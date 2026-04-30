// =============================================================================
// Singles.ar — Database Types
// Mirrors lib/supabase/schema.sql exactly. Keep in sync when schema changes.
// =============================================================================

// =============================================================================
// ENUMS
// =============================================================================

export type Game            = "magic" | "pokemon" | "onepiece";
export type Condition       = "NM" | "LP" | "MP" | "HP" | "DMG";
export type ListingType     = "sale" | "trade";
export type ListingStatus   = "active" | "reserved" | "sold" | "cancelled";
export type BuyOrderStatus  = "active" | "reserved" | "filled" | "cancelled" | "expired";
export type TransactionStatus =
  | "in_chat"          // chat opened, no payment yet
  | "payment_pending"  // MP preference created, awaiting payment
  | "paid"             // MercadoPago confirmed payment
  | "completed"        // both parties confirmed delivery
  | "disputed"         // dispute opened
  | "cancelled";
export type PriceSource     = "tcgplayer" | "scryfall" | "listing";
export type ChatMessageType = "text" | "image" | "system";


// =============================================================================
// TABLE ROWS
// =============================================================================

// ─── Profiles ─────────────────────────────────────────────────────────────────

/**
 * Full profile row — includes sensitive fields (email, MP tokens).
 * Use PublicProfile for any client-facing or public API response.
 */
export interface Profile {
  id:                       string;
  internal_id:              string;         // usr_xxxxxxxx — internal only, never shown to others
  username:                 string;
  email:                    string;         // ADMIN ONLY — never expose in public API responses

  // MercadoPago — server-side only, never sent to browser
  mercadopago_access_token:  string | null;
  mercadopago_refresh_token: string | null;
  mercadopago_user_id:       string | null;
  mercadopago_connected_at:  string | null;

  // Reputation & counters
  reputation_score:         number;         // 0–100; recalculated by recalculate_reputation()
  total_sales:              number;
  total_purchases:          number;
  cancel_count:             number;
  cancel_count_reset_at:    string | null;
  is_reliable_buyer:        boolean;

  // Admin moderation
  suspended_at:             string | null;  // null = active account
  suspend_reason:           string | null;

  // Username cooldown
  username_last_changed_at: string | null;

  avatar_url:               string | null;
  created_at:               string;
}

/**
 * Safe subset of Profile for public-facing API responses.
 * Contains zero PII and no sensitive tokens.
 */
export type PublicProfile = Pick<
  Profile,
  | "id"
  | "username"
  | "avatar_url"
  | "reputation_score"
  | "total_sales"
  | "is_reliable_buyer"
>;


// ─── Cards ────────────────────────────────────────────────────────────────────

export interface Card {
  id:                 string;
  external_id:        string;
  game:               Game;
  name:               string;
  set_name:           string | null;
  set_code:           string | null;
  card_number:        string | null;
  rarity:             string | null;
  image_url:          string | null;
  image_override_url: string | null;  // admin-set override; takes precedence over image_url
  tcgplayer_id:       string | null;
  scryfall_id:        string | null;
  lang:               string;
  created_at:         string;
  updated_at:         string;
}


// ─── Listings ─────────────────────────────────────────────────────────────────

export interface Listing {
  id:           string;
  card_id:      string;
  seller_id:    string;
  listing_type: ListingType;
  price:        number | null;   // required when listing_type = 'sale'
  currency:     string;
  condition:    Condition;
  quantity:     number;
  status:       ListingStatus;
  notes:        string | null;
  trade_for:    string | null;   // what seller wants in a trade
  price_diff:   number | null;   // optional cash component in a trade
  created_at:   string;
  updated_at:   string;
}

export interface ListingWithCard extends Listing {
  cards: Pick<Card, "id" | "name" | "set_name" | "image_url" | "game">;
}

export interface ListingWithSeller extends Listing {
  profiles: PublicProfile;
}

export interface ListingWithCardAndSeller extends Listing {
  cards:    Pick<Card, "id" | "name" | "set_name" | "image_url" | "game">;
  profiles: PublicProfile;
}


// ─── Buy Orders ───────────────────────────────────────────────────────────────

export interface BuyOrder {
  id:          string;
  card_id:     string;
  buyer_id:    string;
  price:       number;          // maximum price buyer will pay
  currency:    string;
  condition:   Condition | null;
  quantity:    number;
  status:      BuyOrderStatus;
  notes:       string | null;
  expires_at:  string;
  accepted_by: string | null;   // profile id of seller who accepted
  created_at:  string;
  updated_at:  string;
}

export interface BuyOrderWithBuyer extends BuyOrder {
  profiles: PublicProfile;
}

export interface BuyOrderWithCard extends BuyOrder {
  cards: Pick<Card, "id" | "name" | "image_url" | "game">;
}


// ─── Transactions ─────────────────────────────────────────────────────────────

export interface Transaction {
  id:               string;
  listing_id:       string | null;
  buy_order_id:     string | null;
  buyer_id:         string;
  seller_id:        string;
  card_id:          string;

  // Financial snapshot — recorded at creation, immutable after
  price:            number;
  currency:         string;
  platform_fee:     number | null;  // Singles.ar commission
  mp_fee:           number | null;  // MercadoPago processing fee
  seller_net:       number | null;  // price - platform_fee - mp_fee

  // MercadoPago references
  mp_preference_id: string | null;
  mp_payment_id:    string | null;

  // State
  status:           TransactionStatus;

  // Chat read tracking for unread-message indicators
  buyer_last_read_at:  string | null;
  seller_last_read_at: string | null;

  created_at:   string;
  updated_at:   string;
  completed_at: string | null;
}

export interface TransactionWithDetails extends Transaction {
  card:   Pick<Card, "id" | "name" | "image_url" | "set_name">;
  buyer:  Pick<PublicProfile, "id" | "username" | "avatar_url">;
  seller: Pick<PublicProfile, "id" | "username" | "avatar_url">;
}


// ─── Chat Messages ────────────────────────────────────────────────────────────

export interface ChatMessage {
  id:             string;
  transaction_id: string;
  sender_id:      string | null;   // null = system-generated message
  body:           string | null;
  image_url:      string | null;
  message_type:   ChatMessageType;
  created_at:     string;
}

export interface ChatMessageWithSender extends ChatMessage {
  sender: Pick<PublicProfile, "id" | "username" | "avatar_url"> | null;
}


// ─── Reviews ──────────────────────────────────────────────────────────────────

export interface Review {
  id:             string;
  transaction_id: string;
  reviewer_id:    string;
  reviewee_id:    string;
  rating:         number;   // 1–5
  comment:        string | null;
  created_at:     string;
}

export interface ReviewWithReviewer extends Review {
  reviewer: Pick<PublicProfile, "id" | "username" | "avatar_url">;
}


// ─── Wishlist ─────────────────────────────────────────────────────────────────

export interface WishlistItem {
  id:         string;
  user_id:    string;
  card_id:    string;
  created_at: string;
}

export interface WishlistWithCard extends WishlistItem {
  cards: Pick<Card, "id" | "name" | "image_url" | "set_name" | "game">;
}


// ─── Price History ────────────────────────────────────────────────────────────

export interface PriceHistory {
  id:          string;
  card_id:     string;
  price_usd:   number | null;
  price_ars:   number | null;
  source:      PriceSource;
  recorded_at: string;
}


// ─── Admin Settings ───────────────────────────────────────────────────────────

/**
 * Typed map of all admin_settings keys.
 * The table stores key/value pairs as text; parse with parseFloat() when reading.
 */
export interface AdminSettings {
  price_tolerance_percent:     number;  // max % deviation from reference price
  platform_commission_percent: number;  // % of sale price kept by Singles.ar
  buy_order_default_days:      number;  // 15 | 30 | 60
  max_cancels_before_flag:     number;  // cancellations before is_reliable_buyer = false
  cancel_window_days:          number;  // rolling window for cancel_count
  usd_to_ars_rate:             number;  // informational exchange rate
  mp_fee_percent:              number;  // MercadoPago fee (informational)
}

export type AdminSettingKey = keyof AdminSettings;


// =============================================================================
// VIEWS
// =============================================================================

/**
 * cards_with_listing_stats — card row enriched with active-listing aggregate data.
 * image_url is already resolved: image_override_url ?? image_url.
 */
export interface CardWithListingStats
  extends Omit<Card, "image_url"> {
  image_url:      string | null;   // resolved: override ?? original
  listing_count:  number;
  lowest_price:   number | null;
  latest_listing: string | null;
}


// =============================================================================
// COMPOSITE / JOINED TYPES
// =============================================================================

export interface ChatPreview {
  transaction: TransactionWithDetails;
  lastMessage: ChatMessage | null;
  unread:      boolean;
}

/** Wishlist row enriched with listing stats for the wishlist tab UI. */
export interface WishlistRowWithStats extends WishlistItem {
  cards:         Pick<Card, "id" | "name" | "image_url" | "set_name" | "game">;
  listing_count: number;
  lowest_price:  number | null;
}


// =============================================================================
// API TYPES
// =============================================================================

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_BODY"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "DB_ERROR"
  | "INTERNAL_ERROR"
  | "RATE_LIMITED";

export interface ApiResponse<T = unknown> {
  data?:  T;
  error?: string;
  code?:  ApiErrorCode;
}

export interface UsernameCheckResult {
  available: boolean;
}


// =============================================================================
// INPUT TYPES (for API route bodies)
// =============================================================================

export interface CreateListingInput {
  card_id:      string;
  listing_type: ListingType;
  price:        number | null;
  condition:    Condition;
  quantity:     number;
  notes:        string | null;
  trade_for:    string | null;
  price_diff:   number | null;
}

export interface CreateBuyOrderInput {
  card_id:       string;
  price:         number;
  condition?:    Condition;
  quantity?:     number;
  notes?:        string;
  duration_days: 15 | 30 | 60;
}


// =============================================================================
// SEARCH
// =============================================================================

/**
 * Lightweight card shape returned by /api/cards/search.
 * Used in autocomplete and card picker components.
 */
export interface CardSearchResult {
  id:          string;
  name:        string;
  set_name:    string | null;
  set_code:    string | null;
  card_number: string | null;
  rarity:      string | null;
  image_url:   string | null;
  game:        Game;
}
