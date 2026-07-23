import { NextRequest, NextResponse } from "next/server";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_GAMES = ["magic", "pokemon", "onepiece"];

// ─── GET /api/collection/progress?game=X ───────────────────────────────────────
// Per-set ownership progress for the current user: how many cards of each set
// they own vs. the set's total size.

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const game = req.nextUrl.searchParams.get("game") ?? "";
  if (!VALID_GAMES.includes(game)) {
    return NextResponse.json({ error: "Juego inválido." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin.rpc("get_collection_progress", {
    p_user_id: user.id,
    p_game:    game,
  });

  if (error) {
    return NextResponse.json({ error: "Error al obtener el progreso de la colección." }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
