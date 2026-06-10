import * as React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

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

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: { status?: string; game?: string; from?: string; to?: string; page?: string };
}) {
  const status = searchParams.status ?? "";
  const game   = searchParams.game   ?? "";
  const from   = searchParams.from   ?? "";
  const to     = searchParams.to     ?? "";
  const page   = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const limit  = 30;
  const offset = (page - 1) * limit;

  const admin = createAdminClient();
  let query = admin
    .from("transactions")
    .select(
      "id, price, platform_fee, mp_fee, mp_payment_id, status, currency, created_at, " +
      "buyer:profiles!buyer_id(username), " +
      "seller:profiles!seller_id(username), " +
      "card:cards!card_id(name, game)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (status) query = (query as any).eq("status", status);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (from)   query = (query as any).gte("created_at", from);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (to)     query = (query as any).lte("created_at", to + "T23:59:59Z");

  const { data: rawTxs, count } = await query;

  type TxRow = {
    id: string; price: number; platform_fee: number | null; mp_fee: number | null;
    mp_payment_id: string | null;
    status: string; currency: string; created_at: string;
    buyer: { username: string } | null;
    seller: { username: string } | null;
    card: { name: string; game: string } | null;
  };
  const txs = (rawTxs ?? []) as unknown as TxRow[];

  // Filter by game client-side if specified (no FK filter in Supabase on joined field)
  const filtered = game
    ? txs.filter((t) => t.card?.game === game)
    : txs;

  const totalPages = Math.ceil((count ?? 0) / limit);

  function formatARS(n: number) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency", currency: "ARS", minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(n);
  }

  // Build filter URL helper
  const currentParams = { status, game, from, to };
  function filterUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams({ ...currentParams, page: "1", ...overrides });
    // Remove empty
    Array.from(p.entries()).forEach(([k, v]) => { if (!v) p.delete(k); });
    return `/admin/transactions?${p.toString()}`;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-serif font-semibold text-text-primary mb-1">Transacciones</h1>
      <p className="text-sm text-text-muted font-sans mb-6">
        {count ?? 0} transacciones totales
      </p>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Status filter */}
        <div className="flex flex-wrap gap-1.5">
          {["", "in_chat", "payment_pending", "paid", "completed", "disputed", "cancelled"].map((s) => (
            <a
              key={s}
              href={filterUrl({ status: s })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium font-sans transition-colors ${
                status === s
                  ? "bg-primary text-white"
                  : "bg-surface border border-border text-text-secondary hover:bg-secondary"
              }`}
            >
              {s ? (STATUS_LABELS[s] ?? s) : "Todos"}
            </a>
          ))}
        </div>

        {/* Game filter */}
        <div className="flex gap-1.5 ml-auto">
          {[["", "Todos"], ["magic", "MTG"], ["pokemon", "Pokémon"], ["onepiece", "One Piece"]].map(([g, label]) => (
            <a
              key={g}
              href={filterUrl({ game: g })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium font-sans transition-colors ${
                game === g
                  ? "bg-primary text-white"
                  : "bg-surface border border-border text-text-secondary hover:bg-secondary"
              }`}
            >
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* Date range */}
      <form method="GET" action="/admin/transactions" className="flex gap-2 mb-4">
        {status && <input type="hidden" name="status" value={status} />}
        {game   && <input type="hidden" name="game"   value={game}   />}
        <input
          type="date" name="from" defaultValue={from}
          className="px-3 py-1.5 rounded-lg bg-surface border border-border text-sm font-sans text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <input
          type="date" name="to" defaultValue={to}
          className="px-3 py-1.5 rounded-lg bg-surface border border-border text-sm font-sans text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button
          type="submit"
          className="px-4 py-1.5 rounded-lg bg-surface border border-border text-sm font-medium font-sans text-text-secondary hover:bg-secondary transition-colors"
        >
          Filtrar
        </button>
      </form>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
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
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => {
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
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/admin/transactions/${tx.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-text-muted">
                    No se encontraron transacciones.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm font-sans">
          <p className="text-text-muted">Página {page} de {totalPages}</p>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={filterUrl({ page: String(page - 1) })}
                className="px-3 py-1.5 rounded-lg bg-surface border border-border text-text-secondary hover:bg-secondary transition-colors"
              >
                Anterior
              </a>
            )}
            {page < totalPages && (
              <a
                href={filterUrl({ page: String(page + 1) })}
                className="px-3 py-1.5 rounded-lg bg-surface border border-border text-text-secondary hover:bg-secondary transition-colors"
              >
                Siguiente
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
