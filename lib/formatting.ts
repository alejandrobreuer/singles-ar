// ─── Shared formatting utilities ─────────────────────────────────────────────
// All currency/number formatting for the app lives here.

export const ARS_FORMAT = new Intl.NumberFormat("es-AR", {
  style:                "currency",
  currency:             "ARS",
  maximumFractionDigits: 0,
});

export const USD_FORMAT = new Intl.NumberFormat("en-US", {
  style:                "currency",
  currency:             "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const ARS_NUMBER_FORMAT = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});

export function formatARS(amount: number): string {
  return ARS_FORMAT.format(amount);
}

export function formatUSD(amount: number): string {
  return USD_FORMAT.format(amount);
}

/** Format as plain ARS number without currency symbol: "10.500" */
export function formatARSNumber(amount: number): string {
  return ARS_NUMBER_FORMAT.format(amount);
}

/** Parse a localized ARS string back to a number: "10.500,50" → 10500.50 */
export function parseARSInput(raw: string): number {
  // Remove thousand separators (.) and replace decimal comma with dot
  const cleaned = raw.replace(/\./g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

export function formatPercent(value: number, decimals = 1): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}
