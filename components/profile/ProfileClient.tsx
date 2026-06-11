"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  Package, TrendingUp, Heart, Clock, Settings,
  Star, Award, ShieldAlert, Tag, Plus, RefreshCw,
  CheckCircle2, XCircle, Edit2, Trash2, Check, X,
  ChevronRight, ExternalLink,
} from "lucide-react";
import { toast }     from "sonner";
import { cn }        from "@/lib/utils";
import { Avatar }    from "@/components/ui/avatar";
import { Badge }     from "@/components/ui/badge";
import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import { Divider }   from "@/components/ui/divider";
import { Spinner }   from "@/components/ui/spinner";
import { formatARS } from "@/lib/formatting";
import type {
  Profile, ListingWithCard, BuyOrder, Game,
} from "@/types/database";
import type {
  TransactionHistoryRow, WishlistRowWithStats,
} from "@/app/profile/page";

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabKey = "listings" | "buy-orders" | "wishlist" | "historial" | "configuracion";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "listings",      label: "Mis listings",  icon: <Package    size={14} /> },
  { key: "buy-orders",    label: "Buy orders",    icon: <TrendingUp size={14} /> },
  { key: "wishlist",      label: "Wishlist",      icon: <Heart      size={14} /> },
  { key: "historial",     label: "Historial",     icon: <Clock      size={14} /> },
  { key: "configuracion", label: "Configuración", icon: <Settings   size={14} /> },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GAME_VARIANT: Record<Game, React.ComponentProps<typeof Badge>["variant"]> = {
  magic:    "magic",
  pokemon:  "poke",
  onepiece: "op",
};

const LISTING_STATUS_LABEL: Record<string, { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }> = {
  active:    { label: "Activo",    variant: "green"  },
  sold:      { label: "Vendido",   variant: "navy"   },
  reserved:  { label: "Reservado", variant: "amber"  },
  cancelled: { label: "Cancelado", variant: "slate"  },
};

const TX_STATUS_LABEL: Record<string, { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }> = {
  pending_buyer_confirmation: { label: "Confirmar pago", variant: "amber" },
  in_chat:                    { label: "En chat",        variant: "blue"  },
  payment_pending:            { label: "Pago pendiente", variant: "amber" },
  paid:                       { label: "Pagado",         variant: "green" },
  completed:                  { label: "Completado",     variant: "green" },
  cancelled:                  { label: "Cancelado",      variant: "slate" },
  disputed:                   { label: "En disputa",     variant: "red"   },
};

// ─── Stars ────────────────────────────────────────────────────────────────────

function Stars({ score }: { score: number }) {
  const filled = Math.round(score / 20);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={12} className={i < filled ? "text-accent fill-accent" : "text-border fill-transparent"} />
      ))}
    </div>
  );
}

// ─── Card thumbnail ───────────────────────────────────────────────────────────

function CardThumb({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  return (
    <div className="relative shrink-0 w-9 h-12 rounded-lg overflow-hidden border border-border bg-secondary">
      {imageUrl ? (
        <Image src={imageUrl} alt={name} fill sizes="36px" className="object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Tag size={12} className="text-border" />
        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function Empty({ icon, text, cta }: { icon: React.ReactNode; text: string; cta?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center text-text-muted">
      {icon}
      <p className="text-sm font-sans">{text}</p>
      {cta}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProfileClientProps {
  profile:        Profile;
  currentUserId:  string;
  listings:       ListingWithCard[];
  buyOrders:      (BuyOrder & { cards: { id: string; name: string; image_url: string | null; game: Game } })[];
  wishlist:       WishlistRowWithStats[];
  transactions:   TransactionHistoryRow[];
  reservedOrderTransactions: Record<string, string>; // buyOrderId → transactionId
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProfileClient({
  profile,
  currentUserId,
  listings:       initialListings,
  buyOrders:      initialBuyOrders,
  wishlist:       initialWishlist,
  transactions,
  reservedOrderTransactions,
}: ProfileClientProps) {
  const router = useRouter();
  const [tab,       setTab]       = React.useState<TabKey>("listings");

  // Handle OAuth return params (?mp_success / ?mp_error) and direct tab links (?tab=)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("mp_success")) {
      toast.success("MercadoPago conectado correctamente.");
      window.history.replaceState({}, "", "/profile");
      setTab("configuracion");
    } else if (params.get("mp_error")) {
      const code = params.get("mp_error");
      toast.error(
        code === "access_denied"   ? "Conexión con MercadoPago cancelada." :
        code === "db_error"        ? "No se pudo guardar la conexión." :
        code === "token_exchange"  ? "Error al obtener el token de MercadoPago." :
        "Error al conectar MercadoPago."
      );
      window.history.replaceState({}, "", "/profile");
    } else {
      const requestedTab = params.get("tab") as TabKey | null;
      if (requestedTab) setTab(requestedTab);
    }
  }, []);
  const [listings,  setListings]  = React.useState(initialListings);
  const [buyOrders, setBuyOrders] = React.useState(initialBuyOrders);
  const [wishlist,  setWishlist]  = React.useState(initialWishlist);

  const isTopSeller = profile.reputation_score >= 90 && profile.total_sales >= 20;

  // ── Listing actions ────────────────────────────────────────────────────────
  async function cancelListing(id: string) {
    const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
    if (res.ok) {
      setListings((prev) => prev.map((l) => l.id === id ? { ...l, status: "cancelled" as const } : l));
      toast.success("Publicación cancelada.");
    } else {
      toast.error("No se pudo cancelar la publicación.");
    }
  }

  // ── Buy order actions ──────────────────────────────────────────────────────
  async function cancelBuyOrder(id: string) {
    const res = await fetch(`/api/buy-orders/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "cancel" }),
    });
    if (res.ok) {
      setBuyOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "cancelled" as const } : o));
      toast.success("Orden cancelada.");
    } else {
      toast.error("No se pudo cancelar la orden.");
    }
  }

  async function renewBuyOrder(id: string, days: 15 | 30 | 60 = 30) {
    const res = await fetch(`/api/buy-orders/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "renew", duration_days: days }),
    });
    if (res.ok) {
      toast.success(`Orden renovada por ${days} días.`);
      router.refresh();
    } else {
      toast.error("No se pudo renovar la orden.");
    }
  }

  // ── Wishlist actions ───────────────────────────────────────────────────────
  async function removeFromWishlist(cardId: string) {
    const res = await fetch(`/api/wishlist?cardId=${cardId}`, { method: "DELETE" });
    if (res.ok) {
      setWishlist((prev) => prev.filter((w) => w.card_id !== cardId));
      toast.success("Eliminado de la wishlist.");
    } else {
      toast.error("No se pudo eliminar de la wishlist.");
    }
  }

  return (
    <div>
      {/* ── Profile header ────────────────────────────────────────────────── */}
      <div className="surface-raised p-5 mb-6 flex items-center gap-4">
        <Avatar src={profile.avatar_url} name={profile.username} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <h1 className="text-xl font-serif font-semibold text-text-primary">{profile.username}</h1>
            {isTopSeller && (
              <Badge variant="gold" size="sm"><Award size={10} className="mr-0.5" />Top vendedor</Badge>
            )}
            {profile.is_reliable_buyer === false && (
              <Badge variant="red" size="sm"><ShieldAlert size={10} className="mr-0.5" />Comprador poco confiable</Badge>
            )}
          </div>
          <Stars score={profile.reputation_score} />
          <div className="flex flex-wrap gap-4 mt-2 text-xs font-sans text-text-muted">
            <span><strong className="text-text-primary">{profile.total_sales}</strong> ventas</span>
            <span><strong className="text-text-primary">{profile.total_purchases}</strong> compras</span>
            <span>Miembro desde {format(new Date(profile.created_at), "MMMM yyyy", { locale: es })}</span>
          </div>
        </div>
        <Link href={`/profile/${profile.username}`}>
          <Button variant="ghost" size="sm" rightIcon={<ExternalLink size={12} />}>
            Ver perfil público
          </Button>
        </Link>
      </div>

      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      <div className="surface-raised overflow-hidden">
        <div className="flex overflow-x-auto border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={[
                "flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium font-sans whitespace-nowrap",
                "border-b-2 -mb-px transition-colors shrink-0",
                tab === t.key
                  ? "text-primary border-primary"
                  : "text-text-muted border-transparent hover:text-text-primary",
              ].join(" ")}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1 — Mis listings
        ══════════════════════════════════════════════════════════════════ */}
        {tab === "listings" && (
          <div>
            <div className="flex items-center justify-between p-4 pb-0">
              <p className="text-sm text-text-muted font-sans">{listings.length} publicaciones</p>
              <Link href="/sell">
                <Button variant="primary" size="sm" leftIcon={<Plus size={13} />}>
                  Nueva publicación
                </Button>
              </Link>
            </div>

            {listings.length === 0 ? (
              <div className="p-4">
                <Empty
                  icon={<Package size={28} />}
                  text="No tenés publicaciones todavía."
                  cta={<Link href="/sell"><Button variant="secondary" size="sm">Publicar ahora</Button></Link>}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-sans">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40">
                      {["Carta", "Tipo", "Precio", "Estado", "Acciones"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {listings.map((listing) => {
                      const card = listing.cards as { id: string; name: string; image_url: string | null; game: Game } | null;
                      const info = LISTING_STATUS_LABEL[listing.status] ?? { label: listing.status, variant: "slate" as const };
                      return (
                        <tr key={listing.id} className="hover:bg-secondary/30 transition-colors">
                          {/* Carta */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <CardThumb imageUrl={card?.image_url ?? null} name={card?.name ?? "?"} />
                              <div className="min-w-0">
                                <Link href={card ? `/cards/${card.id}` : "#"} className="text-sm font-medium text-text-primary hover:text-primary transition-colors truncate block max-w-[160px]">
                                  {card?.name ?? "—"}
                                </Link>
                                {card?.game && <Badge variant={GAME_VARIANT[card.game]} size="sm" />}
                              </div>
                            </div>
                          </td>
                          {/* Tipo */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {listing.listing_type === "trade"
                              ? <Badge variant="amber" size="sm">Trade</Badge>
                              : <Badge variant="navy"  size="sm">Venta</Badge>
                            }
                          </td>
                          {/* Precio */}
                          <td className="px-4 py-3 font-price whitespace-nowrap text-text-primary">
                            {listing.price != null ? formatARS(listing.price) : "—"}
                          </td>
                          {/* Estado */}
                          <td className="px-4 py-3">
                            <Badge variant={info.variant} size="sm">{info.label}</Badge>
                          </td>
                          {/* Acciones */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {listing.status === "active" && (
                                <>
                                  <Link href={`/sell/edit/${listing.id}`}>
                                    <button className="p-1.5 rounded-md text-text-muted hover:text-primary hover:bg-primary/5 transition-colors" title="Editar">
                                      <Edit2 size={14} />
                                    </button>
                                  </Link>
                                  <ConfirmAction
                                    title="Cancelar publicación"
                                    onConfirm={() => cancelListing(listing.id)}
                                  >
                                    <button className="p-1.5 rounded-md text-text-muted hover:text-error hover:bg-error-subtle transition-colors" title="Cancelar">
                                      <Trash2 size={14} />
                                    </button>
                                  </ConfirmAction>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2 — Buy orders
        ══════════════════════════════════════════════════════════════════ */}
        {tab === "buy-orders" && (
          <div>
            <div className="flex items-center justify-between p-4 pb-0">
              <p className="text-sm text-text-muted font-sans">{buyOrders.length} órdenes</p>
              <Link href="/buy-orders/new">
                <Button variant="primary" size="sm" leftIcon={<Plus size={13} />}>
                  Nuevo buy order
                </Button>
              </Link>
            </div>

            {buyOrders.length === 0 ? (
              <div className="p-4">
                <Empty
                  icon={<TrendingUp size={28} />}
                  text="No tenés órdenes de compra activas."
                  cta={<Link href="/buy-orders/new"><Button variant="secondary" size="sm">Crear ahora</Button></Link>}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-sans">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40">
                      {["Carta", "Mi oferta", "Vence", "Estado", "Acciones"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {buyOrders.map((order) => {
                      const card        = order.cards as { id: string; name: string; image_url: string | null; game: Game } | null;
                      const daysLeft    = differenceInDays(new Date(order.expires_at), new Date());
                      const isExpiring  = daysLeft <= 3 && order.status === "active";
                      const canRenew    = ["active", "expired"].includes(order.status);
                      const canCancel   = order.status === "active";
                      const pendingTxId = order.status === "reserved"
                        ? reservedOrderTransactions[order.id]
                        : undefined;

                      return (
                        <tr key={order.id} className={[
                          "hover:bg-secondary/30 transition-colors",
                          isExpiring  ? "bg-warning/5" : "",
                          pendingTxId ? "bg-amber-50/50" : "",
                        ].join(" ")}>
                          {/* Carta */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <CardThumb imageUrl={card?.image_url ?? null} name={card?.name ?? "?"} />
                              <div className="min-w-0">
                                <Link href={card ? `/cards/${card.id}` : "#"} className="text-sm font-medium text-text-primary hover:text-primary transition-colors truncate block max-w-[140px]">
                                  {card?.name ?? "—"}
                                </Link>
                                {card?.game && <Badge variant={GAME_VARIANT[card.game]} size="sm" />}
                              </div>
                            </div>
                          </td>
                          {/* Oferta */}
                          <td className="px-4 py-3 font-price text-success whitespace-nowrap">
                            {formatARS(order.price)}
                          </td>
                          {/* Vence */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={isExpiring ? "text-warning font-semibold" : "text-text-muted"}>
                              {daysLeft > 0
                                ? `${daysLeft}d`
                                : <span className="text-error">Vencido</span>
                              }
                            </span>
                            {isExpiring && <span className="ml-1 text-warning">⚠</span>}
                          </td>
                          {/* Estado */}
                          <td className="px-4 py-3">
                            {pendingTxId ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold font-sans px-2 py-0.5 rounded-full border border-amber-400/60 bg-amber-100 text-amber-700 animate-pulse">
                                ⚡ Requiere tu confirmación
                              </span>
                            ) : (
                              <Badge variant={
                                order.status === "active"   ? "green" :
                                order.status === "reserved" ? "amber" :
                                order.status === "filled"   ? "navy"  :
                                order.status === "expired"  ? "red"   : "slate"
                              } size="sm">
                                {{ active: "Activo", reserved: "Reservado", filled: "Completado", cancelled: "Cancelado", expired: "Vencido" }[order.status] ?? order.status}
                              </Badge>
                            )}
                          </td>
                          {/* Acciones */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {pendingTxId ? (
                                <Link href={`/chat/${pendingTxId}`}>
                                  <Button variant="primary" size="sm" rightIcon={<ChevronRight size={12} />}>
                                    Ir al chat
                                  </Button>
                                </Link>
                              ) : (
                                <>
                                  {canRenew && (
                                    <button
                                      onClick={() => renewBuyOrder(order.id, 30)}
                                      className="p-1.5 rounded-md text-text-muted hover:text-primary hover:bg-primary/5 transition-colors"
                                      title="Renovar 30 días"
                                    >
                                      <RefreshCw size={14} />
                                    </button>
                                  )}
                                  {canCancel && (
                                    <ConfirmAction title="Cancelar orden" onConfirm={() => cancelBuyOrder(order.id)}>
                                      <button className="p-1.5 rounded-md text-text-muted hover:text-error hover:bg-error-subtle transition-colors" title="Cancelar">
                                        <Trash2 size={14} />
                                      </button>
                                    </ConfirmAction>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3 — Wishlist
        ══════════════════════════════════════════════════════════════════ */}
        {tab === "wishlist" && (
          <div className="p-4">
            {wishlist.length === 0 ? (
              <Empty
                icon={<Heart size={28} />}
                text="Tu wishlist está vacía."
                cta={
                  <Link href="/cards">
                    <Button variant="secondary" size="sm">Explorar cartas</Button>
                  </Link>
                }
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {wishlist.map((item) => {
                  const card = item.cards as { id: string; name: string; image_url: string | null; set_name: string | null; game: Game } | null;
                  return (
                    <div key={item.id} className="relative group rounded-xl border border-border bg-surface hover:shadow-card transition-shadow overflow-hidden">
                      {/* Remove button */}
                      <button
                        onClick={() => removeFromWishlist(item.card_id)}
                        className="absolute top-2 right-2 z-10 p-1 rounded-full bg-surface/80 backdrop-blur-sm text-text-muted hover:text-error hover:bg-error-subtle transition-colors opacity-0 group-hover:opacity-100"
                        title="Quitar de wishlist"
                      >
                        <X size={12} />
                      </button>

                      <Link href={card ? `/cards/${card.id}` : "#"} className="block no-underline">
                        {/* Image */}
                        <div className="relative w-full aspect-[2.5/3.5] bg-secondary">
                          {card?.image_url ? (
                            <Image src={card.image_url} alt={card.name} fill sizes="160px" className="object-cover" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Tag size={24} className="text-border" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="p-2.5">
                          <p className="text-xs font-semibold font-sans text-text-primary truncate leading-tight mb-1">
                            {card?.name ?? "Carta"}
                          </p>
                          {item.listing_count > 0 ? (
                            <>
                              <p className="text-2xs text-text-muted font-sans">{item.listing_count} en venta</p>
                              {item.lowest_price != null && (
                                <p className="font-price text-sm text-text-primary mt-0.5">
                                  desde {formatARS(item.lowest_price)}
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-2xs text-error font-sans">Sin stock</p>
                          )}
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 4 — Historial
        ══════════════════════════════════════════════════════════════════ */}
        {tab === "historial" && (
          <div>
            {transactions.length === 0 ? (
              <div className="p-4">
                <Empty
                icon={<Clock size={28} />}
                text="Sin transacciones todavía."
                cta={
                  <div className="flex gap-2">
                    <Link href="/cards"><Button variant="secondary" size="sm">Buscar cartas</Button></Link>
                    <Link href="/sell"><Button variant="ghost" size="sm">Vender</Button></Link>
                  </div>
                }
              />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-sans">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40">
                      {["Fecha", "Carta", "Con", "Monto", "Estado"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {transactions.map((tx) => {
                      const isBuyer = tx.buyer_id === currentUserId;
                      const info    = TX_STATUS_LABEL[tx.status] ?? { label: tx.status, variant: "slate" as const };
                      return (
                        <tr
                          key={tx.id}
                          onClick={() => router.push(`/chat/${tx.id}`)}
                          className="hover:bg-secondary/30 cursor-pointer transition-colors"
                        >
                          {/* Fecha */}
                          <td className="px-4 py-3 text-text-muted whitespace-nowrap text-xs">
                            {format(new Date(tx.created_at), "dd/MM/yyyy")}
                          </td>
                          {/* Carta */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <CardThumb imageUrl={tx.card.image_url} name={tx.card.name} />
                              <span className="font-medium text-text-primary truncate max-w-[130px] block">{tx.card.name}</span>
                            </div>
                          </td>
                          {/* Contraparte */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <Avatar src={tx.counterpart.avatar_url} name={tx.counterpart.username} size="sm" />
                              <span className="text-text-secondary truncate max-w-[100px]">{tx.counterpart.username}</span>
                            </div>
                          </td>
                          {/* Monto */}
                          <td className="px-4 py-3 font-price whitespace-nowrap">
                            <span className={isBuyer ? "text-error" : "text-success"}>
                              {isBuyer ? "−" : "+"}{formatARS(tx.price)}
                            </span>
                          </td>
                          {/* Estado */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Badge variant={info.variant} size="sm">{info.label}</Badge>
                              <ChevronRight size={12} className="text-text-muted" />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 5 — Configuración
        ══════════════════════════════════════════════════════════════════ */}
        {tab === "configuracion" && (
          <div className="p-5 flex flex-col gap-6 max-w-lg">

            {/* Username */}
            <UsernameSection
              currentUsername={profile.username}
              lastChangedAt={profile.username_last_changed_at}
            />

            <Divider />

            {/* MercadoPago */}
            <div>
              <h3 className="text-sm font-semibold text-text-primary font-sans mb-3">MercadoPago</h3>
              {profile.mercadopago_user_id ? (
                <MpConnected
                  connectedAt={profile.mercadopago_connected_at}
                  userId={profile.mercadopago_user_id}
                  nickname={profile.mercadopago_nickname ?? null}
                  onDisconnect={() => router.refresh()}
                />
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-warning/30 bg-warning/5">
                  <XCircle size={16} className="shrink-0 text-warning" />
                  <div className="flex-1">
                    <p className="text-sm font-medium font-sans text-text-primary">Sin cuenta conectada</p>
                    <p className="text-xs text-text-muted font-sans">Necesitás conectar MercadoPago para aceptar pagos.</p>
                  </div>
                  <a href="/api/auth/mercadopago">
                    <Button variant="primary" size="sm">Conectar MercadoPago</Button>
                  </a>
                </div>
              )}
            </div>

            <Divider />

            {/* Notifications placeholder */}
            <div>
              <h3 className="text-sm font-semibold text-text-primary font-sans mb-1">Notificaciones</h3>
              <p className="text-xs text-text-muted font-sans leading-relaxed">
                Las preferencias de notificación estarán disponibles próximamente.
                Por ahora recibirás alertas cuando alguien acepte tu orden de compra o
                haya stock de cartas en tu wishlist.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MercadoPago connected section ───────────────────────────────────────────

function MpConnected({
  connectedAt,
  userId,
  nickname,
  onDisconnect,
}: {
  connectedAt:  string | null;
  userId:       string | null;
  nickname:     string | null;
  onDisconnect: () => void;
}) {
  const [disconnecting, setDisconnecting] = React.useState(false);
  const [confirm,       setConfirm]       = React.useState(false);

  const expiryDate = connectedAt
    ? new Date(new Date(connectedAt).getTime() + 180 * 24 * 60 * 60 * 1000)
    : null;
  const daysLeft      = expiryDate ? differenceInDays(expiryDate, new Date()) : null;
  const isExpired     = daysLeft !== null && daysLeft <= 0;
  const isExpiringSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 14;

  async function disconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/auth/mercadopago", { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("MercadoPago desconectado.");
      onDisconnect();
    } catch {
      toast.error("No se pudo desconectar.");
      setDisconnecting(false);
      setConfirm(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5 p-3 rounded-xl border border-success/30 bg-success/5">

      {/* Status row */}
      <div className="flex items-center gap-3">
        <CheckCircle2 size={16} className="shrink-0 text-success" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold font-sans text-text-primary">MercadoPago conectado ✓</p>
          {connectedAt && (
            <p className="text-xs text-text-muted font-sans">
              Conectado {formatDistanceToNow(new Date(connectedAt), { locale: es, addSuffix: true })}
            </p>
          )}
        </div>
        <a href="/api/auth/mercadopago">
          <Button variant="ghost" size="sm">Reconectar</Button>
        </a>
      </div>

      {/* Account info */}
      <div className="flex flex-col gap-1 px-1 py-1.5 rounded-lg bg-success/5 border border-success/10">
        {nickname && (
          <div className="flex items-center gap-2 text-xs font-sans">
            <span className="text-text-muted w-16 shrink-0">Cuenta</span>
            <span className="font-medium text-text-primary">{nickname}</span>
          </div>
        )}
        {userId && (
          <div className="flex items-center gap-2 text-xs font-sans">
            <span className="text-text-muted w-16 shrink-0">ID de usuario</span>
            <span className="font-mono text-text-secondary">{userId}</span>
          </div>
        )}
      </div>

      {/* Token expiry */}
      {expiryDate && (
        <p className={cn(
          "text-xs font-sans px-1",
          isExpired      ? "text-error font-medium" :
          isExpiringSoon ? "text-warning font-medium" :
          "text-text-muted"
        )}>
          {isExpired
            ? `⚠ Token expirado el ${format(expiryDate, "d 'de' MMMM yyyy", { locale: es })} — reconectá tu cuenta.`
            : isExpiringSoon
            ? `⚠ Token vence en ${daysLeft} días (${format(expiryDate, "d MMM yyyy", { locale: es })})`
            : `Token válido hasta el ${format(expiryDate, "d 'de' MMMM yyyy", { locale: es })}`
          }
        </p>
      )}

      {/* Disconnect */}
      {!confirm ? (
        <button
          onClick={() => setConfirm(true)}
          className="text-xs text-text-muted hover:text-error font-sans transition-colors text-left px-1 w-fit"
        >
          Desconectar cuenta
        </button>
      ) : (
        <div className="flex items-center gap-3 px-1">
          <span className="text-xs text-text-muted font-sans">¿Desconectar MercadoPago?</span>
          <button
            onClick={disconnect}
            disabled={disconnecting}
            className="text-xs text-error font-semibold font-sans hover:underline disabled:opacity-50"
          >
            {disconnecting ? "Desconectando…" : "Sí, desconectar"}
          </button>
          <button
            onClick={() => setConfirm(false)}
            className="text-xs text-text-muted font-sans hover:underline"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Username section ─────────────────────────────────────────────────────────

function UsernameSection({
  currentUsername,
  lastChangedAt,
}: {
  currentUsername: string;
  lastChangedAt:   string | null;
}) {
  const [editing,  setEditing]  = React.useState(false);
  const [value,    setValue]    = React.useState(currentUsername);
  const [saving,   setSaving]   = React.useState(false);
  const [error,    setError]    = React.useState<string | null>(null);
  const [success,  setSuccess]  = React.useState(false);

  const daysSince = lastChangedAt
    ? differenceInDays(new Date(), new Date(lastChangedAt))
    : null;
  const daysUntilNext = daysSince !== null ? Math.max(0, 30 - daysSince) : 0;
  const canChange = daysSince === null || daysSince >= 30;

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res  = await fetch("/api/profile", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ username: value.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error.");
      setSuccess(true);
      setEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-text-primary font-sans mb-3">Nombre de usuario</h3>

      {!editing ? (
        <div className="flex items-center gap-3">
          <code className="text-base font-sans font-medium text-text-primary bg-secondary px-3 py-1.5 rounded-lg border border-border">
            @{currentUsername}
          </code>
          {canChange ? (
            <Button variant="ghost" size="sm" leftIcon={<Edit2 size={13} />} onClick={() => setEditing(true)}>
              Cambiar
            </Button>
          ) : (
            <span className="text-xs text-text-muted font-sans">
              Podés cambiarlo en {daysUntilNext} días
            </span>
          )}
          {success && (
            <span className="text-xs text-success font-sans flex items-center gap-1">
              <CheckCircle2 size={12} /> Actualizado
            </span>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="nuevo_usuario"
              className="max-w-[220px]"
              autoFocus
            />
            <button
              onClick={save}
              disabled={saving}
              className="p-2 rounded-lg bg-primary text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              {saving ? <Spinner size="xs" variant="white" /> : <Check size={14} />}
            </button>
            <button
              onClick={() => { setEditing(false); setValue(currentUsername); setError(null); }}
              className="p-2 rounded-lg text-text-muted hover:bg-secondary transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          <p className="text-2xs text-text-muted font-sans">Solo letras, números y guiones bajos. Máx 20 caracteres.</p>
          {error && <p className="text-xs text-error font-sans">{error}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Confirm action (inline mini-confirm) ────────────────────────────────────

function ConfirmAction({
  children,
  title,
  onConfirm,
}: {
  children:  React.ReactNode;
  title:     string;
  onConfirm: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  if (!open) {
    return (
      <span onClick={() => setOpen(true)}>{children}</span>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-surface border border-border rounded-lg px-2 py-1 shadow-card">
      <span className="text-2xs text-text-muted font-sans whitespace-nowrap">{title}?</span>
      <button
        onClick={() => { setOpen(false); onConfirm(); }}
        className="p-0.5 rounded text-error hover:bg-error-subtle transition-colors"
      >
        <Check size={12} />
      </button>
      <button
        onClick={() => setOpen(false)}
        className="p-0.5 rounded text-text-muted hover:bg-secondary transition-colors"
      >
        <X size={12} />
      </button>
    </div>
  );
}
