"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingCart, X, Star, Tag, Plus, Clock } from "lucide-react";
import { cn }    from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import type { Card, ListingWithSeller, Condition } from "@/types/database";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CONDITION_META: Record<Condition, { label: string; color: string }> = {
  NM:  { label: "NM",  color: "bg-success-subtle text-success border-success/20"   },
  LP:  { label: "LP",  color: "bg-blue-50 text-blue-700 border-blue-200"           },
  MP:  { label: "MP",  color: "bg-warning-subtle text-warning border-warning/20"   },
  HP:  { label: "HP",  color: "bg-orange-50 text-orange-700 border-orange-200"     },
  DMG: { label: "DMG", color: "bg-error-subtle text-error border-error/20"         },
};

function formatARS(price: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(price);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface BuyListingSectionProps {
  listings:      ListingWithSeller[];
  card:          Card;
  currentUserId: string | null;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BuyListingSection({ listings, card, currentUserId }: BuyListingSectionProps) {
  const [selected, setSelected] = React.useState<ListingWithSeller | null>(null);

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center rounded-xl border border-dashed border-border bg-secondary/40">
        <ShoppingCart size={22} className="text-text-muted" />
        <p className="text-sm font-medium font-sans text-text-secondary">Sin ofertas activas</p>
        <p className="text-xs text-text-muted font-sans max-w-xs">Nadie está vendiendo esta carta en este momento.</p>
        {currentUserId && (
          <div className="mt-1">
            <Link href="/sell">
              <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium font-sans hover:bg-primary/90 transition-colors">
                <Plus size={13} />
                Sé el primero en vender esta carta
              </button>
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {listings.map((listing) => (
          <BuyableListingRow
            key={listing.id}
            listing={listing}
            isOwn={listing.seller_id === currentUserId}
            isLoggedIn={!!currentUserId}
            onBuy={() => setSelected(listing)}
          />
        ))}
      </div>

      {selected && (
        <BuyConfirmModal
          listing={selected}
          card={card}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

// ─── BuyableListingRow ────────────────────────────────────────────────────────

function BuyableListingRow({
  listing,
  isOwn,
  isLoggedIn,
  onBuy,
}: {
  listing:    ListingWithSeller;
  isOwn:      boolean;
  isLoggedIn: boolean;
  onBuy:      () => void;
}) {
  const { profiles: seller } = listing;
  const cond = CONDITION_META[listing.condition] ?? CONDITION_META.NM;

  const isReserved = listing.status === "reserved";

  return (
    <div className={cn(
      "flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-colors duration-150",
      isReserved
        ? "border-border bg-secondary/40"
        : "border-border bg-surface hover:bg-secondary/60",
    )}>
      {/* Condition */}
      <span className={cn(
        "shrink-0 inline-flex items-center justify-center w-10 h-6 rounded text-2xs font-sans font-bold border",
        cond.color
      )}>
        {cond.label}
      </span>

      {/* Seller */}
      <Link
        href={`/profile/${seller.username}`}
        className="flex items-center gap-2 min-w-0 flex-1 no-underline group"
      >
        <Avatar name={seller.username} size="sm" className="shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium font-sans text-text-primary truncate group-hover:text-primary transition-colors">
            {seller.username}
          </p>
          <div className="flex items-center gap-1">
            <Star size={10} className="text-accent fill-accent" />
            <span className="text-2xs text-text-muted font-sans">{seller.reputation_score.toFixed(1)}</span>
            <span className="text-2xs text-text-muted font-sans">· {seller.total_sales} ventas</span>
          </div>
        </div>
      </Link>

      {/* Qty */}
      {listing.quantity > 1 && (
        <span className="shrink-0 text-xs text-text-muted font-sans">×{listing.quantity}</span>
      )}

      {/* Price */}
      <span className="shrink-0 font-price text-base text-text-primary">
        {listing.price != null ? formatARS(listing.price) : "—"}
      </span>

      {/* Buy button / reserved */}
      {isReserved ? (
        <button
          type="button"
          disabled
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs font-medium font-sans text-text-muted cursor-not-allowed"
        >
          <Clock size={12} />
          Reservado
        </button>
      ) : !isOwn && listing.listing_type === "sale" && listing.price != null && (
        isLoggedIn ? (
          <button
            type="button"
            onClick={onBuy}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium font-sans hover:bg-primary/90 transition-colors"
          >
            <ShoppingCart size={12} />
            Comprar
          </button>
        ) : (
          <Link href="/login" className="shrink-0">
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs font-medium font-sans text-text-secondary hover:bg-primary hover:text-white hover:border-primary transition-colors"
            >
              <ShoppingCart size={12} />
              Comprar
            </button>
          </Link>
        )
      )}
    </div>
  );
}

// ─── BuyConfirmModal ──────────────────────────────────────────────────────────

function BuyConfirmModal({
  listing,
  card,
  onClose,
}: {
  listing: ListingWithSeller;
  card:    Card;
  onClose: () => void;
}) {
  const router  = useRouter();
  const [busy,  setBusy]  = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const { profiles: seller } = listing;
  const cond = CONDITION_META[listing.condition] ?? CONDITION_META.NM;
  const imgSrc = card.image_override_url ?? card.image_url;

  async function handleConfirm() {
    setError(null);
    setBusy(true);
    try {
      const res  = await fetch(`/api/listings/${listing.id}/buy`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al iniciar la compra.");
      router.push(`/chat/${json.data.transactionId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-border rounded-2xl w-full max-w-sm shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <h2 className="text-base font-semibold font-sans text-text-primary">Confirmar compra</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Card + listing summary */}
        <div className="px-5 py-4 flex gap-4">
          <div className="shrink-0 relative w-16 h-[88px] rounded-lg overflow-hidden border border-border bg-secondary">
            {imgSrc ? (
              <Image src={imgSrc} alt={card.name} fill sizes="64px" className="object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Tag size={20} className="text-border" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold font-serif text-text-primary leading-snug mb-0.5 truncate">
              {card.name}
            </p>
            <p className="text-xs text-text-muted font-sans mb-2 truncate">{card.set_name}</p>

            <div className="flex items-center gap-2 mb-2">
              <span className={cn(
                "inline-flex items-center justify-center px-2 py-0.5 rounded text-2xs font-sans font-bold border",
                cond.color
              )}>
                {cond.label}
              </span>
              {card.game && (
                <Badge
                  variant={card.game === "magic" ? "magic" : card.game === "pokemon" ? "poke" : "op"}
                  size="sm"
                />
              )}
            </div>

            {listing.notes && (
              <p className="text-xs text-text-muted font-sans italic line-clamp-2">{listing.notes}</p>
            )}
          </div>
        </div>

        {/* Seller */}
        <div className="mx-5 mb-4 flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary border border-border">
          <Avatar name={seller.username} size="sm" className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium font-sans text-text-primary truncate">{seller.username}</p>
            <div className="flex items-center gap-1">
              <Star size={10} className="text-accent fill-accent" />
              <span className="text-2xs text-text-muted font-sans">{seller.reputation_score.toFixed(1)}</span>
              <span className="text-2xs text-text-muted font-sans">· {seller.total_sales} ventas</span>
            </div>
          </div>
          <div className="shrink-0 font-price text-lg text-text-primary">
            {listing.price != null ? formatARS(listing.price) : "—"}
          </div>
        </div>

        {/* Note */}
        <p className="mx-5 mb-4 text-xs text-text-muted font-sans leading-relaxed">
          Se abrirá un chat con el vendedor para coordinar la entrega. Ambas partes deben confirmar antes de que la transacción se complete.
        </p>

        {error && (
          <p className="mx-5 mb-3 text-xs text-error font-sans">{error}</p>
        )}

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold font-sans hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {busy ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <ShoppingCart size={15} />
            )}
            {busy ? "Iniciando…" : "Confirmar compra"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2.5 rounded-xl bg-secondary border border-border text-sm font-medium font-sans text-text-secondary hover:bg-border transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
