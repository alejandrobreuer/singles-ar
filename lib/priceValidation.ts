// ─── Price validation + commission utilities ──────────────────────────────────
// Pure functions — no I/O, safe on both client and server.

// ─── Default settings (used as fallback if DB unavailable) ───────────────────

export const DEFAULT_SETTINGS = {
  price_tolerance_percent:     30,
  usd_to_ars_rate:             1000,
  platform_commission_percent: 5,
  mp_fee_percent:              5.99,
  buy_order_default_days:      30,
  max_cancels_before_flag:     3,
  cancel_window_days:          1,
  bulk_listing_enabled:        false,
} as const;

// ─── Price validation ─────────────────────────────────────────────────────────

export interface PriceValidationResult {
  valid:              boolean;
  min:                number;   // minimum allowed ARS price
  max:                number;   // maximum allowed ARS price
  medianARS:          number;   // TCGPlayer USD median converted to ARS
  percentFromMedian:  number;   // % deviation: positive = above, negative = below
  /** Clamped 0–100 position of user's price within the [min, max] band */
  barPosition:        number;
}

export function validatePrice(
  priceARS:         number,
  tcgMedianUSD:     number,
  usdToARS:         number,
  tolerancePercent: number
): PriceValidationResult {
  const medianARS = tcgMedianUSD * usdToARS;
  const factor    = tolerancePercent / 100;
  const min       = medianARS * (1 - factor);
  const max       = medianARS * (1 + factor);

  const percentFromMedian =
    medianARS > 0 ? ((priceARS - medianARS) / medianARS) * 100 : 0;

  const valid = priceARS >= min && priceARS <= max;

  // Position within band: 0 = at min, 50 = at median, 100 = at max
  const range       = max - min;
  const rawPosition = range > 0 ? ((priceARS - min) / range) * 100 : 50;
  const barPosition = Math.max(0, Math.min(100, rawPosition));

  return { valid, min, max, medianARS, percentFromMedian, barPosition };
}

// ─── Commission calculation ───────────────────────────────────────────────────

export interface CommissionResult {
  grossPrice:     number;
  platformFee:    number;
  mpFee:          number;
  totalFees:      number;
  sellerReceives: number;
  effectiveRate:  number;  // total fee % of gross
}

export function calculateCommission(
  priceARS:           number,
  platformFeePercent: number = DEFAULT_SETTINGS.platform_commission_percent,
  mpFeePercent:       number = DEFAULT_SETTINGS.mp_fee_percent
): CommissionResult {
  const platformFee   = priceARS * (platformFeePercent / 100);
  const mpFee         = priceARS * (mpFeePercent / 100);
  const totalFees     = platformFee + mpFee;
  const sellerReceives = priceARS - totalFees;
  const effectiveRate  = (totalFees / priceARS) * 100;

  return {
    grossPrice: priceARS,
    platformFee,
    mpFee,
    totalFees,
    sellerReceives,
    effectiveRate,
  };
}
