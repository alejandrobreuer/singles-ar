-- ─── Admin settings + listing type ──────────────────────────────────────────

-- ── 1. Admin settings table ───────────────────────────────────────────────────

create table if not exists public.admin_settings (
  key        text        primary key,
  value      jsonb       not null,
  updated_at timestamptz not null default now()
);

-- Seed defaults
insert into public.admin_settings (key, value) values
  ('price_tolerance_percent', '30'),
  ('usd_to_ars_rate',         '1000'),
  ('platform_fee_percent',    '5'),
  ('mp_fee_percent',          '5.99')
on conflict (key) do nothing;

-- RLS: anyone can read, only service role can write
alter table public.admin_settings enable row level security;

create policy "Admin settings are publicly readable"
  on public.admin_settings for select using (true);

-- ── 2. Add listing_type + trade fields to listings ────────────────────────────

alter table public.listings
  add column if not exists listing_type text not null default 'sale'
    check (listing_type in ('sale', 'trade')),
  add column if not exists trade_for    text,
  add column if not exists price_diff   numeric(12,2);
