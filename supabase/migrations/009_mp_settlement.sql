-- ─── Transactions: store MP settlement date ───────────────────────────────────
-- Populated from the payment object's money_release_date when the webhook
-- confirms an approved payment. mp_fee already exists (006) but was never
-- written to — the webhook now fills both.

alter table public.transactions
  add column if not exists mp_settlement_date timestamptz;
