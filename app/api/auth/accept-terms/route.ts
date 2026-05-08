import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── POST /api/auth/accept-terms ──────────────────────────────────────────────
// Called from /accept-terms page for existing users who haven't accepted yet.

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({
      terms_accepted:    true,
      terms_accepted_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "No se pudieron guardar los términos. Intentá de nuevo." }, { status: 500 });
  }

  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, terms_accepted: true },
  });

  return NextResponse.json({ ok: true });
}
