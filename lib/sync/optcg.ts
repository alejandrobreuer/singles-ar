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
  card_number: string | null;
  rarity:      string;
  color:       string | null;
  image_url:   string | null;
  game:        "onepiece";
  lang:        string;
  updated_at:  string;
}

function toCardRow(c: OPTCGCard, externalId: string): CardRow {
  // card_number always comes from the base card_set_id (strip any _v2/_v3 suffix)
  const base       = c.card_set_id;
  const hyphenIdx  = base.indexOf("-");
  const cardNumber = hyphenIdx >= 0 ? base.slice(hyphenIdx + 1) : null;

  return {
    external_id: externalId,
    name:        c.card_name,
    set_name:    c.set_name,
    set_code:    c.set_id,
    card_number: cardNumber,
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
    fetchEndpoint(`${BASE}/allSetCards/`).catch((e)  => { console.error("[optcg] allSetCards error:",  e.message); return [] as OPTCGCard[]; }),
    fetchEndpoint(`${BASE}/allSTCards/`).catch((e)   => { console.error("[optcg] allSTCards error:",   e.message); return [] as OPTCGCard[]; }),
    fetchEndpoint(`${BASE}/allPromoCards/`).catch((e) => { console.error("[optcg] allPromoCards error:", e.message); return [] as OPTCGCard[]; }),
  ]);

  const allCards = [...setCards, ...stCards, ...promoCards];
  console.log(`[optcg] Fetched ${allCards.length.toLocaleString()} total cards (set: ${setCards.length}, ST: ${stCards.length}, promo: ${promoCards.length}).`);

  // ── Step 2: deduplicate preserving alternate arts ─────────────────────────────
  //
  // Cards sharing a card_set_id but with different images are alternate/parallel
  // arts and should each get their own row. We sort by (card_set_id, image_url)
  // before processing so variant suffixes are stable across re-syncs:
  //   first image  → external_id = "OP01-001"
  //   second image → external_id = "OP01-001_v2"
  //   third image  → external_id = "OP01-001_v3"  … etc.

  const sorted = [...allCards].sort((a, b) => {
    const idCmp = a.card_set_id.localeCompare(b.card_set_id);
    if (idCmp !== 0) return idCmp;
    return (a.card_image ?? "").localeCompare(b.card_image ?? "");
  });

  // Track seen (card_set_id → ordered list of unique image URLs)
  const imagesBySetId = new Map<string, string[]>();
  const processed: Array<{ card: OPTCGCard; externalId: string }> = [];
  let skipped = 0;

  for (const card of sorted) {
    if (!card.card_set_id || !card.card_name) { skipped++; continue; }

    const imgKey = card.card_image ?? "";
    const images = imagesBySetId.get(card.card_set_id) ?? [];

    if (images.includes(imgKey)) {
      // Exact duplicate (same card_set_id + same image) — skip
      skipped++;
      continue;
    }

    images.push(imgKey);
    imagesBySetId.set(card.card_set_id, images);

    // First art has no suffix; subsequent arts get _v2, _v3, …
    const variantIdx = images.length;
    const externalId = variantIdx === 1
      ? card.card_set_id
      : `${card.card_set_id}_v${variantIdx}`;

    processed.push({ card, externalId });
  }

  const altCount = processed.filter(({ externalId }) => externalId.includes("_v")).length;
  console.log(`[optcg] ${processed.length.toLocaleString()} cards after dedup (${skipped} skipped, ${altCount} alternate arts).`);

  // ── Step 3: batch upsert ─────────────────────────────────────────────────────
  const BATCH_SIZE = 500;
  let inserted = 0;
  let errors   = 0;

  for (let i = 0; i < processed.length; i += BATCH_SIZE) {
    const batch = processed.slice(i, i + BATCH_SIZE).map(({ card, externalId }) => toCardRow(card, externalId));

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
      const pct = ((i + BATCH_SIZE) / processed.length * 100).toFixed(1);
      console.log(`[optcg] Progress: ${pct}% (${i + BATCH_SIZE}/${processed.length})`);
    }
  }

  const duration = (Date.now() - startTime) / 1000;
  const result: OPTCGSyncResult = {
    total:    processed.length,
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
