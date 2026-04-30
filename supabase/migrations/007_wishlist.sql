-- ─── Wishlist + profile extensions ───────────────────────────────────────────

-- ── 1. Wishlist table ─────────────────────────────────────────────────────────

create table if not exists public.wishlist (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  card_id    uuid        not null references public.cards(id)    on delete cascade,
  created_at timestamptz not null default now(),

  unique (user_id, card_id)
);

create index if not exists wishlist_user_idx on public.wishlist (user_id);
create index if not exists wishlist_card_idx on public.wishlist (card_id);

alter table public.wishlist enable row level security;

create policy "Users see own wishlist"
  on public.wishlist for select
  using (auth.uid() = user_id);

create policy "Users add to own wishlist"
  on public.wishlist for insert
  with check (auth.uid() = user_id);

create policy "Users remove from own wishlist"
  on public.wishlist for delete
  using (auth.uid() = user_id);

-- ── 2. Add username_last_changed_at to profiles ───────────────────────────────

alter table public.profiles
  add column if not exists username_last_changed_at timestamptz;

-- ── 3. Add total_purchases if not already present ────────────────────────────
-- (may have been added in 006 — idempotent)

alter table public.profiles
  add column if not exists total_purchases int not null default 0;
