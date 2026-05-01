import * as React from "react";
import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explorar cartas — Singles.ar",
  description:
    "Explorá el catálogo de singles TCG en Argentina. Magic: The Gathering, Pokémon y One Piece con precios en ARS.",
};

import { Sparkles } from "lucide-react";
import { createAdminClient }              from "@/lib/supabase/admin";
import { createClient }                   from "@/lib/supabase/server";
import { Topbar }                         from "@/components/layout/Topbar";
import { CardTile }                       from "@/components/cards/CardTile";
import { CardSearchBar }                  from "@/components/cards/CardSearchBar";
import { ExploreFilters }                 from "@/components/cards/ExploreFilters";
import type { FilterOptions }             from "@/components/cards/ExploreFilters";
import type { CardWithListingStats, Game } from "@/types/database";

const PAGE_SIZE = 24;

// ─── Server data helpers ──────────────────────────────────────────────────────

async function fetchCards(
  q: string, game: string, set: string, rarity: string, color: string,
  sort: string, instock: boolean, page: number
) {
  if (!(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").startsWith("http")) {
    return { cards: [] as CardWithListingStats[], total: 0 };
  }

  const supabase = createClient();

  let query = supabase
    .from("cards_with_listing_stats")
    .select("*", { count: "exact" })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  switch (sort) {
    case "popular":    query = query.order("listing_count",  { ascending: false, nullsFirst: false }); break;
    case "price_asc":  query = query.order("lowest_price",   { ascending: true,  nullsFirst: false }); break;
    case "price_desc": query = query.order("lowest_price",   { ascending: false, nullsFirst: false }); break;
    case "name_asc":   query = query.order("name",           { ascending: true                     }); break;
    default:           query = query.order("latest_listing", { ascending: false, nullsFirst: false }); break;
  }

  if (q)       query = query.or(`name.ilike.%${q}%,external_id.ilike.%${q}%`);
  if (game && (["magic", "pokemon", "onepiece"] as string[]).includes(game))
               query = query.eq("game", game as Game);
  if (set)     query = query.ilike("set_code", set);
  if (rarity)  query = query.ilike("rarity",   rarity);
  if (color)   query = query.ilike("color",    `%${color}%`);
  if (instock) query = query.gt("listing_count", 0);

  const { data, count, error } = await query;
  if (error) {
    console.error("[explore] cards fetch error:", error.message);
    return { cards: [] as CardWithListingStats[], total: 0 };
  }
  return { cards: (data ?? []) as CardWithListingStats[], total: count ?? 0 };
}

async function fetchFilterOptions(game: string): Promise<FilterOptions | null> {
  if (!game || !(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").startsWith("http")) return null;

  const admin = createAdminClient();

  const [setsRes, raritiesRes, colorsRes] = await Promise.all([
    admin.rpc("get_filter_sets",     { p_game: game }),
    admin.rpc("get_filter_rarities", { p_game: game }),
    admin.rpc("get_filter_colors",   { p_game: game }),
  ]);

  const sets     = (setsRes.data     ?? []).map((r: { set_code: string; set_name: string | null }) => ({
    code: r.set_code, name: r.set_name ?? r.set_code,
  }));
  const rarities = (raritiesRes.data ?? []).map((r: { rarity: string }) => r.rarity);
  const colors   = (colorsRes.data   ?? []).map((r: { color:  string }) => r.color);

  return { sets, rarities, colors };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: { q?: string; game?: string; set?: string; rarity?: string; color?: string; sort?: string; instock?: string; page?: string };
}) {
  const q       = searchParams.q       ?? "";
  const game    = searchParams.game    ?? "";
  const set     = searchParams.set     ?? "";
  const rarity  = searchParams.rarity  ?? "";
  const color   = searchParams.color   ?? "";
  const sort    = searchParams.sort    ?? "recent";
  const instock = searchParams.instock === "1";
  const page    = Math.max(1, parseInt(searchParams.page ?? "1", 10));

  const [{ cards, total }, filterOptions] = await Promise.all([
    fetchCards(q, game, set, rarity, color, sort, instock, page),
    fetchFilterOptions(game),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasFilter  = Boolean(q || game || set || rarity || color || (sort && sort !== "recent") || instock);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Topbar />

      <main className="flex-1">

        {/* ── Hero / Search ─────────────────────────────────────────────── */}
        <section className="bg-primary">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-14 text-center">
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-white mb-2 text-balance">
              El marketplace de singles TCG en Argentina
            </h1>
            <p className="text-primary-200 font-sans text-base mb-6">
              Comprá y vendé cartas de Magic, Pokémon y One Piece al mejor precio
            </p>
            <Suspense>
              <CardSearchBar
                className="max-w-xl mx-auto"
                placeholder="Buscar por nombre, set o código…"
              />
            </Suspense>
          </div>
        </section>

        {/* ── Content: sidebar + grid ────────────────────────────────────── */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8 items-start">

            {/* ── Left sidebar ──────────────────────────────────────────── */}
            <aside className="w-full lg:w-52 lg:shrink-0 lg:sticky lg:top-6">
              <div className="surface-raised p-4">
                <p className="text-sm font-semibold font-serif text-text-primary mb-4">
                  Filtros
                </p>
                <ExploreFilters
                  currentGame={game}
                  currentSet={set}
                  currentRarity={rarity}
                  currentColor={color}
                  currentQ={q}
                  currentSort={sort}
                  currentInStock={instock}
                  filterOptions={filterOptions}
                />
              </div>
            </aside>

            {/* ── Card grid ─────────────────────────────────────────────── */}
            <div className="flex-1 min-w-0">

              {/* Section header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-serif font-semibold text-text-primary flex items-center gap-2">
                    {hasFilter ? (
                      q ? `Resultados para "${q}"` : activeLabel(game, set, rarity, color)
                    ) : (
                      <>
                        <Sparkles size={18} className="text-accent" />
                        Publicaciones recientes
                      </>
                    )}
                  </h2>
                  {total > 0 && (
                    <p className="text-sm text-text-muted font-sans mt-0.5">
                      {total.toLocaleString("es-AR")} {total === 1 ? "carta" : "cartas"}
                    </p>
                  )}
                </div>

                {hasFilter && (
                  <Link
                    href="/cards"
                    className="text-xs text-text-muted hover:text-text-primary font-sans no-underline transition-colors"
                  >
                    Limpiar
                  </Link>
                )}
              </div>

              {/* Grid */}
              {cards.length === 0 ? (
                <EmptyState q={q} />
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                    {cards.map((card) => (
                      <CardTile key={card.id} card={card} />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <Pagination
                      page={page} totalPages={totalPages}
                      q={q} game={game} set={set} rarity={rarity} color={color}
                      sort={sort} instock={instock}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-border mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <Link href="/" className="no-underline inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo.png" alt="Singles.ar" className="h-7 w-auto object-contain" />
            </Link>
            <p className="text-xs text-text-muted font-sans">
              © {new Date().getFullYear()} Singles.ar — Todos los derechos reservados
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GAME_LABELS: Record<string, string> = {
  magic:    "Magic: the Gathering",
  pokemon:  "Pokémon TCG",
  onepiece: "One Piece TCG",
};

function activeLabel(game: string, set: string, rarity: string, color: string) {
  const parts: string[] = [];
  if (game)   parts.push(GAME_LABELS[game] ?? game);
  if (set)    parts.push(set.toUpperCase());
  if (rarity) parts.push(rarity);
  if (color)  parts.push(color);
  return parts.join(" · ") || "Explorar";
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ q }: { q: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <div className="size-14 rounded-full bg-border flex items-center justify-center">
        <Sparkles size={24} className="text-text-muted" />
      </div>
      <div>
        <p className="text-base font-semibold font-sans text-text-secondary mb-1">
          {q ? `No encontramos "${q}"` : "Sin resultados"}
        </p>
        <p className="text-sm text-text-muted font-sans max-w-sm">
          {q
            ? "Probá con otro nombre o código de set."
            : "No hay cartas para estos filtros. ¡Sé el primero en vender!"}
        </p>
      </div>
      <Link href="/cards" className="text-sm text-primary font-sans font-medium hover:text-accent transition-colors no-underline">
        Ver todas las cartas
      </Link>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function buildPageNumbers(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | "…"> = [1];
  if (current > 3) pages.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

function Pagination({
  page, totalPages, q, game, set, rarity, color, sort, instock,
}: {
  page: number; totalPages: number;
  q: string; game: string; set: string; rarity: string; color: string;
  sort: string; instock: boolean;
}) {
  function href(p: number) {
    const ps = new URLSearchParams();
    if (q)                         ps.set("q",       q);
    if (game)                      ps.set("game",    game);
    if (set)                       ps.set("set",     set);
    if (rarity)                    ps.set("rarity",  rarity);
    if (color)                     ps.set("color",   color);
    if (sort && sort !== "recent") ps.set("sort",    sort);
    if (instock)                   ps.set("instock", "1");
    ps.set("page", String(p));
    return `/cards?${ps.toString()}`;
  }

  const pages = buildPageNumbers(page, totalPages);

  return (
    <nav aria-label="Paginación" className="flex items-center justify-center gap-1.5 mt-10">
      {page > 1 ? (
        <Link href={href(page - 1)} className="px-3 h-9 flex items-center rounded-lg text-sm font-sans font-medium text-text-secondary border border-border bg-surface hover:bg-secondary transition-colors no-underline">
          ← Anterior
        </Link>
      ) : (
        <span className="px-3 h-9 flex items-center text-sm font-sans text-text-muted opacity-40">← Anterior</span>
      )}

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="px-2 text-text-muted font-sans text-sm">…</span>
        ) : (
          <Link
            key={p}
            href={href(p as number)}
            className={[
              "size-9 flex items-center justify-center rounded-lg text-sm font-medium font-sans transition-colors no-underline",
              page === p
                ? "bg-primary text-white"
                : "bg-surface border border-border text-text-secondary hover:bg-secondary hover:border-primary/20",
            ].join(" ")}
          >
            {p}
          </Link>
        )
      )}

      {page < totalPages ? (
        <Link href={href(page + 1)} className="px-3 h-9 flex items-center rounded-lg text-sm font-sans font-medium text-text-secondary border border-border bg-surface hover:bg-secondary transition-colors no-underline">
          Siguiente →
        </Link>
      ) : (
        <span className="px-3 h-9 flex items-center text-sm font-sans text-text-muted opacity-40">Siguiente →</span>
      )}
    </nav>
  );
}
