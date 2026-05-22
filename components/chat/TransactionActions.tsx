"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle, XCircle, Clock, AlertCircle,
  PackageCheck, CreditCard, Loader2, ShieldAlert, Zap,
} from "lucide-react";
import { Button }    from "@/components/ui/button";
import { formatARS } from "@/lib/formatting";
import type { TransactionWithDetails } from "@/types/database";

interface TransactionActionsProps {
  transaction:   TransactionWithDetails;
  currentUserId: string;
  onStatusChange?: (newStatus: string) => void;
}

export function TransactionActions({
  transaction,
  currentUserId,
  onStatusChange,
}: TransactionActionsProps) {
  const router  = useRouter();
  const [busy,       setBusy]       = React.useState(false);
  const [cancelBusy, setCancelBusy] = React.useState(false);
  const [error,      setError]      = React.useState<string | null>(null);

  const isBuyer  = transaction.buyer_id  === currentUserId;
  const isSeller = transaction.seller_id === currentUserId;
  const { status } = transaction;

  // ── Helpers ───────────────────────────────────────────────────────────────────

  async function handlePay() {
    setError(null);
    setBusy(true);
    try {
      const res  = await fetch("/api/payments/create-preference", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ transactionId: transaction.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo iniciar el pago.");
      const url = json.data?.initPoint ?? json.data?.sandboxUrl;
      if (url) window.location.href = url;
      else throw new Error("No se recibió URL de pago.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setBusy(false);
    }
  }

  async function handleConfirmDelivery() {
    setError(null);
    setBusy(true);
    try {
      const res  = await fetch(`/api/transactions/${transaction.id}/confirm-delivery`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al confirmar.");
      const next = json.transition === "completed" ? "completed" : "delivered";
      onStatusChange?.(next);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDispute() {
    setError(null);
    setBusy(true);
    try {
      const res  = await fetch(`/api/transactions/${transaction.id}/dispute`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al disputar.");
      onStatusChange?.("disputed");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setBusy(false);
    }
  }

  async function doCancel() {
    setError(null);
    setCancelBusy(true);
    try {
      const res  = await fetch(`/api/transactions/${transaction.id}/action`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "cancel" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error.");
      onStatusChange?.("cancelled");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setCancelBusy(false);
    }
  }

  // ── Hours remaining in dispute window ─────────────────────────────────────────

  function hoursLeft(): number | null {
    if (!transaction.release_at) return null;
    const ms = new Date(transaction.release_at).getTime() - Date.now();
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60)));
  }

  async function handleReject() {
    if (!transaction.buy_order_id) return;
    setError(null);
    setCancelBusy(true);
    try {
      const res  = await fetch(`/api/buy-orders/${transaction.buy_order_id}/cancel-acceptance`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al rechazar.");
      onStatusChange?.("cancelled");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setCancelBusy(false);
    }
  }

  const errNode = error && (
    <div className="flex items-center gap-1.5 text-xs text-error font-sans">
      <AlertCircle size={12} />
      {error}
    </div>
  );

  // ── pending_buyer_confirmation — seller accepted, buyer must pay within 24h ──
  if (status === "pending_buyer_confirmation") {
    const deadline  = new Date(new Date(transaction.created_at).getTime() + 24 * 60 * 60 * 1000);
    const msLeft    = Math.max(0, deadline.getTime() - Date.now());
    const hoursLeft = Math.floor(msLeft / (1000 * 60 * 60));
    const minsLeft  = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
    const pct       = (msLeft / (24 * 60 * 60 * 1000)) * 100;

    return (
      <div className="flex flex-col gap-2.5">
        {isBuyer ? (
          <div className="rounded-xl border border-accent/40 bg-accent/5 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold font-sans text-text-primary">
              <Zap size={15} className="text-accent shrink-0" />
              {transaction.seller.username} quiere venderte esta carta
            </div>

            {/* Price breakdown */}
            <div className="flex flex-col gap-1.5 text-sm font-sans border border-border rounded-lg px-3 py-2.5 bg-surface">
              <div className="flex justify-between">
                <span className="text-text-muted truncate mr-2">{transaction.card.name}</span>
                <span className="font-price text-text-primary shrink-0">{formatARS(transaction.price)}</span>
              </div>
              {transaction.platform_fee != null && transaction.platform_fee > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Comisión CardStash ({Math.round((transaction.platform_fee / transaction.price) * 100)}%)</span>
                  <span className="text-text-muted shrink-0">−{formatARS(transaction.platform_fee)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-1.5 mt-0.5">
                <span className="font-semibold text-text-primary text-xs">Tu pago total</span>
                <span className="font-price font-semibold text-text-primary shrink-0">{formatARS(transaction.price)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="primary" size="sm" className="flex-1"
                leftIcon={busy ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                onClick={handlePay} disabled={busy || cancelBusy}
              >
                {busy ? "Iniciando pago…" : `Confirmar y pagar ${formatARS(transaction.price)}`}
              </Button>
              <Button
                variant="ghost" size="sm"
                leftIcon={cancelBusy ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                onClick={handleReject} disabled={busy || cancelBusy}
                className="text-error hover:bg-error-subtle hover:text-error shrink-0"
              >
                Rechazar
              </Button>
            </div>

            {/* 24h countdown */}
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1 text-xs text-text-muted font-sans">
                <Clock size={11} />
                Tenés {hoursLeft}h {minsLeft}m para confirmar
              </span>
              <div className="h-1 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-text-muted text-xs font-sans">
              <Clock size={13} />
              Esperando confirmación del comprador. Tiene {hoursLeft}h {minsLeft}m para pagar.
            </div>
            <div className="h-1 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full bg-primary/40 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
        {errNode}
      </div>
    );
  }

  // ── in_chat — awaiting payment (no mp_payment_id yet) ────────────────────────
  if (status === "in_chat" && !transaction.mp_payment_id) {
    return (
      <div className="flex flex-col gap-2.5">
        {isBuyer ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-warning font-sans">
              El pago no se pudo iniciar automáticamente. Podés reintentarlo:
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="primary" size="sm" className="flex-1"
                leftIcon={busy ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                onClick={handlePay} disabled={busy}
              >
                {busy ? "Iniciando pago…" : "Pagar con MercadoPago"}
              </Button>
              <Button
                variant="ghost" size="sm"
                leftIcon={<XCircle size={14} />}
                loading={cancelBusy} onClick={doCancel}
                className="text-error hover:bg-error-subtle hover:text-error shrink-0"
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-text-muted text-xs font-sans flex-1">
              <Clock size={13} />
              Esperando que el comprador realice el pago…
            </div>
            <Button
              variant="ghost" size="sm"
              leftIcon={<XCircle size={14} />}
              loading={cancelBusy} onClick={doCancel}
              className="text-error hover:bg-error-subtle hover:text-error shrink-0"
            >
              Cancelar
            </Button>
          </div>
        )}
        {errNode}
      </div>
    );
  }

  // ── in_chat — payment confirmed, coordinate delivery ─────────────────────────
  if (status === "in_chat" && transaction.mp_payment_id) {
    return (
      <div className="flex flex-col gap-2.5">
        {isSeller ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-text-muted font-sans">
              El pago fue confirmado. Coordiná la entrega con el comprador por este chat y, cuando la carta esté entregada, confirmalo acá.
            </p>
            <Button
              variant="primary" size="sm"
              leftIcon={busy ? <Loader2 size={14} className="animate-spin" /> : <PackageCheck size={14} />}
              onClick={handleConfirmDelivery} disabled={busy}
            >
              {busy ? "Confirmando…" : "Confirmar entrega"}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-text-muted text-xs font-sans">
            <Clock size={13} />
            Pago confirmado — esperando que el vendedor confirme la entrega…
          </div>
        )}
        {errNode}
      </div>
    );
  }

  // ── payment_pending ───────────────────────────────────────────────────────────
  if (status === "payment_pending") {
    return (
      <div className="flex items-center gap-2">
        {isBuyer ? (
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center gap-1.5 text-warning text-xs font-sans">
              <Loader2 size={13} className="animate-spin" />
              Pago en proceso — completá el pago en MercadoPago.
            </div>
            <Button
              variant="secondary" size="sm"
              leftIcon={<CreditCard size={14} />}
              onClick={handlePay} disabled={busy}
              className="w-fit"
            >
              Reintentar / volver al checkout
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-warning text-xs font-sans flex-1">
            <Loader2 size={13} className="animate-spin" />
            Esperando confirmación del pago de MercadoPago…
          </div>
        )}
      </div>
    );
  }

  // ── delivered — 72h dispute window ───────────────────────────────────────────
  if (status === "delivered") {
    const hrs = hoursLeft();
    return (
      <div className="flex flex-col gap-2.5">
        {isBuyer ? (
          <>
            <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2.5 flex flex-col gap-1">
              <p className="text-xs font-semibold font-sans text-warning flex items-center gap-1.5">
                <ShieldAlert size={13} />
                Período de protección activo
              </p>
              <p className="text-xs text-text-secondary font-sans">
                Tenés{" "}
                <span className="font-semibold text-text-primary">
                  {hrs != null ? `${hrs} horas` : "72 horas"}
                </span>{" "}
                para reportar cualquier problema. Si no hay disputa, la transacción se cerrará automáticamente.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="primary" size="sm" className="flex-1"
                leftIcon={busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                onClick={handleConfirmDelivery} disabled={busy}
              >
                {busy ? "Confirmando…" : "Recibí la carta"}
              </Button>
              <Button
                variant="ghost" size="sm"
                leftIcon={<ShieldAlert size={14} />}
                loading={busy} onClick={handleDispute}
                className="text-error hover:bg-error-subtle hover:text-error shrink-0"
              >
                Disputar
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-success text-xs font-sans">
              <PackageCheck size={13} />
              Entrega confirmada
            </div>
            <p className="text-xs text-text-muted font-sans">
              Esperando confirmación del comprador.{" "}
              {hrs != null && hrs > 0
                ? `El período de disputa vence en ${hrs} horas.`
                : "El período de disputa venció."}
            </p>
          </div>
        )}
        {errNode}
      </div>
    );
  }

  // ── disputed ──────────────────────────────────────────────────────────────────
  if (status === "disputed") {
    const resolved   = !!transaction.dispute_resolved_at;
    const resolution = transaction.dispute_resolution;
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-error text-xs font-sans font-semibold">
          <ShieldAlert size={13} />
          {resolved ? "Disputa resuelta" : "Disputa en revisión"}
        </div>
        <p className="text-xs text-text-muted font-sans leading-relaxed">
          {resolved
            ? resolution === "buyer"
              ? "La disputa fue resuelta a favor del comprador. El vendedor debe procesar el reembolso vía MercadoPago."
              : "La disputa fue resuelta a favor del vendedor."
            : isBuyer
              ? "Tu disputa fue recibida. El equipo de Card Stash la revisará. En caso de validarse, el vendedor deberá reembolsar el pago."
              : "El comprador abrió una disputa. El equipo de Card Stash la está revisando."}
        </p>
      </div>
    );
  }

  // ── completed ─────────────────────────────────────────────────────────────────
  if (status === "completed") {
    return (
      <div className="flex items-center gap-1.5 text-success text-xs font-sans">
        <CheckCircle size={14} />
        Transacción completada
      </div>
    );
  }

  // ── cancelled ─────────────────────────────────────────────────────────────────
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-1.5 text-error text-xs font-sans">
        <XCircle size={14} />
        Transacción cancelada
      </div>
    );
  }

  return null;
}
