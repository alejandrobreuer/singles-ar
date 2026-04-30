-- ─── Buy orders v2 + transactions + cancellation tracking ───────────────────

-- ── 1. Extend buy_orders ──────────────────────────────────────────────────────

-- Drop and recreate the status check to include new states
alter table public.buy_orders
  drop constraint if exists buy_orders_status_check;

alter table public.buy_orders
  add column if not exists expires_at   timestamptz,
  add column if not exists notes        text,
  add column if not exists accepted_by  uuid references public.profiles(id) on delete set null;

alter table public.buy_orders
  add constraint buy_orders_status_check
    check (status in ('active','reserved','filled','cancelled','expired'));

-- Set default expiry for existing rows (30 days from creation)
update public.buy_orders
  set expires_at = created_at + interval '30 days'
  where expires_at is null;

-- Index for the cron expiry job
create index if not exists buy_orders_expires_idx
  on public.buy_orders (status, expires_at)
  where status = 'active';

-- ── 2. Transactions table ─────────────────────────────────────────────────────

create table if not exists public.transactions (
  id             uuid        primary key default gen_random_uuid(),
  buy_order_id   uuid        references public.buy_orders(id) on delete set null,
  buyer_id       uuid        not null references public.profiles(id) on delete cascade,
  seller_id      uuid        not null references public.profiles(id) on delete cascade,
  card_id        uuid        not null references public.cards(id) on delete cascade,
  price          numeric(12,2) not null,
  currency       text        not null default 'ARS',
  status         text        not null default 'in_chat'
    check (status in ('in_chat','payment_pending','paid','completed','disputed','cancelled')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists transactions_buyer_idx  on public.transactions (buyer_id);
create index if not exists transactions_seller_idx on public.transactions (seller_id);
create index if not exists transactions_status_idx on public.transactions (status);

alter table public.transactions enable row level security;

create policy "Users see own transactions"
  on public.transactions for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "Participants can update own transactions"
  on public.transactions for update
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- ── 3. Extend profiles — cancellation tracking ────────────────────────────────

alter table public.profiles
  add column if not exists cancel_count          int         not null default 0,
  add column if not exists is_reliable_buyer     boolean     not null default true,
  add column if not exists cancel_count_reset_at timestamptz;

-- ── 4. Admin settings — buy order defaults ────────────────────────────────────

insert into public.admin_settings (key, value) values
  ('max_cancels_before_flag', '3'),
  ('buy_order_default_days',  '30')
on conflict (key) do nothing;
