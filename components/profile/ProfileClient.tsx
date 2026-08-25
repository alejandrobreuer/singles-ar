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
  ChevronRight, ExternalLink, Zap, ListChecks,
  ArrowUp, ArrowDown, ArrowUpDown,
} from "lucide-react";
import { toast }     from "sonner";
import { cn }        from "@/lib/utils";
import { Avatar }    from "@/components/ui/avatar";
import { Badge }     from "@/components/ui/badge";
import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import { Divider }   from "@/components/ui/divider";
import { Spinner }   from "@/components/ui/spinner";
import { LocationPickerList } from "@/components/ui/LocationPickerList";
import { LanguageBadge } from "@/components/ui/LanguageBadge";
import { PriceDisplay } from "@/components/pricing/PriceDisplay";
import { formatARS, formatARSNumber, parseARSInput } from "@/lib/formatting";
import { listingLocationSummary } from "@/lib/listingLocation";
import { LANGUAGES_BY_GAME, LANGUAGE_LABELS, LANGUAGE_FLAGS } from "@/lib/cardAttributes";
import type {
  Profile, ListingWithCard, BuyOrder, Game, LocationValue, CardLanguage, DiscountType,
} from "@/types/database";
import type {
  TransactionHistoryRow, WishlistRowWithStats,
} from "@/app/profile/page";
import { useCardListFilters, ProfileListFilters, type CardFilterFields } from "@/components/profile/ProfileListFilters";

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
  dbz:      "dbz",
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

// ─── Mobile card fallbacks (md:hidden — desktop keeps the <table>s) ───────────

function ListingMobileCard({
  listing, massEditMode, checkboxEligible, selected, onToggleSelect, onCancel,
}: {
  listing:          ListingWithCard;
  massEditMode:     boolean;
  checkboxEligible: boolean;
  selected:         boolean;
  onToggleSelect:   () => void;
  onCancel:         () => void;
}) {
  const card = listing.cards as { id: string; name: string; image_url: string | null; set_name: string | null; set_code: string | null; game: Game } | null;
  const info = LISTING_STATUS_LABEL[listing.status] ?? { label: listing.status, variant: "slate" as const };
  const locationSummary = listingLocationSummary(listing);

  return (
    <div className="rounded-xl border border-border bg-surface p-3 flex flex-col gap-2.5">
      <div className="flex items-start gap-2.5">
        {massEditMode && checkboxEligible && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="mt-1 size-4 rounded border-border accent-primary shrink-0"
          />
        )}
        <CardThumb imageUrl={card?.image_url ?? null} name={card?.name ?? "?"} />
        <div className="min-w-0 flex-1">
          <Link href={card ? `/cards/${card.id}` : "#"} className="text-sm font-medium text-text-primary hover:text-primary transition-colors truncate block">
            {card?.name ?? "—"}
          </Link>
          <div className="flex items-center gap-1.5 mt-1">
            {card?.game && <Badge variant={GAME_VARIANT[card.game]} size="sm" />}
            {listing.listing_type === "trade"
              ? <Badge variant="amber" size="sm">Trade</Badge>
              : <Badge variant="navy"  size="sm">Venta</Badge>
            }
          </div>
        </div>
        <Badge variant={info.variant} size="sm" className="shrink-0">{info.label}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs font-sans">
        <div>
          <span className="text-text-muted">Set: </span>
          <span className="text-text-secondary">{card?.set_code ?? card?.set_name ?? "—"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-text-muted">Idioma:</span>
          <LanguageBadge language={listing.language} />
        </div>
        <div className="col-span-2">
          <span className="text-text-muted">Ubicación: </span>
          <span className="text-text-secondary">{locationSummary ?? "—"}</span>
        </div>
        <div className="col-span-2">
          <PriceDisplay
            price={listing.price}
            originalPrice={listing.original_price}
            discountType={listing.discount_type}
            discountValue={listing.discount_value}
            size="sm"
          />
        </div>
      </div>

      {listing.status === "active" && (
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Link
            href={`/sell/edit/${listing.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans text-text-secondary hover:text-primary hover:bg-primary/5 transition-colors no-underline"
          >
            <Edit2 size={13} /> Editar
          </Link>
          <ConfirmAction title="Cancelar publicación" onConfirm={onCancel}>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans text-text-secondary hover:text-error hover:bg-error-subtle transition-colors"
            >
              <Trash2 size={13} /> Cancelar
            </button>
          </ConfirmAction>
        </div>
      )}
    </div>
  );
}

function BuyOrderMobileCard({
  order, daysLeft, isExpiring, canRenew, canCancel, pendingTxId, onRenew, onCancel,
}: {
  order:       BuyOrder & { cards: { id: string; name: string; image_url: string | null; set_name: string | null; set_code: string | null; rarity: string | null; color: string | null; game: Game } };
  daysLeft:    number;
  isExpiring:  boolean;
  canRenew:    boolean;
  canCancel:   boolean;
  pendingTxId: string | undefined;
  onRenew:     () => void;
  onCancel:    () => void;
}) {
  const card = order.cards as { id: string; name: string; image_url: string | null; game: Game } | null;
  const hasActions = Boolean(pendingTxId || canRenew || canCancel);

  return (
    <div className={cn(
      "rounded-xl border border-border bg-surface p-3 flex flex-col gap-2.5",
      isExpiring  && "bg-warning/5",
      pendingTxId && "bg-amber-50/50"
    )}>
      <div className="flex items-center gap-2.5">
        <CardThumb imageUrl={card?.image_url ?? null} name={card?.name ?? "?"} />
        <div className="min-w-0 flex-1">
          <Link href={card ? `/cards/${card.id}` : "#"} className="text-sm font-medium text-text-primary hover:text-primary transition-colors truncate block">
            {card?.name ?? "—"}
          </Link>
          {card?.game && <Badge variant={GAME_VARIANT[card.game]} size="sm" className="mt-1" />}
        </div>
        <span className="font-price text-success text-sm shrink-0">{formatARS(order.price)}</span>
      </div>

      <div className="flex items-center justify-between text-xs font-sans">
        <span className={isExpiring ? "text-warning font-semibold" : "text-text-muted"}>
          {daysLeft > 0
            ? `Vence en ${daysLeft}d`
            : <span className="text-error">Vencido</span>
          }
          {isExpiring && <span className="ml-1">⚠</span>}
        </span>
        {pendingTxId ? (
          <span className="inline-flex items-center gap-1 text-2xs font-semibold font-sans px-2 py-0.5 rounded-full border border-amber-400/60 bg-amber-100 text-amber-700 animate-pulse">
            ⚡ Requiere confirmación
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
      </div>

      {hasActions && (
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          {pendingTxId ? (
            <Link href={`/chat/${pendingTxId}`} className="flex-1 no-underline">
              <Button variant="primary" size="sm" className="w-full" rightIcon={<ChevronRight size={12} />}>
                Ir al chat
              </Button>
            </Link>
          ) : (
            <>
              {canRenew && (
                <button
                  onClick={onRenew}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans text-text-secondary hover:text-primary hover:bg-primary/5 transition-colors"
                >
                  <RefreshCw size={13} /> Renovar
                </button>
              )}
              {canCancel && (
                <ConfirmAction title="Cancelar orden" onConfirm={onCancel}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans text-text-secondary hover:text-error hover:bg-error-subtle transition-colors"
                  >
                    <Trash2 size={13} /> Cancelar
                  </button>
                </ConfirmAction>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function HistorialMobileCard({
  tx, currentUserId, onClick,
}: {
  tx:            TransactionHistoryRow;
  currentUserId: string;
  onClick:       () => void;
}) {
  const isBuyer = tx.buyer_id === currentUserId;
  const info    = TX_STATUS_LABEL[tx.status] ?? { label: tx.status, variant: "slate" as const };

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border bg-surface p-3 flex items-center gap-2.5 hover:bg-secondary/30 transition-colors"
    >
      <CardThumb imageUrl={tx.card.image_url} name={tx.card.name} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium font-sans text-text-primary truncate">{tx.card.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Avatar src={tx.counterpart.avatar_url} name={tx.counterpart.username} size="sm" />
          <span className="text-xs text-text-secondary font-sans truncate">{tx.counterpart.username}</span>
        </div>
        <p className="text-2xs text-text-muted font-sans mt-0.5">{format(new Date(tx.created_at), "dd/MM/yyyy")}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={cn("font-price text-sm", isBuyer ? "text-error" : "text-success")}>
          {isBuyer ? "−" : "+"}{formatARS(tx.price)}
        </span>
        <Badge variant={info.variant} size="sm">{info.label}</Badge>
      </div>
    </button>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProfileClientProps {
  profile:        Profile;
  currentUserId:  string;
  listings:       ListingWithCard[];
  buyOrders:      (BuyOrder & { cards: { id: string; name: string; image_url: string | null; set_name: string | null; set_code: string | null; rarity: string | null; color: string | null; game: Game } })[];
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

  // ── Quick edit (price + location + language, inline) ───────────────────────
  const [editingId,     setEditingId]     = React.useState<string | null>(null);
  const [editPrice,     setEditPrice]     = React.useState("");
  const [editLocations, setEditLocations] = React.useState<LocationValue[]>([]);
  const [editLanguage,  setEditLanguage]  = React.useState<CardLanguage>("es");
  const [savingEdit,    setSavingEdit]    = React.useState(false);

  function startQuickEdit(listing: ListingWithCard) {
    setEditingId(listing.id);
    setEditPrice(listing.price != null ? formatARSNumber(listing.price) : "");
    setEditLocations(
      (listing.listing_locations ?? []).map((loc) => ({
        province_id: loc.province_id,
        zone_id:     loc.zone_id,
        area_id:     loc.area_id,
        store_id:    loc.store_id,
      }))
    );
    setEditLanguage(listing.language ?? "es");
  }

  function cancelQuickEdit() {
    setEditingId(null);
  }

  async function saveQuickEdit(listing: ListingWithCard) {
    setSavingEdit(true);
    try {
      const payload: Record<string, unknown> = {
        locations: editLocations.filter((l) => l.province_id),
        language:  editLanguage,
      };
      if (listing.listing_type === "sale") {
        const priceNum = parseARSInput(editPrice);
        payload.price = priceNum > 0 ? priceNum : null;
      }

      const res = await fetch(`/api/listings/${listing.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "No se pudo guardar.");
        return;
      }

      const fresh = await fetch(`/api/listings/${listing.id}`).then((r) => r.json()).catch(() => null);
      setListings((prev) => prev.map((l) => l.id === listing.id ? {
        ...l,
        price:             json.data?.price ?? l.price,
        language:          json.data?.language ?? l.language,
        listing_locations: fresh?.data?.listing_locations ?? l.listing_locations,
      } : l));
      toast.success("Publicación actualizada.");
      setEditingId(null);
    } catch {
      toast.error("Error de red. Verificá tu conexión.");
    } finally {
      setSavingEdit(false);
    }
  }

  // ── Mass edit (bulk price / location across selected listings) ────────────
  const [massEditMode,  setMassEditMode]  = React.useState(false);
  const [selectedIds,   setSelectedIds]   = React.useState<Set<string>>(new Set());
  const [bulkPrice,     setBulkPrice]     = React.useState("");
  const [bulkLocations, setBulkLocations] = React.useState<LocationValue[]>([]);
  const [bulkLanguage,  setBulkLanguage]  = React.useState<CardLanguage | "">("");
  const [bulkDiscountType,  setBulkDiscountType]  = React.useState<DiscountType>("percentage");
  const [bulkDiscountValue, setBulkDiscountValue] = React.useState("");
  const [bulkSaving,    setBulkSaving]    = React.useState(false);

  const EDITABLE_STATUSES = new Set(["active", "reserved"]);

  function toggleMassEdit() {
    setMassEditMode((v) => !v);
    setSelectedIds(new Set());
    setEditingId(null);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const selectable = listingFilters.filtered.filter((l) => EDITABLE_STATUSES.has(l.status));
    setSelectedIds((prev) =>
      prev.size === selectable.length && selectable.length > 0
        ? new Set()
        : new Set(selectable.map((l) => l.id))
    );
  }

  async function applyBulkPrice() {
    const priceNum = parseARSInput(bulkPrice);
    if (priceNum <= 0) return;

    const targets = listings.filter((l) => selectedIds.has(l.id) && l.listing_type === "sale");
    if (targets.length === 0) {
      toast.error("Ninguna publicación de venta seleccionada.");
      return;
    }

    setBulkSaving(true);
    try {
      const results = await Promise.all(targets.map((l) =>
        fetch(`/api/listings/${l.id}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ price: priceNum }),
        }).then((r) => r.ok)
      ));

      const okIds = new Set(targets.filter((_, i) => results[i]).map((l) => l.id));
      setListings((prev) => prev.map((l) => okIds.has(l.id) ? { ...l, price: priceNum } : l));

      const failed = targets.length - okIds.size;
      if (failed > 0) toast.error(`No se pudo actualizar el precio de ${failed} publicación(es).`);
      if (okIds.size > 0) toast.success(`Precio actualizado en ${okIds.size} publicación(es).`);
      setBulkPrice("");
    } finally {
      setBulkSaving(false);
    }
  }

  async function applyBulkLocations() {
    const locations = bulkLocations.filter((l) => l.province_id);
    if (locations.length === 0) return;

    const targets = listings.filter((l) => selectedIds.has(l.id));
    if (targets.length === 0) return;

    setBulkSaving(true);
    try {
      const results = await Promise.all(targets.map(async (l) => {
        const res = await fetch(`/api/listings/${l.id}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ locations }),
        });
        if (!res.ok) return null;
        const fresh = await fetch(`/api/listings/${l.id}`).then((r) => r.json()).catch(() => null);
        return fresh?.data?.listing_locations ?? [];
      }));

      setListings((prev) => prev.map((l) => {
        const idx = targets.findIndex((t) => t.id === l.id);
        if (idx === -1 || results[idx] == null) return l;
        return { ...l, listing_locations: results[idx] };
      }));

      const failed = results.filter((r) => r == null).length;
      if (failed > 0) toast.error(`No se pudo actualizar la ubicación de ${failed} publicación(es).`);
      if (targets.length - failed > 0) toast.success(`Ubicación actualizada en ${targets.length - failed} publicación(es).`);
    } finally {
      setBulkSaving(false);
    }
  }

  async function applyBulkLanguage() {
    if (!bulkLanguage) return;

    const targets = listings.filter((l) => {
      if (!selectedIds.has(l.id)) return false;
      const game = (l.cards as { game: Game } | null)?.game;
      return game ? LANGUAGES_BY_GAME[game].includes(bulkLanguage) : false;
    });
    if (targets.length === 0) {
      toast.error("El idioma elegido no es válido para ninguna publicación seleccionada.");
      return;
    }

    setBulkSaving(true);
    try {
      const results = await Promise.all(targets.map((l) =>
        fetch(`/api/listings/${l.id}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ language: bulkLanguage }),
        }).then((r) => r.ok)
      ));

      const okIds = new Set(targets.filter((_, i) => results[i]).map((l) => l.id));
      setListings((prev) => prev.map((l) => okIds.has(l.id) ? { ...l, language: bulkLanguage } : l));

      const skipped = selectedIds.size - targets.length;
      const failed  = targets.length - okIds.size;
      if (failed > 0) toast.error(`No se pudo actualizar el idioma de ${failed} publicación(es).`);
      if (skipped > 0) toast.error(`${skipped} publicación(es) no admiten ese idioma y fueron omitidas.`);
      if (okIds.size > 0) toast.success(`Idioma actualizado en ${okIds.size} publicación(es).`);
      setBulkLanguage("");
    } finally {
      setBulkSaving(false);
    }
  }

  async function applyBulkDiscount() {
    const valueNum = parseARSInput(bulkDiscountValue);
    if (valueNum <= 0) return;
    if (bulkDiscountType === "percentage" && valueNum >= 100) {
      toast.error("El porcentaje debe ser menor a 100.");
      return;
    }

    const targets = listings.filter((l) => selectedIds.has(l.id) && l.listing_type === "sale");
    if (targets.length === 0) {
      toast.error("Ninguna publicación de venta seleccionada.");
      return;
    }

    setBulkSaving(true);
    try {
      const results = await Promise.all(targets.map((l) =>
        fetch(`/api/listings/${l.id}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ discount_type: bulkDiscountType, discount_value: valueNum }),
        }).then(async (r) => (r.ok ? (await r.json()).data : null))
      ));

      const updated = new Map(
        targets.map((l, i) => [l.id, results[i]] as const).filter(([, v]) => v != null)
      );
      setListings((prev) => prev.map((l) => updated.has(l.id) ? { ...l, ...updated.get(l.id) } : l));

      const failed = targets.length - updated.size;
      if (failed > 0) toast.error(`No se pudo aplicar el descuento a ${failed} publicación(es).`);
      if (updated.size > 0) toast.success(`Descuento aplicado a ${updated.size} publicación(es).`);
      setBulkDiscountValue("");
    } finally {
      setBulkSaving(false);
    }
  }

  async function removeBulkDiscount() {
    const targets = listings.filter((l) => selectedIds.has(l.id) && l.discount_type != null);
    if (targets.length === 0) {
      toast.error("Ninguna publicación seleccionada tiene descuento activo.");
      return;
    }

    setBulkSaving(true);
    try {
      const results = await Promise.all(targets.map((l) =>
        fetch(`/api/listings/${l.id}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ discount_type: null, discount_value: null }),
        }).then(async (r) => (r.ok ? (await r.json()).data : null))
      ));

      const updated = new Map(
        targets.map((l, i) => [l.id, results[i]] as const).filter(([, v]) => v != null)
      );
      setListings((prev) => prev.map((l) => updated.has(l.id) ? { ...l, ...updated.get(l.id) } : l));

      const failed = targets.length - updated.size;
      if (failed > 0) toast.error(`No se pudo quitar el descuento de ${failed} publicación(es).`);
      if (updated.size > 0) toast.success(`Descuento quitado de ${updated.size} publicación(es).`);
    } finally {
      setBulkSaving(false);
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

  // ── Filters ────────────────────────────────────────────────────────────────
  const getListingCard = React.useCallback((l: typeof listings[number]): CardFilterFields | null => {
    const card = l.cards as { set_name: string | null; set_code: string | null; rarity: string | null; color: string | null; game: Game } | null;
    return card ? { game: card.game, set_code: card.set_code, set_name: card.set_name, rarity: card.rarity, color: card.color } : null;
  }, []);
  const getListingName = React.useCallback((l: typeof listings[number]) => (l.cards as { name: string } | null)?.name ?? "", []);
  const listingFilters = useCardListFilters(listings, getListingCard, getListingName);

  const [listingSort, setListingSort] = React.useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  function toggleListingSort(key: string) {
    setListingSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  }

  const sortedListings = React.useMemo(() => {
    if (!listingSort) return listingFilters.filtered;
    return [...listingFilters.filtered].sort((a, b) => {
      const cardA = a.cards as { name: string; game: Game; set_code: string | null; set_name: string | null } | null;
      const cardB = b.cards as { name: string; game: Game; set_code: string | null; set_name: string | null } | null;
      let aVal: string | number = "";
      let bVal: string | number = "";
      switch (listingSort.key) {
        case "name":     aVal = cardA?.name ?? ""; bVal = cardB?.name ?? ""; break;
        case "game":     aVal = cardA?.game ?? ""; bVal = cardB?.game ?? ""; break;
        case "set":      aVal = cardA?.set_code ?? cardA?.set_name ?? ""; bVal = cardB?.set_code ?? cardB?.set_name ?? ""; break;
        case "type":     aVal = a.listing_type; bVal = b.listing_type; break;
        case "language": aVal = a.language ?? ""; bVal = b.language ?? ""; break;
        case "price":    aVal = a.price ?? 0; bVal = b.price ?? 0; break;
        case "status":   aVal = a.status; bVal = b.status; break;
      }
      const cmp = typeof aVal === "number" && typeof bVal === "number"
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal), "es");
      return listingSort.dir === "asc" ? cmp : -cmp;
    });
  }, [listingFilters.filtered, listingSort]);

  const getOrderCard = React.useCallback((o: typeof buyOrders[number]): CardFilterFields | null => {
    const card = o.cards as { set_name: string | null; set_code: string | null; rarity: string | null; color: string | null; game: Game } | null;
    return card ? { game: card.game, set_code: card.set_code, set_name: card.set_name, rarity: card.rarity, color: card.color } : null;
  }, []);
  const getOrderName = React.useCallback((o: typeof buyOrders[number]) => (o.cards as { name: string } | null)?.name ?? "", []);
  const buyOrderFilters = useCardListFilters(buyOrders, getOrderCard, getOrderName);

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
              <p className="text-sm text-text-muted font-sans">{listingFilters.filtered.length} de {listings.length} publicaciones</p>
              <div className="flex items-center gap-2">
                {listings.length > 0 && (
                  <Button
                    variant={massEditMode ? "primary" : "secondary"}
                    size="sm"
                    leftIcon={<ListChecks size={13} />}
                    onClick={toggleMassEdit}
                  >
                    Edición en masa
                  </Button>
                )}
                <Link href="/sell">
                  <Button variant="primary" size="sm" leftIcon={<Plus size={13} />}>
                    Nueva publicación
                  </Button>
                </Link>
              </div>
            </div>

            {/* Mass-edit toolbar */}
            {massEditMode && listings.length > 0 && (
              <div className="mx-4 mt-3 p-3 rounded-lg border border-primary/20 bg-primary/5 flex flex-col gap-3">
                <p className="text-sm font-sans text-text-secondary">
                  {selectedIds.size} publicación{selectedIds.size === 1 ? "" : "es"} seleccionada{selectedIds.size === 1 ? "" : "s"}
                </p>
                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-2xs font-semibold font-sans text-text-muted uppercase tracking-wide">
                      Nuevo precio (ARS)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Ej: 15000"
                        value={bulkPrice}
                        onChange={(e) => setBulkPrice(e.target.value.replace(/[^0-9.,]/g, ""))}
                        className="w-32 h-9 px-2.5 rounded-lg border border-border bg-background font-sans text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/50"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={selectedIds.size === 0 || !bulkPrice || bulkSaving}
                        loading={bulkSaving}
                        onClick={applyBulkPrice}
                      >
                        Aplicar precio
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 flex-1 min-w-[260px]">
                    <label className="text-2xs font-semibold font-sans text-text-muted uppercase tracking-wide">
                      Nueva ubicación
                    </label>
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <LocationPickerList value={bulkLocations} onChange={setBulkLocations} />
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={selectedIds.size === 0 || !bulkLocations.some((l) => l.province_id) || bulkSaving}
                        loading={bulkSaving}
                        onClick={applyBulkLocations}
                      >
                        Aplicar ubicación
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-2xs font-semibold font-sans text-text-muted uppercase tracking-wide">
                      Nuevo idioma
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={bulkLanguage}
                        onChange={(e) => setBulkLanguage(e.target.value as CardLanguage | "")}
                        className="h-9 px-2.5 rounded-lg border border-border bg-background font-sans text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/50"
                      >
                        <option value="">Elegir…</option>
                        {(["en", "es", "pt", "ja"] as CardLanguage[]).map((lang) => (
                          <option key={lang} value={lang}>
                            {LANGUAGE_FLAGS[lang]} {LANGUAGE_LABELS[lang]}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={selectedIds.size === 0 || !bulkLanguage || bulkSaving}
                        loading={bulkSaving}
                        onClick={applyBulkLanguage}
                      >
                        Aplicar idioma
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-2xs font-semibold font-sans text-text-muted uppercase tracking-wide">
                      Descuento
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={bulkDiscountType}
                        onChange={(e) => setBulkDiscountType(e.target.value as DiscountType)}
                        className="h-9 px-2 rounded-lg border border-border bg-background font-sans text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/50"
                      >
                        <option value="percentage">%</option>
                        <option value="fixed">$ ARS</option>
                      </select>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder={bulkDiscountType === "percentage" ? "Ej: 10" : "Ej: 1000"}
                        value={bulkDiscountValue}
                        onChange={(e) => setBulkDiscountValue(e.target.value.replace(/[^0-9.,]/g, ""))}
                        className="w-24 h-9 px-2.5 rounded-lg border border-border bg-background font-sans text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/50"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={selectedIds.size === 0 || !bulkDiscountValue || bulkSaving}
                        loading={bulkSaving}
                        onClick={applyBulkDiscount}
                      >
                        Aplicar descuento
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={selectedIds.size === 0 || bulkSaving}
                        loading={bulkSaving}
                        onClick={removeBulkDiscount}
                      >
                        Quitar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {listings.length === 0 ? (
              <div className="p-4">
                <Empty
                  icon={<Package size={28} />}
                  text="No tenés publicaciones todavía."
                  cta={<Link href="/sell"><Button variant="secondary" size="sm">Publicar ahora</Button></Link>}
                />
              </div>
            ) : (
              <>
                <ProfileListFilters filters={listingFilters} searchPlaceholder="Buscar por nombre de carta…" />
                {listingFilters.filtered.length === 0 ? (
                  <div className="p-4">
                    <Empty icon={<Package size={28} />} text="Ninguna publicación coincide con los filtros." />
                  </div>
                ) : (
              <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm font-sans">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40">
                      {massEditMode && (
                        <th className="px-4 py-2.5 text-left w-8">
                          <input
                            type="checkbox"
                            checked={selectedIds.size > 0 && selectedIds.size === listingFilters.filtered.filter((l) => EDITABLE_STATUSES.has(l.status)).length}
                            onChange={toggleSelectAll}
                            className="size-4 rounded border-border accent-primary"
                          />
                        </th>
                      )}
                      {([
                        { label: "Carta",     key: "name"     },
                        { label: "Juego",     key: "game"     },
                        { label: "Set",       key: "set"      },
                        { label: "Tipo",      key: "type"     },
                        { label: "Idioma",    key: "language" },
                        { label: "Ubicación", key: null       },
                        { label: "Precio",    key: "price"    },
                        { label: "Estado",    key: "status"   },
                        { label: "Acciones",  key: null       },
                      ] as { label: string; key: string | null }[]).map(({ label, key }) => (
                        <th key={label} className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap">
                          {key ? (
                            <button
                              onClick={() => toggleListingSort(key)}
                              className="flex items-center gap-1 hover:text-text-primary transition-colors"
                            >
                              {label}
                              {listingSort?.key === key
                                ? listingSort.dir === "asc"
                                  ? <ArrowUp size={11} className="text-primary" />
                                  : <ArrowDown size={11} className="text-primary" />
                                : <ArrowUpDown size={11} className="opacity-40" />
                              }
                            </button>
                          ) : (
                            label
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sortedListings.map((listing) => {
                      const card = listing.cards as { id: string; name: string; image_url: string | null; set_name: string | null; set_code: string | null; game: Game } | null;
                      const info = LISTING_STATUS_LABEL[listing.status] ?? { label: listing.status, variant: "slate" as const };
                      const isEditing = editingId === listing.id;
                      const locationSummary = listingLocationSummary(listing);
                      return (
                        <tr key={listing.id} className="hover:bg-secondary/30 transition-colors">
                          {massEditMode && (
                            <td className="px-4 py-3">
                              {EDITABLE_STATUSES.has(listing.status) && (
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(listing.id)}
                                  onChange={() => toggleSelected(listing.id)}
                                  className="size-4 rounded border-border accent-primary"
                                />
                              )}
                            </td>
                          )}
                          {/* Carta */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <CardThumb imageUrl={card?.image_url ?? null} name={card?.name ?? "?"} />
                              <div className="min-w-0">
                                <Link href={card ? `/cards/${card.id}` : "#"} className="text-sm font-medium text-text-primary hover:text-primary transition-colors truncate block max-w-[160px]">
                                  {card?.name ?? "—"}
                                </Link>
                              </div>
                            </div>
                          </td>
                          {/* Juego */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {card?.game && <Badge variant={GAME_VARIANT[card.game]} size="sm" />}
                          </td>
                          {/* Set */}
                          <td className="px-4 py-3 whitespace-nowrap text-text-secondary">
                            {card?.set_code ?? card?.set_name ?? "—"}
                          </td>
                          {/* Tipo */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {listing.listing_type === "trade"
                              ? <Badge variant="amber" size="sm">Trade</Badge>
                              : <Badge variant="navy"  size="sm">Venta</Badge>
                            }
                          </td>
                          {/* Idioma */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isEditing && card ? (
                              <select
                                value={editLanguage}
                                onChange={(e) => setEditLanguage(e.target.value as CardLanguage)}
                                className="h-8 px-2 rounded-md border border-border bg-background font-sans text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/50"
                              >
                                {LANGUAGES_BY_GAME[card.game].map((lang) => (
                                  <option key={lang} value={lang}>
                                    {LANGUAGE_FLAGS[lang]} {LANGUAGE_LABELS[lang]}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <LanguageBadge language={listing.language} />
                            )}
                          </td>
                          {/* Ubicación */}
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <div className="min-w-[240px]">
                                <LocationPickerList value={editLocations} onChange={setEditLocations} />
                              </div>
                            ) : (
                              <span className="text-text-secondary text-xs whitespace-nowrap">
                                {locationSummary ?? "—"}
                              </span>
                            )}
                          </td>
                          {/* Precio */}
                          <td className="px-4 py-3 font-price whitespace-nowrap text-text-primary">
                            {isEditing && listing.listing_type === "sale" ? (
                              <input
                                type="text"
                                inputMode="numeric"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value.replace(/[^0-9.,]/g, ""))}
                                className="w-24 h-8 px-2 rounded-md border border-border bg-background font-price text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/50"
                              />
                            ) : (
                              <PriceDisplay
                                price={listing.price}
                                originalPrice={listing.original_price}
                                discountType={listing.discount_type}
                                discountValue={listing.discount_value}
                                size="sm"
                              />
                            )}
                          </td>
                          {/* Estado */}
                          <td className="px-4 py-3">
                            <Badge variant={info.variant} size="sm">{info.label}</Badge>
                          </td>
                          {/* Acciones */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => saveQuickEdit(listing)}
                                    disabled={savingEdit}
                                    className="p-1.5 rounded-md text-success hover:bg-success/10 transition-colors disabled:opacity-50"
                                    title="Guardar"
                                  >
                                    {savingEdit ? <Spinner size="sm" /> : <Check size={14} />}
                                  </button>
                                  <button
                                    onClick={cancelQuickEdit}
                                    disabled={savingEdit}
                                    className="p-1.5 rounded-md text-text-muted hover:bg-secondary transition-colors disabled:opacity-50"
                                    title="Cancelar"
                                  >
                                    <X size={14} />
                                  </button>
                                </>
                              ) : listing.status === "active" && (
                                <>
                                  <button
                                    onClick={() => startQuickEdit(listing)}
                                    className="p-1.5 rounded-md text-text-muted hover:text-primary hover:bg-primary/5 transition-colors"
                                    title="Edición rápida (precio y ubicación)"
                                  >
                                    <Zap size={14} />
                                  </button>
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

              {/* Mobile card view */}
              <div className="md:hidden flex flex-col gap-2.5 p-3">
                {sortedListings.map((listing) => (
                  <ListingMobileCard
                    key={listing.id}
                    listing={listing}
                    massEditMode={massEditMode}
                    checkboxEligible={EDITABLE_STATUSES.has(listing.status)}
                    selected={selectedIds.has(listing.id)}
                    onToggleSelect={() => toggleSelected(listing.id)}
                    onCancel={() => cancelListing(listing.id)}
                  />
                ))}
              </div>
              </>
                )}
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2 — Buy orders
        ══════════════════════════════════════════════════════════════════ */}
        {tab === "buy-orders" && (
          <div>
            <div className="flex items-center justify-between p-4 pb-0">
              <p className="text-sm text-text-muted font-sans">{buyOrderFilters.filtered.length} de {buyOrders.length} órdenes</p>
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
              <>
                <ProfileListFilters filters={buyOrderFilters} searchPlaceholder="Buscar por nombre de carta…" />
                {buyOrderFilters.filtered.length === 0 ? (
                  <div className="p-4">
                    <Empty icon={<TrendingUp size={28} />} text="Ninguna orden coincide con los filtros." />
                  </div>
                ) : (
              <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm font-sans">
                  <thead>
                    <tr className="border-b border-border bg-secondary/40">
                      {["Carta", "Mi oferta", "Vence", "Estado", "Acciones"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {buyOrderFilters.filtered.map((order) => {
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

              {/* Mobile card view */}
              <div className="md:hidden flex flex-col gap-2.5 p-3">
                {buyOrderFilters.filtered.map((order) => {
                  const daysLeft    = differenceInDays(new Date(order.expires_at), new Date());
                  const isExpiring  = daysLeft <= 3 && order.status === "active";
                  const canRenew    = ["active", "expired"].includes(order.status);
                  const canCancel   = order.status === "active";
                  const pendingTxId = order.status === "reserved"
                    ? reservedOrderTransactions[order.id]
                    : undefined;

                  return (
                    <BuyOrderMobileCard
                      key={order.id}
                      order={order}
                      daysLeft={daysLeft}
                      isExpiring={isExpiring}
                      canRenew={canRenew}
                      canCancel={canCancel}
                      pendingTxId={pendingTxId}
                      onRenew={() => renewBuyOrder(order.id, 30)}
                      onCancel={() => cancelBuyOrder(order.id)}
                    />
                  );
                })}
              </div>
              </>
                )}
              </>
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
                        className="absolute top-2 right-2 z-10 p-1 rounded-full bg-surface/80 backdrop-blur-sm text-text-muted hover:text-error hover:bg-error-subtle transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
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
              <>
              <div className="hidden md:block overflow-x-auto">
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

              {/* Mobile card view */}
              <div className="md:hidden flex flex-col gap-2.5 p-3">
                {transactions.map((tx) => (
                  <HistorialMobileCard
                    key={tx.id}
                    tx={tx}
                    currentUserId={currentUserId}
                    onClick={() => router.push(`/chat/${tx.id}`)}
                  />
                ))}
              </div>
              </>
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
