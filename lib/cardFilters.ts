// ─── Shared card-catalog filter logic ────────────────────────────────────────
// Lifted verbatim from app/api/cards/search/route.ts so /api/collection/bulk
// can resolve the same "which cards match these filters" set without a second,
// independently-maintained implementation that could drift out of sync.

export interface CardFilterParams {
  game?:   string;
  set?:    string;
  rarity?: string[];
  color?:  string[];
  q?:      string;
}

export function applyCardFilters<T extends {
  eq:    (column: string, value: string) => T;
  ilike: (column: string, pattern: string) => T;
  or:    (filters: string) => T;
}>(query: T, { game, set, rarity, color, q }: CardFilterParams): T {
  let result = query;

  if (q) {
    result = result.or(`name.ilike.%${q}%,external_id.ilike.%${q}%`);
  }

  if (game && ["magic", "pokemon", "onepiece", "dbz"].includes(game)) {
    result = result.eq("game", game);
  }

  if (set) {
    result = result.ilike("set_code", set);
  }

  if (rarity && rarity.length > 0) {
    result = result.or(rarity.map((r) => `rarity.ilike.${r}`).join(","));
  }

  if (color && color.length > 0) {
    result = result.or(color.map((c) => `color.ilike.%${c}%`).join(","));
  }

  return result;
}
