import * as React from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateCommission } from "@/lib/priceValidation";
import { formatARS } from "@/lib/formatting";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommissionBreakdownProps {
  priceARS:           number;
  platformFeePercent: number;
  mpFeePercent:       number;
  className?:         string;
  compact?:           boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CommissionBreakdown({
  priceARS,
  platformFeePercent,
  mpFeePercent,
  className,
  compact = false,
}: CommissionBreakdownProps) {
  if (priceARS <= 0) return null;

  const c = calculateCommission(priceARS, platformFeePercent, mpFeePercent);

  if (compact) {
    return (
      <div className={cn("flex items-center justify-between text-sm font-sans", className)}>
        <span className="text-text-muted">Recibís:</span>
        <span className="font-price text-success text-base">{formatARS(c.sellerReceives)}</span>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-border bg-surface overflow-hidden", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-secondary/40">
        <p className="text-sm font-semibold font-sans text-text-primary">
          Desglose de comisiones
        </p>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/60">
        <CommRow
          label="Precio de venta"
          value={formatARS(c.grossPrice)}
          valueClass="text-text-primary font-medium"
        />
        <CommRow
          label={`Comisión plataforma (${platformFeePercent}%)`}
          value={`- ${formatARS(c.platformFee)}`}
          valueClass="text-text-secondary"
        />
        <CommRow
          label={`Comisión MercadoPago (${mpFeePercent}%)`}
          value={`- ${formatARS(c.mpFee)}`}
          valueClass="text-text-secondary"
        />
      </div>

      {/* Total */}
      <div className="px-4 py-3 bg-success-subtle/60 flex items-center justify-between">
        <span className="text-sm font-semibold font-sans text-text-primary">
          Recibís
        </span>
        <span className="font-price text-lg text-success">
          {formatARS(c.sellerReceives)}
        </span>
      </div>

      {/* Footnote */}
      <div className="px-4 py-2.5 border-t border-border/60 flex items-start gap-2">
        <Info size={11} className="shrink-0 mt-0.5 text-text-muted" />
        <p className="text-2xs text-text-muted font-sans leading-relaxed">
          Las comisiones se descuentan automáticamente al momento del pago.
          El monto recibido se acredita en tu cuenta de MercadoPago.
        </p>
      </div>
    </div>
  );
}

// ─── Row helper ───────────────────────────────────────────────────────────────

function CommRow({
  label,
  value,
  valueClass,
}: {
  label:      string;
  value:      string;
  valueClass: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-sm text-text-secondary font-sans">{label}</span>
      <span className={cn("font-price text-sm", valueClass)}>{value}</span>
    </div>
  );
}
