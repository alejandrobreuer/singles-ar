import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { subDays } from "date-fns";

// ─── GET /api/cards/[id]/price ────────────────────────────────────────────────
// Returns the platform median price (ARS) derived from completed transactions
// recorded in price_history for this card over the last 90 days.

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid    = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin    = createAdminClient();
  const since    = subDays(new Date(), 90).toISOString();

  const { data, error } = await admin
    .from("price_history")
    .select("price_ars")
    .eq("card_id", params.id)
    .eq("source", "listing")
    .gte("recorded_at", since)
    .not("price_ars", "is", null);

  if (error) {
    return NextResponse.json({ price_ars: null, count: 0 });
  }

  const prices    = (data ?? []).map((r) => r.price_ars as number);
  const medianARS = median(prices);

  return NextResponse.json({ price_ars: medianARS, count: prices.length });
}
