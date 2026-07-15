-- =============================================================================
-- CLEANUP: remove all test listings and related transactional data
-- =============================================================================
-- Run this once before launch to clear out test listings, buy orders,
-- transactions, chat messages and reviews generated during development.
--
-- This does NOT touch:
--   - public.cards          (card catalog — keep)
--   - public.profiles       (user accounts — keep)
--   - public.admin_settings (platform config — keep)
--   - public.wishlist        (harmless, left as-is)
--
-- Order matters due to foreign keys: children before parents.
-- Run inside a transaction so you can ROLLBACK if something looks wrong.

BEGIN;

-- 1. Reviews (references transactions)
DELETE FROM public.reviews;

-- 2. Chat messages (references transactions)
DELETE FROM public.chat_messages;

-- 3. Transactions (references listings, buy_orders, cards)
DELETE FROM public.transactions;

-- 4. Buy orders
DELETE FROM public.buy_orders;

-- 5. Listings
DELETE FROM public.listings;

-- 6. (Optional) Reset reputation/sales counters that were built up from test
--    transactions, so profiles start clean for launch.
UPDATE public.profiles SET
  reputation_score    = 0,
  total_sales         = 0,
  total_purchases     = 0,
  cancel_count        = 0,
  is_reliable_buyer   = true;

COMMIT;
