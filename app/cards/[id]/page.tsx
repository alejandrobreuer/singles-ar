import * as React from "react";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { subDays } from "date-fns";
import {
  ChevronRight, ShoppingCart, Heart, TrendingUp, Info,
} from "lucide-react";
import { createClient }       from "@/lib/supabase/server";
import { createAdminClient }  from "@/lib/supabase/admin";
import { setLabel }           from "@/lib/formatting";
import { fantasyName }        from "@/lib/fantasy-name";
import { Badge }              from "@/components/ui/badge";
import { Button }             from "@/components/ui/button";
import { Divider }            from "@/components/ui/divider";
import { BuyListingSection }  from "@/components/cards/BuyListingSection";
import { BuyOrdersSection }   from "@/components/buyorders/BuyOrdersSection";
import { WishlistButton }     from "@/components/cards/WishlistButton";
import { CardImageZoom }      from "@/components/cards/CardImageZoom";

const PriceChart = dynamic(
  () => import("@/components/cards/PriceChart").then((m) => ({ default: m.PriceChart })),
  {
    ssr:     false,
    loading: () => <div className="h-44 w-full rounded-lg bg-secondary animate-pulse" />,
  }
);
import type {
  Card, ListingWithSeller, BuyOrderWithBuyer, PriceHistory, Game,
} from "@/types/database";

// ─── ISR — rebuild card pages at most every 60 seconds ───────────────────────

export const revalidate = 60;

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("cards_with_listing_stats")
    .select("id, name, set_name, game, image_url, listing_count, lowest_price")
    .eq("id", params.id)
    .single();

  if (!data) return { title: "Carta no encontrada — Card Stash" };

  const baseUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "https://cardstash.ar";
  const title      = `${data.name} — Card Stash`;
  const setLabel   = data.set_name ? ` (${data.set_name})` : "";
  const priceLabel = data.listing_count > 0 && data.lowest_price != null
    ? ` ${data.listing_count} listings desde $${Math.round(data.lowest_price).toLocaleString("es-AR")} ARS.`
    : "";
  const description = `Comprá ${data.name}${setLabel} en Card Stash.${priceLabel}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url:    `${baseUrl}/cards/${data.id}`,
      images: data.image_url ? [{ url: data.image_url, width: 488, height: 680, alt: data.name }] : [],
    },
    twitter: {
      card:        "summary",
      title,
      description,
      images:      data.image_url ? [data.image_url] : [],
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GAME_LABELS: Record<Game, string> = {
  magic:    "Magic: The Gathering",
  pokemon:  "Pokémon TCG",
  onepiece: "One Piece TCG",
};

const GAME_BADGE_VARIANT: Record<Game, React.ComponentProps<typeof Badge>["variant"]> = {
  magic:    "magic",
  pokemon:  "poke",
  onepiece: "op",
};

const RARITY_LABELS: Record<string, string> = {
  common:   "Común",
  uncommon: "Infrecuente",
  rare:     "Rara",
  mythic:   "Mítica",
  special:  "Especial",
};

function formatARS(price: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(price);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CardDetailPage({
  params,
  searchParams,
}: {
  params:       { id: string };
  searchParams: { highlight?: string };
}) {
  const supabase  = createClient();
  const thirtyAgo = subDays(new Date(), 30).toISOString();

  // ── Auth: get current user + MP connection status ──────────────────────────
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();

  let currentUserHasMp = false;
  if (user) {
    const { data: profile } = await admin
      .from("profiles")
      .select("mercadopago_user_id")
      .eq("id", user.id)
      .single();
    currentUserHasMp = !!profile?.mercadopago_user_id;
  }

  // ── Parallel data fetches ──────────────────────────────────────────────────

  const [cardResult, listingsResult, buyOrdersResult, priceHistoryResult, wishlistResult] =
    await Promise.all([
      // Cards are public — use admin client to bypass any missing RLS policy
      admin
        .from("cards")
        .select("*")
        .eq("id", params.id)
        .single(),

      supabase
        .from("listings")
        .select(`
          *,
          profiles (
            id, username, avatar_url, reputation_score, total_sales
          )
        `)
        .eq("card_id", params.id)
        .in("status", ["active", "reserved"])
        .order("price", { ascending: true })
        .limit(20),

      supabase
        .from("buy_orders")
        .select(`
          *,
          profiles!buyer_id (
            id, username, avatar_url, reputation_score, total_sales, is_reliable_buyer
          )
        `)
        .eq("card_id", params.id)
        .eq("status", "active")
        .order("price", { ascending: false })
        .limit(10),

      supabase
        .from("price_history")
        .select("*")
        .eq("card_id", params.id)
        .gte("recorded_at", thirtyAgo)
        .order("recorded_at", { ascending: true }),

      user
        ? admin
            .from("wishlist")
            .select("id")
            .eq("user_id", user.id)
            .eq("card_id", params.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

  if (cardResult.error || !cardResult.data) notFound();

  const card         = cardResult.data           as Card;
  const listings     = (listingsResult.data  ?? []) as ListingWithSeller[];
  const buyOrders    = (buyOrdersResult.data ?? []) as BuyOrderWithBuyer[];
  const priceHistory = (priceHistoryResult.data ?? []) as PriceHistory[];
  const inWishlist   = !!wishlistResult.data;

  // Platform median from completed transactions (last 30 days)
  const platformPrices = priceHistory
    .map((h) => h.price_ars)
    .filter((p): p is number => p != null)
    .sort((a, b) => a - b);
  const platformMedian = platformPrices.length > 0
    ? platformPrices[Math.floor(platformPrices.length / 2)]
    : null;

  const lowestListing   = listings[0];
  const highestBuyOrder = buyOrders[0];

  return (
    <div className="min-h-screen bg-background">

      {/* ── Breadcrumb ────────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-surface">
        <nav className="mx-auto max-w-site px-4 sm:px-6 lg:px-8 h-10 flex items-center gap-1.5 text-xs text-text-muted font-sans">
          <Link href="/cards" className="hover:text-text-primary transition-colors no-underline">
            Explorar
          </Link>
          <ChevronRight size={12} />
          <Link href={`/cards?game=${card.game}`} className="hover:text-text-primary transition-colors no-underline capitalize">
            {GAME_LABELS[card.game]}
          </Link>
          <ChevronRight size={12} />
          <span className="text-text-primary truncate max-w-[180px]">{card.name}</span>
        </nav>
      </div>

      {/* ── Main layout ───────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">

          {/* ════════════════════════════════════════════════════════════════
              LEFT COLUMN
          ════════════════════════════════════════════════════════════════ */}
          <div className="flex flex-col gap-6">

            {/* ── Card image + metadata row ──────────────────────────────── */}
            <div className="flex gap-6 items-start">
              {/* Image */}
              <div className="shrink-0 w-44 sm:w-52">
                <CardImageZoom src={card.image_url ?? null} alt={card.name} />
              </div>

              {/* Metadata */}
              <div className="flex-1 min-w-0 pt-1">
                {/* Game badge */}
                <Badge variant={GAME_BADGE_VARIANT[card.game]} className="mb-3" />

                <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-text-primary leading-snug mb-1">
                  {card.name}
                </h1>

                <p className="text-base text-text-secondary font-sans mb-4">
                  {card.set_name}
                </p>

                {/* Meta grid */}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm mb-5">
                  {([
                    { label: "Set",    value: setLabel(card.set_code, card.set_name) },
                    { label: "ID",     value: card.external_id },
                    { label: "Rareza", value: RARITY_LABELS[card.rarity?.toLowerCase() ?? ""] ?? card.rarity ?? "—" },
                    ...(card.color ? [{ label: "Color", value: card.color }] : []),
                  ] as { label: string; value: string }[]).map(({ label, value }) => (
                    <div key={label}>
                      <dt className="text-xs text-text-muted font-sans uppercase tracking-wide mb-0.5">{label}</dt>
                      <dd className="font-sans font-medium text-text-primary truncate">{value}</dd>
                    </div>
                  ))}
                </dl>

                {/* Quick stats */}
                <div className="flex flex-wrap gap-3">
                  <div className="flex flex-col">
                    <span className="text-2xs text-text-muted font-sans uppercase tracking-wide">En venta</span>
                    <span className="text-lg font-price text-text-primary">{listings.length}</span>
                  </div>
                  {lowestListing && (
                    <div className="flex flex-col">
                      <span className="text-2xs text-text-muted font-sans uppercase tracking-wide">Precio más bajo</span>
                      <span className="text-lg font-price text-text-primary">{lowestListing.price != null ? formatARS(lowestListing.price) : "—"}</span>
                    </div>
                  )}
                  {highestBuyOrder && (
                    <div className="flex flex-col">
                      <span className="text-2xs text-text-muted font-sans uppercase tracking-wide">Mejor oferta de compra</span>
                      <span className="text-lg font-price text-success">{formatARS(highestBuyOrder.price)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Divider />

            {/* ── Listings section ───────────────────────────────────────── */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-serif font-semibold text-text-primary">
                  Ofertas de venta
                </h2>
                <span className="text-sm text-text-muted font-sans">
                  {listings.length} {listings.length === 1 ? "vendedor" : "vendedores"}
                </span>
              </div>

              <BuyListingSection
                listings={listings}
                card={card}
                currentUserId={user?.id ?? null}
              />
            </section>

            <Divider />

            {/* ── Buy orders section ─────────────────────────────────────── */}
            <section id="buy-orders">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-serif font-semibold text-text-primary">
                    Órdenes de compra
                  </h2>
                  <p className="text-xs text-text-muted font-sans mt-0.5">
                    {buyOrders.length} {buyOrders.length === 1 ? "comprador buscando esta carta" : "compradores buscando esta carta"}
                  </p>
                </div>
              </div>

              <BuyOrdersSection
                initialOrders={buyOrders}
                currentUserId={user?.id ?? null}
                currentUserHasMp={currentUserHasMp}
                cardId={card.id}
                card={card}
                highlightOrderId={searchParams.highlight}
              />
            </section>

          </div>

          {/* ════════════════════════════════════════════════════════════════
              RIGHT SIDEBAR
          ════════════════════════════════════════════════════════════════ */}
          <aside className="flex flex-col gap-5">

            {/* ── Price reference card ───────────────────────────────────── */}
            <div className="surface-raised p-5">
              <h3 className="text-sm font-semibold font-sans text-text-secondary uppercase tracking-wide mb-4">
                Referencia de precio
              </h3>

              {/* Platform median */}
              <div className="flex items-start justify-between gap-2 mb-4">
                <div>
                  <p className="text-xs text-text-muted font-sans mb-0.5 flex items-center gap-1">
                    <TrendingUp size={11} />
                    Mediana Card Stash
                  </p>
                  <p className="font-price text-2xl text-text-primary">
                    {platformMedian != null ? formatARS(platformMedian) : "—"}
                  </p>
                  {platformPrices.length > 0 && (
                    <p className="text-2xs text-text-muted font-sans mt-0.5">
                      {platformPrices.length} transacciones (30 días)
                    </p>
                  )}
                </div>
              </div>

              {/* Local market price */}
              {lowestListing && (
                <div className="bg-secondary rounded-lg px-4 py-3 mb-4">
                  <p className="text-xs text-text-muted font-sans mb-0.5">Precio más bajo en Card Stash</p>
                  <p className="font-price text-xl text-text-primary">
                    {lowestListing.price != null ? formatARS(lowestListing.price) : "—"}
                  </p>
                  <p className="text-xs text-text-muted font-sans mt-0.5">
                    {lowestListing.condition} · {fantasyName(lowestListing.id)}
                  </p>
                </div>
              )}

              {/* CTA */}
              {lowestListing ? (
                <Button variant="primary" size="lg" className="w-full" leftIcon={<ShoppingCart size={16} />}>
                  Comprar al mejor precio
                </Button>
              ) : (
                <WishlistButton
                  cardId={card.id}
                  initialState={inWishlist}
                  isLoggedIn={!!user}
                  variant="sidebar"
                  className="w-full justify-center"
                />
              )}
            </div>

            {/* ── Sell / buy order CTA ───────────────────────────────────── */}
            {user && (
              <div className="surface-raised p-5 flex flex-col gap-3">
                <p className="text-sm font-semibold text-text-primary font-sans">
                  ¿Tenés esta carta?
                </p>
                <Link href={`/sell?${new URLSearchParams({
                  card_id:     card.id,
                  name:        card.name,
                  game:        card.game,
                  external_id: card.external_id ?? "",
                  image_url:   card.image_override_url ?? card.image_url ?? "",
                  set_name:    card.set_name   ?? "",
                  set_code:    card.set_code   ?? "",
                  card_number: card.card_number ?? "",
                  rarity:      card.rarity     ?? "",
                  color:       card.color      ?? "",
                })}`}>
                  <Button variant="secondary" size="md" className="w-full" leftIcon={<TrendingUp size={15} />}>
                    Publicar listing de venta
                  </Button>
                </Link>
                <Link href={`/buy-orders/new?card_id=${card.id}&card_name=${encodeURIComponent(card.name)}&card_set=${encodeURIComponent(card.set_name ?? "")}&card_image=${encodeURIComponent(card.image_url ?? "")}&card_game=${card.game}`}>
                  <Button variant="ghost" size="md" className="w-full">
                    Crear orden de compra
                  </Button>
                </Link>
              </div>
            )}

            {/* ── Price chart ────────────────────────────────────────────── */}
            <div className="surface-raised p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold font-sans text-text-secondary uppercase tracking-wide">
                  Historial (30 días)
                </h3>
                <span className="flex items-center gap-1 text-2xs text-text-muted font-sans">
                  <span className="size-2 rounded-full bg-success" />
                  Card Stash
                </span>
              </div>

              <PriceChart history={priceHistory} />

              {priceHistory.length === 0 && (
                <p className="text-xs text-text-muted font-sans text-center mt-2">
                  No hay datos suficientes para mostrar el historial.
                </p>
              )}
            </div>

            {/* ── Wishlist / alert CTA ───────────────────────────────────── */}
            <div className="surface-raised p-5">
              <div className="flex items-start gap-3">
                <Heart size={18} className="shrink-0 mt-0.5 text-accent" />
                <div>
                  <p className="text-sm font-semibold text-text-primary font-sans mb-1">
                    ¿Querés esta carta?
                  </p>
                  <p className="text-xs text-text-muted font-sans leading-relaxed mb-3">
                    Agregala a tu lista de deseos y te avisamos cuando haya una oferta a tu precio.
                  </p>
                  <WishlistButton
                    cardId={card.id}
                    initialState={inWishlist}
                    isLoggedIn={!!user}
                  />
                </div>
              </div>
            </div>

            {/* ── Info note ─────────────────────────────────────────────── */}
            <div className="flex gap-2.5 text-xs text-text-muted font-sans">
              <Info size={13} className="shrink-0 mt-0.5" />
              <p>
                Los precios en ARS son orientativos y los fijan los vendedores
                individuales. Card Stash no garantiza la disponibilidad de la carta.
              </p>
            </div>

          </aside>
        </div>
      </div>
    </div>
  );
}

