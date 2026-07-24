import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  userId:   z.string().uuid(),
  username: z.string().min(3).max(20).regex(/^[a-z0-9_]+$/),
});

// This route can't be gated by auth.getUser() the way every other user-scoped
// write in this app is: it's called synchronously right after
// supabase.auth.signUp() resolves (app/(auth)/register/page.tsx), and no
// session cookie exists yet at that point — this project requires email
// confirmation before Supabase issues one (see app/auth/confirm/route.ts).
// Without SOME server-side check, userId is just a client-supplied UUID and
// this endpoint would let anyone rename any existing account. Instead, only
// allow it against profiles created within the last few minutes — the
// legitimate flow always calls this within milliseconds of account creation,
// so this turns "rename any account, any time" into "an attacker would need
// to already know the UUID of an account created in roughly the last few
// minutes, and win a race against the real signup flow."
const CLAIM_WINDOW_MINUTES = 10;

// ─── POST /api/auth/set-username ──────────────────────────────────────────────
// Called right after signUp to set the user-chosen username on their profile.
// The profile row is created by the handle_new_user trigger; this just updates
// the username field before the user reaches onboarding.

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 422 }
    );
  }

  const { userId, username } = parsed.data;
  const admin = createAdminClient();

  // Re-check availability to guard against race conditions
  const { data: taken } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", userId)
    .maybeSingle();

  if (taken) {
    return NextResponse.json({ error: "Ese apodo ya no está disponible." }, { status: 409 });
  }

  const cutoff = new Date(Date.now() - CLAIM_WINDOW_MINUTES * 60_000).toISOString();

  const { data: updated, error } = await admin
    .from("profiles")
    .update({
      username,
      terms_accepted:    true,
      terms_accepted_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .gt("created_at", cutoff)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "No se pudo guardar el apodo." }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json(
      { error: "No se pudo guardar el apodo. Volvé a intentar el registro." },
      { status: 403 }
    );
  }

  // Store in user_metadata so middleware can check terms without an extra DB query
  await admin.auth.admin.updateUserById(userId, {
    user_metadata: { terms_accepted: true },
  });

  return NextResponse.json({ ok: true });
}
