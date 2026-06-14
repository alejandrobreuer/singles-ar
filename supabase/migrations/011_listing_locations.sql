-- ─── Listing locations: multiple delivery locations per listing ────────────────

CREATE TABLE IF NOT EXISTS public.listing_locations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid NOT NULL REFERENCES public.listings  ON DELETE CASCADE,
  province_id uuid NOT NULL REFERENCES public.provinces ON DELETE CASCADE,
  zone_id     uuid REFERENCES public.zones  ON DELETE SET NULL,
  area_id     uuid REFERENCES public.areas  ON DELETE SET NULL,
  store_id    uuid REFERENCES public.stores ON DELETE SET NULL
);

ALTER TABLE public.listing_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listing_locations_public_read"
  ON public.listing_locations FOR SELECT
  USING (true);

CREATE POLICY "listing_locations_owner_write"
  ON public.listing_locations FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.seller_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.seller_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_listing_locations_listing  ON public.listing_locations (listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_locations_province ON public.listing_locations (province_id);
CREATE INDEX IF NOT EXISTS idx_listing_locations_zone     ON public.listing_locations (zone_id);
CREATE INDEX IF NOT EXISTS idx_listing_locations_area     ON public.listing_locations (area_id);


-- ─── Migrate existing single-location data ──────────────────────────────────────

INSERT INTO public.listing_locations (listing_id, province_id, zone_id, area_id, store_id)
SELECT id, province_id, zone_id, area_id, store_id
FROM public.listings
WHERE province_id IS NOT NULL;


-- ─── Drop old single-location columns from listings ─────────────────────────────

DROP INDEX IF EXISTS idx_listings_province;

ALTER TABLE public.listings
  DROP COLUMN IF EXISTS province_id,
  DROP COLUMN IF EXISTS zone_id,
  DROP COLUMN IF EXISTS area_id,
  DROP COLUMN IF EXISTS store_id;
