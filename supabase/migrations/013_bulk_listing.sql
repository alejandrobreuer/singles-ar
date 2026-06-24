-- ─── Bulk listing feature ───────────────────────────────────────────────────

-- Global toggle in admin_settings
INSERT INTO public.admin_settings (key, value)
VALUES ('bulk_listing_enabled', '"true"')
ON CONFLICT (key) DO NOTHING;

-- Per-user toggle on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bulk_listing_disabled boolean NOT NULL DEFAULT false;
