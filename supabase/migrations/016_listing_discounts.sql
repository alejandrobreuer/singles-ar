-- ─── Listing discounts ──────────────────────────────────────────────────────
-- `price` remains the effective/final price (drives payment creation, commission
-- calc, buy_orders, cards_with_listing_stats.lowest_price — unchanged). When a
-- seller applies a discount, `original_price` stores the pre-discount price and
-- `price` is recomputed by the API (never trusted from the client — see
-- app/api/listings/[id]/route.ts).

alter table public.listings
  add column if not exists original_price numeric check (original_price > 0),
  add column if not exists discount_type  text    check (discount_type in ('fixed', 'percentage')),
  add column if not exists discount_value numeric check (discount_value > 0);

alter table public.listings
  drop constraint if exists listing_discount_fields_paired;
alter table public.listings
  add constraint listing_discount_fields_paired
    check ((discount_type is null) = (discount_value is null));

alter table public.listings
  drop constraint if exists listing_discount_requires_original_price;
alter table public.listings
  add constraint listing_discount_requires_original_price
    check (discount_type is null or original_price is not null);

alter table public.listings
  drop constraint if exists listing_discount_value_in_range;
alter table public.listings
  add constraint listing_discount_value_in_range
    check (
      discount_type is null
      or (discount_type = 'percentage' and discount_value < 100)
      or (discount_type = 'fixed'      and discount_value < original_price)
    );

-- Defensive net independent of the API: price can never exceed original_price.
alter table public.listings
  drop constraint if exists listing_price_not_above_original;
alter table public.listings
  add constraint listing_price_not_above_original
    check (original_price is null or price is null or price <= original_price);
