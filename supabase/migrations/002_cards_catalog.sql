-- ─── Cards catalog migration ─────────────────────────────────────────────────

-- ── 1. Add seller stats to profiles ──────────────────────────────────────────

alter table public.profiles
  add column if not exists reputation_score numeric(5,2) not null default 0,
  add column if not exists total_sales      int          not null default 0;

-- ── 2. Cards ──────────────────────────────────────────────────────────────────

create table if not exists public.cards (
  id           uuid        primary key default gen_random_uuid(),
  external_id  text        not null unique,
  scryfall_id  text        unique,
  tcgplayer_id text,
  name         text        not null,
  set_name     text,
  set_code     text,
  card_number  text,
  rarity       text,
  image_url    text,
  game         text        not null check (game in ('magic', 'pokemon', 'onepiece')),
  lang         text        not null default 'en',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Full-text search vector (name + set_name, English stemming)
alter table public.cards
  add column if not exists search_vector tsvector
    generated always as (
      to_tsvector('english',
        coalesce(name, '') || ' ' || coalesce(set_name, '') || ' ' || coalesce(set_code, '')
      )
    ) stored;

create index if not exists cards_search_idx  on public.cards using gin(search_vector);
create index if not exists cards_game_idx    on public.cards (game);
create index if not exists cards_name_idx    on public.cards (lower(name));
create index if not exists cards_updated_idx on public.cards (updated_at desc);

-- ── 3. Listings ───────────────────────────────────────────────────────────────

create table if not exists public.listings (
  id          uuid        primary key default gen_random_uuid(),
  card_id     uuid        not null references public.cards(id) on delete cascade,
  seller_id   uuid        not null references public.profiles(id) on delete cascade,
  price       numeric(12,2) not null check (price > 0),
  currency    text        not null default 'ARS',
  condition   text        not null check (condition in ('NM','LP','MP','HP','DMG')),
  quantity    int         not null default 1 check (quantity > 0),
  status      text        not null default 'active'
                          check (status in ('active','sold','cancelled','reserved')),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists listings_card_active_idx
  on public.listings (card_id, status, price asc)
  where status = 'active';

create index if not exists listings_seller_idx    on public.listings (seller_id);
create index if not exists listings_created_idx   on public.listings (created_at desc);

-- ── 4. Buy orders ─────────────────────────────────────────────────────────────

create table if not exists public.buy_orders (
  id          uuid        primary key default gen_random_uuid(),
  card_id     uuid        not null references public.cards(id) on delete cascade,
  buyer_id    uuid        not null references public.profiles(id) on delete cascade,
  price       numeric(12,2) not null check (price > 0),
  currency    text        not null default 'ARS',
  condition   text        check (condition in ('NM','LP','MP','HP','DMG')),
  quantity    int         not null default 1 check (quantity > 0),
  status      text        not null default 'active'
                          check (status in ('active','filled','cancelled')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists buy_orders_card_idx on public.buy_orders (card_id, status)
  where status = 'active';

-- ── 5. Price history ──────────────────────────────────────────────────────────

create table if not exists public.price_history (
  id          uuid        primary key default gen_random_uuid(),
  card_id     uuid        not null references public.cards(id) on delete cascade,
  price_usd   numeric(10,4),
  price_ars   numeric(12,2),
  source      text        not null check (source in ('tcgplayer','scryfall','listing')),
  recorded_at timestamptz not null default now()
);

create index if not exists price_history_card_date_idx
  on public.price_history (card_id, recorded_at desc);

create index if not exists price_history_source_idx
  on public.price_history (card_id, source, recorded_at desc);

-- ── 6. RLS policies ───────────────────────────────────────────────────────────

alter table public.cards         enable row level security;
alter table public.listings      enable row level security;
alter table public.buy_orders    enable row level security;
alter table public.price_history enable row level security;

-- Cards: public read, admin-only write
create policy "Cards are publicly readable"
  on public.cards for select using (true);

-- Listings: public read; sellers manage their own
create policy "Listings are publicly readable"
  on public.listings for select using (true);

create policy "Sellers manage own listings"
  on public.listings for all
  using (auth.uid() = seller_id);

-- Buy orders: public read; buyers manage their own
create policy "Buy orders are publicly readable"
  on public.buy_orders for select using (true);

create policy "Buyers manage own buy orders"
  on public.buy_orders for all
  using (auth.uid() = buyer_id);

-- Price history: public read
create policy "Price history is publicly readable"
  on public.price_history for select using (true);

-- ── 7. Homepage view: cards with listing stats ────────────────────────────────

create or replace view public.cards_with_listing_stats as
select
  c.id,
  c.name,
  c.set_name,
  c.set_code,
  c.card_number,
  c.rarity,
  c.image_url,
  c.game,
  count(l.id)::int          as listing_count,
  min(l.price)              as lowest_price,
  max(l.created_at)::text   as latest_listing
from public.cards c
join public.listings l on l.card_id = c.id and l.status = 'active'
group by c.id;
