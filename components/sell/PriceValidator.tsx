"use client";

import * as React from "react";
import { TrendingUp, Info, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatARS } from "@/lib/formatting";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PriceValidatorProps {
  priceARS:          number;
  platformMedianARS: number | null;
  transactionCount:  number;
  className?:        string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PriceValidator({
  priceARS,
  platformMedianARS,
  transactionCount,
  className,
}: PriceValidatorProps) {
  if (!platformMedianARS || transactionCount === 0) {
    return (
      <div className={cn(
        "flex items-start gap-2.5 rounded-lg bg-secondary border border-border px-4 py-3 text-sm font-sans",
        className
      )}>
        <Info size={14} className="shrink-0 mt-0.5 text-text-muted" />
        <p className="text-text-muted">
          Sin transacciones registradas en Card Stash para esta carta. Podés publicar a cualquier precio.
        </p>
      </div>
    );
  }

  if (priceARS <= 0) return null;

  const pct   = ((priceARS - platformMedianARS) / platformMedianARS) * 100;
  const above = pct > 5;
  const below = pct < -5;

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden",
      above ? "border-warning/25 bg-warning-subtle/40"
            : below ? "border-blue-200 bg-blue-50/40"
            : "border-success/25 bg-success-subtle/40",
      className,
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center gap-2 px-4 py-3 border-b",
        above ? "border-warning/20" : below ? "border-blue-200" : "border-success/20"
      )}>
        {above
          ? <ArrowUp   size={14} className="text-warning shrink-0" />
          : below
          ? <ArrowDown size={14} className="text-blue-500 shrink-0" />
          : <Minus     size={14} className="text-success shrink-0" />
        }
        <p className={cn(
          "text-sm font-medium font-sans",
          above ? "text-warning" : below ? "text-blue-600" : "text-success"
        )}>
          {above
            ? `${pct.toFixed(0)}% sobre la mediana de Card Stash`
            : below
            ? `${Math.abs(pct).toFixed(0)}% bajo la mediana de Card Stash`
            : "Cerca de la mediana de Card Stash"
          }
        </p>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        <div className="text-center">
          <p className="text-2xs text-text-muted font-sans uppercase tracking-wide mb-0.5">Tu precio</p>
          <p className="text-sm font-price text-text-primary">{formatARS(priceARS)}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-2xs text-text-muted font-sans uppercase tracking-wide mb-0.5">
            <TrendingUp size={9} />
            Mediana Card Stash
          </div>
          <p className="text-sm font-price text-text-primary">{formatARS(platformMedianARS)}</p>
          <p className="text-2xs text-text-muted font-sans">{transactionCount} transacciones</p>
        </div>
        <div className="text-center">
          <p className="text-2xs text-text-muted font-sans uppercase tracking-wide mb-0.5">Diferencia</p>
          <p className={cn(
            "text-sm font-price",
            above ? "text-warning" : below ? "text-blue-500" : "text-success"
          )}>
            {pct > 0 ? "+" : ""}{pct.toFixed(0)}%
          </p>
        </div>
      </div>
    </div>
  );
}
