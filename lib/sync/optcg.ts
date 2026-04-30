import { createAdminClient } from "@/lib/supabase/admin";

// ─── OPTCG API types ──────────────────────────────────────────────────────────

interface OPTCGCard {
  card_set_id:  string;
  card_name:    string;
  set_name:     string;
  set_id:       string;
  rarity:       string;
  card_image:   string;
  card_type?:   string;
  card_color?:  string;
}

// ─── Upsert batch shape ───────────────────────────────────────────────────────

interface CardRow {
  external_id: string;
  name:        string;
  set_name:    string;
  set_code:    string;
  rarity:      string;
  color:       string | null;
  image_url:   string | null;
  game:        "onepiece";
  lang:        string;
  updated_at:  string;
}

function toCardRow(c: OPTCGCard): CardRow {
  return {
    external_id: c.card_set_id,
    name:        c.card_name,
    set_name:    c.set_name,
    set_code:    c.set_id,
    rarity:      c.rarity,
    color:       c.card_color || null,
    image_url:   c.card_image || null,
    game:        "onepiece",
    lang:        "en",
    updated_at:  new Date().toISOString(),
  };
}

async function fetchEndpoint(url: string): Promise<OPTCGCard[]> {
  const res = await fetch(url, {
    headers: { "Accept": "application/json" },
    signal:  AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`OPTCG fetch failed for ${url}: ${res.status}`);
  const json = await res.json();
  // API returns either an array or an object wrapping an array
  return Array.isArray(json) ? json : (json.data ?? json.cards ?? []);
}

// ─── Main sync function ───────────────────────────────────────────────────────

export interface OPTCGSyncResult {
  total:    number;
  inserted: number;
  skipped:  number;
  errors:   number;
  duration: number;
}

export async function fetchAndSyncOPTCG(): Promise<OPTCGSyncResult> {
  const startTime = Date.now();
  const supabase  = createAdminClient();
  const BASE      = "https://www.optcgapi.com/api";

  // ── Step 1: fetch all endpoints in parallel ──────────────────────────────────
  console.log("[optcg] Fetching cards from all endpoints…");

  const [setCards, stCards, promoCards] = await Promise.all([
    fetchEndpoint(`${BASE}/allSetCards/`).catch((e) => { console.error("[optcg] allSetCards error:", e.message); return [] as OPTCGCard[]; }),
    fetchEndpoint(`${BASE}/allSTCards/`).catch((e)  => { console.error("[optcg] allSTCards error:",  e.message); return [] as OPTCGCard[]; }),
    fetchEndpoint(`${BASE}/allPromoCards/`).catch((e) => { console.error("[optcg] allPromoCards error:", e.message); return [] as OPTCGCard[]; }),
  ]);

  const allCards = [...setCards, ...stCards, ...promoCards];
  console.log(`[optcg] Fetched ${allCards.length.toLocaleString()} total cards (set: ${setCards.length}, ST: ${stCards.length}, promo: ${promoCards.length}).`);

  // ── Step 2: deduplicate by card_set_id ───────────────────────────────────────
  const seen    = new Set<string>();
  const unique: OPTCGCard[] = [];
  let skipped = 0;

  for (const card of allCards) {
    if (!card.card_set_id || !card.card_name) { skipped++; continue; }
    if (seen.has(card.card_set_id)) { skipped++; continue; }
    seen.add(card.card_set_id);
    unique.push(card);
  }

  console.log(`[optcg] ${unique.length.toLocaleString()} unique cards after dedup (${skipped} skipped).`);

  // ── Step 3: batch upsert ─────────────────────────────────────────────────────
  const BATCH_SIZE = 500;
  let inserted = 0;
  let errors   = 0;

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE).map(toCardRow);

    const { error } = await supabase
      .from("cards")
      .upsert(batch, {
        onConflict:       "game,external_id",
        ignoreDuplicates: false,
      });

    if (error) {
      console.error(`[optcg] Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }

    if ((Math.floor(i / BATCH_SIZE) + 1) % 5 === 0) {
      const pct = ((i + BATCH_SIZE) / unique.length * 100).toFixed(1);
      console.log(`[optcg] Progress: ${pct}% (${i + BATCH_SIZE}/${unique.length})`);
    }
  }

  const duration = (Date.now() - startTime) / 1000;
  const result: OPTCGSyncResult = {
    total:    unique.length,
    inserted,
    skipped,
    errors,
    duration,
  };

  console.log(
    `[optcg] Done in ${duration.toFixed(1)}s — ${inserted} upserted, ${skipped} skipped, ${errors} errors.`
  );

  return result;
}
