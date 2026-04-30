import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { differenceInDays } from "date-fns";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateUsername }  from "@/lib/auth/utils";

// ─── Schema ───────────────────────────────────────────────────────────────────

const patchSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guiones bajos.").optional(),
});

// ─── PATCH /api/profile ───────────────────────────────────────────────────────
// Updates mutable profile fields.
// Currently: username (limited to once per 30 days).

export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 422 }
    );
  }

  const admin = createAdminClient();

  // ── Username change ────────────────────────────────────────────────────────
  if (parsed.data.username !== undefined) {
    const newUsername = parsed.data.username.trim();

    // Validate format
    const validationError = validateUsername(newUsername);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 422 });
    }

    // Fetch current profile
    const { data: profile } = await admin
      .from("profiles")
      .select("username, username_last_changed_at")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Perfil no encontrado." }, { status: 404 });
    }

    // No-op if same username
    if (profile.username.toLowerCase() === newUsername.toLowerCase()) {
      return NextResponse.json({ ok: true, username: profile.username });
    }

    // 30-day cooldown
    if (profile.username_last_changed_at) {
      const daysSince = differenceInDays(new Date(), new Date(profile.username_last_changed_at));
      if (daysSince < 30) {
        return NextResponse.json(
          { error: `Podés cambiar tu nombre de usuario en ${30 - daysSince} días.` },
          { status: 422 }
        );
      }
    }

    // Uniqueness check
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .ilike("username", newUsername)
      .neq("id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Ese nombre de usuario ya está en uso." }, { status: 409 });
    }

    const { error: updateError } = await admin
      .from("profiles")
      .update({
        username:                 newUsername,
        username_last_changed_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json({ error: "Error al actualizar el usuario." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, username: newUsername });
  }

  return NextResponse.json({ error: "Sin cambios." }, { status: 400 });
}
