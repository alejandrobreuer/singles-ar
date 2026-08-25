"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Layers } from "lucide-react";
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

  // ── Filters (set selection driven by either the summary rows or the sidebar) ─
  const [filterOptions,  setFilterOptions]  = React.useState<FilterOptions | null>(null);
  const [filtersLoading, setFiltersLoading] = React.useState(false);
  const [selectedSet,    setSelectedSet]    = React.useState("");
  const [filterRarities, setFilterRarities] = React.useState<string[]>([]);
  const [filterColors,   setFilterColors]   = React.useState<string[]>([]);

  // ── Roster (all cards for the current game/set/filters, owned or not) ──────
  const [cardResults,    setCardResults]    = React.useState<CardSearchResult[]>([]);
  const [resultsMeta,    setResultsMeta]    = React.useState<{ total: number; pages: number; page: number } | null>(null);
  const [loadingResults, setLoadingResults] = React.useState(false);
  const [loadError,      setLoadError]      = React.useState<string | null>(null);

  // ── Load filter options for the initial game on mount ──────────────────────
  React.useEffect(() => {
    loadFilterOptions(initialGame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Roster reacts automatically to game / set / filter changes ─────────────
  React.useEffect(() => {
    loadRoster(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, selectedSet, filterRarities, filterColors]);

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

  async function loadRoster(page: number) {
    setLoadingResults(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ game, page: String(page), limit: "24" });
      if (selectedSet)            params.set("set", selectedSet);
      if (filterRarities.length)  params.set("rarity", filterRarities.join(","));
      if (filterColors.length)    params.set("color", filterColors.join(","));

      const res  = await fetch(`/api/cards/search?${params}`);
      const data = await res.json() as { data?: CardSearchResult[]; error?: string; meta?: { total: number; pages: number; page: number } };

      if (!res.ok) {
        setLoadError(data.error ?? "Error al cargar cartas.");
        return;
      }

      if (page === 1) {
        setCardResults(data.data ?? []);
      } else {
        setCardResults((prev) => [...prev, ...(data.data ?? [])]);
      }
      setResultsMeta(data.meta ?? null);
    } catch {
      setLoadError("Error de red al cargar cartas.");
    } finally {
      setLoadingResults(false);
    }
  }

  function handleGameSelect(g: Game) {
    if (g === game) return;
    setGame(g);
    setSelectedSet(""); setFilterRarities([]); setFilterColors([]);
    loadFilterOptions(g);
    loadOwned(g);
    loadProgress(g);
    // roster refetch handled by the effect watching [game, selectedSet, filterRarities, filterColors]
  }

  // ── Progress adjustment (optimistic) ────────────────────────────────────────
  function adjustProgress(setCode: string | null | undefined, delta: number) {
    if (!setCode) return;
    setProgress((prev) => prev.map((row) =>
      row.set_code === setCode ? { ...row, owned: Math.max(0, Math.min(row.total, row.owned + delta)) } : row
    ));
  }

  // ── Toggle (only ever called for owned cards on this page — see render) ────
  async function removeFromCollection(card: CardSearchResult) {
    setOwnedMap((prev) => {
      const next = new Map(prev);
      next.delete(card.id);
      return next;
    });
    adjustProgress(card.set_code, -1);

    try {
      const res = await fetch(`/api/collection/${card.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setOwnedMap((prev) => new Map(prev).set(card.id, 1));
      adjustProgress(card.set_code, 1);
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

  // ── Derived ──────────────────────────────────────────────────────────────────
  const totalOwned = progress.reduce((sum, row) => sum + row.owned, 0);
  const totalCards = progress.reduce((sum, row) => sum + row.total, 0);

  return (
    <div>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-text-primary flex items-center gap-2">
            <Layers size={22} className="text-primary" />
            Mi colección
          </h1>
          <p className="text-sm text-text-secondary font-sans mt-1">
            Llevá el registro de qué cartas tenés y cuáles te faltan.
          </p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} asChild>
          <Link href={`/collection/add?game=${game}`}>Agregar a la colección</Link>
        </Button>
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

        {/* Progress summary — "Todos" + per-set rows, each selectable */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold font-sans text-text-primary">
              Progreso
            </p>
            {progressLoading && <Spinner size="xs" />}
          </div>

          {progress.length === 0 && !progressLoading ? (
            <p className="text-xs text-text-muted font-sans">Sin datos de sets para este juego todavía.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto flex flex-col gap-1 pr-1">
              {/* "Todos" row */}
              <button
                type="button"
                onClick={() => setSelectedSet("")}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors",
                  selectedSet === "" ? "bg-primary/5 border border-primary/20" : "border border-transparent hover:bg-secondary/50"
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-sans font-semibold text-text-primary">Todos</p>
                  {totalCards > 0 && (
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden mt-1">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-200"
                        style={{ width: `${Math.round((totalOwned / totalCards) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
                <span className="text-2xs font-sans text-text-muted whitespace-nowrap shrink-0">
                  {totalOwned}/{totalCards}
                </span>
              </button>

              {progress.map((row) => {
                const pct = row.total > 0 ? Math.round((row.owned / row.total) * 100) : 0;
                const isSelected = selectedSet === row.set_code;
                return (
                  <button
                    type="button"
                    key={row.set_code}
                    onClick={() => setSelectedSet(row.set_code)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors",
                      isSelected ? "bg-primary/5 border border-primary/20" : "border border-transparent hover:bg-secondary/50"
                    )}
                  >
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
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Filters + roster ─────────────────────────────────────────────── */}
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
              selectedSet={selectedSet}
              onSetChange={setSelectedSet}
              selectedRarities={filterRarities}
              onRaritiesChange={setFilterRarities}
              selectedColors={filterColors}
              onColorsChange={setFilterColors}
            />
          )}
        </aside>

        <div className="surface-raised p-6 flex-1 min-w-0">
          {loadError ? (
            <p className="text-sm text-error font-sans text-center py-8">{loadError}</p>
          ) : cardResults.length === 0 && !loadingResults ? (
            <p className="text-sm text-text-muted font-sans text-center py-8">
              Sin cartas para mostrar con estos filtros.
            </p>
          ) : (
            <>
              {resultsMeta && (
                <p className="text-xs text-text-muted font-sans mb-3">
                  {resultsMeta.total.toLocaleString()} carta{resultsMeta.total !== 1 ? "s" : ""}
                </p>
              )}

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {cardResults.map((card) => {
                  const owned = ownedMap.has(card.id);
                  return (
                    <CollectionCardTile
                      key={card.id}
                      card={card}
                      owned={owned}
                      quantity={ownedMap.get(card.id) ?? 1}
                      onToggle={owned ? () => removeFromCollection(card) : undefined}
                      onQuantityChange={(next) => updateQuantity(card.id, next)}
                    />
                  );
                })}
              </div>

              {loadingResults && cardResults.length === 0 && (
                <div className="flex justify-center py-8"><Spinner size="md" /></div>
              )}

              {resultsMeta && resultsMeta.page < resultsMeta.pages && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={loadingResults}
                    onClick={() => loadRoster((resultsMeta.page ?? 1) + 1)}
                  >
                    Cargar más
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
