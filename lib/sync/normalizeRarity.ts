// Maps known abbreviations and lowercase API values to full proper-case names.
// Applied at sync time so all rarity values stored in the DB are consistent.

const RARITY_MAP: Record<string, string> = {
  // ── One Piece TCG (OPTCG API returns abbreviations) ───────────────────────
  // Also covers Dragon Ball Super: Fusion World (apitcg.com uses the same
  // C/UC/R/SR/L/SEC/SP/P abbreviations).
  "C":    "Common",
  "UC":   "Uncommon",
  "R":    "Rare",
  "SR":   "Super Rare",
  "L":    "Leader",
  "SEC":  "Secret Rare",
  "SP":   "Special",
  "P":    "Promo",

  // ── Magic: The Gathering (Scryfall returns lowercase full names) ──────────
  "common":   "Common",
  "uncommon": "Uncommon",
  "rare":     "Rare",
  "mythic":   "Mythic Rare",
  "special":  "Special",
  "bonus":    "Bonus",
};

export function normalizeRarity(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();

  // Exact match takes priority
  if (RARITY_MAP[trimmed]) return RARITY_MAP[trimmed];

  // Capitalize first letter of each word, leave the rest unchanged
  // (handles TCGdex values like "Rare Holo EX", "Ultra Rare", "VMAX Rare")
  return trimmed.replace(/\b\w/g, (c) => c.toUpperCase());
}
