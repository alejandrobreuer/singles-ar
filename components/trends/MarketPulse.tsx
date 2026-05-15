import * as React from "react";
import { formatCompact } from "@/lib/trendsFormat";
import { formatARS } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import type { MarketPulseData } from "@/lib/trends";

interface Props {
  data: MarketPulseData;
}

function PulseCard({ icon, value, label, change, changeColor }: {
  icon:        string;
  value:       string;
  label:       string;
  change:      string;
  changeColor: "green" | "muted";
}) {
  return (
    <div className="surface-raised p-4 sm:p-5 text-center">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="font-serif text-2xl font-bold text-text-primary mb-0.5">{value}</div>
      <div className="text-2xs font-medium uppercase tracking-wider text-text-muted">{label}</div>
      <div className={cn("text-xs mt-1 font-medium", changeColor === "green" ? "text-success" : "text-text-muted")}>
        {change}
      </div>
    </div>
  );
}

function pctLabel(pct: number | null, suffix = ""): { text: string; color: "green" | "muted" } {
  if (pct === null) return { text: "Sin datos previos", color: "muted" };
  const sign = pct >= 0 ? "↑" : "↓";
  return { text: `${sign} ${Math.abs(Math.round(pct))}%${suffix}`, color: pct >= 0 ? "green" : "muted" };
}

export function MarketPulse({ data }: Props) {
  const vol  = pctLabel(data.volumeChange, " vs período anterior");
  const tx   = pctLabel(data.txCountChange);
  const rep  = data.avgReputation !== null ? data.avgReputation.toFixed(1) : "—";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <PulseCard
        icon="💰"
        value={formatCompact(data.volume)}
        label="Volumen total"
        change={vol.text}
        changeColor={vol.color}
      />
      <PulseCard
        icon="🃏"
        value={data.txCount.toLocaleString("es-AR")}
        label="Transacciones"
        change={tx.text}
        changeColor={tx.color}
      />
      <PulseCard
        icon="🔍"
        value={data.activeBuyOrders.toLocaleString("es-AR")}
        label="Buy orders activos"
        change={data.activeBuyOrders > 0 ? "Activos ahora" : "Sin cambios"}
        changeColor="muted"
      />
      <PulseCard
        icon="📦"
        value={data.activeListings.toLocaleString("es-AR")}
        label="Listings activos"
        change={data.newListingsInPeriod > 0 ? `↑ ${data.newListingsInPeriod} nuevos` : "Sin cambios"}
        changeColor={data.newListingsInPeriod > 0 ? "green" : "muted"}
      />
      <PulseCard
        icon="⭐"
        value={rep}
        label="Rep. promedio"
        change="Sin cambios"
        changeColor="muted"
      />
    </div>
  );
}
