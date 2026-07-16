-- ─── Auto-generated reviews ──────────────────────────────────────────────────
--
-- When a transaction auto-closes after the 72h protection window without the
-- buyer confirming receipt, the system now leaves a 5-star review on the
-- seller's behalf (see /api/cron/auto-complete-transactions). This flag lets
-- the UI explain that origin and offer the buyer a chance to correct it
-- within the review edit window.

alter table public.reviews
  add column if not exists auto_generated boolean not null default false;
