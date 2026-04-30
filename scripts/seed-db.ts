/**
 * scripts/seed-db.ts
 * Seeds the database with realistic test data.
 * Run with: npx tsx scripts/seed-db.ts
 *
 * Creates:
 *   - 3 users  (buyer, seller, admin)
 *   - 12 cards (Magic × 5, Pokémon × 4, One Piece × 3)
 *   - 8 listings, 5 buy orders, 3 transactions
 *   - chat messages, reviews, wishlist, price history
 *
 * Updates .env.local → ADMIN_USER_IDS with the admin user UUID.
 * Safe to re-run: upserts by fixed ID everywhere.
 */

import { createClient } from "@supabase/supabase-js";
import { config }       from "dotenv";
import { resolve }      from "path";
import { readFileSync, writeFileSync } from "fs";

config({ path: resolve(process.cwd(), ".env.local") });

const URL_    = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!URL_ || !SVC_KEY) {
  console.error("❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(URL_, SVC_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── helpers ──────────────────────────────────────────────────────────────────

async function createOrGetUser(email: string, password: string) {
  const { data } = await sb.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (data?.user) return data.user;

  // Already exists — search pages
  for (let page = 1; ; page++) {
    const { data: list } = await sb.auth.admin.listUsers({ page, perPage: 100 });
    if (!list?.users?.length) break;
    const found = list.users.find(u => u.email === email);
    if (found) return found;
    if (list.users.length < 100) break;
  }
  throw new Error(`Could not create or find ${email}`);
}

function ok(label: string, error: unknown) {
  if (error) console.error(`  ❌  ${label}`, (error as any).message ?? error);
  else       console.log (`  ✅  ${label}`);
}

// ─── Fixed seed UUIDs  (all valid hex) ────────────────────────────────────────
// Prefix key:
//   ca = cards     | 1a = listings   | ba = buy orders
//   aa = transactions | ea = reviews | fa = wishlist | da = chat

const C = {
  blackLotus:    "ca000000-0000-0000-0000-000000000001",
  lightningBolt: "ca000000-0000-0000-0000-000000000002",
  counterspell:  "ca000000-0000-0000-0000-000000000003",
  darkRitual:    "ca000000-0000-0000-0000-000000000004",
  island:        "ca000000-0000-0000-0000-000000000005",
  charizard:     "ca000000-0000-0000-0000-000000000011",
  pikachu:       "ca000000-0000-0000-0000-000000000012",
  mewtwo:        "ca000000-0000-0000-0000-000000000013",
  blastoise:     "ca000000-0000-0000-0000-000000000014",
  luffy:         "ca000000-0000-0000-0000-000000000021",
  zoro:          "ca000000-0000-0000-0000-000000000022",
  nami:          "ca000000-0000-0000-0000-000000000023",
};

const L = {
  l1: "1a000000-0000-0000-0000-000000000001",
  l2: "1a000000-0000-0000-0000-000000000002",
  l3: "1a000000-0000-0000-0000-000000000003",
  l4: "1a000000-0000-0000-0000-000000000004",
  l5: "1a000000-0000-0000-0000-000000000005",
  l6: "1a000000-0000-0000-0000-000000000006",
  l7: "1a000000-0000-0000-0000-000000000007",
  l8: "1a000000-0000-0000-0000-000000000008",
};

const BO = {
  b1: "ba000000-0000-0000-0000-000000000001",
  b2: "ba000000-0000-0000-0000-000000000002",
  b3: "ba000000-0000-0000-0000-000000000003",
  b4: "ba000000-0000-0000-0000-000000000004",
  b5: "ba000000-0000-0000-0000-000000000005",
};

const TX = {
  t1: "aa000000-0000-0000-0000-000000000001",  // completed
  t2: "aa000000-0000-0000-0000-000000000002",  // in_chat
  t3: "aa000000-0000-0000-0000-000000000003",  // paid
};

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {

  // ── 1. Auth users ──────────────────────────────────────────────────────────
  console.log("── 1. Users ─────────────────────────────────────────────────");

  const buyer  = await createOrGetUser("comprador@singles-test.ar", "Test1234!");
  const seller = await createOrGetUser("vendedor@singles-test.ar",  "Test1234!");
  const admin  = await createOrGetUser("admin@singles-test.ar",     "Admin1234!");

  console.log(`  buyer  → ${buyer.id}`);
  console.log(`  seller → ${seller.id}`);
  console.log(`  admin  → ${admin.id}`);

  // Update ADMIN_USER_IDS in .env.local
  const envPath = resolve(process.cwd(), ".env.local");
  let env = readFileSync(envPath, "utf-8");
  env = env.replace(/^ADMIN_USER_IDS=.*$/m, `ADMIN_USER_IDS=${admin.id}`);
  writeFileSync(envPath, env);
  console.log(`  ✅  .env.local → ADMIN_USER_IDS=${admin.id}`);

  // ── 2. Profiles ────────────────────────────────────────────────────────────
  // The handle_new_user trigger auto-creates profiles on INSERT into auth.users.
  // We update only the display/stats fields, leaving internal_id untouched.
  console.log("\n── 2. Profiles ──────────────────────────────────────────────");

  const profileUpdates = [
    { id: buyer.id,  username: "comprador_test", reputation_score: 72,  total_sales: 3,  total_purchases: 12, cancel_count: 1, is_reliable_buyer: true },
    { id: seller.id, username: "vendedor_test",  reputation_score: 94,  total_sales: 47, total_purchases: 5,  cancel_count: 0, is_reliable_buyer: true },
    { id: admin.id,  username: "admin_singles",  reputation_score: 100, total_sales: 0,  total_purchases: 0,  cancel_count: 0, is_reliable_buyer: true },
  ];

  for (const { id, ...fields } of profileUpdates) {
    const { error } = await sb.from("profiles").update(fields).eq("id", id);
    ok(`profile update ${fields.username}`, error);
  }

  // ── 3. Cards ───────────────────────────────────────────────────────────────
  console.log("\n── 3. Cards ─────────────────────────────────────────────────");

  const cards = [
    // Magic: The Gathering
    { id: C.blackLotus,    external_id: "seed-mtg-black-lotus",       game: "magic",    name: "Black Lotus",        set_name: "Limited Edition Alpha", set_code: "LEA",   card_number: "232", rarity: "Rare",       lang: "en" },
    { id: C.lightningBolt, external_id: "seed-mtg-lightning-bolt",    game: "magic",    name: "Lightning Bolt",     set_name: "Magic 2011",            set_code: "M11",   card_number: "149", rarity: "Common",     lang: "en" },
    { id: C.counterspell,  external_id: "seed-mtg-counterspell",      game: "magic",    name: "Counterspell",       set_name: "Modern Masters 2015",   set_code: "MM2",   card_number: "042", rarity: "Common",     lang: "en" },
    { id: C.darkRitual,    external_id: "seed-mtg-dark-ritual",       game: "magic",    name: "Dark Ritual",        set_name: "Urza's Saga",           set_code: "USG",   card_number: "128", rarity: "Common",     lang: "en" },
    { id: C.island,        external_id: "seed-mtg-island-afr",        game: "magic",    name: "Island",             set_name: "Adventures in the FR",  set_code: "AFR",   card_number: "266", rarity: "Land",       lang: "en" },
    // Pokémon
    { id: C.charizard,     external_id: "seed-poke-charizard-vmax",   game: "pokemon",  name: "Charizard VMAX",     set_name: "Sword & Shield",        set_code: "SWSH1", card_number: "020", rarity: "Rare Ultra", lang: "en" },
    { id: C.pikachu,       external_id: "seed-poke-pikachu-v",        game: "pokemon",  name: "Pikachu V",          set_name: "Vivid Voltage",         set_code: "VIV",   card_number: "043", rarity: "Rare Holo V",lang: "en" },
    { id: C.mewtwo,        external_id: "seed-poke-mewtwo-gx",        game: "pokemon",  name: "Mewtwo GX",          set_name: "Shining Legends",       set_code: "SLG",   card_number: "039", rarity: "Ultra Rare", lang: "en" },
    { id: C.blastoise,     external_id: "seed-poke-blastoise-vstar",  game: "pokemon",  name: "Blastoise VSTAR",    set_name: "Brilliant Stars",       set_code: "BRS",   card_number: "018", rarity: "Rare Ultra", lang: "en" },
    // One Piece
    { id: C.luffy,         external_id: "seed-op-luffy-op01",         game: "onepiece", name: "Monkey D. Luffy",    set_name: "Romance Dawn",          set_code: "OP01",  card_number: "ST01-012", rarity: "Super Rare", lang: "en" },
    { id: C.zoro,          external_id: "seed-op-zoro-op01",          game: "onepiece", name: "Roronoa Zoro",       set_name: "Romance Dawn",          set_code: "OP01",  card_number: "ST01-003", rarity: "Common",     lang: "en" },
    { id: C.nami,          external_id: "seed-op-nami-op01",          game: "onepiece", name: "Nami",               set_name: "Romance Dawn",          set_code: "OP01",  card_number: "ST01-006", rarity: "Common",     lang: "en" },
  ];

  for (const card of cards) {
    const { error } = await sb.from("cards").upsert(card, { onConflict: "id" });
    ok(card.name, error);
  }

  // ── 4. Listings ────────────────────────────────────────────────────────────
  console.log("\n── 4. Listings ──────────────────────────────────────────────");

  const listings = [
    // Seller's active listings
    { id: L.l1, card_id: C.blackLotus,    seller_id: seller.id, listing_type: "sale",  price: 250000, currency: "ARS", condition: "NM", quantity: 1, status: "active",   notes: "Carta de Alpha, bordes impecables. Tengo fotos adicionales." },
    { id: L.l2, card_id: C.lightningBolt, seller_id: seller.id, listing_type: "sale",  price: 4500,   currency: "ARS", condition: "NM", quantity: 4, status: "active",   notes: "Tengo 4 copias disponibles, precio por unidad." },
    { id: L.l3, card_id: C.charizard,     seller_id: seller.id, listing_type: "sale",  price: 85000,  currency: "ARS", condition: "LP", quantity: 1, status: "active",   notes: "Leve desgaste en los bordes, apreciable en las fotos." },
    { id: L.l4, card_id: C.luffy,         seller_id: seller.id, listing_type: "sale",  price: 42000,  currency: "ARS", condition: "NM", quantity: 2, status: "active",   notes: null },
    { id: L.l5, card_id: C.counterspell,  seller_id: seller.id, listing_type: "trade", price: null,   currency: "ARS", condition: "NM", quantity: 1, status: "active",   trade_for: "Force of Will (cualquier edición)", notes: "Solo permuto, no vendo." },
    // Buyer's active listing
    { id: L.l6, card_id: C.zoro,          seller_id: buyer.id,  listing_type: "sale",  price: 8500,   currency: "ARS", condition: "MP", quantity: 1, status: "active",   notes: "Estado jugable, pequeñas marcas de mazo." },
    // Sold (linked to completed TX)
    { id: L.l7, card_id: C.pikachu,       seller_id: seller.id, listing_type: "sale",  price: 11000,  currency: "ARS", condition: "NM", quantity: 1, status: "sold",     notes: null },
    // Reserved (linked to in_chat TX)
    { id: L.l8, card_id: C.mewtwo,        seller_id: seller.id, listing_type: "sale",  price: 62000,  currency: "ARS", condition: "NM", quantity: 1, status: "reserved", notes: "Gradeada PSA 9." },
  ];

  for (const listing of listings) {
    const { error } = await sb.from("listings").upsert(listing, { onConflict: "id" });
    ok(`listing ${listing.id} — ${listing.status}`, error);
  }

  // ── 5. Buy Orders ──────────────────────────────────────────────────────────
  console.log("\n── 5. Buy Orders ────────────────────────────────────────────");

  const in30d = new Date(Date.now() + 30 * 86_400_000).toISOString();
  const past5 = new Date(Date.now() -  5 * 86_400_000).toISOString();

  const buyOrders = [
    { id: BO.b1, card_id: C.lightningBolt, buyer_id: buyer.id,  price: 4000,  currency: "ARS", condition: "NM", quantity: 2, status: "active", notes: "Necesito para torneo del sábado.",    expires_at: in30d },
    { id: BO.b2, card_id: C.charizard,     buyer_id: buyer.id,  price: 90000, currency: "ARS", condition: null, quantity: 1, status: "active", notes: null,                                 expires_at: in30d },
    { id: BO.b3, card_id: C.zoro,          buyer_id: buyer.id,  price: 9000,  currency: "ARS", condition: "NM", quantity: 1, status: "active", notes: "Solo NM o LP.",                      expires_at: in30d },
    { id: BO.b4, card_id: C.island,        buyer_id: seller.id, price: 1500,  currency: "ARS", condition: null, quantity: 4, status: "active", notes: "Busco 4x Island para mazo azul.",    expires_at: in30d },
    // Filled — linked to completed TX
    { id: BO.b5, card_id: C.pikachu,       buyer_id: buyer.id,  price: 11000, currency: "ARS", condition: "NM", quantity: 1, status: "filled", notes: null, expires_at: past5, accepted_by: seller.id },
  ];

  for (const bo of buyOrders) {
    const { error } = await sb.from("buy_orders").upsert(bo, { onConflict: "id" });
    ok(`buy_order ${bo.id} — ${bo.status}`, error);
  }

  // ── 6. Transactions ────────────────────────────────────────────────────────
  console.log("\n── 6. Transactions ──────────────────────────────────────────");

  const completedAt = new Date(Date.now() - 10 * 86_400_000).toISOString();

  const transactions = [
    {
      id:               TX.t1,
      listing_id:       L.l7,
      buy_order_id:     BO.b5,
      buyer_id:         buyer.id,
      seller_id:        seller.id,
      card_id:          C.pikachu,
      price:            11000,
      currency:         "ARS",
      platform_fee:     550,
      mp_fee:           659,
      seller_net:       9791,
      mp_preference_id: "SEED-PREF-000001",
      mp_payment_id:    "SEED-PAY-000001",
      status:           "completed",
      completed_at:     completedAt,
      buyer_last_read_at:  completedAt,
      seller_last_read_at: completedAt,
    },
    {
      id:           TX.t2,
      listing_id:   L.l8,
      buy_order_id: null,
      buyer_id:     buyer.id,
      seller_id:    seller.id,
      card_id:      C.mewtwo,
      price:        62000,
      currency:     "ARS",
      platform_fee: null,
      mp_fee:       null,
      seller_net:   null,
      mp_preference_id: null,
      mp_payment_id:    null,
      status:       "in_chat",
    },
    {
      id:               TX.t3,
      listing_id:       null,
      buy_order_id:     null,
      buyer_id:         buyer.id,
      seller_id:        seller.id,
      card_id:          C.blastoise,
      price:            55000,
      currency:         "ARS",
      platform_fee:     2750,
      mp_fee:           3295,
      seller_net:       48955,
      mp_preference_id: "SEED-PREF-000003",
      mp_payment_id:    "SEED-PAY-000003",
      status:           "paid",
    },
  ];

  for (const tx of transactions) {
    const { error } = await sb.from("transactions").upsert(tx, { onConflict: "id" });
    ok(`transaction ${tx.id} — ${tx.status}`, error);
  }

  // ── 7. Chat Messages ───────────────────────────────────────────────────────
  console.log("\n── 7. Chat Messages ─────────────────────────────────────────");

  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

  const chatMessages = [
    // T1: completed Pikachu V transaction
    { id: "da000000-0001-0000-0000-000000000001", transaction_id: TX.t1, sender_id: null,       message_type: "system", body: "Chat iniciado. El vendedor aceptó tu orden de compra.",                        created_at: daysAgo(12) },
    { id: "da000000-0001-0000-0000-000000000002", transaction_id: TX.t1, sender_id: buyer.id,   message_type: "text",   body: "Hola! Te hago el pago en breve por MercadoPago.",                              created_at: daysAgo(11.9) },
    { id: "da000000-0001-0000-0000-000000000003", transaction_id: TX.t1, sender_id: seller.id,  message_type: "text",   body: "Perfecto, te la mando por correo una vez confirmado el pago.",                created_at: daysAgo(11.8) },
    { id: "da000000-0001-0000-0000-000000000004", transaction_id: TX.t1, sender_id: null,        message_type: "system", body: "Pago confirmado por MercadoPago. Coordinen el envío.",                        created_at: daysAgo(11) },
    { id: "da000000-0001-0000-0000-000000000005", transaction_id: TX.t1, sender_id: buyer.id,   message_type: "text",   body: "Pago listo! Mandame tu dirección para el correo.",                            created_at: daysAgo(10.9) },
    { id: "da000000-0001-0000-0000-000000000006", transaction_id: TX.t1, sender_id: seller.id,  message_type: "text",   body: "Despachée por Correo Argentino. Tracking: RA1234567890AR.",                   created_at: daysAgo(10) },
    { id: "da000000-0001-0000-0000-000000000007", transaction_id: TX.t1, sender_id: buyer.id,   message_type: "text",   body: "Llegó en perfectas condiciones! Muchas gracias, excelente vendedor!",         created_at: daysAgo(9.9) },
    { id: "da000000-0001-0000-0000-000000000008", transaction_id: TX.t1, sender_id: null,        message_type: "system", body: "Transacción completada por ambas partes.",                                    created_at: daysAgo(9.8) },
    // T2: in_chat Mewtwo GX transaction
    { id: "da000000-0002-0000-0000-000000000001", transaction_id: TX.t2, sender_id: null,        message_type: "system", body: "Chat iniciado. El vendedor aceptó tu consulta.",                             created_at: daysAgo(2) },
    { id: "da000000-0002-0000-0000-000000000002", transaction_id: TX.t2, sender_id: buyer.id,   message_type: "text",   body: "Hola! Te consulto, ¿aceptas transferencia bancaria además de MercadoPago?", created_at: hoursAgo(47) },
    { id: "da000000-0002-0000-0000-000000000003", transaction_id: TX.t2, sender_id: seller.id,  message_type: "text",   body: "Solo acepto MercadoPago, para estar cubierto por el programa de protección.", created_at: hoursAgo(46) },
    { id: "da000000-0002-0000-0000-000000000004", transaction_id: TX.t2, sender_id: buyer.id,   message_type: "text",   body: "Entendido, esta semana te hago el pago.",                                    created_at: hoursAgo(24) },
    // T3: paid Blastoise VSTAR transaction
    { id: "da000000-0003-0000-0000-000000000001", transaction_id: TX.t3, sender_id: null,        message_type: "system", body: "Chat iniciado.",                                                              created_at: daysAgo(3) },
    { id: "da000000-0003-0000-0000-000000000002", transaction_id: TX.t3, sender_id: buyer.id,   message_type: "text",   body: "Hola! Me interesa el Blastoise VSTAR, ¿está disponible?",                    created_at: daysAgo(2.9) },
    { id: "da000000-0003-0000-0000-000000000003", transaction_id: TX.t3, sender_id: seller.id,  message_type: "text",   body: "Sí, disponible. Acá va el link de pago de MercadoPago.",                     created_at: daysAgo(2.8) },
    { id: "da000000-0003-0000-0000-000000000004", transaction_id: TX.t3, sender_id: null,        message_type: "system", body: "Pago confirmado por MercadoPago. Coordinen el envío.",                       created_at: daysAgo(1) },
  ];

  for (const msg of chatMessages) {
    const { error } = await sb.from("chat_messages").upsert(msg, { onConflict: "id" });
    ok(`chat ${msg.id.slice(-4)} [${msg.transaction_id.slice(-4)}] ${msg.sender_id ? "text" : "sys"}`, error);
  }

  // ── 8. Reviews ─────────────────────────────────────────────────────────────
  console.log("\n── 8. Reviews ───────────────────────────────────────────────");

  const reviews = [
    {
      id:             "ea000000-0000-0000-0000-000000000001",
      transaction_id: TX.t1,
      reviewer_id:    buyer.id,
      reviewee_id:    seller.id,
      rating:         5,
      comment:        "Excelente vendedor! La carta llegó exactamente como se describió, envío rapidísimo y muy buen embalaje. 100% recomendable.",
    },
    {
      id:             "ea000000-0000-0000-0000-000000000002",
      transaction_id: TX.t1,
      reviewer_id:    seller.id,
      reviewee_id:    buyer.id,
      rating:         5,
      comment:        "Comprador serio, pagó enseguida y fue muy amable. Excelente experiencia.",
    },
  ];

  for (const r of reviews) {
    const { error } = await sb.from("reviews").upsert(r, { onConflict: "id" });
    ok(`review ${r.id.slice(-4)} (rating ${r.rating}/5)`, error);
  }

  // ── 9. Wishlist ────────────────────────────────────────────────────────────
  console.log("\n── 9. Wishlist ──────────────────────────────────────────────");

  const wishlist = [
    { id: "fa000000-0000-0000-0000-000000000001", user_id: buyer.id, card_id: C.blackLotus },
    { id: "fa000000-0000-0000-0000-000000000002", user_id: buyer.id, card_id: C.mewtwo },
    { id: "fa000000-0000-0000-0000-000000000003", user_id: buyer.id, card_id: C.zoro },
    { id: "fa000000-0000-0000-0000-000000000004", user_id: buyer.id, card_id: C.nami },
  ];

  for (const w of wishlist) {
    const { error } = await sb.from("wishlist").upsert(w, { onConflict: "id" });
    ok(`wishlist item ${w.card_id.slice(-4)}`, error);
  }

  // ── 10. Price History ──────────────────────────────────────────────────────
  console.log("\n── 10. Price History ────────────────────────────────────────");

  // Clear existing seed price history to keep re-runs clean
  const seedCardIds = Object.values(C);
  await sb.from("price_history").delete().in("card_id", seedCardIds);

  const priceSeeds: Record<string, { baseUsd: number; variance: number }> = {
    [C.blackLotus]:    { baseUsd: 3200, variance: 150  },
    [C.lightningBolt]: { baseUsd: 4.5,  variance: 0.8  },
    [C.charizard]:     { baseUsd: 85,   variance: 12   },
    [C.pikachu]:       { baseUsd: 11,   variance: 2    },
    [C.mewtwo]:        { baseUsd: 62,   variance: 8    },
    [C.luffy]:         { baseUsd: 42,   variance: 6    },
    [C.zoro]:          { baseUsd: 8,    variance: 1.5  },
  };

  const USD_RATE = 1000; // ARS per USD
  const rows: any[] = [];

  for (const [cardId, { baseUsd, variance }] of Object.entries(priceSeeds)) {
    for (let i = 0; i < 15; i++) {
      const drift = (Math.random() - 0.5) * 2 * variance;
      const priceUsd = Math.round((baseUsd + drift) * 100) / 100;
      rows.push({
        card_id:     cardId,
        price_usd:   priceUsd,
        price_ars:   Math.round(priceUsd * USD_RATE),
        source:      "tcgplayer",
        recorded_at: new Date(Date.now() - (14 - i) * 2 * 86_400_000).toISOString(),
      });
    }
  }

  const { error: phErr } = await sb.from("price_history").insert(rows);
  ok(`price_history — ${rows.length} rows for ${Object.keys(priceSeeds).length} cards`, phErr);

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`
══════════════════════════════════════════════════════════════════
  SEED COMPLETE

  Login credentials
  ┌─────────────────────────────────────────────────────────────┐
  │  REGULAR USER  comprador@singles-test.ar / Test1234!        │
  │  SELLER        vendedor@singles-test.ar  / Test1234!        │
  │  ADMIN         admin@singles-test.ar     / Admin1234!       │
  └─────────────────────────────────────────────────────────────┘

  Admin UUID : ${admin.id}
  Buyer  UUID: ${buyer.id}
  Seller UUID: ${seller.id}

  .env.local has been updated with ADMIN_USER_IDS=${admin.id}
══════════════════════════════════════════════════════════════════
`);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
