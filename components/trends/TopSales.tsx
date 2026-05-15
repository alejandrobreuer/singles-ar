import * as React from "react";
import Link from "next/link";
import { formatCompact } from "@/lib/trendsFormat";
import { formatARS } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { GameBadge } from "@/components/trends/GameBadge";
import type { TopSaleItem } from "@/lib/trends";

interface Props {
  items: TopSaleItem[];
}

const RANK_COLORS = ["text-[#d4a84b]", "text-[#c0c8d8]", "text-[#c87941]"] as const;

function rankChangeLabel(change: string): { label: string; color: string } {
  if (change === "new")     return { label: "★ NUEVO EN TOP", color: "text-[#d4a84b]" };
  if (change === "=")       return { label: "= Sin cambio",   color: "text-text-muted" };
  if (change.startsWith("up:"))   return { label: `↑ desde #${change.slice(3)}`, color: "text-success" };
  if (change.startsWith("down:")) return { label: `↓ desde #${change.slice(5)}`, color: "text-error" };
  return { label: change, color: "text-text-muted" };
}

function CardImage({ src, name }: { src: string | null; name: string }) {
  if (!src) {
    return (
      <div className="w-[52px] h-[72px] bg-secondary border border-border rounded flex items-center justify-center text-text-muted shrink-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity={0.4}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} className="w-[52px] h-[72px] object-cover rounded border border-border shrink-0" />
  );
}

export function TopSales({ items }: Props) {
  if (!items.length) {
    return (
      <div className="col-span-3 text-center py-10 text-text-muted text-sm font-sans">
        Sin ventas para este juego en el período seleccionado.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {items.map((item) => {
        const rc   = rankChangeLabel(item.rankChange);
        const rank = item.rank;
        return (
          <Link key={item.card.id} href={`/cards/${item.card.id}`} className="no-underline">
            <div className="surface-raised overflow-hidden hover:-translate-y-0.5 hover:shadow-card-lg transition-all duration-200 cursor-pointer">
              {/* Rank bar */}
              <div className="bg-primary px-4 py-2.5 flex items-center justify-between">
                <span className={cn("font-serif text-[22px] font-bold", RANK_COLORS[rank - 1] ?? "text-white/20")}>
                  #{rank}
                </span>
                <span className={cn("text-xs font-semibold flex items-center gap-1", rc.color)}>
                  {rc.label}
                </span>
              </div>

              {/* Body */}
              <div className="p-4">
                <div className="flex gap-3 items-center mb-3">
                  <CardImage src={item.card.image_url} name={item.card.name} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-text-primary leading-tight mb-1 line-clamp-2">
                      {item.card.name}
                    </div>
                    <div className="text-2xs text-text-muted font-sans">
                      {[item.card.set_code, item.card.set_name].filter(Boolean).join(" · ")}
                    </div>
                    <div className="mt-1.5">
                      <GameBadge game={item.card.game} />
                    </div>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Ventas",           value: item.saleCount.toString() },
                    { label: "Precio mediano",    value: formatARS(item.medianPrice) },
                    { label: "Volumen total",     value: formatCompact(item.totalVolume) },
                    { label: "Listings activos",  value: item.activeListings.toString() },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-secondary/60 rounded-md px-2.5 py-2">
                      <div className="text-2xs font-semibold uppercase tracking-wider text-text-muted mb-0.5">{label}</div>
                      <div className="font-serif text-sm font-semibold text-text-primary">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
