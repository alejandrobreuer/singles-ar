-- ─── Payments + Reviews ───────────────────────────────────────────────────────

-- ── 1. Extend transactions ────────────────────────────────────────────────────

alter table public.transactions
  add column if not exists mp_preference_id text,
  add column if not exists mp_payment_id    text;

-- ── 2. Extend profiles ────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists total_purchases int not null default 0;

-- ── 3. Seed platform commission setting ───────────────────────────────────────

insert into public.admin_settings (key, value) values
  ('platform_commission_percent', '5')
on conflict (key) do nothing;

-- ── 4. Reviews table ──────────────────────────────────────────────────────────

create table if not exists public.reviews (
  id             uuid        primary key default gen_random_uuid(),
  transaction_id uuid        not null references public.transactions(id) on delete cascade,
  reviewer_id    uuid        not null references public.profiles(id) on delete cascade,
  reviewee_id    uuid        not null references public.profiles(id) on delete cascade,
  rating         int         not null check (rating between 1 and 5),
  comment        text        check (char_length(comment) <= 500),
  created_at     timestamptz not null default now(),

  -- One review per user per transaction
  unique (transaction_id, reviewer_id)
);

create index if not exists reviews_reviewee_idx  on public.reviews (reviewee_id);
create index if not exists reviews_reviewer_idx  on public.reviews (reviewer_id);
create index if not exists reviews_tx_idx        on public.reviews (transaction_id);

alter table public.reviews enable row level security;

create policy "Reviews are publicly readable"
  on public.reviews for select using (true);

create policy "Participants can insert their review"
  on public.reviews for insert
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.transactions t
      where t.id = transaction_id
        and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
        and t.status = 'completed'
    )
  );

-- ── 5. RPCs ───────────────────────────────────────────────────────────────────

-- Recalculate reputation_score for a user as avg of all ratings received
create or replace function public.recalculate_reputation(target_id uuid)
returns void
language sql
security definer
as $$
  update public.profiles
  set reputation_score = coalesce(
    (select round(avg(rating) * 20)   -- scale 1-5 → 20-100
     from   public.reviews
     where  reviewee_id = target_id),
    0
  )
  where id = target_id;
$$;

-- Increment buyer total_purchases
create or replace function public.increment_total_purchases(buyer_id uuid)
returns void
language sql
security definer
as $$
  update public.profiles
  set total_purchases = total_purchases + 1
  where id = buyer_id;
$$;
