import { createAdminClient }                              from "@/lib/supabase/admin";
import { MarketClient }                                   from "./MarketClient";
import type { ActiveBuyOrder, TrendingCard, PriceMover }  from "./MarketClient";

export const revalidate = 60;

export default async function MarketPage() {
  const admin = createAdminClient();

  // ── Active buy orders ─────────────────────────────────────────────────────
  const { data: ordersRaw } = await admin
    .from("buy_orders")
    .select(`
      id, price, quantity, expires_at, created_at,
      cards ( id, name, image_url, image_override_url, game ),
      profiles!buyer_id ( username )
    `)
    .eq("status", "active")
    .order("price", { ascending: false })
    .limit(50);

  const activeOrders = (ordersRaw ?? []) as unknown as ActiveBuyOrder[];

  // ── Most-wanted: aggregate wishlist counts then fetch card details ─────────
  const { data: wishlistRows } = await admin
    .from("wishlist")
    .select("card_id");

  const countMap = new Map<string, number>();
  for (const row of wishlistRows ?? []) {
    countMap.set(row.card_id, (countMap.get(row.card_id) ?? 0) + 1);
  }

  const top15Ids = Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([id]) => id);

  let trendingCards: TrendingCard[] = [];

  if (top15Ids.length > 0) {
    const { data: cardRows } = await admin
      .from("cards_with_listing_stats")
      .select("id, name, image_url, game, lowest_price, listing_count")
      .in("id", top15Ids);

    trendingCards = (cardRows ?? [])
      .map((c) => ({
        id:            c.id            as string,
        name:          c.name          as string,
        image_url:     c.image_url     as string | null,
        game:          c.game          as TrendingCard["game"],
        lowest_price:  c.lowest_price  as number | null,
        listing_count: c.listing_count as number,
        wishlist_count: countMap.get(c.id) ?? 0,
      }))
      .sort((a, b) => b.wishlist_count - a.wishlist_count);
  }

  // ── Price movers: compare oldest vs newest active listing per card ───────────
  // Ordered ascending so first-seen = oldest listing, last-seen = newest listing.
  const { data: listingRows } = await admin
    .from("listings")
    .select("card_id, price, created_at")
    .eq("status", "active")
    .eq("listing_type", "sale")
    .order("created_at", { ascending: true });

  // Per card: track oldest and newest active listing price.
  // Cards with only 1 listing will have oldest === newest and be filtered out.
  const priceMap = new Map<string, { oldest: number; newest: number; count: number }>();
  for (const row of listingRows ?? []) {
    const p = row.price as number;
    const existing = priceMap.get(row.card_id);
    if (!existing) {
      priceMap.set(row.card_id, { oldest: p, newest: p, count: 1 });
    } else {
      priceMap.set(row.card_id, { oldest: existing.oldest, newest: p, count: existing.count + 1 });
    }
  }

  // Only cards with ≥2 active listings; split by direction
  const riserEntries  = Array.from(priceMap.entries()).filter(([, p]) => p.count >= 2 && p.newest > p.oldest);
  const fallerEntries = Array.from(priceMap.entries()).filter(([, p]) => p.count >= 2 && p.newest < p.oldest);

  const riserIds = riserEntries
    .sort((a, b) => (b[1].newest - b[1].oldest) / b[1].oldest - (a[1].newest - a[1].oldest) / a[1].oldest)
    .slice(0, 15).map(([id]) => id);

  const fallerIds = fallerEntries
    .sort((a, b) => (a[1].newest - a[1].oldest) / a[1].oldest - (b[1].newest - b[1].oldest) / b[1].oldest)
    .slice(0, 15).map(([id]) => id);

  const allMoverIds = Array.from(new Set(riserIds.concat(fallerIds)));

  let priceRisers:  PriceMover[] = [];
  let priceFallers: PriceMover[] = [];

  if (allMoverIds.length > 0) {
    const { data: moverCardRows } = await admin
      .from("cards_with_listing_stats")
      .select("id, name, image_url, game")
      .in("id", allMoverIds);

    const toMover = (c: { id: string; name: string; image_url: unknown; game: unknown }): PriceMover => {
      const p = priceMap.get(c.id)!;
      return {
        id:        c.id        as string,
        name:      c.name      as string,
        image_url: c.image_url as string | null,
        game:      c.game      as PriceMover["game"],
        prevPrice: p.oldest,
        currPrice: p.newest,
        pctChange: Math.round(((p.newest - p.oldest) / p.oldest) * 100),
      };
    };

    const cardMap = new Map((moverCardRows ?? []).map((c) => [c.id, c]));

    priceRisers = riserIds
      .map((id) => cardMap.get(id)).filter(Boolean)
      .map((c) => toMover(c!))
      .sort((a, b) => b.pctChange - a.pctChange);

    priceFallers = fallerIds
      .map((id) => cardMap.get(id)).filter(Boolean)
      .map((c) => toMover(c!))
      .sort((a, b) => a.pctChange - b.pctChange);
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-primary py-12">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold font-serif text-white">Mercado</h1>
          <p className="mt-2 text-sm font-sans text-white/70 max-w-lg">
            El pulso del mercado TCG en Argentina — órdenes de compra activas, cartas en tendencia y movimientos de precio en tiempo real.
          </p>
        </div>
      </section>

      <div className="px-10 py-10">
        <MarketClient
          orders={activeOrders}
          trendingCards={trendingCards}
          priceRisers={priceRisers}
          priceFallers={priceFallers}
        />
      </div>
    </div>
  );
}
