import * as React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { TrendingUp, DollarSign, ShoppingCart, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-surface rounded-xl border border-border p-5 flex items-start gap-4">
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-text-muted font-sans mb-0.5">{label}</p>
        <p className="text-xl font-price text-text-primary leading-none">{value}</p>
        {sub && <p className="text-xs text-text-muted font-sans mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  in_chat:         "bg-blue-500/10 text-blue-400",
  payment_pending: "bg-amber-500/10 text-amber-400",
  paid:            "bg-emerald-500/10 text-emerald-400",
  completed:       "bg-emerald-600/10 text-emerald-500",
  disputed:        "bg-red-500/10 text-red-400",
  cancelled:       "bg-secondary text-text-muted",
};
const STATUS_LABELS: Record<string, string> = {
  in_chat:         "En chat",
  payment_pending: "Pago pendiente",
  paid:            "Pagado",
  completed:       "Completado",
  disputed:        "Disputado",
  cancelled:       "Cancelado",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  const admin = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Stats queries in parallel
  const [
    { data: volumeData },
    { data: recentTx },
    { data: activeUsersData },
    { count: txCount },
  ] = await Promise.all([
    // Volume + fees last 30 days — any transaction MP has actually paid out
    admin
      .from("transactions")
      .select("price, platform_fee, mp_fee")
      .not("mp_payment_id", "is", null)
      .gte("created_at", thirtyDaysAgo),

    // Recent transactions (last 20)
    admin
      .from("transactions")
      .select(
        "id, price, platform_fee, mp_fee, mp_payment_id, status, created_at, currency, " +
        "buyer:profiles!buyer_id(username), " +
        "seller:profiles!seller_id(username), " +
        "card:cards!card_id(name)"
      )
      .order("created_at", { ascending: false })
      .limit(20),

    // Active users: profiles that have a transaction in last 30 days
    admin
      .from("transactions")
      .select("buyer_id, seller_id")
      .gte("created_at", thirtyDaysAgo),

    // Total transaction count last 30 days
    admin
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo),
  ]);

  type TxRow = {
    id: string; price: number; platform_fee: number | null; mp_fee: number | null;
    mp_payment_id: string | null;
    status: string; created_at: string; currency: string;
    buyer: { username: string } | null;
    seller: { username: string } | null;
    card: { name: string } | null;
  };
  const txRows = (recentTx ?? []) as unknown as TxRow[];

  const totalVolume      = (volumeData ?? []).reduce((s, r) => s + (r.price ?? 0), 0);
  const totalCommision   = (volumeData ?? []).reduce((s, r) => s + (r.platform_fee ?? 0), 0);
  const totalMpFee       = (volumeData ?? []).reduce((s, r) => s + (r.mp_fee ?? 0), 0);
  const activeUserIds  = new Set(
    (activeUsersData ?? []).flatMap((r) => [r.buyer_id, r.seller_id])
  );

  function formatARS(n: number) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency", currency: "ARS", maximumFractionDigits: 0,
    }).format(n);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-serif font-semibold text-text-primary mb-1">Dashboard</h1>
      <p className="text-sm text-text-muted font-sans mb-6">Últimos 30 días</p>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          label="Volumen pagado"
          value={formatARS(totalVolume)}
          icon={TrendingUp}
        />
        <StatCard
          label="Comisión de plataforma"
          value={formatARS(totalCommision)}
          icon={DollarSign}
        />
        <StatCard
          label="Comisión MercadoPago"
          value={formatARS(totalMpFee)}
          icon={DollarSign}
        />
        <StatCard
          label="Transacciones"
          value={String(txCount ?? 0)}
          sub="iniciadas"
          icon={ShoppingCart}
        />
        <StatCard
          label="Usuarios activos"
          value={String(activeUserIds.size)}
          sub="participantes"
          icon={Users}
        />
      </div>

      {/* Recent transactions */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold font-sans text-text-primary">
            Transacciones recientes
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-sans">
            <thead>
              <tr className="text-xs text-text-muted border-b border-border">
                <th className="text-left px-4 py-2.5 font-medium">Carta</th>
                <th className="text-left px-4 py-2.5 font-medium">Comprador</th>
                <th className="text-left px-4 py-2.5 font-medium">Vendedor</th>
                <th className="text-right px-4 py-2.5 font-medium">Monto</th>
                <th className="text-right px-4 py-2.5 font-medium">Comisión plataforma</th>
                <th className="text-right px-4 py-2.5 font-medium">Comisión MP</th>
                <th className="text-left px-4 py-2.5 font-medium">N° operación</th>
                <th className="text-left px-4 py-2.5 font-medium">Estado</th>
                <th className="text-left px-4 py-2.5 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {txRows.map((tx) => {
                const buyer  = tx.buyer;
                const seller = tx.seller;
                const card   = tx.card;
                return (
                  <tr key={tx.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-2.5 text-text-primary truncate max-w-[160px]">
                      {card?.name ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary">
                      @{buyer?.username ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary">
                      @{seller?.username ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-price text-text-primary">
                      {formatARS(tx.price)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-price text-text-secondary">
                      {tx.platform_fee != null ? formatARS(tx.platform_fee) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-price text-text-secondary">
                      {tx.mp_fee != null ? formatARS(tx.mp_fee) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary font-mono text-xs">
                      {tx.mp_payment_id ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[tx.status] ?? ""}`}>
                        {STATUS_LABELS[tx.status] ?? tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">
                      {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true, locale: es })}
                    </td>
                  </tr>
                );
              })}
              {txRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-text-muted">
                    No hay transacciones aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
