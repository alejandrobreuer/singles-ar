import * as React from "react";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { subDays } from "date-fns";
import {
  Tag, ChevronRight, ShoppingCart, Heart,
  TrendingUp, AlertCircle, ExternalLink, Info, Plus,
} from "lucide-react";
import { createClient }       from "@/lib/supabase/server";
import { createAdminClient }  from "@/lib/supabase/admin";
import { getCardPrice }       from "@/lib/tcgplayer";
import { Badge }              from "@/components/ui/badge";
import { Button }             from "@/components/ui/button";
import { Divider }            from "@/components/ui/divider";
import { Topbar }             from "@/components/layout/Topbar";
import { ListingRow }         from "@/components/cards/ListingRow";
import { BuyOrdersSection }   from "@/components/buyorders/BuyOrdersSection";

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

  if (!data) return { title: "Carta no encontrada — Singles.ar" };

  const baseUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "https://singles.ar";
  const title      = `${data.name} — Singles.ar`;
  const setLabel   = data.set_name ? ` (${data.set_name})` : "";
  const priceLabel = data.listing_count > 0 && data.lowest_price != null
    ? ` ${data.listing_count} listings desde $${Math.round(data.lowest_price).toLocaleString("es-AR")} ARS.`
    : "";
  const description = `Comprá ${data.name}${setLabel} en Singles.ar.${priceLabel}`;

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

function formatUSD(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2,
  }).format(price);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CardDetailPage({ params }: { params: { id: string } }) {
  const supabase  = createClient();
  const thirtyAgo = subDays(new Date(), 30).toISOString();

  // ── Auth: get current user + MP connection status ──────────────────────────
  const { data: { user } } = await supabase.auth.getUser();

  let currentUserHasMp = false;
  if (user) {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("mercadopago_user_id")
      .eq("id", user.id)
      .single();
    currentUserHasMp = !!profile?.mercadopago_user_id;
  }

  // ── Parallel data fetches ──────────────────────────────────────────────────
  const [cardResult, listingsResult, buyOrdersResult, priceHistoryResult] =
    await Promise.all([
      supabase
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
        .eq("status", "active")
        .order("price", { ascending: true })
        .limit(20),

      supabase
        .from("buy_orders")
        .select(`
          *,
          profiles (
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
    ]);

  if (cardResult.error || !cardResult.data) notFound();

  const card         = cardResult.data           as Card;
  const listings     = (listingsResult.data  ?? []) as ListingWithSeller[];
  const buyOrders    = (buyOrdersResult.data ?? []) as BuyOrderWithBuyer[];
  const priceHistory = (priceHistoryResult.data ?? []) as PriceHistory[];

  // TCGPlayer price (uses cache, non-blocking on failure)
  const tcgPrice = card.tcgplayer_id
    ? await getCardPrice(card.id, card.tcgplayer_id).catch(() => null)
    : null;

  const lowestListing   = listings[0];
  const highestBuyOrder = buyOrders[0];

  return (
    <div className="min-h-screen bg-background">
      <Topbar />

      {/* ── Breadcrumb ────────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-surface">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-10 flex items-center gap-1.5 text-xs text-text-muted font-sans">
          <Link href="/" className="hover:text-text-primary transition-colors no-underline">
            Inicio
          </Link>
          <ChevronRight size={12} />
          <Link href={`/?game=${card.game}`} className="hover:text-text-primary transition-colors no-underline capitalize">
            {GAME_LABELS[card.game]}
          </Link>
          <ChevronRight size={12} />
          <span className="text-text-primary truncate max-w-[180px]">{card.name}</span>
        </nav>
      </div>

      {/* ── Main layout ───────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">

          {/* ════════════════════════════════════════════════════════════════
              LEFT COLUMN
          ════════════════════════════════════════════════════════════════ */}
          <div className="flex flex-col gap-6">

            {/* ── Card image + metadata row ──────────────────────────────── */}
            <div className="flex gap-6 items-start">
              {/* Image */}
              <div className="shrink-0 w-44 sm:w-52">
                <div className="relative rounded-xl overflow-hidden shadow-card-lg border border-border aspect-[2.5/3.5] bg-secondary">
                  {card.image_url ? (
                    <Image
                      src={card.image_url}
                      alt={card.name}
                      fill
                      sizes="(max-width: 640px) 176px, 208px"
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Tag size={36} className="text-border" />
                    </div>
                  )}
                </div>
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
                  {[
                    { label: "Set",      value: card.set_name ?? "—" },
                    { label: "Código",   value: card.set_code?.toUpperCase() ?? "—" },
                    { label: "Número",   value: card.card_number ?? "—" },
                    { label: "Rareza",   value: RARITY_LABELS[card.rarity?.toLowerCase() ?? ""] ?? card.rarity ?? "—" },
                  ].map(({ label, value }) => (
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
                      <span className="text-lg font-price text-text-primary">{formatARS(lowestListing.price)}</span>
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

              {listings.length === 0 ? (
                <EmptySection
                  icon={<ShoppingCart size={22} className="text-text-muted" />}
                  title="Sin ofertas activas"
                  description="Nadie está vendiendo esta carta en este momento."
                  cta={
                    <Link href="/sell">
                      <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium font-sans hover:bg-primary/90 transition-colors">
                        <Plus size={13} />
                        Sé el primero en vender esta carta
                      </button>
                    </Link>
                  }
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {listings.map((listing) => (
                    <ListingRow key={listing.id} listing={listing} />
                  ))}
                </div>
              )}
            </section>

            <Divider />

            {/* ── Buy orders section ─────────────────────────────────────── */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-serif font-semibold text-text-primary">
                    Órdenes de compra
                  </h2>
                  <p className="text-xs text-text-muted font-sans mt-0.5">
                    {buyOrders.length} {buyOrders.length === 1 ? "comprador buscando esta carta" : "compradores buscando esta carta"}
                  </p>
                </div>
                {user && (
                  <Link href={`/buy-orders/new?card_id=${card.id}`}>
                    <Button variant="secondary" size="sm" leftIcon={<Plus size={14} />}>
                      Crear orden
                    </Button>
                  </Link>
                )}
              </div>

              {buyOrders.length === 0 && (
                <div className="mb-4">
                  <EmptySection
                    icon={<TrendingUp size={22} className="text-text-muted" />}
                    title="Sin órdenes de compra"
                    description="Publicá tu precio y los vendedores te contactarán."
                    cta={
                      user ? (
                        <Link href={`/buy-orders/new?card_id=${card.id}`}>
                          <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface border border-border text-sm font-medium font-sans text-text-secondary hover:bg-secondary transition-colors">
                            <Plus size={13} />
                            Publicar un buy order
                          </button>
                        </Link>
                      ) : (
                        <Link href="/login">
                          <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface border border-border text-sm font-medium font-sans text-text-secondary hover:bg-secondary transition-colors">
                            Iniciá sesión para comprar
                          </button>
                        </Link>
                      )
                    }
                  />
                </div>
              )}
              <BuyOrdersSection
                initialOrders={buyOrders}
                currentUserId={user?.id ?? null}
                currentUserHasMp={currentUserHasMp}
                cardId={card.id}
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

              {/* TCGPlayer price */}
              <div className="flex items-start justify-between gap-2 mb-4">
                <div>
                  <p className="text-xs text-text-muted font-sans mb-0.5 flex items-center gap-1">
                    TCGPlayer median
                    {tcgPrice?.stale && (
                      <span className="inline-flex items-center gap-0.5 text-warning text-2xs">
                        <AlertCircle size={10} />
                        desactualizado
                      </span>
                    )}
                  </p>
                  <p className="font-price text-2xl text-text-primary">
                    {tcgPrice?.price_usd != null
                      ? formatUSD(tcgPrice.price_usd)
                      : "—"}
                  </p>
                </div>
                {card.tcgplayer_id && (
                  <a
                    href={`https://www.tcgplayer.com/product/${card.tcgplayer_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-2xs text-text-muted hover:text-primary font-sans flex items-center gap-0.5 no-underline mt-1 transition-colors"
                  >
                    Ver en TCGPlayer <ExternalLink size={10} />
                  </a>
                )}
              </div>

              {/* Local market price */}
              {lowestListing && (
                <div className="bg-secondary rounded-lg px-4 py-3 mb-4">
                  <p className="text-xs text-text-muted font-sans mb-0.5">Precio más bajo en Singles.ar</p>
                  <p className="font-price text-xl text-text-primary">
                    {formatARS(lowestListing.price)}
                  </p>
                  <p className="text-xs text-text-muted font-sans mt-0.5">
                    {lowestListing.condition} · {lowestListing.profiles.username}
                  </p>
                </div>
              )}

              {/* CTA */}
              {lowestListing ? (
                <Button variant="primary" size="lg" className="w-full" leftIcon={<ShoppingCart size={16} />}>
                  Comprar al mejor precio
                </Button>
              ) : (
                <Button variant="secondary" size="lg" className="w-full" leftIcon={<Heart size={16} />}>
                  Agregar a lista de deseos
                </Button>
              )}
            </div>

            {/* ── Sell / buy order CTA ───────────────────────────────────── */}
            {user && (
              <div className="surface-raised p-5 flex flex-col gap-3">
                <p className="text-sm font-semibold text-text-primary font-sans">
                  ¿Tenés esta carta?
                </p>
                <Link href="/sell">
                  <Button variant="secondary" size="md" className="w-full" leftIcon={<TrendingUp size={15} />}>
                    Publicar listing de venta
                  </Button>
                </Link>
                <Link href={`/buy-orders/new?card_id=${card.id}`}>
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
                <div className="flex items-center gap-3 text-2xs text-text-muted font-sans">
                  {[
                    { color: "bg-primary", label: "TCGPlayer" },
                    { color: "bg-accent",  label: "Scryfall"  },
                    { color: "bg-success", label: "Singles.ar" },
                  ].map(({ color, label }) => (
                    <span key={label} className="flex items-center gap-1">
                      <span className={`size-2 rounded-full ${color}`} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <PriceChart history={priceHistory} currency="USD" />

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
                  <Button variant="ghost" size="sm" leftIcon={<Heart size={13} />}>
                    Agregar a wishlist
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Info note ─────────────────────────────────────────────── */}
            <div className="flex gap-2.5 text-xs text-text-muted font-sans">
              <Info size={13} className="shrink-0 mt-0.5" />
              <p>
                Los precios en ARS son orientativos y los fijan los vendedores
                individuales. Singles.ar no garantiza la disponibilidad de la carta.
              </p>
            </div>

          </aside>
        </div>
      </div>
    </div>
  );
}

// ─── Empty state helper ───────────────────────────────────────────────────────

function EmptySection({
  icon, title, description, cta,
}: {
  icon:        React.ReactNode;
  title:       string;
  description: string;
  cta?:        React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center rounded-xl border border-dashed border-border bg-secondary/40">
      {icon}
      <p className="text-sm font-medium font-sans text-text-secondary">{title}</p>
      <p className="text-xs text-text-muted font-sans max-w-xs">{description}</p>
      {cta && <div className="mt-1">{cta}</div>}
    </div>
  );
}
