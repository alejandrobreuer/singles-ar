import * as React from "react";
import { cn } from "@/lib/utils";
import type { BuyOrderWithBuyer, Condition } from "@/types/database";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CONDITION_LABELS: Record<Condition, string> = {
  NM: "NM", LP: "LP", MP: "MP", HP: "HP", DMG: "DMG",
};

function formatARS(price: number): string {
  return new Intl.NumberFormat("es-AR", {
    style:    "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface BuyOrderRowProps {
  order:     BuyOrderWithBuyer;
  className?: string;
}

export function BuyOrderRow({ order, className }: BuyOrderRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 px-4 py-3 rounded-lg border border-border",
        "bg-surface hover:bg-secondary/60 transition-colors",
        className
      )}
    >
      {/* Buyer */}
      <span className="text-sm font-sans text-text-secondary truncate flex-1">
        {order.profiles.username}
      </span>

      {/* Condition */}
      <span className="text-xs font-sans text-text-muted shrink-0">
        {order.condition ? CONDITION_LABELS[order.condition] : "Cualquier estado"}
      </span>

      {/* Qty */}
      {order.quantity > 1 && (
        <span className="text-xs text-text-muted font-sans shrink-0">×{order.quantity}</span>
      )}

      {/* Price */}
      <span className="shrink-0 font-price text-sm text-success ml-auto">
        {formatARS(order.price)}
      </span>
    </div>
  );
}
