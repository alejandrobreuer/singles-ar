-- =============================================================================
-- DELETE ACCOUNTS: @benjapoke087, @dragonito, @thiagosergiooliveira, @builder2
-- =============================================================================
-- Run in the Supabase SQL editor (as postgres / service role).
-- Wrapped in a transaction so you can ROLLBACK if the row counts look wrong.
--
-- Order:
--   1. Delete transactions involving these users (buyer or seller) — RESTRICT
--      FK means profiles can't be deleted while transactions reference them.
--      This cascades to chat_messages and reviews tied to those transactions.
--   2. Delete the auth.users rows — cascades to profiles, which in turn
--      cascades to listings, buy_orders, wishlist, and any remaining reviews
--      (reviewer/reviewee). chat_messages.sender_id is set to NULL.

BEGIN;

WITH targets AS (
  SELECT id FROM public.profiles
  WHERE username IN ('benjapoke087', 'dragonito', 'thiagosergiooliveira', 'builder2')
)
DELETE FROM public.transactions
WHERE buyer_id IN (SELECT id FROM targets)
   OR seller_id IN (SELECT id FROM targets);

DELETE FROM auth.users
WHERE id IN (
  SELECT id FROM public.profiles
  WHERE username IN ('benjapoke087', 'dragonito', 'thiagosergiooliveira', 'builder2')
);

COMMIT;
