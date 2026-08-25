-- ─── Dragon Ball TCG ────────────────────────────────────────────────────────
-- Adds Dragon Ball Super: Fusion World as a supported game, synced from
-- apitcg.com (lib/sync/apitcg.ts). Card game code is 'dbz'.

ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_game_check;
ALTER TABLE public.cards ADD CONSTRAINT cards_game_check
  CHECK (game IN ('magic', 'pokemon', 'onepiece', 'dbz'));
