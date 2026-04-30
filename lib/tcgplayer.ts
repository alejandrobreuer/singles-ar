import { createAdminClient } from "@/lib/supabase/admin";

// ─── TCGPlayer API types ──────────────────────────────────────────────────────

interface TCGPlayerTokenResponse {
  access_token: string;
  expires_in:   number;
  token_type:   string;
}

interface TCGPlayerPrice {
  productId:    number;
  marketPrice:  number | null;
  midPrice:     number | null;
  lowPrice:     number | null;
  highPrice:    number | null;
  subTypeName:  string;
}

interface TCGPlayerPriceResponse {
  results: TCGPlayerPrice[];
}

// ─── Module-level token cache (per process, not shared across instances) ──────

let _token:   string | null   = null;
let _tokenEx: number          = 0;   // unix ms expiry

async function getAccessToken(): Promise<string> {
  if (_token && Date.now() < _tokenEx - 60_000) return _token;

  const res = await fetch("https://api.tcgplayer.com/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "client_credentials",
      client_id:     process.env.TCGPLAYER_CLIENT_ID ?? "",
      client_secret: process.env.TCGPLAYER_CLIENT_SECRET ?? "",
    }),
  });

  if (!res.ok) throw new Error(`TCGPlayer token error: ${res.status}`);
  const data = (await res.json()) as TCGPlayerTokenResponse;

  _token   = data.access_token;
  _tokenEx = Date.now() + data.expires_in * 1000;
  return _token;
}

// ─── Price result ─────────────────────────────────────────────────────────────

export interface CardPriceResult {
  price_usd:  number | null;
  source:     "tcgplayer";
  stale:      boolean;        // true if returned from cache because API was unavailable
  recorded_at: string;
}

// ─── Main fetch function ──────────────────────────────────────────────────────

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function getCardPrice(
  cardId:      string,
  tcgplayerId: string
): Promise<CardPriceResult | null> {
  const supabase = createAdminClient();

  // ── 1. Check cache ─────────────────────────────────────────────────────────
  const { data: cached } = await supabase
    .from("price_history")
    .select("price_usd, recorded_at")
    .eq("card_id", cardId)
    .eq("source", "tcgplayer")
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const cacheAge = cached
    ? Date.now() - new Date(cached.recorded_at).getTime()
    : Infinity;

  // Cache is fresh — return it
  if (cached && cacheAge < STALE_THRESHOLD_MS) {
    return {
      price_usd:   cached.price_usd,
      source:      "tcgplayer",
      stale:       false,
      recorded_at: cached.recorded_at,
    };
  }

  // ── 2. Fetch from TCGPlayer ────────────────────────────────────────────────
  try {
    const token = await getAccessToken();

    const res = await fetch(
      `https://api.tcgplayer.com/pricing/product/${tcgplayerId}`,
      {
        headers: {
          Authorization:  `bearer ${token}`,
          "User-Agent":   "singles-ar/1.0",
        },
        // 5 second timeout to avoid hanging
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!res.ok) throw new Error(`TCGPlayer pricing error: ${res.status}`);

    const data      = (await res.json()) as TCGPlayerPriceResponse;
    // Prefer "Normal" printing median; fall back to first result
    const normal    = data.results.find((r) => r.subTypeName === "Normal");
    const priceRow  = normal ?? data.results[0];
    const price_usd = priceRow?.marketPrice ?? priceRow?.midPrice ?? null;

    // ── 3. Persist to cache ──────────────────────────────────────────────────
    const recorded_at = new Date().toISOString();
    await supabase.from("price_history").insert({
      card_id:     cardId,
      price_usd,
      price_ars:   null,   // ARS conversion handled by a separate layer
      source:      "tcgplayer",
      recorded_at,
    });

    return { price_usd, source: "tcgplayer", stale: false, recorded_at };
  } catch (err) {
    console.warn("[tcgplayer] Fetch failed, falling back to cache:", err);

    // Return stale cache rather than nothing
    if (cached) {
      return {
        price_usd:   cached.price_usd,
        source:      "tcgplayer",
        stale:       true,
        recorded_at: cached.recorded_at,
      };
    }

    return null;
  }
}
