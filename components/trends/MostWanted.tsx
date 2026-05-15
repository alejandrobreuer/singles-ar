import * as React from "react";
import Link from "next/link";
import { formatARS } from "@/lib/formatting";
import { GameBadge } from "@/components/trends/GameBadge";
import type { WantedItem } from "@/lib/trends";

interface Props {
  items: WantedItem[];
}

function CardImage({ src, name }: { src: string | null; name: string }) {
  if (!src) {
    return (
      <div className="w-10 h-14 bg-secondary border border-border rounded flex items-center justify-center text-text-muted shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.4}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} className="w-10 h-14 object-cover rounded border border-border shrink-0" />
  );
}

export function MostWanted({ items }: Props) {
  if (!items.length) {
    return (
      <div className="surface-raised text-center py-10 text-text-muted text-sm font-sans">
        Sin buy orders para este juego.
      </div>
    );
  }

  return (
    <div className="surface-raised divide-y divide-border">
      {items.map((item) => (
        <Link key={item.card.id} href={`/cards/${item.card.id}`} className="no-underline">
          <div className="flex items-center gap-4 px-4 sm:px-5 py-3.5 hover:bg-secondary/40 transition-colors duration-150 cursor-pointer">
            {/* Rank */}
            <div className="font-serif text-lg font-bold text-border w-7 text-center shrink-0">
              {item.rank}
            </div>

            {/* Card image */}
            <CardImage src={item.card.image_url} name={item.card.name} />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-text-primary mb-1 truncate">{item.card.name}</div>
              <div className="flex flex-wrap items-center gap-2">
                <GameBadge game={item.card.game} />
                <span className="text-2xs text-text-muted font-sans">
                  {[item.card.set_code, item.card.set_name].filter(Boolean).join(" · ")}
                </span>
              </div>
              {/* Demand bar */}
              <div className="mt-2 h-1 bg-secondary rounded-full overflow-hidden w-44 max-w-full">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round(item.demandRatio * 100)}%`,
                    background: "linear-gradient(90deg, #1e5fa8 0%, #5ba8ff 100%)",
                  }}
                />
              </div>
            </div>

            {/* Right */}
            <div className="text-right shrink-0">
              <div className="font-serif text-xl font-bold text-[#1e5fa8]">{item.orderCount}</div>
              <div className="text-2xs text-text-muted uppercase tracking-wider">buy orders</div>
              {item.bestOffer > 0 && (
                <div className="text-xs text-text-muted mt-0.5">
                  Mejor oferta: {formatARS(item.bestOffer)}
                </div>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
