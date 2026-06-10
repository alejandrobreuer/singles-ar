import * as React from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatARS } from "@/lib/formatting";

// ─── Constants ────────────────────────────────────────────────────────────────
// MercadoPago's fee varies by province, buyer payment method and account
// history — we show a range rather than a single number.
const MP_FEE_MIN_PERCENT = 4;
const MP_FEE_MAX_PERCENT = 8;

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommissionBreakdownProps {
  priceARS:           number;
  platformFeePercent: number;
  className?:         string;
  compact?:           boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CommissionBreakdown({
  priceARS,
  platformFeePercent,
  className,
  compact = false,
}: CommissionBreakdownProps) {
  if (priceARS <= 0) return null;

  const platformFee = priceARS * (platformFeePercent / 100);
  const mpFeeLow    = priceARS * (MP_FEE_MIN_PERCENT / 100);
  const mpFeeHigh   = priceARS * (MP_FEE_MAX_PERCENT / 100);
  const sellerReceivesLow  = priceARS - platformFee - mpFeeHigh;
  const sellerReceivesHigh = priceARS - platformFee - mpFeeLow;

  if (compact) {
    return (
      <div className={cn("flex items-center justify-between text-sm font-sans", className)}>
        <span className="text-text-muted">Recibís:</span>
        <span className="font-price text-success text-base">
          {formatARS(sellerReceivesLow)} – {formatARS(sellerReceivesHigh)}
        </span>
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
          value={formatARS(priceARS)}
          valueClass="text-text-primary font-medium"
        />
        <CommRow
          label={`Comisión plataforma (${platformFeePercent}%)`}
          value={`- ${formatARS(platformFee)}`}
          valueClass="text-text-secondary"
        />
        <CommRow
          label={`Comisión MercadoPago (${MP_FEE_MIN_PERCENT}-${MP_FEE_MAX_PERCENT}% aprox.)`}
          value={`- ${formatARS(mpFeeLow)} a - ${formatARS(mpFeeHigh)}`}
          valueClass="text-text-secondary"
        />
      </div>

      {/* Total */}
      <div className="px-4 py-3 bg-success-subtle/60 flex items-center justify-between">
        <span className="text-sm font-semibold font-sans text-text-primary">
          Recibís
        </span>
        <span className="font-price text-lg text-success">
          {formatARS(sellerReceivesLow)} – {formatARS(sellerReceivesHigh)}
        </span>
      </div>

      {/* Footnote */}
      <div className="px-4 py-2.5 border-t border-border/60 flex items-start gap-2">
        <Info size={11} className="shrink-0 mt-0.5 text-text-muted" />
        <p className="text-2xs text-text-muted font-sans leading-relaxed">
          La comisión de MercadoPago varía según tu provincia, el método de pago del comprador y el historial de tu cuenta de MP.
          Las primeras ventas en cuentas nuevas de MP pueden demorar hasta 20 días en acreditarse — con el tiempo, ese plazo se reduce y la comisión de MP aumenta.
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
