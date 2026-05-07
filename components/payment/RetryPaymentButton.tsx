"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RetryPaymentButton({ transactionId }: { transactionId: string }) {
  const [busy,  setBusy]  = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function retry() {
    setError(null);
    setBusy(true);
    try {
      const res  = await fetch("/api/payments/create-preference", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ transactionId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo reintentar el pago.");
      const url = json.data?.initPoint ?? json.data?.sandboxUrl;
      if (!url) throw new Error("No se recibió URL de pago.");
      window.location.href = url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={retry}
        disabled={busy}
        leftIcon={busy
          ? <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          : <RefreshCw size={15} />
        }
      >
        {busy ? "Preparando checkout…" : "Reintentar pago"}
      </Button>
      {error && (
        <p className="text-xs text-error font-sans text-center">{error}</p>
      )}
    </div>
  );
}
