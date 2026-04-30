/**
 * scripts/test-db.ts
 * Quick connectivity check: fetches all rows from admin_settings.
 * Run with: npx tsx scripts/test-db.ts
 */

import { createClient } from "@supabase/supabase-js";
import { config }       from "dotenv";
import { resolve }      from "path";

// Load .env.local from the project root
config({ path: resolve(process.cwd(), ".env.local") });

const url     = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ─── Pre-flight checks ────────────────────────────────────────────────────────

if (!url || !anonKey || !svcKey) {
  console.error("❌  Missing env vars. Check .env.local:");
  console.error("    NEXT_PUBLIC_SUPABASE_URL     =", url      ?? "(missing)");
  console.error("    NEXT_PUBLIC_SUPABASE_ANON_KEY=", anonKey  ? "(set)"    : "(missing)");
  console.error("    SUPABASE_SERVICE_ROLE_KEY    =", svcKey   ? "(set)"    : "(missing)");
  process.exit(1);
}

// Supabase project URLs must start with https://<ref>.supabase.co
if (!url.includes(".supabase.co")) {
  console.error("❌  NEXT_PUBLIC_SUPABASE_URL looks wrong.");
  console.error("    Got:      ", url);
  console.error("    Expected: https://<project-ref>.supabase.co");
  console.error("\n    Tip: find your project ref in the Supabase dashboard URL,");
  console.error("    e.g. https://supabase.com/dashboard/project/eekucyrieqlczwcmcwrb");
  console.error("    → the API URL is https://eekucyrieqlczwcmcwrb.supabase.co");
  process.exit(1);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

const supabase = createClient(url, svcKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("🔌  Connecting to:", url, "\n");

  // ── 1. admin_settings ──────────────────────────────────────────────────────
  console.log("── admin_settings ───────────────────────────────────────");
  const { data: settings, error: settingsErr } = await supabase
    .from("admin_settings")
    .select("key, value, updated_at")
    .order("key");

  if (settingsErr) {
    console.error("❌  admin_settings error:", settingsErr.message);
  } else if (!settings || settings.length === 0) {
    console.warn("⚠️   admin_settings table is empty — run the schema seed.");
  } else {
    console.log(`✅  ${settings.length} row(s) found:\n`);
    for (const row of settings) {
      console.log(`    ${row.key.padEnd(32)} = ${row.value}`);
    }
  }

  // ── 2. Quick table existence check ─────────────────────────────────────────
  console.log("\n── Table existence check ────────────────────────────────");
  const tables = [
    "profiles", "cards", "listings", "buy_orders",
    "transactions", "chat_messages", "reviews", "wishlist", "price_history",
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).select("id").limit(1);
    if (error) {
      console.error(`  ❌  ${table.padEnd(16)} — ${error.message}`);
    } else {
      console.log(`  ✅  ${table}`);
    }
  }

  // ── 3. cards_with_listing_stats view ───────────────────────────────────────
  console.log("\n── View: cards_with_listing_stats ───────────────────────");
  const { error: viewErr } = await supabase
    .from("cards_with_listing_stats")
    .select("id")
    .limit(1);
  if (viewErr) {
    console.error("  ❌  cards_with_listing_stats —", viewErr.message);
  } else {
    console.log("  ✅  cards_with_listing_stats");
  }

  console.log("\n✓ Done.\n");
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
