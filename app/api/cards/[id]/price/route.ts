import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCardPrice } from "@/lib/tcgplayer";
import { DEFAULT_SETTINGS } from "@/lib/priceValidation";

// ─── GET /api/cards/[id]/price ────────────────────────────────────────────────
// Returns TCGPlayer price + current USD→ARS rate for the sell form.

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  // Fetch card to get tcgplayer_id
  const { data: card, error } = await supabase
    .from("cards")
    .select("id, tcgplayer_id")
    .eq("id", params.id)
    .single();

  if (error || !card) {
    return NextResponse.json({ error: "Carta no encontrada." }, { status: 404 });
  }

  // Fetch current USD→ARS rate from admin_settings
  const { data: rateRow } = await createAdminClient()
    .from("admin_settings")
    .select("value")
    .eq("key", "usd_to_ars_rate")
    .maybeSingle();

  const usdToARS = rateRow ? parseFloat(String(rateRow.value)) : DEFAULT_SETTINGS.usd_to_ars_rate;

  // No TCGPlayer ID — return null price (validation will be skipped)
  if (!card.tcgplayer_id) {
    return NextResponse.json({ price_usd: null, usd_to_ars_rate: usdToARS, stale: false });
  }

  const priceResult = await getCardPrice(card.id, card.tcgplayer_id).catch(() => null);

  return NextResponse.json({
    price_usd:    priceResult?.price_usd    ?? null,
    usd_to_ars:   usdToARS,
    stale:        priceResult?.stale        ?? false,
    recorded_at:  priceResult?.recorded_at  ?? null,
  });
}
