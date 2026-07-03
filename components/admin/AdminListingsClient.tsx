"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { format } from "date-fns";
import { Tag } from "lucide-react";
import type { Game } from "@/types/database";
import { formatARS } from "@/lib/formatting";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminListing {
  id:           string;
  listing_type: "sale" | "trade";
  price:        number | null;
  condition:    string | null;
  quantity:     number;
  status:       string;
  currency:     string | null;
  notes:        string | null;
  created_at:   string;
  updated_at:   string;
  cards: { id: string; name: string; set_name: string | null; set_code: string | null; rarity: string | null; game: Game; image_url: string | null } | null;
  profiles: { id: string; username: string } | null;
}

interface Props {
  listings: AdminListing[];
  total:    number;
  page:     number;
  limit:    number;
  q:        string;
  sellerId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  active:    "bg-emerald-500/10 text-emerald-400",
  reserved:  "bg-amber-500/10 text-amber-400",
  sold:      "bg-blue-500/10 text-blue-400",
  cancelled: "bg-secondary text-text-muted",
};

const STATUS_LABELS: Record<string, string> = {
  active:    "Activo",
  reserved:  "Reservado",
  sold:      "Vendido",
  cancelled: "Cancelado",
};

const GAME_STYLES: Record<Game, string> = {
  magic:    "bg-blue-500/10 text-blue-400",
  pokemon:  "bg-yellow-500/10 text-yellow-500",
  onepiece: "bg-red-500/10 text-red-400",
};

const GAME_LABELS: Record<Game, string> = {
  magic:    "MTG",
  pokemon:  "Pokémon",
  onepiece: "One Piece",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminListingsClient({ listings, total, page, limit, q, sellerId }: Props) {
  const router = useRouter();
  const [search, setSearch] = React.useState(q);
  const totalPages = Math.ceil(total / limit);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search)   params.set("q", search);
    if (sellerId) params.set("seller_id", sellerId);
    params.set("page", "1");
    router.push(`/admin/listings?${params.toString()}`);
  }

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (q)        params.set("q", q);
    if (sellerId) params.set("seller_id", sellerId);
    params.set("page", String(p));
    return `/admin/listings?${params.toString()}`;
  }

  return (
    <div>
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre de carta…"
          className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-sm font-sans text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium font-sans hover:bg-primary/90 transition-colors"
        >
          Buscar
        </button>
      </form>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-sans">
            <thead>
              <tr className="text-xs text-text-muted border-b border-border bg-secondary/40">
                <th className="text-left px-4 py-2.5 font-medium">Carta</th>
                <th className="text-left px-4 py-2.5 font-medium">Juego</th>
                <th className="text-left px-4 py-2.5 font-medium">Set</th>
                {!sellerId && (
                  <th className="text-left px-4 py-2.5 font-medium">Vendedor</th>
                )}
                <th className="text-left px-4 py-2.5 font-medium">Tipo</th>
                <th className="text-left px-4 py-2.5 font-medium">Condición</th>
                <th className="text-right px-4 py-2.5 font-medium">Precio</th>
                <th className="text-right px-4 py-2.5 font-medium">Stock</th>
                <th className="text-left px-4 py-2.5 font-medium">Estado</th>
                <th className="text-left px-4 py-2.5 font-medium">Publicado</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => {
                const card = l.cards;
                const statusStyle = STATUS_STYLES[l.status] ?? "bg-secondary text-text-muted";
                return (
                  <tr key={l.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    {/* Carta */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="relative shrink-0 w-8 h-11 rounded overflow-hidden border border-border bg-secondary">
                          {card?.image_url ? (
                            <Image src={card.image_url} alt={card.name} fill sizes="32px" className="object-cover" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Tag size={10} className="text-border" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={card ? `/admin/cards?q=${encodeURIComponent(card.name)}` : "#"}
                            className="text-sm font-medium text-text-primary hover:text-primary transition-colors truncate block max-w-[180px]"
                          >
                            {card?.name ?? "—"}
                          </Link>
                          {card?.rarity && (
                            <span className="text-2xs text-text-muted">{card.rarity}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Juego */}
                    <td className="px-4 py-2.5">
                      {card?.game && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${GAME_STYLES[card.game]}`}>
                          {GAME_LABELS[card.game]}
                        </span>
                      )}
                    </td>
                    {/* Set */}
                    <td className="px-4 py-2.5 text-text-secondary whitespace-nowrap">
                      {card?.set_code ?? card?.set_name ?? "—"}
                    </td>
                    {/* Vendedor (only when not filtered) */}
                    {!sellerId && (
                      <td className="px-4 py-2.5">
                        {l.profiles ? (
                          <Link
                            href={`/admin/listings?seller_id=${l.profiles.id}`}
                            className="text-sm text-primary hover:underline font-sans"
                          >
                            @{l.profiles.username}
                          </Link>
                        ) : "—"}
                      </td>
                    )}
                    {/* Tipo */}
                    <td className="px-4 py-2.5">
                      {l.listing_type === "trade" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400">Trade</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400">Venta</span>
                      )}
                    </td>
                    {/* Condición */}
                    <td className="px-4 py-2.5 text-text-secondary whitespace-nowrap">
                      {l.condition ?? "—"}
                    </td>
                    {/* Precio */}
                    <td className="px-4 py-2.5 text-right font-price text-text-primary whitespace-nowrap">
                      {l.price != null ? formatARS(l.price) : "—"}
                    </td>
                    {/* Stock */}
                    <td className="px-4 py-2.5 text-right text-text-secondary">
                      {l.quantity}
                    </td>
                    {/* Estado */}
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle}`}>
                        {STATUS_LABELS[l.status] ?? l.status}
                      </span>
                    </td>
                    {/* Publicado */}
                    <td className="px-4 py-2.5 text-text-muted whitespace-nowrap text-xs">
                      {format(new Date(l.created_at), "dd/MM/yyyy")}
                    </td>
                  </tr>
                );
              })}
              {listings.length === 0 && (
                <tr>
                  <td colSpan={sellerId ? 9 : 10} className="px-4 py-8 text-center text-text-muted">
                    No se encontraron publicaciones.
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
              <a href={pageUrl(page - 1)} className="px-3 py-1.5 rounded-lg bg-surface border border-border text-text-secondary hover:bg-secondary transition-colors">
                Anterior
              </a>
            )}
            {page < totalPages && (
              <a href={pageUrl(page + 1)} className="px-3 py-1.5 rounded-lg bg-surface border border-border text-text-secondary hover:bg-secondary transition-colors">
                Siguiente
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
