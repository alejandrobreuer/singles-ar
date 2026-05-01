import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Game } from "@/types/database";

// ─── GET /api/cards/search ────────────────────────────────────────────────────
// Query params:
//   q      — search term (name / set)
//   game   — filter by game ('magic' | 'pokemon' | 'onepiece')
//   set    — filter by set_code
//   page   — page number (1-indexed, default 1)
//   limit  — results per page (default 20, max 50)

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const q      = searchParams.get("q")?.trim()    ?? "";
  const game   = searchParams.get("game")         ?? "";
  const set    = searchParams.get("set")          ?? "";
  const rarity = searchParams.get("rarity")       ?? "";
  const color  = searchParams.get("color")        ?? "";
  const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1", 10));
  const limit  = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const from   = (page - 1) * limit;
  const to     = from + limit - 1;

  const supabase = createClient();

  let query = supabase
    .from("cards")
    .select("id, external_id, name, set_name, set_code, card_number, rarity, color, image_url, game", { count: "exact" })
    .range(from, to)
    .order("name", { ascending: true });

  // Search by name or card ID (external_id e.g. "OP01-077")
  if (q) {
    query = query.or(`name.ilike.%${q}%,external_id.ilike.%${q}%`);
  }

  if (game && ["magic", "pokemon", "onepiece"].includes(game)) {
    query = query.eq("game", game as Game);
  }

  if (set) {
    query = query.ilike("set_code", set);
  }

  if (rarity) {
    query = query.ilike("rarity", rarity);
  }

  if (color) {
    query = query.ilike("color", `%${color}%`);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    meta: {
      total: count ?? 0,
      page,
      limit,
      pages: Math.ceil((count ?? 0) / limit),
    },
  });
}
