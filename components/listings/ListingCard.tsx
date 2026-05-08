"use client";

import * as React from "react";
import { Star, ShoppingCart, MessageCircle, Award, Repeat2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar }          from "@/components/ui/avatar";
import { Button }          from "@/components/ui/button";
import { ConditionBadge }  from "@/components/ui/ConditionBadge";
import { formatARS }       from "@/lib/formatting";
import type { Condition, ListingType, PublicProfile } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ListingCardData {
  id:           string;
  listing_type: ListingType;
  price:        number | null;
  condition:    Condition;
  quantity:     number;
  notes:        string | null;
  trade_for:    string | null;
  price_diff:   number | null;
  profiles:     PublicProfile;
}

interface ListingCardProps {
  listing:    ListingCardData;
  isCheapest: boolean;
  onBuy?:     (listingId: string) => void;
  onChat?:    (sellerId: string, listingId: string) => void;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ListingCard({
  listing,
  isCheapest,
  onBuy,
  onChat,
  className,
}: ListingCardProps) {
  const { profiles: seller } = listing;
  const isSale = listing.listing_type === "sale";

  return (
    <div
      className={cn(
        "relative rounded-xl border transition-all duration-150 overflow-hidden",
        // Cheapest highlight: subtle tinted background
        isCheapest
          ? "border-accent/30 bg-accent/[0.03] shadow-card-md"
          : "border-border bg-surface shadow-card hover:shadow-card-md",
        className
      )}
    >
      {/* Cheapest ribbon */}
      {isCheapest && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent/60 via-accent to-accent/60" />
      )}

      <div className="p-4">
        {/* Top row: seller + cheapest badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Seller */}
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={seller.username} size="md" className="shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold font-sans text-text-primary truncate">
                  {seller.username}
                </span>
                {seller.total_sales >= 50 && (
                  <Award size={13} className="text-accent shrink-0" aria-label="Vendedor destacado" />
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {/* Star rating */}
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={10}
                      className={cn(
                        s <= Math.round(seller.reputation_score / 20)
                          ? "text-accent fill-accent"
                          : "text-border"
                      )}
                    />
                  ))}
                </div>
                <span className="text-2xs text-text-muted font-sans">
                  {seller.reputation_score.toFixed(1)}
                </span>
                <span className="text-2xs text-text-muted font-sans">
                  · {seller.total_sales} ventas
                </span>
              </div>
            </div>
          </div>

          {/* Cheapest label */}
          {isCheapest && (
            <span className="shrink-0 text-2xs font-semibold font-sans uppercase tracking-wide text-accent bg-accent/10 px-2 py-1 rounded-full">
              Mejor precio
            </span>
          )}
        </div>

        {/* Middle: condition + price / trade info */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            {/* Condition badge */}
            <ConditionBadge condition={listing.condition} className="w-9" />

            {/* Listing type indicator */}
            {listing.listing_type === "trade" && (
              <span className="flex items-center gap-1 text-2xs text-text-muted font-sans bg-secondary border border-border px-2 py-0.5 rounded-full">
                <Repeat2 size={10} />
                Canje
              </span>
            )}

            {/* Quantity */}
            {listing.quantity > 1 && (
              <span className="text-2xs text-text-muted font-sans">
                ×{listing.quantity}
              </span>
            )}
          </div>

          {/* Price */}
          {isSale && listing.price != null ? (
            <span className={cn(
              "font-price text-xl",
              isCheapest ? "text-accent-dark" : "text-text-primary"
            )}>
              {formatARS(listing.price)}
            </span>
          ) : (
            <span className="text-sm font-medium font-sans text-text-secondary">
              Ver oferta →
            </span>
          )}
        </div>

        {/* Trade details */}
        {listing.listing_type === "trade" && listing.trade_for && (
          <div className="mb-3 rounded-lg bg-secondary border border-border/60 px-3 py-2">
            <p className="text-2xs text-text-muted font-sans uppercase tracking-wide mb-0.5">
              Busco a cambio
            </p>
            <p className="text-sm text-text-secondary font-sans">{listing.trade_for}</p>
            {listing.price_diff != null && listing.price_diff !== 0 && (
              <p className="text-xs text-text-muted font-sans mt-0.5">
                {listing.price_diff > 0
                  ? `+ ${formatARS(listing.price_diff)} a tu favor`
                  : `${formatARS(Math.abs(listing.price_diff))} a mi favor`}
              </p>
            )}
          </div>
        )}

        {/* Notes */}
        {listing.notes && (
          <blockquote className="mb-3 border-l-2 border-border pl-3 text-sm text-text-muted font-sans italic leading-relaxed">
            {'"'}{listing.notes}{'"'}
          </blockquote>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          {isSale && (
            <Button
              variant={isCheapest ? "primary" : "secondary"}
              size="sm"
              className="flex-1"
              leftIcon={<ShoppingCart size={13} />}
              onClick={() => onBuy?.(listing.id)}
            >
              Comprar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={cn("flex-1", !isSale && "flex-[2]")}
            leftIcon={<MessageCircle size={13} />}
            onClick={() => onChat?.(seller.id, listing.id)}
          >
            Consultar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function ListingCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      "rounded-xl border border-border bg-surface shadow-card p-4 animate-pulse",
      className
    )}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="size-9 rounded-full bg-border shrink-0" />
        <div className="flex flex-col gap-1.5 flex-1">
          <div className="h-3.5 bg-border rounded w-32" />
          <div className="h-2.5 bg-border rounded w-24" />
        </div>
      </div>
      <div className="flex justify-between mb-3">
        <div className="h-6 bg-border rounded w-14" />
        <div className="h-6 bg-border rounded w-24" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 bg-border rounded flex-1" />
        <div className="h-8 bg-border rounded flex-1" />
      </div>
    </div>
  );
}
