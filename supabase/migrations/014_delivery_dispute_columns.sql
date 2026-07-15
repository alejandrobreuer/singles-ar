-- ─── Delivery confirmation + dispute-window columns ────────────────────────────
--
-- lib/supabase/schema.sql has declared these columns (and the wider `status`
-- CHECK) since the 72h delivery/dispute workflow was designed, but no numbered
-- migration ever added them to the live database — migrations here are applied
-- manually via the Supabase SQL Editor, and this one was missed. The app code
-- (confirm-delivery / mark-received / dispute / resolve-dispute routes) has
-- been writing to delivered_at and release_at, which silently no-ops against
-- production since the columns don't exist there.

-- ── 1. Add the missing columns ────────────────────────────────────────────────

alter table public.transactions
  add column if not exists delivered_at        timestamptz,
  add column if not exists release_at          timestamptz,
  add column if not exists dispute_resolved_at timestamptz,
  add column if not exists dispute_resolution  text;

-- ── 2. Widen the status CHECK to include delivered/disputed ─────────────────────
-- The live constraint's name is unknown (it came from an unnamed inline CHECK
-- in an earlier migration, so Postgres auto-generated the name) — look it up
-- by column rather than guessing, so this doesn't leave a stricter constraint
-- active under a different name.

do $$
declare
  con record;
begin
  for con in
    select tc.constraint_name
    from information_schema.table_constraints tc
    join information_schema.constraint_column_usage ccu
      on tc.constraint_name = ccu.constraint_name
     and tc.constraint_schema = ccu.constraint_schema
    where tc.table_schema = 'public'
      and tc.table_name = 'transactions'
      and tc.constraint_type = 'CHECK'
      and ccu.column_name = 'status'
  loop
    execute format('alter table public.transactions drop constraint %I', con.constraint_name);
  end loop;
end $$;

alter table public.transactions
  add constraint transactions_status_check
  check (status in (
    'pending_buyer_confirmation', 'in_chat', 'payment_pending', 'paid',
    'delivered', 'completed', 'disputed', 'cancelled'
  ));

-- ── 3. dispute_resolution CHECK ──────────────────────────────────────────────

alter table public.transactions
  drop constraint if exists transactions_dispute_resolution_check;

alter table public.transactions
  add constraint transactions_dispute_resolution_check
  check (dispute_resolution is null or dispute_resolution in ('buyer', 'seller'));
