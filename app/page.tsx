import * as React from "react";
import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Singles.ar — Marketplace de cartas TCG en Argentina",
  description:
    "Comprá, vendé e intercambiá cartas de Magic: The Gathering, Pokémon y One Piece con jugadores de Argentina. Precios en ARS, pagos por MercadoPago.",
  openGraph: {
    title:       "Singles.ar — Marketplace de cartas TCG en Argentina",
    description: "Comprá, vendé e intercambiá cartas de Magic, Pokémon y One Piece en Argentina.",
    type:        "website",
  },
};
import { Layers, Sparkles } from "lucide-react";
import { createClient }               from "@/lib/supabase/server";
import { Topbar }                     from "@/components/layout/Topbar";
import { CardTile }                   from "@/components/cards/CardTile";
import { CardSearchBar }              from "@/components/cards/CardSearchBar";
import { Badge }                      from "@/components/ui/badge";
import type { CardWithListingStats, Game } from "@/types/database";

// ─── Game filter options ──────────────────────────────────────────────────────

const GAMES: Array<{ value: string; label: string; image?: string }> = [
  { value: "",         label: "Todos"     },
  { value: "magic",    label: "Magic",     image: "/images/magic.png"    },
  { value: "pokemon",  label: "Pokémon",   image: "/images/pokemon.png"  },
  { value: "onepiece", label: "One Piece", image: "/images/onepiece.png" },
];

const PAGE_SIZE = 24;

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchCards(q: string, game: string, page: number) {
  if (!(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").startsWith("http")) {
    return { cards: [] as CardWithListingStats[], total: 0 };
  }

  const supabase = createClient();

  let query = supabase
    .from("cards_with_listing_stats")
    .select("*", { count: "exact" })
    .order("latest_listing", { ascending: false, nullsFirst: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (q) {
    // ilike on the view (search_vector not exposed through view)
    query = query.ilike("name", `%${q}%`);
  }

  if (game && (["magic", "pokemon", "onepiece"] as string[]).includes(game)) {
    query = query.eq("game", game as Game);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("[homepage] Cards fetch error:", error);
    return { cards: [] as CardWithListingStats[], total: 0 };
  }

  return { cards: (data ?? []) as CardWithListingStats[], total: count ?? 0 };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage({
  searchParams,
}: {
  searchParams: { q?: string; game?: string; page?: string };
}) {
  const q    = searchParams.q    ?? "";
  const game = searchParams.game ?? "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));

  const { cards, total } = await fetchCards(q, game, page);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasFilter  = Boolean(q || game);
  const gameLabel  = GAMES.find((g) => g.value === game)?.label;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Topbar />

      <main className="flex-1">

        {/* ── Hero / Search ───────────────────────────────────────────────── */}
        <section className="bg-primary">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16 text-center">
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-white mb-2 text-balance">
              El marketplace de singles TCG en Argentina
            </h1>
            <p className="text-primary-200 font-sans text-base mb-8">
              Comprá y vendé cartas de Magic, Pokémon y One Piece al mejor precio
            </p>

            {/* SearchBar is a client component — wrap in Suspense for RSC */}
            <Suspense>
              <CardSearchBar
                className="max-w-xl mx-auto"
                placeholder="Buscar por nombre, set o código…"
              />
            </Suspense>

            {/* Game filter cards */}
            <div className="flex items-center justify-center gap-3 mt-6">
              {GAMES.map(({ value, label, image }) => {
                const params = new URLSearchParams();
                if (q)     params.set("q",    q);
                if (value) params.set("game", value);
                const active = game === value;

                return (
                  <Link
                    key={value}
                    href={`/?${params.toString()}`}
                    className={[
                      "relative no-underline rounded-lg overflow-hidden select-none",
                      "border-2 transition-all duration-200",
                      "w-44 sm:w-52",
                      active
                        ? "border-white shadow-lg scale-105"
                        : "border-white/20 hover:border-white/60 hover:scale-[1.03]",
                    ].join(" ")}
                  >
                    {image ? (
                      <>
                        {/* Image drives container height at its natural aspect ratio */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image}
                          alt={label}
                          className="w-full h-auto block"
                        />
                        {/* Subtle gradient for active/hover depth */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      </>
                    ) : (
                      /* "Todos" — matches the ~900×211 banner aspect ratio of the game images */
                      <div className="aspect-[900/211] flex items-center justify-center bg-white/10">
                        <span className="text-sm font-semibold font-sans text-white">
                          {label}
                        </span>
                      </div>
                    )}

                    {/* Active indicator dot */}
                    {active && (
                      <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-white shadow" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Card grid ───────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">

          {/* Section header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-serif font-semibold text-text-primary flex items-center gap-2">
                {hasFilter
                  ? q
                    ? `Resultados para "${q}"`
                    : gameLabel
                  : (
                    <>
                      <Sparkles size={18} className="text-accent" />
                      Publicaciones recientes
                    </>
                  )
                }
              </h2>
              {total > 0 && (
                <p className="text-sm text-text-muted font-sans mt-0.5">
                  {total.toLocaleString("es-AR")} {total === 1 ? "carta" : "cartas"}
                </p>
              )}
            </div>

            {/* Active filter chips */}
            {hasFilter && (
              <div className="flex items-center gap-2">
                {game && (
                  <Badge
                    variant={
                      game === "magic"    ? "magic" :
                      game === "pokemon"  ? "poke"  : "op"
                    }
                  />
                )}
                <Link
                  href="/"
                  className="text-xs text-text-muted hover:text-text-primary font-sans no-underline transition-colors"
                >
                  Limpiar
                </Link>
              </div>
            )}
          </div>

          {/* Grid */}
          {cards.length === 0 ? (
            <EmptyState q={q} game={game} />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {cards.map((card) => (
                  <CardTile key={card.id} card={card} />
                ))}
              </div>

              {totalPages > 1 && (
                <Pagination page={page} totalPages={totalPages} q={q} game={game} />
              )}
            </>
          )}
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <Link href="/" className="no-underline inline-block mb-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/logo.png" alt="Singles.ar" className="h-7 w-auto object-contain" />
              </Link>
              <p className="text-xs text-text-muted font-sans">
                El marketplace de cartas coleccionables de Argentina
              </p>
            </div>

            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-text-muted font-sans">
              {[
                ["Explorar",      "/explorar"        ],
                ["Vender",        "/vender"          ],
                ["Cómo funciona", "/como-funciona"   ],
                ["Términos",      "/terminos"        ],
                ["Privacidad",    "/privacidad"      ],
              ].map(([label, href]) => (
                <Link key={href} href={href} className="hover:text-text-primary transition-colors no-underline">
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="mt-8 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-text-muted font-sans">
              © {new Date().getFullYear()} Singles.ar — Todos los derechos reservados
            </p>
            <div className="flex items-center gap-1.5 text-xs text-text-muted font-sans">
              <Layers size={12} />
              <span>
                Datos de cartas:{" "}
                <a href="https://scryfall.com" target="_blank" rel="noopener noreferrer"
                  className="hover:text-primary transition-colors no-underline">Scryfall</a>
                {" "}&amp;{" "}
                <a href="https://pokemontcg.io" target="_blank" rel="noopener noreferrer"
                  className="hover:text-primary transition-colors no-underline">PokémonTCG API</a>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ q, game }: { q: string; game: string }) {
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
            : "Aún no hay cartas publicadas para este filtro. ¡Sé el primero en vender!"}
        </p>
      </div>
      <Link href="/" className="text-sm text-primary font-sans font-medium hover:text-accent transition-colors no-underline">
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
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

function Pagination({
  page, totalPages, q, game,
}: {
  page: number; totalPages: number; q: string; game: string;
}) {
  function href(p: number) {
    const ps = new URLSearchParams();
    if (q)    ps.set("q",    q);
    if (game) ps.set("game", game);
    ps.set("page", String(p));
    return `/?${ps.toString()}`;
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
