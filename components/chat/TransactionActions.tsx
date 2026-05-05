"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Clock, AlertCircle, PackageCheck, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const myConfirmedAt = isBuyer
    ? transaction.buyer_confirmed_delivery_at
    : transaction.seller_confirmed_delivery_at;
  const otherConfirmedAt = isBuyer
    ? transaction.seller_confirmed_delivery_at
    : transaction.buyer_confirmed_delivery_at;

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
      const url = json.data?.sandboxUrl ?? json.data?.initPoint;
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
      const res = await fetch(`/api/transactions/${transaction.id}/confirm-delivery`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al confirmar.");
      if (json.bothConfirmed) {
        onStatusChange?.("completed");
      }
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
      const res = await fetch(`/api/transactions/${transaction.id}/action`, {
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

  // ── in_chat ───────────────────────────────────────────────────────────────
  if (status === "in_chat") {
    return (
      <div className="flex flex-col gap-2.5">
        {isBuyer ? (
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={busy ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
              onClick={handlePay}
              disabled={busy}
              className="flex-1"
            >
              {busy ? "Iniciando pago…" : "Pagar con MercadoPago"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<XCircle size={14} />}
              loading={cancelBusy}
              onClick={doCancel}
              className="text-error hover:bg-error-subtle hover:text-error shrink-0"
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-text-muted text-xs font-sans flex-1">
              <Clock size={13} />
              Esperando que el comprador realice el pago…
            </div>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<XCircle size={14} />}
              loading={cancelBusy}
              onClick={doCancel}
              className="text-error hover:bg-error-subtle hover:text-error shrink-0"
            >
              Cancelar
            </Button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-error font-sans">
            <AlertCircle size={12} />
            {error}
          </div>
        )}
      </div>
    );
  }

  // ── payment_pending ───────────────────────────────────────────────────────
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
              variant="secondary"
              size="sm"
              leftIcon={<CreditCard size={14} />}
              onClick={handlePay}
              disabled={busy}
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

  // ── completed ─────────────────────────────────────────────────────────────
  if (status === "completed") {
    return (
      <div className="flex items-center gap-1.5 text-success text-xs font-sans">
        <CheckCircle size={14} />
        Transacción completada
      </div>
    );
  }

  // ── cancelled ─────────────────────────────────────────────────────────────
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-1.5 text-error text-xs font-sans">
        <XCircle size={14} />
        Transacción cancelada
      </div>
    );
  }

  // ── paid (legacy MP flow) ─────────────────────────────────────────────────
  if (status === "paid") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-success text-xs font-sans flex-1">
            <CheckCircle size={14} />
            Pago confirmado
          </div>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<CheckCircle size={14} />}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              const res = await fetch(`/api/transactions/${transaction.id}/action`, {
                method:  "PATCH",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ action: "complete" }),
              });
              const json = await res.json();
              if (res.ok) { onStatusChange?.("completed"); router.refresh(); }
              else setError(json.error ?? "Error.");
              setBusy(false);
            }}
          >
            Marcar como completado
          </Button>
        </div>
        {error && (
          <div className="flex items-center gap-1.5 text-xs text-error font-sans">
            <AlertCircle size={12} /> {error}
          </div>
        )}
      </div>
    );
  }

  return null;
}

// ─── Party badge ──────────────────────────────────────────────────────────────

function ConfirmPartyBadge({ label, confirmed }: { label: string; confirmed: boolean }) {
  return (
    <div className={[
      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-sans font-medium border flex-1 justify-center",
      confirmed
        ? "bg-success/10 border-success/20 text-success"
        : "bg-secondary border-border text-text-muted",
    ].join(" ")}>
      {confirmed
        ? <CheckCircle size={11} />
        : <Clock size={11} />
      }
      {label}
    </div>
  );
}
