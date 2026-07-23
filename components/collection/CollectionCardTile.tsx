import * as React from "react";
import { Check, Minus, Plus, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { setLabel } from "@/lib/formatting";
import type { CardSearchResult } from "@/types/database";

interface CollectionCardTileProps {
  card:               CardSearchResult;
  owned:              boolean;
  quantity:           number;
  onToggle:           () => void;
  onQuantityChange:   (next: number) => void;
}

export function CollectionCardTile({
  card, owned, quantity, onToggle, onQuantityChange,
}: CollectionCardTileProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-xl border p-2 text-left transition-all duration-150",
        owned ? "bg-success/5 border-success/30" : "bg-surface border-border hover:border-primary/50 hover:bg-secondary/30"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full aspect-[3/4] rounded-lg overflow-hidden bg-secondary border border-border/50 relative group cursor-pointer"
        aria-label={owned ? "Quitar de mi colección" : "Agregar a mi colección"}
      >
        {card.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.image_url}
            alt={card.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Tag size={14} className="text-border" />
          </div>
        )}
        <div className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity",
          owned ? "opacity-100 bg-success/20" : "opacity-0 group-hover:opacity-100 bg-black/20"
        )}>
          {owned ? (
            <span className="size-7 rounded-full bg-success text-white flex items-center justify-center">
              <Check size={14} />
            </span>
          ) : (
            <span className="size-7 rounded-full bg-primary text-white flex items-center justify-center">
              <Plus size={14} />
            </span>
          )}
        </div>
      </button>

      <p className="text-xs font-medium font-sans text-text-primary text-center leading-tight line-clamp-2 w-full">
        {card.name}
      </p>
      {(card.set_code || card.set_name) && (
        <p className="text-2xs text-text-muted font-sans text-center truncate w-full">
          {setLabel(card.set_code, card.set_name)}
        </p>
      )}

      {owned && (
        <div className="flex items-center gap-1.5 mt-0.5">
          <button
            type="button"
            onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            className="size-5 rounded-full border border-border bg-surface flex items-center justify-center text-text-secondary hover:bg-secondary disabled:opacity-30 transition-colors"
          >
            <Minus size={10} />
          </button>
          <span className="text-2xs font-sans font-semibold text-text-primary w-4 text-center">{quantity}</span>
          <button
            type="button"
            onClick={() => onQuantityChange(quantity + 1)}
            className="size-5 rounded-full border border-border bg-surface flex items-center justify-center text-text-secondary hover:bg-secondary transition-colors"
          >
            <Plus size={10} />
          </button>
        </div>
      )}
    </div>
  );
}
