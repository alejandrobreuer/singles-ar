import * as React from "react";
import Link from "next/link";
import { formatARS } from "@/lib/formatting";
import { formatRelativeTime } from "@/lib/trendsFormat";
import { GameBadge } from "@/components/trends/GameBadge";
import type { BackInStockItem } from "@/lib/trends";

interface Props {
  items: BackInStockItem[];
}

function CardImage({ src, name }: { src: string | null; name: string }) {
  if (!src) {
    return (
      <div className="w-[60px] h-[84px] bg-secondary border border-border rounded flex items-center justify-center text-text-muted">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity={0.4}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} className="w-[60px] h-[84px] object-cover rounded border border-border" />
  );
}

export function BackInStock({ items }: Props) {
  if (!items.length) {
    return (
      <div className="col-span-4 text-center py-10 text-text-muted text-sm font-sans">
        Sin stock reciente para este juego.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <Link key={item.card.id} href={`/cards/${item.card.id}`} className="no-underline">
          <div className="surface-raised p-3.5 hover:-translate-y-0.5 hover:shadow-card-lg transition-all duration-200 cursor-pointer">
            {/* Header */}
            <div className="flex items-start justify-between mb-2.5">
              <span className="text-2xs font-bold uppercase tracking-wider bg-[#edf7f2] text-[#1a7a4a] border border-[#b8dece] px-2 py-0.5 rounded">
                Nuevo
              </span>
              <span className="text-2xs text-text-muted">{formatRelativeTime(item.firstListingAt)}</span>
            </div>

            {/* Card image */}
            <div className="flex justify-center mb-2.5">
              <CardImage src={item.card.image_url} name={item.card.name} />
            </div>

            <div className="mb-1.5">
              <GameBadge game={item.card.game} />
            </div>
            <div className="font-semibold text-xs text-text-primary leading-tight mb-0.5 line-clamp-2">
              {item.card.name}
            </div>
            <div className="text-2xs text-text-muted font-sans mb-2">
              {[item.card.set_code, item.card.set_name].filter(Boolean).join(" · ")}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <span className="font-serif text-sm font-semibold text-text-primary">
                {item.price > 0 ? formatARS(item.price) : "—"}
              </span>
              <span className="text-2xs text-text-muted">
                {item.listingCount} {item.listingCount === 1 ? "listing" : "listings"}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
