// ─── Discount pricing ─────────────────────────────────────────────────────────
// Shared by the PATCH /api/listings/[id] route (authoritative) and the edit
// UIs (live preview only) so the formula can never drift between the two.

import type { DiscountType } from "@/types/database";

/** Computes the effective price from a base price + discount. Rounds to the
 * nearest whole peso (ARS has no meaningful sub-peso granularity in this app). */
export function computeDiscountedPrice(
  basePrice: number,
  discountType: DiscountType,
  discountValue: number,
): number {
  const raw = discountType === "fixed"
    ? basePrice - discountValue
    : basePrice * (1 - discountValue / 100);
  return Math.round(raw);
}
