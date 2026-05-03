-- =============================================================================
-- Singles.ar — Complete Supabase Database Schema
-- Run this on a fresh Supabase project to create the entire database.
-- =============================================================================

-- ─── Extensions ───────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- fast ILIKE search on card names


-- =============================================================================
-- TABLES
-- =============================================================================

-- ─── Profiles (extends auth.users) ───────────────────────────────────────────
-- Public nickname is `username`. Email is denormalized here for admin queries
-- but is never returned by public-facing API endpoints.
-- Sensitive MP tokens stored here; only accessible via service role.

CREATE TABLE IF NOT EXISTS public.profiles (
  id                        uuid        PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  internal_id               text        UNIQUE NOT NULL,           -- e.g. usr_k9x2m4, never shown publicly
  username                  text        UNIQUE NOT NULL,
  email                     text,                                  -- denormalized from auth.users — admin use only
  avatar_url                text,

  -- MercadoPago OAuth — stored server-side, never exposed to client
  mercadopago_access_token  text,
  mercadopago_refresh_token text,
  mercadopago_user_id       text,
  mercadopago_connected_at  timestamptz,

  -- Reputation & activity counters
  reputation_score          numeric     DEFAULT 0    NOT NULL,     -- 0–100; recalculated by RPC
  total_sales               integer     DEFAULT 0    NOT NULL,
  total_purchases           integer     DEFAULT 0    NOT NULL,
  cancel_count              integer     DEFAULT 0    NOT NULL,     -- cancellations within cancel_window_days
  cancel_count_reset_at     timestamptz,
  is_reliable_buyer         boolean     DEFAULT true NOT NULL,

  -- Admin moderation
  suspended_at              timestamptz,                           -- null = not suspended
  suspend_reason            text,

  -- Username change cooldown
  username_last_changed_at  timestamptz,

  created_at                timestamptz DEFAULT now() NOT NULL
);

COMMENT ON COLUMN public.profiles.email           IS 'Denormalized from auth.users. Admin-only — never expose to public API.';
COMMENT ON COLUMN public.profiles.internal_id     IS 'Internal identifier (usr_xxxxx). Never shown to other users.';
COMMENT ON COLUMN public.profiles.reputation_score IS '0–100 scale. Recalculated by recalculate_reputation() RPC.';


-- ─── Cards ────────────────────────────────────────────────────────────────────
-- Synced from Scryfall (Magic), PokémonTCG API, or created manually by admins.

CREATE TABLE IF NOT EXISTS public.cards (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id         text        NOT NULL,                   -- ID from source API (unique per game)
  game                text        NOT NULL CHECK (game IN ('magic', 'pokemon', 'onepiece')),
  name                text        NOT NULL,
  set_name            text,
  set_code            text,
  card_number         text,
  rarity              text,
  color               text,                                   -- card color (One Piece: Red/Green/Blue/…; future: Magic/Pokémon)
  image_url           text,                                   -- canonical image from source API
  image_override_url  text,                                   -- admin can override the image
  tcgplayer_id        text,
  scryfall_id         text,
  lang                text        NOT NULL DEFAULT 'en',
  created_at          timestamptz DEFAULT now() NOT NULL,
  updated_at          timestamptz DEFAULT now() NOT NULL,

  UNIQUE (game, external_id)
);

CREATE INDEX IF NOT EXISTS idx_cards_name_trgm ON public.cards USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cards_game      ON public.cards (game);
CREATE INDEX IF NOT EXISTS idx_cards_set_code  ON public.cards (set_code);


-- ─── Listings ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.listings (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id      uuid        NOT NULL REFERENCES public.cards      ON DELETE RESTRICT,
  seller_id    uuid        NOT NULL REFERENCES public.profiles   ON DELETE CASCADE,
  listing_type text        NOT NULL CHECK (listing_type IN ('sale', 'trade')),
  price        numeric     CHECK (price > 0),                -- required when listing_type = 'sale'
  currency     text        NOT NULL DEFAULT 'ARS',
  condition    text        NOT NULL CHECK (condition IN ('NM', 'LP', 'MP', 'HP', 'DMG')),
  quantity     integer     NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  status       text        NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'reserved', 'sold', 'cancelled')),
  notes        text,                                          -- visible to buyers
  trade_for        text,                                      -- what seller wants in a trade
  price_diff       numeric,                                   -- trade + cash: cash difference
  delivery_stores  text[],                                    -- store meetup points selected by the seller
  created_at   timestamptz DEFAULT now() NOT NULL,
  updated_at   timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT listing_sale_requires_price
    CHECK (listing_type <> 'sale' OR price IS NOT NULL),
  CONSTRAINT listing_trade_requires_trade_for
    CHECK (listing_type <> 'trade' OR trade_for IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_listings_card_status   ON public.listings (card_id, status);
CREATE INDEX IF NOT EXISTS idx_listings_seller        ON public.listings (seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_status        ON public.listings (status);


-- ─── Buy Orders ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.buy_orders (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id     uuid        NOT NULL REFERENCES public.cards    ON DELETE RESTRICT,
  buyer_id    uuid        NOT NULL REFERENCES public.profiles ON DELETE CASCADE,
  price       numeric     NOT NULL CHECK (price > 0),         -- maximum price buyer will pay
  currency    text        NOT NULL DEFAULT 'ARS',
  condition   text        CHECK (condition IN ('NM', 'LP', 'MP', 'HP', 'DMG')),
  quantity    integer     NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  status      text        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'reserved', 'filled', 'cancelled', 'expired')),
  notes       text,
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  accepted_by uuid        REFERENCES public.profiles,         -- seller who accepted
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_buy_orders_card_status ON public.buy_orders (card_id, status);
CREATE INDEX IF NOT EXISTS idx_buy_orders_buyer       ON public.buy_orders (buyer_id);
CREATE INDEX IF NOT EXISTS idx_buy_orders_expires_at  ON public.buy_orders (expires_at) WHERE status = 'active';


-- ─── Transactions ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.transactions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id          uuid        REFERENCES public.listings   ON DELETE SET NULL,
  buy_order_id        uuid        REFERENCES public.buy_orders ON DELETE SET NULL,
  buyer_id            uuid        NOT NULL REFERENCES public.profiles ON DELETE RESTRICT,
  seller_id           uuid        NOT NULL REFERENCES public.profiles ON DELETE RESTRICT,
  card_id             uuid        NOT NULL REFERENCES public.cards    ON DELETE RESTRICT,

  -- Financials (snapshot at transaction creation time)
  price               numeric     NOT NULL CHECK (price > 0),
  currency            text        NOT NULL DEFAULT 'ARS',
  platform_fee        numeric,                                 -- commission kept by Singles.ar
  mp_fee              numeric,                                 -- MercadoPago processing fee
  seller_net          numeric,                                 -- price - platform_fee - mp_fee

  -- MercadoPago
  mp_preference_id    text,
  mp_payment_id       text,

  -- State machine
  status              text        NOT NULL DEFAULT 'in_chat'
                      CHECK (status IN (
                        'in_chat',          -- chat started, no payment yet
                        'payment_pending',  -- preference created, waiting for MP
                        'paid',             -- MP confirmed payment
                        'completed',        -- both parties marked complete
                        'disputed',         -- dispute opened
                        'cancelled'         -- cancelled by either party
                      )),

  -- Chat read tracking
  buyer_last_read_at  timestamptz,
  seller_last_read_at timestamptz,

  -- Delivery confirmation (both required to complete)
  buyer_confirmed_delivery_at  timestamptz,
  seller_confirmed_delivery_at timestamptz,

  created_at          timestamptz DEFAULT now() NOT NULL,
  updated_at          timestamptz DEFAULT now() NOT NULL,
  completed_at        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_transactions_buyer   ON public.transactions (buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller  ON public.transactions (seller_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status  ON public.transactions (status);
CREATE INDEX IF NOT EXISTS idx_transactions_updated ON public.transactions (updated_at DESC);


-- ─── Chat Messages ────────────────────────────────────────────────────────────
-- Named chat_messages to distinguish from any future notification/email messages.

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid        NOT NULL REFERENCES public.transactions ON DELETE CASCADE,
  sender_id      uuid        REFERENCES public.profiles ON DELETE SET NULL, -- null = system message
  body           text,
  image_url      text,
  message_type   text        NOT NULL DEFAULT 'text'
                             CHECK (message_type IN ('text', 'image', 'system')),
  created_at     timestamptz DEFAULT now() NOT NULL,

  -- Either body or image_url must be set (unless it's a system message)
  CONSTRAINT chat_message_has_content
    CHECK (message_type = 'system' OR body IS NOT NULL OR image_url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_transaction ON public.chat_messages (transaction_id, created_at);


-- ─── Reviews ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reviews (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid    NOT NULL REFERENCES public.transactions ON DELETE CASCADE,
  reviewer_id    uuid    NOT NULL REFERENCES public.profiles     ON DELETE CASCADE,
  reviewee_id    uuid    NOT NULL REFERENCES public.profiles     ON DELETE CASCADE,
  rating         integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment        text    CHECK (length(comment) <= 500),
  created_at     timestamptz DEFAULT now() NOT NULL,

  UNIQUE (transaction_id, reviewer_id),   -- one review per party per transaction
  CHECK (reviewer_id <> reviewee_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON public.reviews (reviewee_id);


-- ─── Wishlist ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.wishlist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles ON DELETE CASCADE,
  card_id    uuid NOT NULL REFERENCES public.cards    ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,

  UNIQUE (user_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_user ON public.wishlist (user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_card ON public.wishlist (card_id);


-- ─── Price History ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.price_history (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id     uuid    NOT NULL REFERENCES public.cards ON DELETE CASCADE,
  price_usd   numeric CHECK (price_usd >= 0),
  price_ars   numeric CHECK (price_ars >= 0),
  source      text    NOT NULL DEFAULT 'listing' CHECK (source IN ('listing')),
  recorded_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_price_history_card_date ON public.price_history (card_id, recorded_at DESC);


-- ─── Admin Settings ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_settings (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);


-- =============================================================================
-- SEED DATA — Admin Settings defaults
-- =============================================================================

INSERT INTO public.admin_settings (key, value) VALUES
  ('price_tolerance_percent',    '20'),   -- max % deviation from reference price
  ('platform_commission_percent','5'),    -- % of sale price kept by Singles.ar
  ('buy_order_default_days',     '30'),   -- default expiry for new buy orders
  ('max_cancels_before_flag',    '3'),    -- cancellations before is_reliable_buyer = false
  ('cancel_window_days',         '30'),   -- rolling window for cancel_count
  ('usd_to_ars_rate',            '1000'), -- informational; updated by cron
  ('mp_fee_percent',             '5.99')  -- MercadoPago fee (informational)
ON CONFLICT (key) DO NOTHING;


-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- ─── Auto-update updated_at ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_buy_orders_updated_at
  BEFORE UPDATE ON public.buy_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_cards_updated_at
  BEFORE UPDATE ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── Auto-create profile on signup ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  base_username text;
  final_username text;
  suffix        text;
BEGIN
  -- Derive a username from email local part, strip non-alphanumeric
  base_username  := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9_]', '', 'g'));
  base_username  := left(base_username, 20);
  final_username := base_username;

  -- Ensure uniqueness by appending a random suffix if needed
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    suffix         := substr(replace(gen_random_uuid()::text, '-', ''), 1, 4);
    final_username := base_username || '_' || suffix;
  END LOOP;

  INSERT INTO public.profiles (id, email, username, internal_id)
  VALUES (
    NEW.id,
    NEW.email,
    final_username,
    'usr_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─── Recalculate reputation score ────────────────────────────────────────────
-- Called after every new review. Updates reviewee's reputation_score (0–100).

CREATE OR REPLACE FUNCTION public.recalculate_reputation(target_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles
  SET reputation_score = COALESCE(
    (SELECT ROUND(AVG(rating) * 20) FROM public.reviews WHERE reviewee_id = target_id),
    0
  )
  WHERE id = target_id;
END;
$$;


-- ─── Increment total_sales / total_purchases ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_total_sales(seller_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles SET total_sales = total_sales + 1 WHERE id = seller_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_total_purchases(buyer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles SET total_purchases = total_purchases + 1 WHERE id = buyer_id;
END;
$$;


-- ─── Check and flag unreliable buyers ────────────────────────────────────────
-- Called after a buy order cancellation. Flags buyer if cancel_count exceeds threshold.

CREATE OR REPLACE FUNCTION public.check_buyer_reliability(p_buyer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  max_cancels   integer;
  window_days   integer;
  recent_count  integer;
BEGIN
  SELECT value::integer INTO max_cancels FROM public.admin_settings WHERE key = 'max_cancels_before_flag';
  SELECT value::integer INTO window_days  FROM public.admin_settings WHERE key = 'cancel_window_days';

  max_cancels := COALESCE(max_cancels, 3);
  window_days := COALESCE(window_days, 30);

  SELECT COUNT(*) INTO recent_count
  FROM public.buy_orders
  WHERE buyer_id = p_buyer_id
    AND status    = 'cancelled'
    AND updated_at >= now() - (window_days || ' days')::interval;

  UPDATE public.profiles
  SET
    cancel_count          = recent_count,
    cancel_count_reset_at = CASE WHEN recent_count = 0 THEN now() ELSE cancel_count_reset_at END,
    is_reliable_buyer     = (recent_count < max_cancels)
  WHERE id = p_buyer_id;
END;
$$;


-- ─── Filter options RPCs ──────────────────────────────────────────────────────
-- Used by homepage and sell flow to populate filter dropdowns.
-- RPCs bypass PostgREST db-max-rows cap; color fn splits "Blue/Yellow" → individual values.

CREATE OR REPLACE FUNCTION public.get_filter_sets(p_game text)
RETURNS TABLE(set_code text, set_name text)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT DISTINCT ON (c.set_code) c.set_code, c.set_name
  FROM   public.cards c
  WHERE  c.game     = p_game
    AND  c.set_code IS NOT NULL
  ORDER  BY c.set_code;
$$;

CREATE OR REPLACE FUNCTION public.get_filter_rarities(p_game text)
RETURNS TABLE(rarity text)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT DISTINCT c.rarity
  FROM   public.cards c
  WHERE  c.game   = p_game
    AND  c.rarity IS NOT NULL
  ORDER  BY c.rarity;
$$;

CREATE OR REPLACE FUNCTION public.get_filter_colors(p_game text)
RETURNS TABLE(color text)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT DISTINCT trim(part) AS color
  FROM   public.cards c,
         unnest(string_to_array(c.color, '/')) AS part
  WHERE  c.game  = p_game
    AND  c.color IS NOT NULL
    AND  trim(part) <> ''
  ORDER  BY color;
$$;


-- =============================================================================
-- VIEWS
-- =============================================================================

-- ─── cards_with_listing_stats ─────────────────────────────────────────────────
-- Used on homepage and search: cards enriched with active listing counts.

CREATE OR REPLACE VIEW public.cards_with_listing_stats AS
SELECT
  c.id,
  c.external_id,
  c.game,
  c.name,
  c.set_name,
  c.set_code,
  c.card_number,
  c.rarity,
  COALESCE(c.image_override_url, c.image_url) AS image_url,  -- override takes precedence
  c.image_override_url,
  c.tcgplayer_id,
  c.scryfall_id,
  c.lang,
  c.created_at,
  c.updated_at,
  c.color,
  COALESCE(s.listing_count, 0)                AS listing_count,
  s.lowest_price,
  s.latest_listing
FROM public.cards c
LEFT JOIN (
  SELECT
    card_id,
    COUNT(*)::integer       AS listing_count,
    MIN(price)              AS lowest_price,
    MAX(created_at)         AS latest_listing
  FROM public.listings
  WHERE status = 'active'
    AND listing_type = 'sale'
  GROUP BY card_id
) s ON c.id = s.card_id;


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buy_orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;


-- ─── profiles ─────────────────────────────────────────────────────────────────
-- Public read (app is responsible for selecting only safe columns).
-- Sensitive columns (email, tokens) are never returned by public API routes.

CREATE POLICY "profiles_public_read"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "profiles_owner_update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT is handled by the handle_new_user trigger (SECURITY DEFINER),
-- so regular users cannot INSERT directly.


-- ─── cards ────────────────────────────────────────────────────────────────────

CREATE POLICY "cards_public_read"
  ON public.cards FOR SELECT
  USING (true);

-- INSERT/UPDATE/DELETE only via service role (admin panel, sync crons).
-- No user-facing policy needed; service role bypasses RLS.


-- ─── listings ─────────────────────────────────────────────────────────────────

CREATE POLICY "listings_public_read"
  ON public.listings FOR SELECT
  USING (true);

CREATE POLICY "listings_owner_insert"
  ON public.listings FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "listings_owner_update"
  ON public.listings FOR UPDATE
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "listings_owner_delete"
  ON public.listings FOR DELETE
  USING (auth.uid() = seller_id);


-- ─── buy_orders ───────────────────────────────────────────────────────────────

CREATE POLICY "buy_orders_public_read"
  ON public.buy_orders FOR SELECT
  USING (true);

CREATE POLICY "buy_orders_owner_insert"
  ON public.buy_orders FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "buy_orders_owner_update"
  ON public.buy_orders FOR UPDATE
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);


-- ─── transactions ─────────────────────────────────────────────────────────────
-- Only buyer and seller can see their own transactions.

CREATE POLICY "transactions_participant_read"
  ON public.transactions FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "transactions_participant_update"
  ON public.transactions FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- INSERT is done server-side via service role (API routes).


-- ─── chat_messages ────────────────────────────────────────────────────────────
-- Only transaction participants can read or write messages.

CREATE POLICY "chat_messages_participant_read"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_id
        AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
    )
  );

CREATE POLICY "chat_messages_participant_insert"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_id
        AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
        AND t.status NOT IN ('cancelled', 'completed')
    )
  );


-- ─── reviews ──────────────────────────────────────────────────────────────────

CREATE POLICY "reviews_public_read"
  ON public.reviews FOR SELECT
  USING (true);

CREATE POLICY "reviews_participant_insert"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_id
        AND (t.buyer_id = auth.uid() OR t.seller_id = auth.uid())
        AND t.status = 'completed'
    )
  );


-- ─── wishlist ─────────────────────────────────────────────────────────────────

CREATE POLICY "wishlist_owner_read"
  ON public.wishlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "wishlist_owner_insert"
  ON public.wishlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wishlist_owner_delete"
  ON public.wishlist FOR DELETE
  USING (auth.uid() = user_id);


-- ─── price_history ────────────────────────────────────────────────────────────

CREATE POLICY "price_history_public_read"
  ON public.price_history FOR SELECT
  USING (true);

-- INSERT only via service role (cron jobs, webhook handler).


-- ─── admin_settings ───────────────────────────────────────────────────────────

CREATE POLICY "admin_settings_public_read"
  ON public.admin_settings FOR SELECT
  USING (true);

-- UPDATE only via service role (admin panel API routes).


-- =============================================================================
-- REALTIME
-- =============================================================================
-- Enable Realtime for chat_messages so the ChatRoom component receives
-- live message inserts without polling.

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;


-- =============================================================================
-- STORAGE
-- =============================================================================
-- Run these in the Supabase Dashboard → Storage, or via the Storage API.
-- Included here for documentation; cannot be executed as plain SQL.
--
-- 1. Create bucket:  chat-images  (public = true)
-- 2. Add policy — allow authenticated users to INSERT into chat-images:
--      (storage.foldername(name))[1] = auth.uid()::text
-- 3. Public read is automatic for public buckets.


-- =============================================================================
-- NOTES FOR DEPLOYMENT
-- =============================================================================
-- 1. Set ADMIN_USER_IDS env var (comma-separated Supabase user UUIDs).
-- 2. Set MP_WEBHOOK_SECRET from MercadoPago Dashboard → Webhooks.
-- 3. Set CRON_SECRET to a random string for cron endpoint protection.
-- 4. The cards_with_listing_stats view is queried directly by the homepage;
--    no additional setup needed.
-- 5. Call recalculate_reputation(uuid) after every INSERT into reviews.
-- 6. Call check_buyer_reliability(uuid) after every buy order cancellation.
