import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── GET /api/cards/filters?game= ────────────────────────────────────────────
// Returns distinct sets, rarities, and colors for a given game.
// Multi-color values like "Blue/Yellow" are split into individual colors.

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const game = searchParams.get("game") ?? "";

  if (!["magic", "pokemon", "onepiece"].includes(game)) {
    return NextResponse.json({ error: "game param required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const [setsRes, raritiesRes, colorsRes] = await Promise.all([
    supabase.rpc("get_filter_sets",     { p_game: game }),
    supabase.rpc("get_filter_rarities", { p_game: game }),
    supabase.rpc("get_filter_colors",   { p_game: game }),
  ]);

  if (setsRes.error)     console.error("[filters] sets error:",     setsRes.error.message);
  if (raritiesRes.error) console.error("[filters] rarities error:", raritiesRes.error.message);
  if (colorsRes.error)   console.error("[filters] colors error:",   colorsRes.error.message);

  const sets = (setsRes.data ?? []).map((r: { set_code: string; set_name: string | null }) => ({
    code: r.set_code, name: r.set_name ?? r.set_code,
  }));
  const rarities = (raritiesRes.data ?? []).map((r: { rarity: string }) => r.rarity);
  const colors   = (colorsRes.data   ?? []).map((r: { color:  string }) => r.color);

  return NextResponse.json({ sets, rarities, colors });
}
