import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyCardFilters } from "@/lib/cardFilters";

// ─── GET /api/cards/search ────────────────────────────────────────────────────
// Query params:
//   q      — search term (name / set)
//   game   — filter by game ('magic' | 'pokemon' | 'onepiece')
//   set    — filter by set_code
//   rarity — comma-separated list of rarities (OR'd together)
//   color  — comma-separated list of colors/types (OR'd together)
//   page   — page number (1-indexed, default 1)
//   limit  — results per page (default 20, max 50)

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const q        = searchParams.get("q")?.trim()    ?? "";
  const game     = searchParams.get("game")         ?? "";
  const set      = searchParams.get("set")          ?? "";
  const rarities = (searchParams.get("rarity") ?? "").split(",").filter(Boolean);
  const colors   = (searchParams.get("color")  ?? "").split(",").filter(Boolean);
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

  query = applyCardFilters(query, { game, set, rarity: rarities, color: colors, q });

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
