"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Search, Loader2, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge }   from "@/components/ui/badge";
import { Button }  from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SellFilterSidebar } from "@/components/sell/SellFilterSidebar";
import { CollectionCardTile } from "@/components/collection/CollectionCardTile";
import { toast } from "sonner";
import type { Game, CardSearchResult, CollectionItemWithCard } from "@/types/database";

// ─── Constants ────────────────────────────────────────────────────────────────

const GAME_TABS: { game: Game; label: string; badge: React.ComponentProps<typeof Badge>["variant"] }[] = [
  { game: "onepiece", label: "One Piece",   badge: "op" },
  { game: "magic",    label: "Magic",       badge: "magic" },
  { game: "pokemon",  label: "Pokémon",     badge: "poke" },
  { game: "dbz",      label: "Dragon Ball", badge: "dbz" },
];

interface FilterOptions {
  sets:     { code: string; name: string }[];
  rarities: string[];
  colors:   string[];
}

interface CollectionAddClientProps {
  initialGame: Game;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CollectionAddClient({ initialGame }: CollectionAddClientProps) {
  const [game, setGame] = React.useState<Game>(initialGame);
  const [ownedMap, setOwnedMap] = React.useState<Map<string, number>>(new Map());

  const [filterOptions,  setFilterOptions]  = React.useState<FilterOptions | null>(null);
  const [filtersLoading, setFiltersLoading] = React.useState(false);
  const [filterSet,      setFilterSet]      = React.useState("");
  const [filterRarities, setFilterRarities] = React.useState<string[]>([]);
  const [filterColors,   setFilterColors]   = React.useState<string[]>([]);
  const [searchQuery,    setSearchQuery]    = React.useState("");

  const [cardResults, setCardResults] = React.useState<CardSearchResult[]>([]);
  const [resultsMeta, setResultsMeta] = React.useState<{ total: number; pages: number; page: number } | null>(null);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [searching,   setSearching]   = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [bulkAdding,  setBulkAdding]  = React.useState(false);

  React.useEffect(() => {
    loadFilterOptions(initialGame);
    loadOwned(initialGame);
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

  function handleGameSelect(g: Game) {
    if (g === game) return;
    setGame(g);
    setFilterSet(""); setFilterRarities([]); setFilterColors([]); setSearchQuery("");
    setCardResults([]); setHasSearched(false); setResultsMeta(null); setSearchError(null);
    loadFilterOptions(g);
    loadOwned(g);
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

  // ── Toggle ───────────────────────────────────────────────────────────────────
  async function toggleOwned(card: CardSearchResult) {
    const isOwned = ownedMap.has(card.id);

    setOwnedMap((prev) => {
      const next = new Map(prev);
      if (isOwned) next.delete(card.id); else next.set(card.id, 1);
      return next;
    });

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
      toast.error("No se pudo actualizar tu colección.");
    }
  }

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
      await loadOwned(game);
    } catch {
      toast.error("Error de red. Verificá tu conexión.");
    } finally {
      setBulkAdding(false);
    }
  }

  const hasActiveFilters = Boolean(filterSet || filterRarities.length || filterColors.length || searchQuery.trim());

  return (
    <div>
      <Link
        href="/collection"
        className="inline-flex items-center gap-1.5 text-sm font-sans text-text-muted hover:text-text-primary mb-5 no-underline"
      >
        <ArrowLeft size={14} />
        Volver a mi colección
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-serif font-semibold text-text-primary">
          Agregar a la colección
        </h1>
        <p className="text-sm text-text-secondary font-sans mt-1">
          Buscá cartas o marcá un set completo como propio.
        </p>
      </div>

      {/* Game tab bar */}
      <div className="flex overflow-x-auto gap-2 mb-5">
        {GAME_TABS.map((t) => (
          <button
            key={t.game}
            onClick={() => handleGameSelect(t.game)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium font-sans whitespace-nowrap transition-colors shrink-0 border",
              game === t.game
                ? "bg-primary/5 border-primary/30 text-primary"
                : "bg-surface border-border text-text-secondary hover:border-primary/30"
            )}
          >
            <Badge variant={t.badge} size="sm" />
            {t.label}
          </button>
        ))}
      </div>

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
              Buscá o filtrá cartas para empezar a agregarlas a tu colección.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
