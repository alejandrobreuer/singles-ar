"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Clock, CreditCard, AlertCircle } from "lucide-react";
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

  async function handleCheckout() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/payments/create-preference", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ transactionId: transaction.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al crear el pago.");
      // Redirect to MP checkout
      window.location.href = json.data.initPoint;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setBusy(false);
    }
  }

  async function doAction(action: "cancel" | "complete") {
    setError(null);
    const setLoading = action === "cancel" ? setCancelBusy : setBusy;
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions/${transaction.id}/action`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error.");
      onStatusChange?.(action === "cancel" ? "cancelled" : "completed");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  // ── in_chat ──────────────────────────────────────────────────────────────
  if (status === "in_chat") {
    return (
      <div className="flex flex-col gap-2">
        {isBuyer && (
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<CreditCard size={14} />}
              onClick={handleCheckout}
              loading={busy}
              className="flex-1"
            >
              Confirmar y pagar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<XCircle size={14} />}
              loading={cancelBusy}
              onClick={() => doAction("cancel")}
              className="text-error hover:bg-error-subtle hover:text-error"
            >
              Cancelar
            </Button>
          </div>
        )}

        {isSeller && (
          <div className="flex items-center gap-2 text-text-muted">
            <Clock size={14} className="shrink-0" />
            <span className="text-xs font-sans">
              Esperando confirmación del comprador
            </span>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<XCircle size={14} />}
              loading={cancelBusy}
              onClick={() => doAction("cancel")}
              className="ml-auto text-error hover:bg-error-subtle hover:text-error shrink-0"
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

  // ── paid ─────────────────────────────────────────────────────────────────
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
            onClick={() => doAction("complete")}
          >
            Marcar como completado
          </Button>
        </div>
        {error && (
          <div className="flex items-center gap-1.5 text-xs text-error font-sans">
            <AlertCircle size={12} />
            {error}
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

  return null;
}
