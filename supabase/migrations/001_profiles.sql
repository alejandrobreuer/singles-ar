-- ─── profiles table ──────────────────────────────────────────────────────────
-- Run this in your Supabase SQL editor or via `supabase db push`

create table if not exists public.profiles (
  id                          uuid        primary key references auth.users(id) on delete cascade,
  internal_id                 text        not null unique,
  username                    text        not null unique,
  email                       text        not null,
  avatar_url                  text,
  created_at                  timestamptz not null default now(),

  -- MercadoPago OAuth
  mercadopago_access_token    text,
  mercadopago_refresh_token   text,
  mercadopago_user_id         text,
  mercadopago_connected_at    timestamptz
);

-- Indexes
create unique index if not exists profiles_username_idx
  on public.profiles (lower(username));

create unique index if not exists profiles_internal_id_idx
  on public.profiles (internal_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table public.profiles enable row level security;

-- Anyone can read public profile info (username, avatar)
create policy "Profiles are publicly readable"
  on public.profiles for select
  using (true);

-- Only the owner can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Insert handled by API route (service role bypasses RLS)
-- No direct insert policy needed for clients

-- ─── Protect sensitive columns from anon reads ────────────────────────────────
-- Use a view or server-side filtering to hide tokens in client queries.
-- Never select mercadopago_access_token from the browser client.
