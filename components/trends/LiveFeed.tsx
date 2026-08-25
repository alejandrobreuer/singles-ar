"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { formatARS } from "@/lib/formatting";
import { formatRelativeTime } from "@/lib/trendsFormat";
import { createClient } from "@/lib/supabase/client";
import type { LiveFeedItem } from "@/lib/trends";

interface Props {
  initialItems: LiveFeedItem[];
  game:         string;
}

export function LiveFeed({ initialItems }: Props) {
  const router   = useRouter();
  const [items, setItems] = React.useState<LiveFeedItem[]>(initialItems);

  React.useEffect(() => {
    // Reset when game filter changes
    setItems(initialItems);
  }, [initialItems]);

  React.useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("trends-live-feed")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "transactions", filter: "status=eq.completed" },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [router]);

  if (!items.length) {
    return (
      <div className="surface-raised text-center py-10 text-text-muted text-sm font-sans">
        Sin transacciones recientes para este juego.
      </div>
    );
  }

  return (
    <div className="surface-raised divide-y divide-border">
      {items.map((item) => (
        <div key={item.transactionId} className="flex items-center gap-3.5 px-4 py-3 hover:bg-secondary/40 transition-colors cursor-pointer">
          {/* Time */}
          <div className="text-2xs text-text-muted w-14 shrink-0">
            {formatRelativeTime(item.completedAt)}
          </div>

          {/* Card image placeholder */}
          <div className="w-8 h-11 bg-secondary border border-border rounded flex items-center justify-center text-text-muted shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.4}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-text-primary truncate mb-0.5">{item.card.name}</div>
            <div className="text-2xs text-text-muted font-sans">
              {item.card.game === "pokemon" ? "Pokémon" : item.card.game === "magic" ? "Magic" : item.card.game === "dbz" ? "Dragon Ball" : "One Piece"}
              {item.card.set_name ? ` · ${item.card.set_name}` : ""}
              {item.isBuyOrder ? " · via buy order" : ` · vendido por ${item.sellerUsername}`}
            </div>
          </div>

          {/* Badge */}
          <div className="shrink-0">
            {item.isBuyOrder ? (
              <span className="inline-flex items-center text-2xs font-medium px-2 py-0.5 rounded bg-[#eef4fd] text-[#1e5fa8] border border-[#bed5f0]">
                Buy order
              </span>
            ) : (
              <span className="inline-flex items-center text-2xs font-medium px-2 py-0.5 rounded bg-[#edf7f2] text-[#1a7a4a] border border-[#b8dece]">
                Venta
              </span>
            )}
          </div>

          {/* Price */}
          <div className="font-serif text-sm font-semibold text-text-primary shrink-0">
            {item.price > 0 ? formatARS(item.price) : "Canje"}
          </div>
        </div>
      ))}
    </div>
  );
}
