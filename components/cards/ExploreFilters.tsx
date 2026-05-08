"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X, ChevronDown, ChevronUp, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FilterOptions {
  sets:     { code: string; name: string }[];
  rarities: string[];
  colors:   string[];
}

interface ExploreFiltersProps {
  currentGame:    string;
  currentSet:     string;
  currentRarity:  string;
  currentColor:   string;
  currentQ:       string;
  currentSort:    string;
  currentInStock: boolean;
  filterOptions:  FilterOptions | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GAME_OPTIONS = [
  { value: "",         label: "Todos los juegos", badge: null              },
  { value: "onepiece", label: "One Piece",         badge: "op"    as const },
  { value: "magic",    label: "Magic",             badge: "magic" as const },
  { value: "pokemon",  label: "Pokémon",           badge: "poke"  as const },
];

const SORT_OPTIONS = [
  { value: "recent",     label: "Más recientes"         },
  { value: "popular",    label: "Más populares"          },
  { value: "price_asc",  label: "Precio: menor a mayor" },
  { value: "price_desc", label: "Precio: mayor a menor" },
  { value: "name_asc",   label: "Nombre A-Z"            },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function ExploreFilters({
  currentGame, currentSet, currentRarity, currentColor, currentQ,
  currentSort, currentInStock, filterOptions,
}: ExploreFiltersProps) {
  const router = useRouter();

  function buildUrl(overrides: {
    game?:    string;
    set?:     string;
    rarity?:  string;
    color?:   string;
    q?:       string;
    sort?:    string;
    instock?: boolean;
  }) {
    const merged = {
      q:       overrides.q       ?? currentQ,
      game:    overrides.game    ?? currentGame,
      set:     overrides.set     !== undefined ? overrides.set    : currentSet,
      rarity:  overrides.rarity  !== undefined ? overrides.rarity : currentRarity,
      color:   overrides.color   !== undefined ? overrides.color  : currentColor,
      sort:    overrides.sort    !== undefined ? overrides.sort   : currentSort,
      instock: overrides.instock !== undefined ? overrides.instock : currentInStock,
    };
    const params = new URLSearchParams();
    if (merged.q)                                params.set("q",       merged.q);
    if (merged.game)                             params.set("game",    merged.game);
    if (merged.set)                              params.set("set",     merged.set);
    if (merged.rarity)                           params.set("rarity",  merged.rarity);
    if (merged.color)                            params.set("color",   merged.color);
    if (merged.sort && merged.sort !== "recent") params.set("sort",    merged.sort);
    if (merged.instock)                          params.set("instock", "1");
    return `/cards?${params.toString()}`;
  }

  function handleGameChange(game: string) {
    const params = new URLSearchParams();
    if (currentQ)                                params.set("q",       currentQ);
    if (game)                                    params.set("game",    game);
    if (currentSort && currentSort !== "recent") params.set("sort",    currentSort);
    if (currentInStock)                          params.set("instock", "1");
    router.push(`/cards?${params.toString()}`);
  }

  const activeSort    = currentSort || "recent";
  const hasAnyFilter  = Boolean(
    currentGame || currentSet || currentRarity || currentColor || currentQ ||
    (activeSort !== "recent") || currentInStock
  );

  return (
    <div className="flex flex-col gap-5">

      {/* ── Ordenar ─────────────────────────────────────────────────── */}
      <FilterGroup label="Ordenar">
        {SORT_OPTIONS.map((opt) => {
          const active = activeSort === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => router.push(buildUrl({ sort: opt.value }))}
              className={cn(
                "flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-xs font-sans transition-all text-left",
                active
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-text-secondary hover:bg-secondary"
              )}
            >
              <span className="truncate">{opt.label}</span>
              {active && <span className="size-1.5 rounded-full bg-primary shrink-0" />}
            </button>
          );
        })}
      </FilterGroup>

      {/* ── Disponibilidad ──────────────────────────────────────────── */}
      <FilterGroup label="Disponibilidad">
        <button
          type="button"
          onClick={() => router.push(buildUrl({ instock: !currentInStock }))}
          className={cn(
            "flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-sans transition-all text-left",
            currentInStock
              ? "bg-primary/10 text-primary font-semibold"
              : "text-text-secondary hover:bg-secondary hover:text-text-primary"
          )}
        >
          <span>Solo con stock</span>
          <div className={cn(
            "w-8 h-4 rounded-full transition-colors relative shrink-0",
            currentInStock ? "bg-primary" : "bg-border"
          )}>
            <div className={cn(
              "absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform",
              currentInStock ? "translate-x-4" : "translate-x-0.5"
            )} />
          </div>
        </button>
      </FilterGroup>

      {/* ── Juego ──────────────────────────────────────────────────── */}
      <FilterGroup label="Juego">
        {GAME_OPTIONS.map((opt) => {
          const active = currentGame === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleGameChange(opt.value)}
              className={cn(
                "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-sans transition-all text-left",
                active
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-text-secondary hover:bg-secondary hover:text-text-primary"
              )}
            >
              {opt.badge
                ? <Badge variant={opt.badge} size="sm" className="shrink-0 pointer-events-none" />
                : <span className="w-[34px] shrink-0" />
              }
              <span className="flex-1 truncate">{opt.label}</span>
              {active && <span className="size-1.5 rounded-full bg-primary shrink-0" />}
            </button>
          );
        })}
      </FilterGroup>

      {/* ── Sub-filters (only when game selected and options loaded) ─ */}
      {currentGame && filterOptions && (
        <>
          {filterOptions.sets.length > 0 && (
            <FilterGroup label="Set">
              <OptionList
                options={filterOptions.sets.map((s) => ({ value: s.code, label: `${s.code} ${s.name}` }))}
                selected={currentSet}
                onSelect={(v) => router.push(buildUrl({ set: v === currentSet ? "" : v }))}
                searchable
              />
            </FilterGroup>
          )}

          {filterOptions.rarities.length > 0 && (
            <FilterGroup label="Rareza">
              <OptionList
                options={filterOptions.rarities.map((r) => ({ value: r, label: r }))}
                selected={currentRarity}
                onSelect={(v) => router.push(buildUrl({ rarity: v === currentRarity ? "" : v }))}
              />
            </FilterGroup>
          )}

          {filterOptions.colors.length > 0 && currentGame !== "pokemon" && (
            <FilterGroup label="Color">
              <OptionList
                options={filterOptions.colors.map((c) => ({ value: c, label: c }))}
                selected={currentColor}
                onSelect={(v) => router.push(buildUrl({ color: v === currentColor ? "" : v }))}
              />
            </FilterGroup>
          )}

          {filterOptions.colors.length > 0 && currentGame === "pokemon" && (
            <FilterGroup label="Tipos">
              <OptionList
                options={filterOptions.colors.map((c) => ({ value: c, label: c }))}
                selected={currentColor}
                onSelect={(v) => router.push(buildUrl({ color: v === currentColor ? "" : v }))}
              />
            </FilterGroup>
          )}
        </>
      )}

      {/* ── Clear all ──────────────────────────────────────────────── */}
      {hasAnyFilter && (
        <button
          type="button"
          onClick={() => router.push("/cards")}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-error font-sans transition-colors mt-1"
        >
          <X size={12} />
          Limpiar filtros
        </button>
      )}
    </div>
  );
}

// ─── FilterGroup ──────────────────────────────────────────────────────────────

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-2xs font-semibold font-sans text-white uppercase tracking-widest mb-2 px-2.5 py-1 rounded-md bg-primary">
        {label}
      </p>
      {children}
    </div>
  );
}

// ─── OptionList ───────────────────────────────────────────────────────────────

function OptionList({
  options, selected, onSelect, searchable = false,
}: {
  options:    { value: string; label: string }[];
  selected:   string;
  onSelect:   (v: string) => void;
  searchable?: boolean;
}) {
  const SHOW_ALL_THRESHOLD = 8;
  const [expanded, setExpanded] = React.useState(false);
  const [query,    setQuery]    = React.useState("");

  // When searchable: filter by query; otherwise use expand/collapse
  const filtered = searchable && query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const visible  = searchable ? filtered : (expanded ? filtered : filtered.slice(0, SHOW_ALL_THRESHOLD));
  const hasMore  = !searchable && filtered.length > SHOW_ALL_THRESHOLD;

  // Reset expand state when query changes
  React.useEffect(() => { setExpanded(false); }, [query]);

  return (
    <div className="flex flex-col gap-0.5">
      {searchable && (
        <div className="relative mb-1">
          <Search
            size={11}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar set…"
            className={cn(
              "w-full h-7 pl-7 pr-7 rounded-lg border border-border bg-background",
              "font-sans text-xs text-text-primary placeholder:text-text-muted",
              "focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/50",
              "transition-colors",
            )}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={11} />
            </button>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="text-xs text-text-muted font-sans px-3 py-2">Sin resultados.</p>
      ) : (
        visible.map((opt) => {
          const active = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              className={cn(
                "flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-xs font-sans transition-all text-left",
                active
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-text-secondary hover:bg-secondary"
              )}
            >
              <span className="truncate">{opt.label}</span>
              {active && <X size={10} className="shrink-0 ml-1.5 opacity-60" />}
            </button>
          );
        })
      )}

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 px-3 py-1 text-2xs text-text-muted hover:text-primary font-sans transition-colors mt-0.5"
        >
          {expanded
            ? <><ChevronUp size={11} /> Mostrar menos</>
            : <><ChevronDown size={11} /> Ver {filtered.length - SHOW_ALL_THRESHOLD} más</>
          }
        </button>
      )}
    </div>
  );
}
