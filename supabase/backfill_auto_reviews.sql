-- =============================================================================
-- BACKFILL: auto-generate missing 5-star reviews for already-completed transactions
-- =============================================================================
-- The 72h auto-close cron (app/api/cron/auto-complete-transactions) and the
-- resolve-dispute admin route only insert an auto_generated review at the
-- moment a transaction transitions INTO "completed". Neither one ever looks
-- back at transactions that were already "completed" before this feature
-- shipped (2026-07-16, commit a24fbb7), or that reached "completed" via the
-- buyer manually clicking "Recibí la carta" without leaving a review.
--
-- This is a one-time backfill so historical sellers aren't left permanently
-- unrated. Run this ONCE via the Supabase SQL Editor. Safe to re-run: it only
-- targets transactions with zero review rows at all, so it will never touch
-- (or duplicate) a review that already exists — real or auto-generated.

-- Preview first — run this SELECT alone to sanity-check the count before
-- running the block below:
--
-- SELECT count(*) FROM public.transactions t
-- WHERE t.status = 'completed'
--   AND NOT EXISTS (SELECT 1 FROM public.reviews r WHERE r.transaction_id = t.id);

BEGIN;

DO $$
DECLARE
  seller record;
BEGIN
  -- Insert one 5-star auto_generated review per completed transaction that
  -- currently has no review row at all (neither party has one — reviewer_id
  -- is the buyer, matching the cron's convention).
  INSERT INTO public.reviews (transaction_id, reviewer_id, reviewee_id, rating, comment, auto_generated)
  SELECT t.id, t.buyer_id, t.seller_id, 5, NULL, true
  FROM public.transactions t
  WHERE t.status = 'completed'
    AND NOT EXISTS (SELECT 1 FROM public.reviews r WHERE r.transaction_id = t.id);

  -- Recompute reputation once per seller who received a backfilled review.
  -- recalculate_reputation() is a full AVG recompute (not incremental), so
  -- this is idempotent and safe even if some of those sellers already had
  -- other reviews factored in.
  FOR seller IN
    SELECT DISTINCT reviewee_id
    FROM public.reviews
    WHERE auto_generated = true
  LOOP
    PERFORM public.recalculate_reputation(seller.reviewee_id);
  END LOOP;
END $$;

COMMIT;
