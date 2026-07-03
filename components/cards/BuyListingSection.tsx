"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, X, Star, Tag, Plus, Clock, MapPin } from "lucide-react";
import { cn }           from "@/lib/utils";
import { Badge }           from "@/components/ui/badge";
import { Avatar }          from "@/components/ui/avatar";
import { ConditionBadge }  from "@/components/ui/ConditionBadge";
import { LanguageBadge }   from "@/components/ui/LanguageBadge";
import { SellerNameLink }  from "@/components/seller/SellerNameLink";
import { fantasyName }     from "@/lib/fantasy-name";
import { listingLocationLabels } from "@/lib/listingLocation";
import type { Card, ListingWithSeller } from "@/types/database";

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
            <Link href={`/sell?${new URLSearchParams({
              card_id:     card.id,
              name:        card.name,
              game:        card.game,
              external_id: card.external_id ?? "",
              image_url:   card.image_override_url ?? card.image_url ?? "",
              set_name:    card.set_name    ?? "",
              set_code:    card.set_code    ?? "",
              card_number: card.card_number ?? "",
              rarity:      card.rarity      ?? "",
              color:       card.color       ?? "",
            })}`}>
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
  const alias  = fantasyName(listing.id);
  const locationLabels = listingLocationLabels(listing);

  const isReserved = listing.status === "reserved";

  return (
    <div className={cn(
      "flex flex-col rounded-xl border transition-colors duration-150",
      isReserved
        ? "border-border bg-secondary/40"
        : "border-border bg-surface hover:bg-secondary/60",
    )}>
      {/* Main row */}
      <div className="flex items-center gap-4 px-4 py-3.5">
        {/* Condition */}
        <ConditionBadge condition={listing.condition} />
        <LanguageBadge language={listing.language} />

        {/* Seller — anonymised */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Avatar name={alias} size="sm" className="shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium font-sans text-text-primary truncate">
              <SellerNameLink listingId={listing.id} sellerId={listing.seller_id} />
            </p>
            <div className="flex items-center gap-1">
              <Star size={10} className="text-accent fill-accent" />
              <span className="text-2xs text-text-muted font-sans">{seller.reputation_score.toFixed(1)}</span>
              <span className="text-2xs text-text-muted font-sans">· {seller.total_sales} ventas</span>
            </div>
            {locationLabels.length > 0 && (
              <p className="text-2xs text-text-muted font-sans truncate">
                {locationLabels.length > 1 ? `${locationLabels[0]} +${locationLabels.length - 1}` : locationLabels[0]}
              </p>
            )}
          </div>
        </div>

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

      {/* Delivery stores row */}
      {listing.delivery_stores && listing.delivery_stores.length > 0 && (
        <div className="flex items-start gap-1.5 px-4 pb-3 flex-wrap">
          <MapPin size={11} className="text-text-muted shrink-0 mt-0.5" />
          {listing.delivery_stores.map((store) => (
            <span
              key={store}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-sans bg-secondary border border-border text-text-secondary"
            >
              {store}
            </span>
          ))}
        </div>
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
  const [step,  setStep]  = React.useState<"confirm" | "paying">("confirm");
  const [busy,  setBusy]  = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [qty,   setQty]   = React.useState(1);

  const maxQty     = listing.quantity ?? 1;
  const unitPrice  = listing.price ?? 0;
  const totalPrice = unitPrice * qty;

  const { profiles: seller } = listing;
  const alias  = fantasyName(listing.id);
  const imgSrc = card.image_override_url ?? card.image_url;
  const locationLabels = listingLocationLabels(listing);

  async function handleConfirm() {
    setError(null);
    setBusy(true);

    // Step 1 — reserve the listing and create the transaction
    setStep("paying");
    let transactionId: string;
    try {
      const res  = await fetch(`/api/listings/${listing.id}/buy`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ qty }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al reservar la carta.");
      transactionId = json.data.transactionId;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setBusy(false);
      setStep("confirm");
      return;
    }

    // Step 2 — create the MercadoPago preference
    try {
      const res  = await fetch("/api/payments/create-preference", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ transactionId }),
      });
      const json = await res.json();
      if (!res.ok) {
        // Attempt to release the reservation we just made
        fetch(`/api/transactions/${transactionId}/action`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ action: "cancel" }),
        }).catch(() => null);
        throw new Error(json.error ?? "No se pudo iniciar el pago.");
      }
      const url = json.data?.initPoint ?? json.data?.sandboxUrl; // TODO: revert to sandboxUrl for sandbox testing
      if (!url) throw new Error("No se recibió URL de pago de MercadoPago.");
      window.location.href = url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setBusy(false);
      setStep("confirm");
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
              <ConditionBadge condition={listing.condition} />
              <LanguageBadge language={listing.language} />
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
          <Avatar name={alias} size="sm" className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium font-sans text-text-primary truncate">
              <SellerNameLink listingId={listing.id} sellerId={listing.seller_id} />
            </p>
            <div className="flex items-center gap-1">
              <Star size={10} className="text-accent fill-accent" />
              <span className="text-2xs text-text-muted font-sans">{seller.reputation_score.toFixed(1)}</span>
              <span className="text-2xs text-text-muted font-sans">· {seller.total_sales} ventas</span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-price text-lg text-text-primary">{formatARS(totalPrice)}</div>
            {qty > 1 && (
              <div className="text-2xs text-text-muted font-sans">{qty} × {formatARS(unitPrice)}</div>
            )}
          </div>
        </div>

        {/* Quantity stepper — only shown when listing has more than 1 unit */}
        {maxQty > 1 && (
          <div className="mx-5 mb-4 flex items-center justify-between px-3.5 py-3 rounded-xl border border-border bg-secondary/50">
            <span className="text-xs font-semibold font-sans text-text-secondary uppercase tracking-wide">Cantidad</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                className="w-7 h-7 rounded-full border border-border bg-surface flex items-center justify-center text-text-primary hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-base leading-none"
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-semibold font-sans text-text-primary">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                disabled={qty >= maxQty}
                className="w-7 h-7 rounded-full border border-border bg-surface flex items-center justify-center text-text-primary hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-base leading-none"
              >
                +
              </button>
              <span className="text-2xs text-text-muted font-sans">de {maxQty} disponibles</span>
            </div>
          </div>
        )}

        {/* Delivery options */}
        <div className="mx-5 mb-4 rounded-xl border border-border bg-secondary/50 px-3.5 py-3">
          <div className="flex items-center gap-1.5 mb-2">
            <MapPin size={12} className="text-text-muted shrink-0" />
            <p className="text-xs font-semibold font-sans text-text-secondary uppercase tracking-wide">
              Lugar de entrega
            </p>
          </div>
          {locationLabels.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {locationLabels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-2xs font-sans bg-surface border border-border text-text-secondary"
                >
                  {label}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-muted font-sans mb-2.5">
              A coordinar con el vendedor por chat tras el pago.
            </p>
          )}
          <p className="text-2xs text-text-muted font-sans leading-relaxed">
            Al confirmar el pago aceptás que la entrega se realizará únicamente en{" "}
            {locationLabels.length > 0
              ? "los lugares indicados arriba"
              : "el lugar que acuerden por chat"}
            {" "}y dentro de los plazos acordados.
          </p>
        </div>

        {/* Note */}
        <p className="mx-5 mb-4 text-xs text-text-muted font-sans leading-relaxed">
          {step === "paying"
            ? "Reservando la carta y preparando el checkout de MercadoPago…"
            : "Serás redirigido a la página de MercadoPago para efectuar el pago. Luego se habilitará un chat con el vendedor para acordar la entrega."}
        </p>

        {error && (
          <div className="mx-5 mb-3 rounded-lg bg-error-subtle border border-error/20 px-3 py-2.5">
            <p className="text-xs font-semibold text-error font-sans mb-0.5">No se pudo procesar la compra</p>
            <p className="text-xs text-error/80 font-sans">{error}</p>
          </div>
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
            {busy
              ? (step === "paying" ? "Redirigiendo a MercadoPago…" : "Reservando…")
              : "Pagar con MercadoPago"}
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
