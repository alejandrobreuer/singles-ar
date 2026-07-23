import * as React from "react";
import { Check, Minus, Plus, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { setLabel } from "@/lib/formatting";
import type { CardSearchResult } from "@/types/database";

interface CollectionCardTileProps {
  card:             CardSearchResult;
  owned:            boolean;
  quantity:         number;
  /** Omit to render a read-only tile (used for not-owned cards on the main
   * collection page — adding new cards happens only via "Agregar a la colección"). */
  onToggle?:        () => void;
  onQuantityChange: (next: number) => void;
}

export function CollectionCardTile({
  card, owned, quantity, onToggle, onQuantityChange,
}: CollectionCardTileProps) {
  const interactive = onToggle !== undefined;

  const imageContent = (
    <>
      {card.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.image_url}
          alt={card.name}
          className={cn(
            "w-full h-full object-cover transition-all duration-200",
            interactive && "group-hover:scale-105",
            !owned && "grayscale opacity-60"
          )}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Tag size={14} className="text-border" />
        </div>
      )}
      {interactive && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity",
          owned ? "opacity-0 group-hover:opacity-100 bg-black/30" : "opacity-0 group-hover:opacity-100 bg-black/20"
        )}>
          {owned ? (
            <span className="size-7 rounded-full bg-error text-white flex items-center justify-center">
              <X size={14} />
            </span>
          ) : (
            <span className="size-7 rounded-full bg-primary text-white flex items-center justify-center">
              <Plus size={14} />
            </span>
          )}
        </div>
      )}
      {owned && (
        <div className="absolute top-1 right-1 size-5 rounded-full bg-success text-white flex items-center justify-center shadow-card">
          <Check size={11} />
        </div>
      )}
    </>
  );

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-xl border p-2 text-left transition-all duration-150",
        owned ? "bg-success/5 border-success/30" : "bg-surface border-border"
      )}
    >
      {interactive ? (
        <button
          type="button"
          onClick={onToggle}
          className="w-full aspect-[3/4] rounded-lg overflow-hidden bg-secondary border border-border/50 relative group cursor-pointer"
          aria-label={owned ? "Quitar de mi colección" : "Agregar a mi colección"}
        >
          {imageContent}
        </button>
      ) : (
        <div className="w-full aspect-[3/4] rounded-lg overflow-hidden bg-secondary border border-border/50 relative">
          {imageContent}
        </div>
      )}

      <p className={cn(
        "text-xs font-medium font-sans text-center leading-tight line-clamp-2 w-full",
        owned ? "text-text-primary" : "text-text-muted"
      )}>
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
