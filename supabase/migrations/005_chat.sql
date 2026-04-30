-- ─── Chat messages + transaction read-tracking ───────────────────────────────

-- ── 1. chat_messages table ────────────────────────────────────────────────────

create table if not exists public.chat_messages (
  id             uuid        primary key default gen_random_uuid(),
  transaction_id uuid        not null references public.transactions(id) on delete cascade,
  sender_id      uuid        references public.profiles(id) on delete set null,
  body           text,
  image_url      text,
  message_type   text        not null default 'text'
    check (message_type in ('text', 'image', 'system')),
  created_at     timestamptz not null default now(),

  -- At least one of body/image_url must be present, except for system messages
  constraint chat_message_has_content
    check (
      message_type = 'system'
      or body is not null
      or image_url is not null
    )
);

create index if not exists chat_messages_tx_time_idx
  on public.chat_messages (transaction_id, created_at asc);

-- ── 2. RLS ────────────────────────────────────────────────────────────────────

alter table public.chat_messages enable row level security;

create policy "Participants can read chat messages"
  on public.chat_messages for select
  using (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_id
        and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
    )
  );

create policy "Participants can send messages"
  on public.chat_messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.transactions t
      where t.id = transaction_id
        and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
        and t.status not in ('cancelled', 'completed')
    )
  );

-- ── 3. Enable Realtime for chat_messages ──────────────────────────────────────

alter publication supabase_realtime add table public.chat_messages;

-- ── 4. Extend transactions with read-tracking + listing_id ────────────────────

alter table public.transactions
  add column if not exists buyer_last_read_at  timestamptz,
  add column if not exists seller_last_read_at timestamptz,
  add column if not exists listing_id          uuid references public.listings(id) on delete set null;

-- ── 5. Helper RPC: increment seller total_sales ──────────────────────────────

create or replace function public.increment_total_sales(seller_id uuid)
returns void
language sql
security definer
as $$
  update public.profiles
  set total_sales = total_sales + 1
  where id = seller_id;
$$;

-- ── 6. Storage bucket for chat images ─────────────────────────────────────────
-- Run once manually in the Supabase dashboard or via the API:
--
--   insert into storage.buckets (id, name, public)
--   values ('chat-images', 'chat-images', true)
--   on conflict do nothing;
--
--   create policy "Auth users can upload chat images"
--     on storage.objects for insert
--     to authenticated
--     with check (bucket_id = 'chat-images');
--
--   create policy "Anyone can view chat images"
--     on storage.objects for select
--     using (bucket_id = 'chat-images');
