import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeRarity }   from "@/lib/sync/normalizeRarity";

// ─── TCGdex API types ─────────────────────────────────────────────────────────

interface TCGdexSetBrief {
  id:        string;
  name:      string;
  cardCount: { total: number; official: number };
}

interface TCGdexCardBrief {
  id:      string;  // e.g. "base1-1"
  localId: string;
  name:    string;
  image?:  string;
}

interface TCGdexSetDetail {
  id:    string;
  name:  string;
  cards: TCGdexCardBrief[];
}

interface TCGdexCardDetail {
  id:      string;
  localId: string;
  name:    string;
  image?:  string;
  rarity?: string;
  types?:  string[];
  set:     { id: string; name: string };
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
  game:        "pokemon";
  lang:        string;
  updated_at:  string;
}

function toCardRow(card: TCGdexCardDetail): CardRow {
  const imageUrl = card.image ? `${card.image}/high.webp` : null;
  const color    = card.types?.length ? card.types.join(" ") : null;

  return {
    external_id: card.id,
    name:        card.name,
    set_name:    card.set.name,
    set_code:    card.set.id.toUpperCase(),
    card_number: card.localId,
    rarity:      normalizeRarity(card.rarity),
    color,
    image_url:   imageUrl,
    game:        "pokemon",
    lang:        "en",
    updated_at:  new Date().toISOString(),
  };
}

// ─── Concurrency helpers ──────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJson<T>(url: string, retries = 4): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(1000 * 2 ** attempt, 16_000); // 2s, 4s, 8s, 16s
      await sleep(delay);
    }

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal:  AbortSignal.timeout(30_000),
    });

    if (res.ok) return res.json() as Promise<T>;

    // Retryable: server overload / rate-limit
    if (res.status === 503 || res.status === 429 || res.status === 502 || res.status === 504) {
      lastError = new Error(`HTTP ${res.status} (attempt ${attempt + 1}/${retries + 1})`);
      continue;
    }

    // Non-retryable
    throw new Error(`TCGdex ${res.status} for ${url}`);
  }

  throw lastError ?? new Error(`TCGdex unreachable: ${url}`);
}

async function withConcurrency<T, R>(
  items: T[],
  limit: number,
  fn:    (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[]     = new Array(items.length);
  const queue            = items.map((item, i) => ({ item, i }));
  let   head             = 0;

  async function worker() {
    while (head < queue.length) {
      const { item, i } = queue[head++];
      results[i] = await fn(item);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// ─── Main sync function ───────────────────────────────────────────────────────

export interface TCGdexSyncResult {
  total:    number;
  inserted: number;
  skipped:  number;
  errors:   number;
  duration: number;
}

export async function fetchAndSyncTCGdex(
  options: { setIds?: string[] } = {},
): Promise<TCGdexSyncResult> {
  const startTime = Date.now();
  const supabase  = createAdminClient();
  const BASE      = "https://api.tcgdex.net/v2/en";

  // ── Step 1: fetch set list ───────────────────────────────────────────────────
  console.log("[tcgdex] Fetching set list…");
  const allSets = await fetchJson<TCGdexSetBrief[]>(`${BASE}/sets`);

  const targetSets = options.setIds?.length
    ? allSets.filter((s) => options.setIds!.includes(s.id))
    : allSets;

  console.log(`[tcgdex] ${targetSets.length} sets to sync.`);

  // ── Step 2: fetch card IDs for each set ─────────────────────────────────────
  console.log("[tcgdex] Fetching card lists per set…");
  const setDetails = await withConcurrency(targetSets, 3, (s) =>
    fetchJson<TCGdexSetDetail>(`${BASE}/sets/${s.id}`).catch((e) => {
      console.error(`[tcgdex] Set ${s.id} error: ${e.message}`);
      return null;
    }),
  );

  const cardIds: string[] = [];
  for (const set of setDetails) {
    if (!set) continue;
    for (const card of set.cards ?? []) {
      if (card.id) cardIds.push(card.id);
    }
  }

  console.log(`[tcgdex] ${cardIds.length.toLocaleString()} cards to fetch details for.`);

  // ── Step 3: fetch individual card details (concurrency 10) ──────────────────
  console.log("[tcgdex] Fetching card details…");
  let fetchErrors = 0;
  let done        = 0;

  const cardDetails = await withConcurrency(cardIds, 4, async (id) => {
    try {
      const detail = await fetchJson<TCGdexCardDetail>(`${BASE}/cards/${id}`);
      done++;
      if (done % 500 === 0) {
        const pct = (done / cardIds.length * 100).toFixed(1);
        console.log(`[tcgdex] Fetched ${done.toLocaleString()}/${cardIds.length.toLocaleString()} card details (${pct}%)…`);
      }
      return detail;
    } catch (e) {
      fetchErrors++;
      console.error(`[tcgdex] Card ${id} fetch error: ${(e as Error).message}`);
      return null;
    }
  });

  const validCards = cardDetails.filter((c): c is TCGdexCardDetail => c !== null);
  console.log(`[tcgdex] ${validCards.length.toLocaleString()} card details fetched (${fetchErrors} errors).`);

  // ── Step 4: dedup by external_id ─────────────────────────────────────────────
  const seenIds = new Set<string>();
  const unique: TCGdexCardDetail[] = [];
  let skipped = 0;

  for (const card of validCards) {
    if (!card.id || !card.name) { skipped++; continue; }
    if (seenIds.has(card.id))   { skipped++; continue; }
    seenIds.add(card.id);
    unique.push(card);
  }

  console.log(`[tcgdex] ${unique.length.toLocaleString()} unique cards to upsert.`);

  // ── Step 5: batch upsert ─────────────────────────────────────────────────────
  const BATCH_SIZE = 500;
  let inserted = 0;
  let errors   = 0;

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batch    = unique.slice(i, i + BATCH_SIZE).map(toCardRow);

    const { error } = await supabase
      .from("cards")
      .upsert(batch, { onConflict: "game,external_id", ignoreDuplicates: false });

    if (error) {
      console.error(`[tcgdex] Batch ${batchNum} error: ${error.message}`);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }

    if (batchNum % 5 === 0) {
      const pct = ((i + BATCH_SIZE) / unique.length * 100).toFixed(1);
      console.log(`[tcgdex] Progress: ${pct}% (${i + BATCH_SIZE}/${unique.length})`);
    }
  }

  const duration = (Date.now() - startTime) / 1000;
  const result: TCGdexSyncResult = {
    total:    unique.length,
    inserted,
    skipped:  skipped + fetchErrors,
    errors,
    duration,
  };

  console.log(
    `[tcgdex] Done in ${duration.toFixed(1)}s — ${inserted} upserted, ${result.skipped} skipped, ${errors} errors.`,
  );

  return result;
}
