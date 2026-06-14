-- ─── Locations: provinces / zones / areas / stores ────────────────────────────
-- 3-level delivery location hierarchy:
--   Province (Provincia) > Zone (Zona, optional) > Area (Barrio/Localidad) or Store (Tienda)

-- ─── Provinces ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.provinces (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text    NOT NULL,
  code          text    NOT NULL UNIQUE,
  is_favorite   boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 99
);

ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provinces_public_read"
  ON public.provinces FOR SELECT
  USING (true);


-- ─── Zones ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.zones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  province_id uuid NOT NULL REFERENCES public.provinces ON DELETE CASCADE,
  name        text NOT NULL
);

ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zones_public_read"
  ON public.zones FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_zones_province ON public.zones (province_id);


-- ─── Areas ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.areas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id     uuid REFERENCES public.zones ON DELETE CASCADE,
  province_id uuid NOT NULL REFERENCES public.provinces ON DELETE CASCADE,
  name        text NOT NULL
);

ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "areas_public_read"
  ON public.areas FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_areas_zone     ON public.areas (zone_id);
CREATE INDEX IF NOT EXISTS idx_areas_province ON public.areas (province_id);


-- ─── Stores ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.stores (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  province_id uuid    NOT NULL REFERENCES public.provinces ON DELETE CASCADE,
  zone_id     uuid    REFERENCES public.zones ON DELETE SET NULL,
  name        text    NOT NULL,
  address     text,
  is_verified boolean NOT NULL DEFAULT false
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stores_public_read"
  ON public.stores FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_stores_province ON public.stores (province_id);
CREATE INDEX IF NOT EXISTS idx_stores_zone     ON public.stores (zone_id);


-- ─── Listings: location columns ──────────────────────────────────────────────────

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS province_id uuid REFERENCES public.provinces ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS zone_id     uuid REFERENCES public.zones     ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS area_id     uuid REFERENCES public.areas     ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS store_id    uuid REFERENCES public.stores    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_listings_province ON public.listings (province_id);


-- ─── Seed: provinces ──────────────────────────────────────────────────────────────
-- Favorites first (Buenos Aires, CABA), then Córdoba/Santa Fe, then the rest A-Z.

INSERT INTO public.provinces (name, code, is_favorite, display_order) VALUES
  ('Buenos Aires',         'BA',   true,  1),
  ('CABA',                 'CABA', true,  2),
  ('Córdoba',              'COR',  false, 3),
  ('Santa Fe',             'SF',   false, 4),
  ('Catamarca',            'CAT',  false, 5),
  ('Chaco',                'CHA',  false, 6),
  ('Chubut',               'CHU',  false, 7),
  ('Corrientes',           'CRR',  false, 8),
  ('Entre Ríos',           'ER',   false, 9),
  ('Formosa',              'FOR',  false, 10),
  ('Jujuy',                'JUJ',  false, 11),
  ('La Pampa',             'LP',   false, 12),
  ('La Rioja',             'LR',   false, 13),
  ('Mendoza',              'MEN',  false, 14),
  ('Misiones',             'MIS',  false, 15),
  ('Neuquén',              'NEU',  false, 16),
  ('Río Negro',            'RN',   false, 17),
  ('Salta',                'SAL',  false, 18),
  ('San Juan',             'SJ',   false, 19),
  ('San Luis',             'SLU',  false, 20),
  ('Santa Cruz',           'SC',   false, 21),
  ('Santiago del Estero',  'SE',   false, 22),
  ('Tierra del Fuego',     'TF',   false, 23),
  ('Tucumán',              'TUC',  false, 24)
ON CONFLICT (code) DO NOTHING;


-- ─── Seed: zones for Buenos Aires ─────────────────────────────────────────────────

INSERT INTO public.zones (province_id, name)
SELECT p.id, z.name
FROM public.provinces p
CROSS JOIN (VALUES
  ('CABA'),
  ('Zona Norte (GBA)'),
  ('Zona Sur (GBA)'),
  ('Zona Oeste (GBA)'),
  ('Interior Provincia')
) AS z(name)
WHERE p.code = 'BA'
  AND NOT EXISTS (
    SELECT 1 FROM public.zones existing
    WHERE existing.province_id = p.id AND existing.name = z.name
  );


-- ─── Seed: areas ───────────────────────────────────────────────────────────────────

-- Zona Norte (GBA)
INSERT INTO public.areas (zone_id, province_id, name)
SELECT z.id, z.province_id, a.name
FROM public.zones z
CROSS JOIN (VALUES
  ('San Isidro'), ('Vicente López'), ('Tigre'), ('San Fernando'),
  ('Olivos'), ('Martínez'), ('Acassuso'), ('Beccar')
) AS a(name)
WHERE z.name = 'Zona Norte (GBA)'
  AND z.province_id = (SELECT id FROM public.provinces WHERE code = 'BA')
  AND NOT EXISTS (
    SELECT 1 FROM public.areas existing
    WHERE existing.zone_id = z.id AND existing.name = a.name
  );

-- CABA
INSERT INTO public.areas (zone_id, province_id, name)
SELECT z.id, z.province_id, a.name
FROM public.zones z
CROSS JOIN (VALUES
  ('Palermo'), ('Belgrano'), ('Recoleta'), ('Villa Urquiza'),
  ('Caballito'), ('Flores'), ('Once'), ('San Telmo'), ('Puerto Madero')
) AS a(name)
WHERE z.name = 'CABA'
  AND z.province_id = (SELECT id FROM public.provinces WHERE code = 'BA')
  AND NOT EXISTS (
    SELECT 1 FROM public.areas existing
    WHERE existing.zone_id = z.id AND existing.name = a.name
  );

-- Zona Sur (GBA)
INSERT INTO public.areas (zone_id, province_id, name)
SELECT z.id, z.province_id, a.name
FROM public.zones z
CROSS JOIN (VALUES
  ('Quilmes'), ('Avellaneda'), ('Lanús'), ('Lomas de Zamora'),
  ('Banfield'), ('Temperley')
) AS a(name)
WHERE z.name = 'Zona Sur (GBA)'
  AND z.province_id = (SELECT id FROM public.provinces WHERE code = 'BA')
  AND NOT EXISTS (
    SELECT 1 FROM public.areas existing
    WHERE existing.zone_id = z.id AND existing.name = a.name
  );

-- Zona Oeste (GBA)
INSERT INTO public.areas (zone_id, province_id, name)
SELECT z.id, z.province_id, a.name
FROM public.zones z
CROSS JOIN (VALUES
  ('Morón'), ('Haedo'), ('Castelar'), ('Ramos Mejía'), ('Ituzaingó')
) AS a(name)
WHERE z.name = 'Zona Oeste (GBA)'
  AND z.province_id = (SELECT id FROM public.provinces WHERE code = 'BA')
  AND NOT EXISTS (
    SELECT 1 FROM public.areas existing
    WHERE existing.zone_id = z.id AND existing.name = a.name
  );
