import * as React from "react";
import Image from "next/image";
import { Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge }           from "@/components/ui/badge";
import { ConditionBadge }  from "@/components/ui/ConditionBadge";
import { LanguageBadge }   from "@/components/ui/LanguageBadge";
import { CommissionBreakdown } from "./CommissionBreakdown";
import { formatARS, setLabel } from "@/lib/formatting";
import type { CardSearchResult, Condition, CardLanguage, ListingType, Game } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ListingPreviewProps {
  card:               CardSearchResult;
  listingType:        ListingType;
  price:              number | null;
  condition:          Condition;
  language:           CardLanguage;
  quantity:           number;
  notes:              string;
  tradeFor:           string;
  priceDiff:          number | null;
  sellerUsername:     string;
  platformFeePercent: number;
  className?:         string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────


const GAME_BADGE: Record<Game, React.ComponentProps<typeof Badge>["variant"]> = {
  magic: "magic", pokemon: "poke", onepiece: "op", dbz: "dbz",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ListingPreview({
  card,
  listingType,
  price,
  condition,
  language,
  quantity,
  notes,
  tradeFor,
  priceDiff,
  sellerUsername,
  platformFeePercent,
  className,
}: ListingPreviewProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Card detail section */}
      <div className="surface-raised p-4">
        <p className="text-xs text-text-muted font-sans uppercase tracking-wide mb-3">
          Así verán tu listing los compradores
        </p>

        <div className="flex gap-4 items-start">
          {/* Card image */}
          <div className="shrink-0 w-16 rounded-lg overflow-hidden border border-border shadow-sm aspect-[2.5/3.5] bg-secondary">
            {card.image_url ? (
              <Image
                src={card.image_url}
                alt={card.name}
                width={64}
                height={90}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Tag size={16} className="text-border" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-base font-serif font-semibold text-text-primary leading-snug">
                {card.name}
              </h3>
              <Badge variant={GAME_BADGE[card.game]} size="sm" className="shrink-0" />
            </div>

            <p className="text-xs text-text-muted font-sans mb-3">
              {setLabel(card.set_code, card.set_name)}
              {card.external_id && (
                <span className="ml-1.5 font-mono opacity-60">{card.external_id}</span>
              )}
            </p>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2">
              <ConditionBadge condition={condition} variant="long" />
              <LanguageBadge language={language} variant="long" />

              {quantity > 1 && (
                <span className="text-xs text-text-muted font-sans">
                  ×{quantity} disponibles
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Price or trade */}
        <div className="mt-4 pt-3 border-t border-border/60">
          {listingType === "sale" && price != null ? (
            <div className="flex items-baseline gap-2">
              <span className="font-price text-2xl text-text-primary">{formatARS(price)}</span>
              <span className="text-xs text-text-muted font-sans">por unidad</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-text-muted font-sans uppercase tracking-wide">
                Trade / Canje — busco:
              </span>
              <span className="text-sm font-sans text-text-primary">
                {tradeFor || "—"}
              </span>
              {priceDiff != null && priceDiff !== 0 && (
                <span className="text-xs text-text-muted font-sans">
                  {priceDiff > 0
                    ? `+ ${formatARS(priceDiff)} a tu favor`
                    : `${formatARS(Math.abs(priceDiff))} a mi favor`}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Notes */}
        {notes && (
          <blockquote className="mt-3 border-l-2 border-border pl-3 text-sm text-text-secondary font-sans italic">
            {'"'}{notes}{'"'}
          </blockquote>
        )}

        {/* Seller */}
        <p className="mt-3 text-xs text-text-muted font-sans">
          Vendedor: <span className="font-medium text-text-secondary">{sellerUsername}</span>
        </p>
      </div>

      {/* Commission breakdown — only for sales */}
      {listingType === "sale" && price != null && price > 0 && (
        <CommissionBreakdown
          priceARS={price}
          platformFeePercent={platformFeePercent}
        />
      )}
    </div>
  );
}
