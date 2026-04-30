-- ─── Admin panel extensions ───────────────────────────────────────────────────

-- ── 1. Cards: custom image override ──────────────────────────────────────────

alter table public.cards
  add column if not exists image_override_url text;

-- When present, the UI should prefer image_override_url over image_url.

-- ── 2. Profiles: suspension ───────────────────────────────────────────────────

alter table public.profiles
  add column if not exists suspended_at    timestamptz,
  add column if not exists suspend_reason  text;

-- ── 3. Transactions: store platform fee at creation time ──────────────────────
-- (derived from price × commission% but storing it makes reporting accurate even
--  if the rate changes later)

alter table public.transactions
  add column if not exists platform_fee numeric(12,2);

-- ── 4. Seed missing admin settings ────────────────────────────────────────────

insert into public.admin_settings (key, value) values
  ('price_tolerance_percent',    '30'),
  ('platform_commission_percent', '5'),
  ('buy_order_default_days',     '30'),
  ('max_cancels_before_flag',     '3'),
  ('platform_fee_percent',        '5'),
  ('mp_fee_percent',            '5.99'),
  ('usd_to_ars_rate',          '1000')
on conflict (key) do nothing;
