"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ShieldOff, ShieldCheck, Flag, History } from "lucide-react";

interface AdminUser {
  id:               string;
  username:         string;
  email:            string;
  reputation_score: number;
  total_sales:      number;
  total_purchases:  number;
  cancel_count:     number;
  is_reliable_buyer: boolean;
  created_at:       string;
  suspended_at:     string | null;
  suspend_reason:   string | null;
  mercadopago_access_token: string | null;
  bulk_listing_disabled: boolean;
}

interface Props {
  users: AdminUser[];
  total: number;
  page:  number;
  limit: number;
  q:     string;
}

export function AdminUsersClient({ users, total, page, limit, q }: Props) {
  const router  = useRouter();
  const [search, setSearch] = React.useState(q);
  const [confirmId, setConfirmId]  = React.useState<string | null>(null);
  const [confirmAction, setConfirmAction] = React.useState<"suspend" | "unsuspend" | "unflag" | "toggle_bulk" | null>(null);
  const [suspendReason, setSuspendReason] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const totalPages = Math.ceil(total / limit);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    params.set("page", "1");
    router.push(`/admin/users?${params.toString()}`);
  }

  function openConfirm(id: string, action: "suspend" | "unsuspend" | "unflag" | "toggle_bulk") {
    setConfirmId(id);
    setConfirmAction(action);
    setSuspendReason("");
  }

  async function doAction() {
    if (!confirmId || !confirmAction) return;
    setLoading(true);
    try {
      const body: Record<string, string> = { userId: confirmId, action: confirmAction };
      if (confirmAction === "suspend" && suspendReason) body.suspend_reason = suspendReason;
      await fetch("/api/admin/users", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      router.refresh();
    } finally {
      setLoading(false);
      setConfirmId(null);
      setConfirmAction(null);
    }
  }

  return (
    <div>
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por usuario o email…"
          className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-sm font-sans text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium font-sans hover:bg-primary/90 transition-colors"
        >
          Buscar
        </button>
      </form>

      {/* Confirm modal */}
      {confirmId && confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-base font-semibold font-sans text-text-primary mb-2">
              {confirmAction === "suspend"     ? "Suspender usuario"   :
               confirmAction === "unsuspend"   ? "Reactivar usuario"   :
               confirmAction === "toggle_bulk" ? "Cambiar acceso a publicación masiva" :
               "Quitar flag de comprador"}
            </h3>
            {confirmAction === "suspend" && (
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Motivo (opcional)…"
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm font-sans text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 mb-3 resize-none"
              />
            )}
            <p className="text-sm text-text-muted font-sans mb-4">¿Confirmar esta acción?</p>
            <div className="flex gap-2">
              <button
                onClick={doAction}
                disabled={loading}
                className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-medium font-sans hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading ? "…" : "Confirmar"}
              </button>
              <button
                onClick={() => setConfirmId(null)}
                className="flex-1 py-2 rounded-lg bg-secondary text-text-primary text-sm font-medium font-sans hover:bg-secondary/80 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-sans">
            <thead>
              <tr className="text-xs text-text-muted border-b border-border">
                <th className="text-left px-4 py-2.5 font-medium">Usuario</th>
                <th className="text-left px-4 py-2.5 font-medium">Email</th>
                <th className="text-right px-4 py-2.5 font-medium">Rep.</th>
                <th className="text-right px-4 py-2.5 font-medium">Ventas</th>
                <th className="text-right px-4 py-2.5 font-medium">Cancels</th>
                <th className="text-left px-4 py-2.5 font-medium">MP</th>
                <th className="text-left px-4 py-2.5 font-medium">Bulk</th>
                <th className="text-left px-4 py-2.5 font-medium">Estado</th>
                <th className="text-left px-4 py-2.5 font-medium">Registro</th>
                <th className="text-left px-4 py-2.5 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-2.5 text-text-primary font-medium">
                    @{u.username}
                    {!u.is_reliable_buyer && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs text-amber-400">
                        <Flag size={10} /> flagged
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary truncate max-w-[180px]">
                    {u.email}
                  </td>
                  <td className="px-4 py-2.5 text-right text-text-secondary">{u.reputation_score}</td>
                  <td className="px-4 py-2.5 text-right text-text-secondary">{u.total_sales}</td>
                  <td className="px-4 py-2.5 text-right text-text-secondary">{u.cancel_count}</td>
                  <td className="px-4 py-2.5">
                    {u.mercadopago_access_token ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">
                        Vinculado
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-text-muted">
                        No vinculado
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => openConfirm(u.id, "toggle_bulk")}
                      title={u.bulk_listing_disabled ? "Activar publicación masiva" : "Desactivar publicación masiva"}
                      className="cursor-pointer"
                    >
                      {u.bulk_listing_disabled ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
                          Desactivado
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">
                          Habilitado
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    {u.suspended_at ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
                        Suspendido
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">
                        Activo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">
                    {formatDistanceToNow(new Date(u.created_at), { addSuffix: true, locale: es })}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/admin/transactions?user_id=${u.id}`}
                        title="Ver historial"
                        className="p-1 rounded hover:bg-primary/10 text-primary transition-colors"
                      >
                        <History size={14} />
                      </Link>
                      {u.suspended_at ? (
                        <button
                          onClick={() => openConfirm(u.id, "unsuspend")}
                          title="Reactivar"
                          className="p-1 rounded hover:bg-emerald-500/10 text-emerald-400 transition-colors"
                        >
                          <ShieldCheck size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => openConfirm(u.id, "suspend")}
                          title="Suspender"
                          className="p-1 rounded hover:bg-red-500/10 text-red-400 transition-colors"
                        >
                          <ShieldOff size={14} />
                        </button>
                      )}
                      {!u.is_reliable_buyer && (
                        <button
                          onClick={() => openConfirm(u.id, "unflag")}
                          title="Quitar flag"
                          className="p-1 rounded hover:bg-amber-500/10 text-amber-400 transition-colors"
                        >
                          <Flag size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-text-muted">
                    No se encontraron usuarios.
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
          <p className="text-text-muted">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={`/admin/users?q=${encodeURIComponent(q)}&page=${page - 1}`}
                className="px-3 py-1.5 rounded-lg bg-surface border border-border text-text-secondary hover:bg-secondary transition-colors"
              >
                Anterior
              </a>
            )}
            {page < totalPages && (
              <a
                href={`/admin/users?q=${encodeURIComponent(q)}&page=${page + 1}`}
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
