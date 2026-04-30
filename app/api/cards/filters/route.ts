import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Game } from "@/types/database";

// ─── GET /api/cards/filters?game= ────────────────────────────────────────────
// Returns distinct sets, rarities, and colors for a given game.
// Used to populate filter dropdowns in the sell flow.

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const game = searchParams.get("game") ?? "";

  if (!["magic", "pokemon", "onepiece"].includes(game)) {
    return NextResponse.json({ error: "game param required" }, { status: 400 });
  }

  const supabase = createClient();

  const [setsRes, raritiesRes, colorsRes] = await Promise.all([
    supabase
      .from("cards")
      .select("set_code, set_name")
      .eq("game", game as Game)
      .not("set_code", "is", null)
      .order("set_name", { ascending: true })
      .limit(2000),

    supabase
      .from("cards")
      .select("rarity")
      .eq("game", game as Game)
      .not("rarity", "is", null)
      .order("rarity", { ascending: true })
      .limit(500),

    supabase
      .from("cards")
      .select("color")
      .eq("game", game as Game)
      .not("color", "is", null)
      .order("color", { ascending: true })
      .limit(100),
  ]);

  if (setsRes.error)    console.error("[filters] sets error:",    setsRes.error.message);
  if (raritiesRes.error) console.error("[filters] rarities error:", raritiesRes.error.message);
  if (colorsRes.error)  console.error("[filters] colors error:",   colorsRes.error.message);

  // Deduplicate sets by set_code
  const seenSets = new Set<string>();
  const sets = (setsRes.data ?? [])
    .filter((row) => {
      if (!row.set_code || seenSets.has(row.set_code)) return false;
      seenSets.add(row.set_code);
      return true;
    })
    .map((row) => ({ code: row.set_code as string, name: row.set_name ?? row.set_code as string }));

  const rarities = [...new Set(
    (raritiesRes.data ?? []).map((r) => r.rarity).filter(Boolean) as string[]
  )];

  const colors = [...new Set(
    (colorsRes.data ?? []).map((r) => r.color).filter(Boolean) as string[]
  )];

  return NextResponse.json({ sets, rarities, colors });
}
