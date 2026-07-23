"use client";

import * as React from "react";
import { Search, Loader2, ListChecks, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { setLabel } from "@/lib/formatting";
import { Badge }   from "@/components/ui/badge";
import { Button }  from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SellFilterSidebar } from "@/components/sell/SellFilterSidebar";
import { CollectionCardTile } from "@/components/collection/CollectionCardTile";
import { toast } from "sonner";
import type {
  Game, CardSearchResult, CollectionItemWithCard, CollectionProgressRow,
} from "@/types/database";

// ─── Constants ────────────────────────────────────────────────────────────────

const GAME_TABS: { game: Game; label: string; badge: React.ComponentProps<typeof Badge>["variant"] }[] = [
  { game: "onepiece", label: "One Piece", badge: "op" },
  { game: "magic",    label: "Magic",     badge: "magic" },
  { game: "pokemon",  label: "Pokémon",   badge: "poke" },
];

interface FilterOptions {
  sets:     { code: string; name: string }[];
  rarities: string[];
  colors:   string[];
}

interface CollectionClientProps {
  initialGame:     Game;
  initialItems:    CollectionItemWithCard[];
  initialProgress: CollectionProgressRow[];
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CollectionClient({ initialGame, initialItems, initialProgress }: CollectionClientProps) {
  const [game, setGame] = React.useState<Game>(initialGame);

  const [ownedMap, setOwnedMap] = React.useState<Map<string, number>>(
    () => new Map(initialItems.map((i) => [i.card_id, i.quantity]))
  );
  const [progress,        setProgress]        = React.useState<CollectionProgressRow[]>(initialProgress);
  const [progressLoading, setProgressLoading] = React.useState(false);

  // ── Filters / search (mirrors BulkSellFlow step 1) ─────────────────────────
  const [filterOptions,   setFilterOptions]   = React.useState<FilterOptions | null>(null);
  const [filtersLoading,  setFiltersLoading]  = React.useState(false);
  const [filterSet,       setFilterSet]       = React.useState("");
  const [filterRarities,  setFilterRarities]  = React.useState<string[]>([]);
  const [filterColors,    setFilterColors]    = React.useState<string[]>([]);
  const [searchQuery,     setSearchQuery]     = React.useState("");
  const [cardResults,     setCardResults]     = React.useState<CardSearchResult[]>([]);
  const [resultsMeta,     setResultsMeta]     = React.useState<{ total: number; pages: number; page: number } | null>(null);
  const [hasSearched,     setHasSearched]     = React.useState(false);
  const [searching,       setSearching]       = React.useState(false);
  const [searchError,     setSearchError]     = React.useState<string | null>(null);
  const [bulkAdding,      setBulkAdding]      = React.useState(false);

  // ── Load filter options for the initial game on mount ──────────────────────
  React.useEffect(() => {
    loadFilterOptions(initialGame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadFilterOptions(g: Game) {
    setFiltersLoading(true);
    try {
      const res  = await fetch(`/api/cards/filters?game=${g}`);
      const data = await res.json() as FilterOptions;
      setFilterOptions(data);
    } catch {
      setFilterOptions({ sets: [], rarities: [], colors: [] });
    } finally {
      setFiltersLoading(false);
    }
  }

  async function loadOwned(g: Game) {
    try {
      const res  = await fetch(`/api/collection?game=${g}`);
      const json = await res.json() as { data?: CollectionItemWithCard[] };
      setOwnedMap(new Map((json.data ?? []).map((i) => [i.card_id, i.quantity])));
    } catch {
      setOwnedMap(new Map());
    }
  }

  async function loadProgress(g: Game) {
    setProgressLoading(true);
    try {
      const res  = await fetch(`/api/collection/progress?game=${g}`);
      const json = await res.json() as { data?: CollectionProgressRow[] };
      setProgress(json.data ?? []);
    } catch {
      setProgress([]);
    } finally {
      setProgressLoading(false);
    }
  }

  function handleGameSelect(g: Game) {
    if (g === game) return;
    setGame(g);
    setFilterSet(""); setFilterRarities([]); setFilterColors([]); setSearchQuery("");
    setCardResults([]); setHasSearched(false); setResultsMeta(null); setSearchError(null);
    loadFilterOptions(g);
    loadOwned(g);
    loadProgress(g);
  }

  async function handleSearch(e?: React.FormEvent, page = 1) {
    e?.preventDefault();
    setSearching(true);
    setSearchError(null);
    try {
      const params = new URLSearchParams({ game, page: String(page), limit: "24" });
      if (searchQuery.trim())    params.set("q", searchQuery.trim());
      if (filterSet)             params.set("set", filterSet);
      if (filterRarities.length) params.set("rarity", filterRarities.join(","));
      if (filterColors.length)   params.set("color", filterColors.join(","));

      const res  = await fetch(`/api/cards/search?${params}`);
      const data = await res.json() as { data?: CardSearchResult[]; error?: string; meta?: { total: number; pages: number; page: number } };

      if (!res.ok) {
        setSearchError(data.error ?? "Error al buscar cartas.");
        setHasSearched(true);
        return;
      }

      if (page === 1) {
        setCardResults(data.data ?? []);
      } else {
        setCardResults((prev) => [...prev, ...(data.data ?? [])]);
      }
      setResultsMeta(data.meta ?? null);
      setHasSearched(true);
    } catch {
      setSearchError("Error de red al buscar cartas.");
      setHasSearched(true);
    } finally {
      setSearching(false);
    }
  }

  // ── Progress adjustment (optimistic) ────────────────────────────────────────
  function adjustProgress(setCode: string | null | undefined, delta: number) {
    if (!setCode) return;
    setProgress((prev) => prev.map((row) =>
      row.set_code === setCode ? { ...row, owned: Math.max(0, Math.min(row.total, row.owned + delta)) } : row
    ));
  }

  // ── Single toggle ────────────────────────────────────────────────────────────
  async function toggleOwned(card: CardSearchResult) {
    const isOwned = ownedMap.has(card.id);

    setOwnedMap((prev) => {
      const next = new Map(prev);
      if (isOwned) next.delete(card.id); else next.set(card.id, 1);
      return next;
    });
    adjustProgress(card.set_code, isOwned ? -1 : 1);

    try {
      const res = isOwned
        ? await fetch(`/api/collection/${card.id}`, { method: "DELETE" })
        : await fetch("/api/collection", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ card_id: card.id }),
          });
      if (!res.ok) throw new Error();
    } catch {
      setOwnedMap((prev) => {
        const next = new Map(prev);
        if (isOwned) next.set(card.id, 1); else next.delete(card.id);
        return next;
      });
      adjustProgress(card.set_code, isOwned ? 1 : -1);
      toast.error("No se pudo actualizar tu colección.");
    }
  }

  // ── Quantity ─────────────────────────────────────────────────────────────────
  async function updateQuantity(cardId: string, next: number) {
    const prevQty = ownedMap.get(cardId) ?? 1;
    setOwnedMap((prev) => new Map(prev).set(cardId, next));
    try {
      const res = await fetch(`/api/collection/${cardId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ quantity: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setOwnedMap((prev) => new Map(prev).set(cardId, prevQty));
      toast.error("No se pudo actualizar la cantidad.");
    }
  }

  // ── Bulk add ─────────────────────────────────────────────────────────────────
  async function applyBulkAdd() {
    setBulkAdding(true);
    try {
      const body: Record<string, unknown> = { game };
      if (filterSet)             body.set    = filterSet;
      if (filterRarities.length) body.rarity = filterRarities;
      if (filterColors.length)   body.color  = filterColors;
      if (searchQuery.trim())    body.q      = searchQuery.trim();

      const res  = await fetch("/api/collection/bulk", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Error al agregar cartas.");
        return;
      }

      toast.success(`${json.data.added} carta${json.data.added !== 1 ? "s" : ""} agregada${json.data.added !== 1 ? "s" : ""} a tu colección.`);
      await Promise.all([loadOwned(game), loadProgress(game)]);
    } catch {
      toast.error("Error de red. Verificá tu conexión.");
    } finally {
      setBulkAdding(false);
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────────
  const totalOwned = progress.reduce((sum, row) => sum + row.owned, 0);
  const totalCards = progress.reduce((sum, row) => sum + row.total, 0);
  const hasActiveFilters = Boolean(filterSet || filterRarities.length || filterColors.length || searchQuery.trim());

  return (
    <div>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-serif font-semibold text-text-primary flex items-center gap-2">
          <Layers size={22} className="text-primary" />
          Mi colección
        </h1>
        <p className="text-sm text-text-secondary font-sans mt-1">
          Llevá el registro de qué cartas tenés y cuáles te faltan.
        </p>
      </div>

      {/* ── Game tab bar ──────────────────────────────────────────────────── */}
      <div className="surface-raised overflow-hidden mb-6">
        <div className="flex overflow-x-auto border-b border-border">
          {GAME_TABS.map((t) => (
            <button
              key={t.game}
              onClick={() => handleGameSelect(t.game)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium font-sans whitespace-nowrap",
                "border-b-2 -mb-px transition-colors shrink-0",
                game === t.game
                  ? "text-primary border-primary"
                  : "text-text-muted border-transparent hover:text-text-primary"
              )}
            >
              <Badge variant={t.badge} size="sm" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Progress summary */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold font-sans text-text-primary">
              Progreso
            </p>
            {progressLoading ? (
              <Spinner size="xs" />
            ) : totalCards > 0 && (
              <span className="text-xs font-sans text-text-muted">
                {totalOwned}/{totalCards} cartas ({totalCards - totalOwned} faltan)
              </span>
            )}
          </div>

          {progress.length === 0 && !progressLoading ? (
            <p className="text-xs text-text-muted font-sans">Sin datos de sets para este juego todavía.</p>
          ) : (
            <div className="max-h-56 overflow-y-auto flex flex-col gap-2 pr-1">
              {progress.map((row) => {
                const pct = row.total > 0 ? Math.round((row.owned / row.total) * 100) : 0;
                return (
                  <div key={row.set_code} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-sans font-medium text-text-primary truncate">
                        {setLabel(row.set_code, row.set_name)}
                      </p>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden mt-1">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-200"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-2xs font-sans text-text-muted whitespace-nowrap shrink-0">
                      {row.owned}/{row.total}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Filters + search + grid ──────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <aside className="w-full lg:w-64 lg:shrink-0 lg:sticky lg:top-24">
          {filtersLoading ? (
            <div className="surface-raised p-4 flex items-center gap-2 text-sm text-text-muted font-sans">
              <Spinner size="xs" /> Cargando filtros…
            </div>
          ) : filterOptions && (
            filterOptions.sets.length > 0 ||
            filterOptions.rarities.length > 0 ||
            filterOptions.colors.length > 0 ||
            game === "pokemon"
          ) && (
            <SellFilterSidebar
              game={game}
              filterOptions={filterOptions}
              selectedSet={filterSet}
              onSetChange={setFilterSet}
              selectedRarities={filterRarities}
              onRaritiesChange={setFilterRarities}
              selectedColors={filterColors}
              onColorsChange={setFilterColors}
            />
          )}
        </aside>

        <div className="surface-raised p-6 flex-1 min-w-0">
          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre…"
                className={cn(
                  "w-full h-10 rounded-lg border border-border bg-surface",
                  "pl-9 pr-3 font-sans text-sm text-text-primary",
                  "placeholder:text-text-muted transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                )}
              />
            </div>
            <Button type="submit" variant="primary" size="sm" loading={searching} disabled={searching}>
              Buscar
            </Button>
          </form>

          {/* Bulk add */}
          {hasSearched && (
            <div className="mt-3">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<ListChecks size={13} />}
                loading={bulkAdding}
                disabled={bulkAdding}
                onClick={applyBulkAdd}
              >
                {hasActiveFilters ? "Marcar todos los resultados como propios" : "Marcar todo lo visible como propio"}
              </Button>
            </div>
          )}

          {/* Results */}
          {hasSearched && (
            <div className="mt-5">
              {searchError ? (
                <p className="text-sm text-error font-sans text-center py-8">{searchError}</p>
              ) : cardResults.length === 0 && !searching ? (
                <p className="text-sm text-text-muted font-sans text-center py-8">
                  Sin resultados. Probá con otro nombre o filtros distintos.
                </p>
              ) : (
                <>
                  {resultsMeta && (
                    <p className="text-xs text-text-muted font-sans mb-3">
                      {resultsMeta.total.toLocaleString()} carta{resultsMeta.total !== 1 ? "s" : ""} encontrada{resultsMeta.total !== 1 ? "s" : ""}
                    </p>
                  )}

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {cardResults.map((card) => (
                      <CollectionCardTile
                        key={card.id}
                        card={card}
                        owned={ownedMap.has(card.id)}
                        quantity={ownedMap.get(card.id) ?? 1}
                        onToggle={() => toggleOwned(card)}
                        onQuantityChange={(next) => updateQuantity(card.id, next)}
                      />
                    ))}
                  </div>

                  {resultsMeta && resultsMeta.page < resultsMeta.pages && (
                    <div className="mt-4 flex justify-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={searching}
                        onClick={() => handleSearch(undefined, (resultsMeta.page ?? 1) + 1)}
                      >
                        Cargar más
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {!hasSearched && (
            <p className="text-sm text-text-muted font-sans text-center py-10">
              Buscá o filtrá cartas para empezar a marcar tu colección.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
