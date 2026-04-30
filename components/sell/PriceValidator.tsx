"use client";

import * as React from "react";
import { CheckCircle2, XCircle, AlertCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { validatePrice, type PriceValidationResult } from "@/lib/priceValidation";
import { formatARS, formatUSD, formatPercent } from "@/lib/formatting";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PriceValidatorProps {
  priceARS:         number;
  tcgMedianUSD:     number | null;
  usdToARS:         number;
  tolerancePercent: number;
  className?:       string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PriceValidator({
  priceARS,
  tcgMedianUSD,
  usdToARS,
  tolerancePercent,
  className,
}: PriceValidatorProps) {
  // No TCGPlayer reference — show informational note only
  if (tcgMedianUSD == null || tcgMedianUSD <= 0) {
    return (
      <div className={cn("flex items-start gap-2.5 rounded-lg bg-warning-subtle border border-warning/20 px-4 py-3 text-sm font-sans", className)}>
        <AlertCircle size={15} className="shrink-0 mt-0.5 text-warning" />
        <p className="text-warning">
          No hay precio de referencia en TCGPlayer para esta carta.
          Podés publicar a cualquier precio.
        </p>
      </div>
    );
  }

  if (priceARS <= 0) return null;

  const result: PriceValidationResult = validatePrice(
    priceARS,
    tcgMedianUSD,
    usdToARS,
    tolerancePercent
  );

  const isAbove = priceARS > result.max;
  const isBelow = priceARS < result.min;

  return (
    <div className={cn("rounded-xl border overflow-hidden", className,
      result.valid
        ? "border-success/25 bg-success-subtle/50"
        : "border-error/25 bg-error-subtle/50"
    )}>
      {/* Header row */}
      <div className={cn(
        "flex items-center gap-2 px-4 py-3 border-b",
        result.valid ? "border-success/20" : "border-error/20"
      )}>
        {result.valid
          ? <CheckCircle2 size={15} className="text-success shrink-0" />
          : <XCircle     size={15} className="text-error   shrink-0" />
        }
        <p className={cn("text-sm font-medium font-sans",
          result.valid ? "text-success" : "text-error"
        )}>
          {result.valid
            ? `Precio dentro del rango permitido (${formatPercent(result.percentFromMedian)} del precio de referencia)`
            : isAbove
              ? `Precio demasiado alto (${formatPercent(result.percentFromMedian)} sobre el precio de referencia)`
              : `Precio demasiado bajo (${formatPercent(result.percentFromMedian)} bajo el precio de referencia)`
          }
        </p>
      </div>

      {/* Reference grid */}
      <div className="px-4 py-3 grid grid-cols-3 gap-3 text-center">
        {[
          { label: "Mínimo permitido", value: formatARS(result.min), sub: null },
          { label: "Referencia TCGPlayer", value: formatARS(result.medianARS), sub: formatUSD(tcgMedianUSD) },
          { label: "Máximo permitido",  value: formatARS(result.max), sub: null },
        ].map(({ label, value, sub }) => (
          <div key={label}>
            <p className="text-2xs text-text-muted font-sans uppercase tracking-wide mb-0.5">{label}</p>
            <p className="text-sm font-price text-text-primary">{value}</p>
            {sub && <p className="text-2xs text-text-muted font-sans">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-4">
        <div className="relative h-2 w-full rounded-full bg-border/60 overflow-hidden">
          {/* Valid zone highlight */}
          <div className="absolute inset-y-0 left-0 right-0 bg-success/20 rounded-full" />

          {/* User price marker */}
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-3.5 rounded-full border-2 border-white shadow-sm transition-all duration-200",
              result.valid ? "bg-success" : isAbove ? "bg-error" : "bg-error"
            )}
            style={{ left: `${result.barPosition}%` }}
            aria-hidden
          />
        </div>

        {/* Bar labels */}
        <div className="flex justify-between mt-1.5">
          <span className="text-2xs text-text-muted font-sans">
            -{tolerancePercent}%
          </span>
          <span className="flex items-center gap-1 text-2xs text-text-muted font-sans">
            <TrendingUp size={10} />
            Mediana
          </span>
          <span className="text-2xs text-text-muted font-sans">
            +{tolerancePercent}%
          </span>
        </div>
      </div>
    </div>
  );
}
