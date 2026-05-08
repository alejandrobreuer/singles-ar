import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  userId:   z.string().uuid(),
  username: z.string().min(3).max(20).regex(/^[a-z0-9_]+$/),
});

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

  const { error } = await admin
    .from("profiles")
    .update({
      username,
      terms_accepted:    true,
      terms_accepted_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: "No se pudo guardar el apodo." }, { status: 500 });
  }

  // Store in user_metadata so middleware can check terms without an extra DB query
  await admin.auth.admin.updateUserById(userId, {
    user_metadata: { terms_accepted: true },
  });

  return NextResponse.json({ ok: true });
}
