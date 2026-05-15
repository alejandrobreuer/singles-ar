import * as React from "react";
import Link from "next/link";
import { formatARS } from "@/lib/formatting";
import { formatChangePct, formatCompact } from "@/lib/trendsFormat";
import { cn } from "@/lib/utils";
import type { PriceMoversData, PriceMoverItem } from "@/lib/trends";

interface Props {
  data: PriceMoversData;
}

function CardImage({ src, name }: { src: string | null; name: string }) {
  if (!src) {
    return (
      <div className="w-8 h-11 bg-secondary border border-border rounded flex items-center justify-center text-text-muted shrink-0">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.4}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} className="w-8 h-11 object-cover rounded border border-border shrink-0" />
  );
}

function MoverRow({ item, direction }: { item: PriceMoverItem; direction: "up" | "down" }) {
  const color = direction === "up" ? "text-success" : "text-error";
  return (
    <Link href={`/cards/${item.card.id}`} className="no-underline">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-secondary/40 transition-colors cursor-pointer">
        <div className="text-xs font-semibold text-text-muted w-4">{item.rank}</div>
        <CardImage src={item.card.image_url} name={item.card.name} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-text-primary truncate mb-0.5">{item.card.name}</div>
          <div className="text-2xs text-text-muted font-sans">
            {item.card.game === "pokemon" ? "Pokémon" : item.card.game === "magic" ? "Magic" : "One Piece"}
            {item.card.set_name ? ` · ${item.card.set_name}` : ""}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={cn("font-serif text-base font-bold", color)}>
            {formatChangePct(item.changePct)}
          </div>
          <div className="text-2xs text-text-muted mt-0.5">
            {formatARS(item.prevPrice)} → {formatARS(item.currPrice)}
          </div>
        </div>
      </div>
    </Link>
  );
}

function EmptyCol({ label }: { label: string }) {
  return (
    <div className="text-center py-10 text-text-muted text-sm font-sans">
      Sin datos suficientes para {label}.
    </div>
  );
}

export function PriceMovers({ data }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
      {/* Up column */}
      <div className="surface-raised overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <span className="text-base">📈</span>
          <span className="text-sm font-semibold text-success">Mayores subidas</span>
        </div>
        {data.up.length > 0
          ? data.up.map((item) => <MoverRow key={item.card.id} item={item} direction="up" />)
          : <EmptyCol label="subidas" />}
      </div>

      {/* Down column */}
      <div className="surface-raised overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <span className="text-base">📉</span>
          <span className="text-sm font-semibold text-error">Mayores bajadas</span>
        </div>
        {data.down.length > 0
          ? data.down.map((item) => <MoverRow key={item.card.id} item={item} direction="down" />)
          : <EmptyCol label="bajadas" />}
      </div>
    </div>
  );
}
