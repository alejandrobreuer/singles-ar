"use client";

import * as React from "react";
import { Clock, ShieldAlert, Star } from "lucide-react";
import { differenceInDays, differenceInHours, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Badge }   from "@/components/ui/badge";
import { Button }  from "@/components/ui/button";
import { Avatar }  from "@/components/ui/avatar";
import { formatARS }   from "@/lib/formatting";
import { fantasyName } from "@/lib/fantasy-name";
import type { BuyOrderWithBuyer } from "@/types/database";

// ─── Props ────────────────────────────────────────────────────────────────────

interface BuyOrderCardProps {
  order:              BuyOrderWithBuyer;
  currentUserId?:     string | null;
  currentUserHasMp?:  boolean;
  onAccept:           (orderId: string) => Promise<void>;
}

// ─── Expiry helper ────────────────────────────────────────────────────────────

function ExpiryBadge({ expiresAt }: { expiresAt: string }) {
  const expiry    = new Date(expiresAt);
  const daysLeft  = differenceInDays(expiry, new Date());
  const hoursLeft = differenceInHours(expiry, new Date());
  const isCritical = daysLeft <= 3;

  const label = hoursLeft < 24
    ? `${hoursLeft}h`
    : formatDistanceToNow(expiry, { locale: es, addSuffix: false });

  return (
    <span
      className={[
        "inline-flex items-center gap-1 text-2xs font-sans px-1.5 py-0.5 rounded-full border",
        isCritical
          ? "text-warning border-warning/30 bg-warning/10"
          : "text-text-muted border-border bg-secondary",
      ].join(" ")}
    >
      <Clock size={10} />
      Vence en {label}
    </span>
  );
}

// ─── Stars ────────────────────────────────────────────────────────────────────

function ReputationStars({ score }: { score: number | null }) {
  const filled = Math.round((score ?? 0) / 20); // 0-100 → 0-5
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={11}
          className={i < filled ? "text-accent fill-accent" : "text-border"}
        />
      ))}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BuyOrderCard({
  order,
  currentUserId,
  currentUserHasMp,
  onAccept,
}: BuyOrderCardProps) {
  const [accepting, setAccepting] = React.useState(false);
  const [error,     setError]     = React.useState<string | null>(null);

  const buyer         = order.profiles;
  const alias         = fantasyName(order.id);
  const isOwn         = currentUserId === order.buyer_id;
  const canAccept     = !!currentUserId && !isOwn && !!currentUserHasMp;
  const daysLeft      = differenceInDays(new Date(order.expires_at), new Date());
  const isExpiringSoon = daysLeft <= 3;

  async function handleAccept() {
    setError(null);
    setAccepting(true);
    try {
      await onAccept(order.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al aceptar la orden.");
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div
      className={[
        "rounded-xl border bg-surface p-4 flex flex-col gap-3 transition-shadow",
        isExpiringSoon ? "border-warning/40" : "border-border",
        "hover:shadow-card",
      ].join(" ")}
    >
      {/* ── Top row: buyer info + price ────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        {/* Buyer info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar
            src={null}
            name={isOwn ? (buyer?.username ?? "?") : alias}
            size="sm"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold font-sans text-text-primary truncate leading-tight">
              {isOwn ? (buyer?.username ?? "Usuario desconocido") : alias}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <ReputationStars score={buyer?.reputation_score ?? null} />
              {buyer?.total_sales != null && (
                <span className="text-2xs text-text-muted font-sans">
                  {buyer.total_sales} {buyer.total_sales === 1 ? "venta" : "ventas"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="shrink-0 text-right">
          <p className="font-price text-xl text-success leading-tight">
            {formatARS(order.price)}
          </p>
          {order.condition && (
            <span className="text-2xs text-text-muted font-sans">{order.condition}</span>
          )}
        </div>
      </div>

      {/* ── Badges row ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <ExpiryBadge expiresAt={order.expires_at} />

        {buyer?.is_reliable_buyer === false && (
          <span className="inline-flex items-center gap-1 text-2xs font-sans px-1.5 py-0.5 rounded-full border border-error/30 bg-error/10 text-error">
            <ShieldAlert size={10} />
            Comprador poco confiable
          </span>
        )}

        {order.quantity > 1 && (
          <Badge variant="slate" size="sm">
            x{order.quantity}
          </Badge>
        )}

        {isOwn && (
          <Badge variant="navy" size="sm">Tu orden</Badge>
        )}
      </div>

      {/* ── Notes ──────────────────────────────────────────────────────────── */}
      {order.notes && (
        <p className="text-xs text-text-muted font-sans leading-relaxed border-t border-border pt-2.5">
          {order.notes}
        </p>
      )}

      {/* ── Accept button / hints ──────────────────────────────────────────── */}
      {canAccept && (
        <div className="border-t border-border pt-3 flex flex-col gap-1.5">
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            loading={accepting}
            onClick={handleAccept}
          >
            Aceptar orden de compra
          </Button>
          {error && (
            <p className="text-xs text-error font-sans text-center">{error}</p>
          )}
        </div>
      )}

      {/* Hint if not logged in */}
      {!currentUserId && (
        <p className="text-xs text-text-muted font-sans text-center border-t border-border pt-2.5">
          <a href="/login" className="text-primary hover:underline">Iniciá sesión</a> para vender esta carta.
        </p>
      )}

      {/* Hint if logged in but no MP */}
      {currentUserId && !isOwn && !currentUserHasMp && (
        <p className="text-xs text-text-muted font-sans text-center border-t border-border pt-2.5">
          <a href="/onboarding/mercadopago" className="text-primary hover:underline">Conectá MercadoPago</a> para aceptar órdenes de compra.
        </p>
      )}
    </div>
  );
}
