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

  const q     = searchParams.get("q")?.trim()    ?? "";
  const game  = searchParams.get("game")         ?? "";
  const set   = searchParams.get("set")          ?? "";
  const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const from  = (page - 1) * limit;
  const to    = from + limit - 1;

  const supabase = createClient();

  let query = supabase
    .from("cards")
    .select("id, name, set_name, set_code, card_number, rarity, image_url, game", { count: "exact" })
    .range(from, to)
    .order("name", { ascending: true });

  // Full-text search on name + set_name when a term is provided
  if (q) {
    // websearch_to_tsquery handles multi-word, quoted phrases, negation
    query = query.textSearch("search_vector", q, {
      type:   "websearch",
      config: "english",
    });
  }

  if (game && ["magic", "pokemon", "onepiece"].includes(game)) {
    query = query.eq("game", game as Game);
  }

  if (set) {
    query = query.ilike("set_code", set);
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
