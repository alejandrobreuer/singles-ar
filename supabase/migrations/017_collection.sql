-- ─── My Collection ──────────────────────────────────────────────────────────
-- Per-user "I own this card" tracking, per catalog card. Ownership is
-- row-existence (like wishlist); quantity is metadata on top, not a separate
-- Y/N flag. Only real cards from public.cards can be tracked (FK-enforced).
-- Schema is deliberately shaped so a future "show me cards I'm missing"
-- marketplace filter needs zero further schema changes (plain NOT EXISTS).

create table if not exists public.collection_items (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles on delete cascade,
  card_id    uuid        not null references public.cards    on delete cascade,
  quantity   int         not null default 1 check (quantity >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, card_id)
);

create index if not exists idx_collection_items_user on public.collection_items (user_id);
create index if not exists idx_collection_items_card on public.collection_items (card_id);

-- Supports the per-set progress query below at catalog scale (Magic alone has
-- hundreds of thousands of rows) — neither idx_cards_game nor idx_cards_set_code
-- alone covers a (game, set_code) grouped count efficiently.
create index if not exists idx_cards_game_set on public.cards (game, set_code);

alter table public.collection_items enable row level security;

drop policy if exists "collection_items_owner_read" on public.collection_items;
create policy "collection_items_owner_read"
  on public.collection_items for select
  using (auth.uid() = user_id);

drop policy if exists "collection_items_owner_insert" on public.collection_items;
create policy "collection_items_owner_insert"
  on public.collection_items for insert
  with check (auth.uid() = user_id);

-- Collection needs UPDATE (quantity changes) — wishlist never required this.
drop policy if exists "collection_items_owner_update" on public.collection_items;
create policy "collection_items_owner_update"
  on public.collection_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "collection_items_owner_delete" on public.collection_items;
create policy "collection_items_owner_delete"
  on public.collection_items for delete
  using (auth.uid() = user_id);

drop trigger if exists trg_collection_items_updated_at on public.collection_items;
create trigger trg_collection_items_updated_at
  before update on public.collection_items
  for each row execute function public.set_updated_at();

-- ── Per-set collection progress ──────────────────────────────────────────────
-- One row per set in the game, with total cards in that set and how many the
-- given user owns (0 if none). SECURITY DEFINER + explicit p_user_id (not
-- auth.uid()) because it's called via the admin client, same convention as
-- get_filter_sets/get_filter_rarities/get_filter_colors.
create or replace function public.get_collection_progress(p_user_id uuid, p_game text)
returns table(set_code text, set_name text, total int, owned int)
language sql stable security definer as $$
  select
    c.set_code,
    min(c.set_name)      as set_name,
    count(*)::int         as total,
    count(ci.id)::int      as owned
  from public.cards c
  left join public.collection_items ci
    on ci.card_id = c.id
   and ci.user_id = p_user_id
  where c.game = p_game
    and c.set_code is not null
  group by c.set_code
  order by c.set_code;
$$;
