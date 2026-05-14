import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─── GET /api/cards/:id ───────────────────────────────────────────────────────
// Returns a single card as CardSearchResult shape.

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("cards")
    .select("id, external_id, name, set_name, set_code, card_number, rarity, color, image_url, game")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Carta no encontrada." }, { status: 404 });
  }

  return NextResponse.json({ data });
}
