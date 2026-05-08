import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeRarity }   from "@/lib/sync/normalizeRarity";

// ─── Streaming JSON array parser ──────────────────────────────────────────────
// Avoids loading the entire ~700 MB Scryfall bulk file into a single string,
// which would exceed Node.js's string size limit.

async function* streamJsonArray(body: ReadableStream<Uint8Array>): AsyncGenerator<unknown> {
  const reader = body.getReader();
  const dec    = new TextDecoder();
  let buf      = "";
  let pos      = 0;
  let depth    = 0;
  let inStr    = false;
  let esc      = false;
  let start    = -1; // position of current top-level object's opening `{`

  outer: for (;;) {
    // Read more data when buffer is exhausted
    while (pos >= buf.length) {
      const { done, value } = await reader.read();
      if (done) break outer;
      buf += dec.decode(value, { stream: true });
    }

    const c = buf[pos];

    if (esc)   { esc = false; pos++; continue; }
    if (inStr) {
      if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      pos++; continue;
    }

    if      (c === '"')                { inStr = true; }
    else if (c === "{" || c === "[")   {
      if (c === "{" && depth === 1) start = pos;
      depth++;
    }
    else if (c === "}" || c === "]")   {
      depth--;
      if (c === "}" && depth === 1 && start !== -1) {
        try { yield JSON.parse(buf.slice(start, pos + 1)); } catch { /* skip malformed */ }
        // Trim processed portion so the buffer doesn't grow unboundedly
        buf   = buf.slice(pos + 1);
        pos   = -1;
        start = -1;
      }
    }

    pos++;
  }
}

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
  id:               string;
  name:             string;
  set:              string;
  set_name:         string;
  collector_number: string;
  rarity:           string;
  lang:             string;
  layout:           string;
  digital:          boolean;
  colors:           string[];
  image_uris?:      { normal?: string };
  card_faces?:      Array<{ image_uris?: { normal?: string } }>;
  tcgplayer_id?:    string | null;
}

// ─── Layouts that are not physical sellable cards ─────────────────────────────

const EXCLUDED_LAYOUTS = new Set([
  "token",
  "double_faced_token",
  "emblem",
  "art_series",
  "reversible_card",
  "planar",
  "scheme",
  "vanguard",
]);

// ─── WUBRG → full color names for filter UI ───────────────────────────────────

const MTG_COLORS: Record<string, string> = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
};

function mtgColor(colors: string[] | undefined): string | null {
  if (!colors?.length) return null;
  return colors.map((c) => MTG_COLORS[c] ?? c).join("/");
}

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
  color:        string | null;
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
    // Human-readable ID matching the set+collector_number pattern (like OP01-001 for OPTCG)
    external_id:  `${c.set}-${c.collector_number}`,
    scryfall_id:  c.id,
    tcgplayer_id: c.tcgplayer_id ?? null,
    name:         c.name,
    set_name:     c.set_name,
    set_code:     c.set.toUpperCase(),
    card_number:  c.collector_number,
    rarity:       normalizeRarity(c.rarity) ?? c.rarity,
    color:        mtgColor(c.colors),
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
    headers: { "User-Agent": "card-stash/1.0 (marketplace)" },
  });

  if (!manifestRes.ok) {
    throw new Error(`Scryfall manifest fetch failed: ${manifestRes.status}`);
  }

  const manifest = (await manifestRes.json()) as ScryfallBulkList;
  const entry    = manifest.data.find((e) => e.type === "default_cards");

  if (!entry) {
    throw new Error("Could not find default_cards entry in Scryfall bulk-data manifest.");
  }

  console.log(`[scryfall] Downloading bulk file (updated ${entry.updated_at})…`);

  // ── Step 2: download the JSON file (~200 MB uncompressed, ~30 MB gzipped) ──
  const dataRes = await fetch(entry.download_uri, {
    headers: { "User-Agent": "card-stash/1.0 (marketplace)" },
  });

  if (!dataRes.ok) {
    throw new Error(`Scryfall bulk download failed: ${dataRes.status}`);
  }

  if (!dataRes.body) throw new Error("Scryfall bulk download returned no body.");

  // ── Step 3: stream-parse + filter ───────────────────────────────────────────
  // Avoid loading the full ~700 MB JSON string into memory at once.
  // Keep: English, physical (non-digital), non-token/emblem/art-series layouts.
  console.log("[scryfall] Streaming and parsing bulk JSON…");
  const filtered: ScryfallCard[] = [];
  let rawCount = 0;

  for await (const item of streamJsonArray(dataRes.body)) {
    const c = item as ScryfallCard;
    rawCount++;
    if (c.lang === "en" && !c.digital && !EXCLUDED_LAYOUTS.has(c.layout)) {
      filtered.push(c);
    }
  }

  console.log(`[scryfall] ${filtered.length.toLocaleString()} cards after filtering (${rawCount - filtered.length} skipped out of ${rawCount.toLocaleString()} total).`);

  // ── Step 4: stable dedup by (set, collector_number) ─────────────────────────
  // Scryfall bulk data should have no duplicates, but guard anyway.
  // Sort first so dedup is deterministic across runs.
  const sorted = [...filtered].sort((a, b) => {
    const setCmp = a.set.localeCompare(b.set);
    if (setCmp !== 0) return setCmp;
    return a.collector_number.localeCompare(b.collector_number);
  });

  const seenKeys = new Set<string>();
  const unique: ScryfallCard[] = [];
  let dedupSkipped = 0;

  for (const card of sorted) {
    const key = `${card.set}|${card.collector_number}`;
    if (seenKeys.has(key)) { dedupSkipped++; continue; }
    seenKeys.add(key);
    unique.push(card);
  }

  if (dedupSkipped > 0) {
    console.log(`[scryfall] ${dedupSkipped} exact duplicates removed in dedup.`);
  }

  console.log(`[scryfall] ${unique.length.toLocaleString()} unique cards to upsert.`);

  // ── Step 5: batch upsert (with per-batch retry for transient network errors) ─
  const BATCH_SIZE = 500;
  let inserted = 0;
  let errors   = 0;

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batch    = unique.slice(i, i + BATCH_SIZE).map(toCardRow);

    let ok = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { error } = await supabase
          .from("cards")
          .upsert(batch, { onConflict: "game,external_id", ignoreDuplicates: false });

        if (!error) { ok = true; break; }

        console.warn(`[scryfall] Batch ${batchNum} attempt ${attempt} error: ${error.message}`);
      } catch (e) {
        console.warn(`[scryfall] Batch ${batchNum} attempt ${attempt} threw: ${e instanceof Error ? e.message : e}`);
      }

      if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 3_000));
    }

    if (ok) {
      inserted += batch.length;
    } else {
      console.error(`[scryfall] Batch ${batchNum} failed after 3 attempts — skipping.`);
      errors += batch.length;
    }

    if (batchNum % 10 === 0) {
      const pct = ((i + BATCH_SIZE) / unique.length * 100).toFixed(1);
      console.log(`[scryfall] Progress: ${pct}% (${i + BATCH_SIZE}/${unique.length})`);
    }
  }

  const duration = (Date.now() - startTime) / 1000;
  const result: ScryfallSyncResult = {
    total:    unique.length,
    inserted,
    skipped:  rawCount - unique.length,
    errors,
    duration,
  };

  console.log(
    `[scryfall] Done in ${duration.toFixed(1)}s — ${inserted} upserted, ${result.skipped} skipped, ${errors} errors.`
  );

  return result;
}
