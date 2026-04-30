import { createAdminClient } from "@/lib/supabase/admin";

// ─── Scryfall types (subset of full API) ─────────────────────────────────────

interface ScryfallBulkEntry {
  type:         string;
  download_uri: string;
  updated_at:   string;
}

interface ScryfallBulkList {
  data: ScryfallBulkEntry[];
}

interface ScryfallCard {
  id:              string;
  name:            string;
  set:             string;
  set_name:        string;
  collector_number: string;
  rarity:          string;
  lang:            string;
  layout:          string;
  image_uris?:     { normal?: string };
  card_faces?:     Array<{ image_uris?: { normal?: string } }>;
  prices:          { usd?: string | null };
  tcgplayer_id?:   string | null;
}

// ─── Layouts to exclude ───────────────────────────────────────────────────────

const EXCLUDED_LAYOUTS = new Set([
  "token",
  "double_faced_token",
  "emblem",
  "art_series",
  "reversible_card",
]);

// ─── Upsert batch shape ───────────────────────────────────────────────────────

interface CardRow {
  external_id:  string;
  scryfall_id:  string;
  tcgplayer_id: string | null;
  name:         string;
  set_name:     string;
  set_code:     string;
  card_number:  string;
  rarity:       string;
  image_url:    string | null;
  game:         "magic";
  lang:         string;
  updated_at:   string;
}

function toCardRow(c: ScryfallCard): CardRow {
  // Double-faced cards have no top-level image_uris — use front face
  const image_url =
    c.image_uris?.normal ??
    c.card_faces?.[0]?.image_uris?.normal ??
    null;

  return {
    external_id:  c.id,
    scryfall_id:  c.id,
    tcgplayer_id: c.tcgplayer_id ?? null,
    name:         c.name,
    set_name:     c.set_name,
    set_code:     c.set,
    card_number:  c.collector_number,
    rarity:       c.rarity,
    image_url,
    game:         "magic",
    lang:         c.lang,
    updated_at:   new Date().toISOString(),
  };
}

// ─── Main sync function ───────────────────────────────────────────────────────

export interface ScryfallSyncResult {
  total:    number;
  inserted: number;
  skipped:  number;
  errors:   number;
  duration: number;
}

export async function fetchAndSyncScryfall(): Promise<ScryfallSyncResult> {
  const startTime = Date.now();
  const supabase  = createAdminClient();

  // ── Step 1: fetch bulk-data manifest ────────────────────────────────────────
  console.log("[scryfall] Fetching bulk-data manifest…");
  const manifestRes = await fetch("https://api.scryfall.com/bulk-data", {
    headers: { "User-Agent": "singles-ar/1.0 (marketplace)" },
  });

  if (!manifestRes.ok) {
    throw new Error(`Scryfall manifest fetch failed: ${manifestRes.status}`);
  }

  const manifest = (await manifestRes.json()) as ScryfallBulkList;
  const entry    = manifest.data.find((e) => e.type === "default_cards");

  if (!entry) {
    throw new Error("Could not find default_cards entry in Scryfall bulk-data manifest.");
  }

  console.log(`[scryfall] Downloading bulk file from ${entry.download_uri} (updated ${entry.updated_at})`);

  // ── Step 2: download the JSON file ──────────────────────────────────────────
  const dataRes = await fetch(entry.download_uri, {
    headers: { "User-Agent": "singles-ar/1.0 (marketplace)" },
  });

  if (!dataRes.ok) {
    throw new Error(`Scryfall bulk download failed: ${dataRes.status}`);
  }

  const rawCards = (await dataRes.json()) as ScryfallCard[];
  console.log(`[scryfall] Downloaded ${rawCards.length.toLocaleString()} raw cards.`);

  // ── Step 3: filter ──────────────────────────────────────────────────────────
  const filtered = rawCards.filter(
    (c) =>
      c.lang === "en" &&
      !EXCLUDED_LAYOUTS.has(c.layout) &&
      c.prices?.usd != null &&
      c.prices.usd !== ""
  );

  console.log(`[scryfall] ${filtered.length.toLocaleString()} cards passed filters.`);

  // ── Step 4: batch upsert ────────────────────────────────────────────────────
  const BATCH_SIZE = 500;
  let inserted = 0;
  let errors   = 0;

  for (let i = 0; i < filtered.length; i += BATCH_SIZE) {
    const batch = filtered.slice(i, i + BATCH_SIZE).map(toCardRow);

    const { error } = await supabase
      .from("cards")
      .upsert(batch, {
        onConflict:        "external_id",
        ignoreDuplicates:  false,       // update existing rows
      });

    if (error) {
      console.error(`[scryfall] Batch ${i / BATCH_SIZE + 1} error:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }

    // Log progress every 10 batches (5 000 cards)
    if ((i / BATCH_SIZE + 1) % 10 === 0) {
      const pct = ((i + BATCH_SIZE) / filtered.length * 100).toFixed(1);
      console.log(`[scryfall] Progress: ${pct}% (${i + BATCH_SIZE}/${filtered.length})`);
    }
  }

  const duration = (Date.now() - startTime) / 1000;
  const result: ScryfallSyncResult = {
    total:    filtered.length,
    inserted,
    skipped:  rawCards.length - filtered.length,
    errors,
    duration,
  };

  console.log(
    `[scryfall] Done in ${duration.toFixed(1)}s — ${inserted} upserted, ${result.skipped} skipped, ${errors} errors.`
  );

  return result;
}
