"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldX, Loader2 } from "lucide-react";

export function AdminDisputeActions({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const [busy, setBusy]     = React.useState<"buyer" | "seller" | null>(null);
  const [msg,  setMsg]      = React.useState<{ ok: boolean; text: string } | null>(null);

  async function resolve(resolution: "buyer" | "seller") {
    setBusy(resolution);
    setMsg(null);
    try {
      const res  = await fetch(`/api/admin/transactions/${transactionId}/resolve-dispute`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ resolution }),
      });
      const json = await res.json().catch(() => ({})) as Record<string, unknown>;
      if (res.ok) {
        setMsg({ ok: true, text: `Disputa resuelta a favor del ${resolution === "buyer" ? "comprador" : "vendedor"}.` });
        router.refresh();
      } else {
        setMsg({ ok: false, text: (json.error as string) ?? `HTTP ${res.status}` });
      }
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Error de red." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-text-muted font-sans">
        <strong className="text-red-400">Comprador:</strong> procesá el reembolso manualmente en el panel de MercadoPago antes de resolver a favor del comprador.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => resolve("buyer")}
          disabled={!!busy}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium font-sans bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
        >
          {busy === "buyer" ? <Loader2 size={12} className="animate-spin" /> : <ShieldX size={12} />}
          Resolver a favor del comprador
        </button>
        <button
          onClick={() => resolve("seller")}
          disabled={!!busy}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium font-sans bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
        >
          {busy === "seller" ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
          Resolver a favor del vendedor
        </button>
      </div>
      {msg && (
        <p className={`text-xs font-sans ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
