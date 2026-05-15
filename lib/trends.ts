import { createAdminClient } from "@/lib/supabase/admin";
import type { Game } from "@/types/database";

// ─── Period ───────────────────────────────────────────────────────────────────

export type TrendPeriod = "7d" | "30d" | "3m";

export function periodToDays(p: TrendPeriod): number {
  return p === "7d" ? 7 : p === "30d" ? 30 : 90;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface TrendCard {
  id:        string;
  name:      string;
  set_name:  string | null;
  set_code:  string | null;
  game:      Game;
  image_url: string | null;
}

function resolveImageUrl(card: { image_url?: string | null; image_override_url?: string | null }): string | null {
  return card.image_override_url ?? card.image_url ?? null;
}

function medianOf(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// ─── 1. Market Pulse ──────────────────────────────────────────────────────────

export interface MarketPulseData {
  volume:              number;
  volumeChange:        number | null;
  txCount:             number;
  txCountChange:       number | null;
  activeBuyOrders:     number;
  activeListings:      number;
  newListingsInPeriod: number;
  avgReputation:       number | null;
}

export async function getMarketPulse(period: TrendPeriod, game: Game | "all"): Promise<MarketPulseData> {
  const admin   = createAdminClient();
  const days    = periodToDays(period);
  const now     = new Date();
  const curFrom = addDays(now, -days).toISOString();
  const prevFrom = addDays(now, -days * 2).toISOString();

  try {
    const [curRes, prevRes, buyRes, listRes, newListRes] = await Promise.all([
      // Current period completed transactions
      admin.from("transactions")
        .select("price, card_id, seller_id, cards!card_id(game)")
        .eq("status", "completed")
        .gte("completed_at", curFrom),

      // Previous period completed transactions
      admin.from("transactions")
        .select("price, card_id, cards!card_id(game)")
        .eq("status", "completed")
        .gte("completed_at", prevFrom)
        .lt("completed_at", curFrom),

      // Active buy orders
      admin.from("buy_orders")
        .select("card_id, cards!card_id(game)", { count: "exact", head: game !== "all" })
        .eq("status", "active"),

      // Active listings
      admin.from("listings")
        .select("card_id, created_at, cards!card_id(game)", { count: "exact", head: game !== "all" })
        .eq("status", "active"),

      // New listings in period
      admin.from("listings")
        .select("card_id, cards!card_id(game)", { count: "exact", head: game !== "all" })
        .eq("status", "active")
        .gte("created_at", curFrom),
    ]);

    type TxRow  = { price: number; card_id: string; seller_id: string; cards: { game: string } | null };
    type ObjRow = { card_id: string; cards: { game: string } | null };

    function filterByGame<T extends { cards: { game: string } | null }>(rows: T[]): T[] {
      if (game === "all") return rows;
      return rows.filter((r) => r.cards?.game === game);
    }

    const curTx  = filterByGame((curRes.data  ?? []) as TxRow[]);
    const prevTx = filterByGame((prevRes.data ?? []) as TxRow[]);

    const curVolume  = curTx.reduce((s, r)  => s + (r.price ?? 0), 0);
    const prevVolume = prevTx.reduce((s, r) => s + (r.price ?? 0), 0);
    const curCount   = curTx.length;
    const prevCount  = prevTx.length;

    const volumeChange = prevVolume > 0 ? ((curVolume - prevVolume) / prevVolume) * 100 : null;
    const txChange     = prevCount  > 0 ? ((curCount  - prevCount)  / prevCount)  * 100 : null;

    let activeBuyOrders = 0;
    let activeListings  = 0;
    let newListings      = 0;

    if (game === "all") {
      activeBuyOrders = buyRes.count   ?? 0;
      activeListings  = listRes.count  ?? 0;
      newListings     = newListRes.count ?? 0;
    } else {
      activeBuyOrders = filterByGame((buyRes.data    ?? []) as ObjRow[]).length;
      activeListings  = filterByGame((listRes.data   ?? []) as ObjRow[]).length;
      newListings     = filterByGame((newListRes.data ?? []) as ObjRow[]).length;
    }

    // Avg reputation of active sellers in period
    const sellerIds = [...new Set(curTx.map((t) => t.seller_id).filter(Boolean))];
    let avgReputation: number | null = null;
    if (sellerIds.length) {
      const { data: repData } = await admin.from("profiles")
        .select("reputation_score")
        .in("id", sellerIds.slice(0, 100));
      if (repData?.length) {
        avgReputation = repData.reduce((s, r) => s + (r.reputation_score ?? 0), 0) / repData.length;
      }
    }

    return { volume: curVolume, volumeChange, txCount: curCount, txCountChange: txChange, activeBuyOrders, activeListings, newListingsInPeriod: newListings, avgReputation };
  } catch {
    return { volume: 0, volumeChange: null, txCount: 0, txCountChange: null, activeBuyOrders: 0, activeListings: 0, newListingsInPeriod: 0, avgReputation: null };
  }
}

// ─── 2. Top Sales ─────────────────────────────────────────────────────────────

export interface TopSaleItem {
  rank:        number;
  rankChange:  string; // "new" | "up:4" | "down:2" | "="
  card:        TrendCard;
  saleCount:   number;
  medianPrice: number;
  totalVolume: number;
  activeListings: number;
}

export async function getTopSales(period: TrendPeriod, game: Game | "all", limit = 3): Promise<TopSaleItem[]> {
  const admin   = createAdminClient();
  const days    = periodToDays(period);
  const now     = new Date();
  const curFrom = addDays(now, -days).toISOString();
  const prevFrom = addDays(now, -days * 2).toISOString();

  try {
    const [curRes, prevRes] = await Promise.all([
      admin.from("transactions")
        .select("price, card_id, cards!card_id(id, name, set_name, set_code, game, image_url, image_override_url)")
        .eq("status", "completed")
        .gte("completed_at", curFrom),
      admin.from("transactions")
        .select("price, card_id")
        .eq("status", "completed")
        .gte("completed_at", prevFrom)
        .lt("completed_at", curFrom),
    ]);

    type CurRow = { price: number; card_id: string; cards: { id: string; name: string; set_name: string | null; set_code: string | null; game: string; image_url: string | null; image_override_url: string | null } | null };
    const rows = (curRes.data ?? []) as CurRow[];
    const filtered = game === "all" ? rows : rows.filter((r) => r.cards?.game === game);

    // Group by card_id
    const grouped = new Map<string, { prices: number[]; card: TrendCard }>();
    for (const r of filtered) {
      if (!r.cards) continue;
      if (!grouped.has(r.card_id)) {
        grouped.set(r.card_id, {
          prices: [],
          card: {
            id:        r.cards.id,
            name:      r.cards.name,
            set_name:  r.cards.set_name,
            set_code:  r.cards.set_code,
            game:      r.cards.game as Game,
            image_url: resolveImageUrl(r.cards),
          },
        });
      }
      grouped.get(r.card_id)!.prices.push(r.price ?? 0);
    }

    // Sort by count desc
    const ranked = [...grouped.entries()]
      .map(([card_id, { prices, card }]) => ({ card_id, card, prices }))
      .sort((a, b) => b.prices.length - a.prices.length)
      .slice(0, limit);

    // Previous period ranking
    const prevCounts = new Map<string, number>();
    for (const r of (prevRes.data ?? []) as { card_id: string }[]) {
      prevCounts.set(r.card_id, (prevCounts.get(r.card_id) ?? 0) + 1);
    }
    const prevRanked = [...prevCounts.entries()].sort((a, b) => b[1] - a[1]);
    const prevRankMap = new Map(prevRanked.map(([id], i) => [id, i + 1]));

    // Fetch active listing counts for ranked cards
    const cardIds = ranked.map((r) => r.card_id);
    const { data: listingData } = await admin.from("listings")
      .select("card_id")
      .in("card_id", cardIds)
      .eq("status", "active");
    const listingCounts = new Map<string, number>();
    for (const l of listingData ?? []) {
      listingCounts.set(l.card_id, (listingCounts.get(l.card_id) ?? 0) + 1);
    }

    return ranked.map(({ card_id, card, prices }, i) => {
      const rank     = i + 1;
      const prevRank = prevRankMap.get(card_id);
      let rankChange = "new";
      if (prevRank !== undefined) {
        if (prevRank === rank)        rankChange = "=";
        else if (prevRank > rank)     rankChange = `up:${prevRank}`;
        else                          rankChange = `down:${prevRank}`;
      }
      return {
        rank,
        rankChange,
        card,
        saleCount:      prices.length,
        medianPrice:    medianOf(prices),
        totalVolume:    prices.reduce((s, p) => s + p, 0),
        activeListings: listingCounts.get(card_id) ?? 0,
      };
    });
  } catch {
    return [];
  }
}

// ─── 3. Most Wanted ───────────────────────────────────────────────────────────

export interface WantedItem {
  rank:         number;
  card:         TrendCard;
  orderCount:   number;
  bestOffer:    number;
  demandRatio:  number; // 0–1
}

export async function getMostWanted(game: Game | "all", limit = 5): Promise<WantedItem[]> {
  const admin = createAdminClient();

  try {
    const { data } = await admin.from("buy_orders")
      .select("card_id, price, cards!card_id(id, name, set_name, set_code, game, image_url, image_override_url)")
      .eq("status", "active");

    type Row = { card_id: string; price: number; cards: { id: string; name: string; set_name: string | null; set_code: string | null; game: string; image_url: string | null; image_override_url: string | null } | null };
    const rows = (data ?? []) as Row[];
    const filtered = game === "all" ? rows : rows.filter((r) => r.cards?.game === game);

    const grouped = new Map<string, { prices: number[]; card: TrendCard }>();
    for (const r of filtered) {
      if (!r.cards) continue;
      if (!grouped.has(r.card_id)) {
        grouped.set(r.card_id, {
          prices: [],
          card: {
            id:        r.cards.id,
            name:      r.cards.name,
            set_name:  r.cards.set_name,
            set_code:  r.cards.set_code,
            game:      r.cards.game as Game,
            image_url: resolveImageUrl(r.cards),
          },
        });
      }
      grouped.get(r.card_id)!.prices.push(r.price ?? 0);
    }

    const sorted = [...grouped.entries()]
      .map(([, { prices, card }]) => ({ card, orderCount: prices.length, bestOffer: Math.max(...prices) }))
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, limit);

    const maxCount = sorted[0]?.orderCount ?? 1;

    return sorted.map((item, i) => ({
      rank:        i + 1,
      card:        item.card,
      orderCount:  item.orderCount,
      bestOffer:   item.bestOffer,
      demandRatio: item.orderCount / maxCount,
    }));
  } catch {
    return [];
  }
}

// ─── 4. Back in Stock ─────────────────────────────────────────────────────────

export interface BackInStockItem {
  card:           TrendCard;
  firstListingAt: string;
  price:          number;
  listingCount:   number;
}

export async function getBackInStock(game: Game | "all", limit = 8): Promise<BackInStockItem[]> {
  const admin  = createAdminClient();
  const since  = addDays(new Date(), -2).toISOString(); // last 48h

  try {
    const { data } = await admin.from("listings")
      .select("card_id, price, created_at, cards!card_id(id, name, set_name, set_code, game, image_url, image_override_url)")
      .eq("status", "active")
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    type Row = { card_id: string; price: number | null; created_at: string; cards: { id: string; name: string; set_name: string | null; set_code: string | null; game: string; image_url: string | null; image_override_url: string | null } | null };
    const rows = (data ?? []) as Row[];
    const filtered = game === "all" ? rows : rows.filter((r) => r.cards?.game === game);

    // One entry per card (first/most recent listing)
    const seen = new Map<string, BackInStockItem>();
    for (const r of filtered) {
      if (!r.cards || seen.size >= limit) break;
      if (!seen.has(r.card_id)) {
        seen.set(r.card_id, {
          card: {
            id:        r.cards.id,
            name:      r.cards.name,
            set_name:  r.cards.set_name,
            set_code:  r.cards.set_code,
            game:      r.cards.game as Game,
            image_url: resolveImageUrl(r.cards),
          },
          firstListingAt: r.created_at,
          price:          r.price ?? 0,
          listingCount:   1,
        });
      } else {
        seen.get(r.card_id)!.listingCount++;
      }
    }

    return [...seen.values()].slice(0, limit);
  } catch {
    return [];
  }
}

// ─── 5. Price Movers ──────────────────────────────────────────────────────────

export interface PriceMoverItem {
  rank:      number;
  card:      TrendCard;
  prevPrice: number;
  currPrice: number;
  changePct: number;
}

export interface PriceMoversData {
  up:   PriceMoverItem[];
  down: PriceMoverItem[];
}

export async function getPriceMovers(period: TrendPeriod, game: Game | "all", limit = 4): Promise<PriceMoversData> {
  const admin   = createAdminClient();
  const days    = periodToDays(period);
  const now     = new Date();
  const curFrom  = addDays(now, -days).toISOString();
  const prevFrom = addDays(now, -days * 2).toISOString();

  try {
    const [curRes, prevRes] = await Promise.all([
      admin.from("transactions")
        .select("price, card_id, cards!card_id(id, name, set_name, set_code, game, image_url, image_override_url)")
        .eq("status", "completed")
        .gte("completed_at", curFrom),
      admin.from("transactions")
        .select("price, card_id")
        .eq("status", "completed")
        .gte("completed_at", prevFrom)
        .lt("completed_at", curFrom),
    ]);

    type CurRow = { price: number; card_id: string; cards: { id: string; name: string; set_name: string | null; set_code: string | null; game: string; image_url: string | null; image_override_url: string | null } | null };
    const curRows = (curRes.data ?? []) as CurRow[];
    const filtered = game === "all" ? curRows : curRows.filter((r) => r.cards?.game === game);

    // Group current period by card_id
    const curMap = new Map<string, { prices: number[]; card: TrendCard }>();
    for (const r of filtered) {
      if (!r.cards) continue;
      if (!curMap.has(r.card_id)) {
        curMap.set(r.card_id, {
          prices: [],
          card: { id: r.cards.id, name: r.cards.name, set_name: r.cards.set_name, set_code: r.cards.set_code, game: r.cards.game as Game, image_url: resolveImageUrl(r.cards) },
        });
      }
      curMap.get(r.card_id)!.prices.push(r.price ?? 0);
    }

    // Group previous period by card_id
    const prevMap = new Map<string, number[]>();
    for (const r of (prevRes.data ?? []) as { card_id: string; price: number }[]) {
      if (!prevMap.has(r.card_id)) prevMap.set(r.card_id, []);
      prevMap.get(r.card_id)!.push(r.price ?? 0);
    }

    // Compute % change for cards with data in both periods (min 3 sales each)
    const movers: (PriceMoverItem & { abs: number })[] = [];
    for (const [card_id, { prices, card }] of curMap) {
      const prevPrices = prevMap.get(card_id);
      if (!prevPrices || prices.length < 3 || prevPrices.length < 3) continue;
      const curr = medianOf(prices);
      const prev = medianOf(prevPrices);
      if (prev === 0) continue;
      const changePct = ((curr - prev) / prev) * 100;
      movers.push({ rank: 0, card, prevPrice: prev, currPrice: curr, changePct, abs: Math.abs(changePct) });
    }

    movers.sort((a, b) => b.abs - a.abs);

    const up   = movers.filter((m) => m.changePct > 0).slice(0, limit).map((m, i) => ({ ...m, rank: i + 1 }));
    const down = movers.filter((m) => m.changePct < 0).slice(0, limit).map((m, i) => ({ ...m, rank: i + 1 }));

    return { up, down };
  } catch {
    return { up: [], down: [] };
  }
}

// ─── 6. Top Sellers ───────────────────────────────────────────────────────────

export interface TopSellerItem {
  profile: {
    id:               string;
    username:         string;
    avatar_url:       string | null;
    reputation_score: number;
    total_sales:      number;
  };
  salesInPeriod: number;
}

export async function getTopSellers(period: TrendPeriod, game: Game | "all", limit = 4): Promise<TopSellerItem[]> {
  const admin   = createAdminClient();
  const days    = periodToDays(period);
  const curFrom = addDays(new Date(), -days).toISOString();

  try {
    const { data } = await admin.from("transactions")
      .select("seller_id, cards!card_id(game)")
      .eq("status", "completed")
      .gte("completed_at", curFrom);

    type Row = { seller_id: string; cards: { game: string } | null };
    const rows = (data ?? []) as Row[];
    const filtered = game === "all" ? rows : rows.filter((r) => r.cards?.game === game);

    const counts = new Map<string, number>();
    for (const r of filtered) {
      counts.set(r.seller_id, (counts.get(r.seller_id) ?? 0) + 1);
    }

    const topSellerIds = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    if (!topSellerIds.length) return [];

    const { data: profiles } = await admin.from("profiles")
      .select("id, username, avatar_url, reputation_score, total_sales")
      .in("id", topSellerIds);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    return topSellerIds
      .map((id) => {
        const p = profileMap.get(id);
        if (!p) return null;
        return { profile: p, salesInPeriod: counts.get(id) ?? 0 };
      })
      .filter(Boolean) as TopSellerItem[];
  } catch {
    return [];
  }
}

// ─── 7. Live Feed ─────────────────────────────────────────────────────────────

export interface LiveFeedItem {
  transactionId:  string;
  completedAt:    string;
  card:           { name: string; game: Game; set_name: string | null };
  price:          number;
  sellerUsername: string;
  isBuyOrder:     boolean;
}

export async function getRecentTransactions(game: Game | "all", limit = 10): Promise<LiveFeedItem[]> {
  const admin = createAdminClient();

  try {
    const { data } = await admin.from("transactions")
      .select("id, completed_at, price, buy_order_id, seller_id, cards!card_id(name, game, set_name)")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(game === "all" ? limit : limit * 3);

    type Row = { id: string; completed_at: string | null; price: number; buy_order_id: string | null; seller_id: string; cards: { name: string; game: string; set_name: string | null } | null };
    const rows = (data ?? []) as Row[];
    const filtered = game === "all" ? rows : rows.filter((r) => r.cards?.game === game);
    const sliced   = filtered.slice(0, limit);

    if (!sliced.length) return [];

    const sellerIds = [...new Set(sliced.map((r) => r.seller_id))];
    const { data: profiles } = await admin.from("profiles")
      .select("id, username")
      .in("id", sellerIds);
    const usernameMap = new Map((profiles ?? []).map((p) => [p.id, p.username]));

    return sliced.map((r) => ({
      transactionId:  r.id,
      completedAt:    r.completed_at ?? new Date().toISOString(),
      card:           { name: r.cards?.name ?? "—", game: (r.cards?.game ?? "magic") as Game, set_name: r.cards?.set_name ?? null },
      price:          r.price ?? 0,
      sellerUsername: usernameMap.get(r.seller_id) ?? "—",
      isBuyOrder:     Boolean(r.buy_order_id),
    }));
  } catch {
    return [];
  }
}
