import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { setLabel } from "@/lib/formatting";
import type { CardWithListingStats, Game } from "@/types/database";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RARITY_COLORS: Record<string, string> = {
  common:   "text-text-muted",
  uncommon: "text-slate-500",
  rare:     "text-yellow-600",
  mythic:   "text-orange-500",
  special:  "text-violet-500",
};

const GAME_BADGE: Record<Game, React.ComponentProps<typeof Badge>["variant"]> = {
  magic:    "magic",
  pokemon:  "poke",
  onepiece: "op",
};

function formatARS(price: number): string {
  return new Intl.NumberFormat("es-AR", {
    style:    "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CardTileProps {
  card:      CardWithListingStats;
  className?: string;
}

export function CardTile({ card, className }: CardTileProps) {
  const rarityColor = RARITY_COLORS[card.rarity?.toLowerCase() ?? ""] ?? "text-text-muted";

  return (
    <Link
      href={`/cards/${card.id}`}
      className={cn(
        "group block no-underline bg-surface rounded-xl border border-border shadow-card",
        "transition-all duration-200 hover:shadow-card-md hover:-translate-y-0.5 overflow-hidden",
        className
      )}
    >
      {/* Card image */}
      <div className="relative aspect-[2.5/3.5] bg-secondary overflow-hidden">
        {card.image_url ? (
          <Image
            src={card.image_url}
            alt={card.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary">
            <Tag size={28} className="text-border" />
          </div>
        )}

        {/* Game badge — top left */}
        <div className="absolute top-2 left-2">
          <Badge variant={GAME_BADGE[card.game]} size="sm" />
        </div>

        {/* Listing count pill — top right */}
        {card.listing_count > 0 && (
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-2xs font-sans font-medium px-1.5 py-0.5 rounded-md">
            {card.listing_count} en venta
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-semibold font-serif text-text-primary leading-snug line-clamp-2 mb-0.5 group-hover:text-primary transition-colors">
          {card.name}
        </p>

        <p className="text-xs text-text-muted font-sans truncate mb-1">
          {setLabel(card.set_code, card.set_name)}
        </p>
        {card.external_id && (
          <p className="text-2xs font-mono text-text-muted/60 font-sans truncate mb-1">
            {card.external_id}
          </p>
        )}

        {/* Rarity + price row */}
        <div className="flex items-center justify-between gap-2">
          <span className={cn("text-2xs font-sans font-medium capitalize", rarityColor)}>
            {card.rarity ?? "—"}
          </span>

          {card.lowest_price != null ? (
            <span className="font-price text-sm text-text-primary">
              {formatARS(card.lowest_price)}
            </span>
          ) : (
            <span className="text-xs text-text-muted font-sans">Sin oferta</span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function CardTileSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-surface rounded-xl border border-border overflow-hidden animate-pulse", className)}>
      <div className="aspect-[2.5/3.5] bg-secondary" />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-4 bg-border rounded w-4/5" />
        <div className="h-3 bg-border rounded w-3/5" />
        <div className="flex justify-between">
          <div className="h-3 bg-border rounded w-1/4" />
          <div className="h-4 bg-border rounded w-1/3" />
        </div>
      </div>
    </div>
  );
}
