import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeRarity }   from "@/lib/sync/normalizeRarity";

// ─── API TCG (apitcg.com) — Dragon Ball Super: Fusion World ──────────────────
//
// Requires an API key: sign up at https://apitcg.com/platform, then set
// APITCG_API_KEY in the environment. Sent as the `x-api-key` header.
//
// Endpoint: GET https://api.apitcg.com/api/products?tcg=dragon-ball-super-fusion-world&type=card
// (note: the real API lives on the api.apitcg.com subdomain — www.apitcg.com is
// just the marketing/docs site and does not serve this route)
// Response envelope: { success, data: Product[], total }
//
// Products carry a fixed set of fields (name, images, set, code…) plus a
// free-form `attributes` map whose keys vary per game (documented in
// openapi.json at docs.apitcg.com — confirmed "Rarity" and "Color" for this
// game). Attribute lookup still falls back across a couple of casing
// variants and returns null rather than throwing if a key is ever renamed.

interface ApiTcgProduct {
  _id:        string | number;
  name:       string;
  code?:      string;
  cardNumber?: string;
  images?:    { small?: string; medium?: string; large?: string }[];
  set?:       { _id?: string; name?: string; code?: string } | string;
  attributes?: Record<string, string>;
  updatedAt?: string;
}

interface ApiTcgResponse {
  success: boolean;
  data:    ApiTcgProduct[];
  total:   number;
  error?:  string;
}

// ─── Upsert batch shape ───────────────────────────────────────────────────────

interface CardRow {
  external_id: string;
  name:        string;
  set_name:    string;
  set_code:    string;
  card_number: string | null;
  rarity:      string | null;
  color:       string | null;
  image_url:   string | null;
  game:        "dbz";
  lang:        string;
  updated_at:  string;
}

function getAttr(attrs: Record<string, string> | undefined, ...keys: string[]): string | null {
  if (!attrs) return null;
  for (const key of keys) {
    if (attrs[key]) return attrs[key];
  }
  // Case-insensitive fallback
  const lowerKeys = keys.map((k) => k.toLowerCase());
  for (const [k, v] of Object.entries(attrs)) {
    if (lowerKeys.includes(k.toLowerCase()) && v) return v;
  }
  return null;
}

function toCardRow(p: ApiTcgProduct): CardRow {
  const setObj    = typeof p.set === "object" ? p.set : null;
  const setName   = setObj?.name ?? (typeof p.set === "string" ? p.set : "");
  const setCode   = (setObj?.code ?? setObj?._id ?? "").toString().toUpperCase();
  const rawRarity = getAttr(p.attributes, "Rarity", "rarity");
  const color     = getAttr(p.attributes, "Color", "color");

  return {
    external_id: p.code ?? String(p._id),
    name:        p.name,
    set_name:    setName,
    set_code:    setCode,
    card_number: p.cardNumber ?? p.code ?? null,
    rarity:      normalizeRarity(rawRarity),
    color,
    image_url:   p.images?.[0]?.large ?? p.images?.[0]?.medium ?? p.images?.[0]?.small ?? null,
    game:        "dbz",
    lang:        "en",
    updated_at:  new Date().toISOString(),
  };
}

async function fetchPage(apiKey: string, page: number, limit: number): Promise<ApiTcgResponse> {
  const url = new URL("https://api.apitcg.com/api/products");
  url.searchParams.set("tcg",   "dragon-ball-super-fusion-world");
  url.searchParams.set("type",  "card");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("page",  String(page));

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", "x-api-key": apiKey },
    signal:  AbortSignal.timeout(30_000),
  });

  const json = (await res.json()) as ApiTcgResponse;
  if (!res.ok || json.success === false) {
    throw new Error(json.error ?? `API TCG fetch failed: HTTP ${res.status}`);
  }
  return json;
}

// ─── Main sync function ───────────────────────────────────────────────────────

export interface ApiTcgSyncResult {
  total:    number;
  inserted: number;
  skipped:  number;
  errors:   number;
  duration: number;
}

export async function fetchAndSyncDBZ(): Promise<ApiTcgSyncResult> {
  const startTime = Date.now();
  const apiKey    = process.env.APITCG_API_KEY;

  if (!apiKey) {
    throw new Error(
      "APITCG_API_KEY no está configurada. Registrate en https://apitcg.com/platform y agregá la clave a las variables de entorno.",
    );
  }

  const supabase = createAdminClient();
  const LIMIT     = 100;

  // ── Step 1: paginate through all Dragon Ball cards ──────────────────────────
  console.log("[apitcg/dbz] Fetching Dragon Ball Super: Fusion World cards…");

  const allProducts: ApiTcgProduct[] = [];
  let page  = 1;
  let total = Infinity;

  while (allProducts.length < total) {
    const json = await fetchPage(apiKey, page, LIMIT);
    total = json.total;
    allProducts.push(...json.data);
    console.log(`[apitcg/dbz] Page ${page}: ${json.data.length} cards (${allProducts.length}/${total} total).`);
    if (json.data.length === 0) break; // safety against infinite loop
    page++;
  }

  console.log(`[apitcg/dbz] Fetched ${allProducts.length.toLocaleString()} cards total.`);

  // ── Step 2: dedup + validate ─────────────────────────────────────────────────
  const seenIds = new Set<string>();
  const processed: ApiTcgProduct[] = [];
  let skipped = 0;

  for (const p of allProducts) {
    if (!p.name || (!p.code && p._id == null)) { skipped++; continue; }
    const id = p.code ?? String(p._id);
    if (seenIds.has(id)) { skipped++; continue; }
    seenIds.add(id);
    processed.push(p);
  }

  console.log(`[apitcg/dbz] ${processed.length.toLocaleString()} unique cards to upsert (${skipped} skipped).`);

  // ── Step 3: batch upsert ─────────────────────────────────────────────────────
  const BATCH_SIZE = 500;
  let inserted = 0;
  let errors   = 0;

  for (let i = 0; i < processed.length; i += BATCH_SIZE) {
    const batch = processed.slice(i, i + BATCH_SIZE).map(toCardRow);

    const { error } = await supabase
      .from("cards")
      .upsert(batch, { onConflict: "game,external_id", ignoreDuplicates: false });

    if (error) {
      console.error(`[apitcg/dbz] Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  const duration = (Date.now() - startTime) / 1000;
  const result: ApiTcgSyncResult = {
    total:    processed.length,
    inserted,
    skipped,
    errors,
    duration,
  };

  console.log(
    `[apitcg/dbz] Done in ${duration.toFixed(1)}s — ${inserted} upserted, ${skipped} skipped, ${errors} errors.`,
  );

  return result;
}
