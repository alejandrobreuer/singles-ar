-- ─── Listing language: physical print language of the seller's copy ────────────
-- Same card can exist in multiple languages (EN/ES/PT/JA depending on the game).
-- This is independent from cards.lang (the catalog/source language).

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en'
    CHECK (language IN ('en', 'es', 'pt', 'ja'));

CREATE INDEX IF NOT EXISTS idx_listings_language ON public.listings (language);
