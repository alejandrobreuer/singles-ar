"use client";

import * as React from "react";
import { X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useExploreNavigation } from "./ExploreTransitionProvider";
import {
  FilterGroup, PillList, OptionList,
  POKEMON_RARITIES, sortAndLabelRarities,
} from "./FilterPrimitives";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FilterOptions {
  sets:     { code: string; name: string }[];
  rarities: string[];
  colors:   string[];
}

interface ExploreFiltersProps {
  currentGame:     string;
  currentSet:      string;
  currentRarities: string[];
  currentColors:   string[];
  currentQ:        string;
  currentSort:     string;
  currentInStock:  boolean;
  filterOptions:   FilterOptions | null;
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
  currentGame, currentSet, currentRarities, currentColors, currentQ,
  currentSort, currentInStock, filterOptions,
}: ExploreFiltersProps) {
  const { navigate } = useExploreNavigation();

  // All staged — only applied when the user clicks "Buscar"
  const [pendingSort,     setPendingSort]     = React.useState(currentSort || "recent");
  const [pendingInStock,  setPendingInStock]  = React.useState(currentInStock);
  const [pendingSet,      setPendingSet]      = React.useState(currentSet);
  const [pendingRarities, setPendingRarities] = React.useState<string[]>(currentRarities);
  const [pendingColors,   setPendingColors]   = React.useState<string[]>(currentColors);

  // Stable string keys for array deps — avoids referential instability on every render
  const currentRaritiesKey = currentRarities.join(",");
  const currentColorsKey   = currentColors.join(",");

  // Sync pending state when URL params change (e.g. after game switch or external navigation)
  React.useEffect(() => { setPendingSort(currentSort || "recent"); }, [currentSort]);
  React.useEffect(() => { setPendingInStock(currentInStock);       }, [currentInStock]);
  React.useEffect(() => { setPendingSet(currentSet);               }, [currentSet]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { setPendingRarities(currentRarities);     }, [currentRaritiesKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => { setPendingColors(currentColors);         }, [currentColorsKey]);

  const hasPendingChanges =
    pendingSort    !== (currentSort || "recent")          ||
    pendingInStock !== currentInStock                     ||
    pendingSet     !== currentSet                         ||
    pendingRarities.join(",") !== currentRarities.join(",") ||
    pendingColors.join(",")   !== currentColors.join(",");

  function buildUrl() {
    const params = new URLSearchParams();
    if (currentQ)                                    params.set("q",       currentQ);
    if (currentGame)                                 params.set("game",    currentGame);
    if (pendingSet)                                  params.set("set",     pendingSet);
    if (pendingRarities.length)                      params.set("rarity",  pendingRarities.join(","));
    if (pendingColors.length)                        params.set("color",   pendingColors.join(","));
    if (pendingSort && pendingSort !== "recent")     params.set("sort",    pendingSort);
    if (!pendingInStock)                             params.set("instock", "0");
    return `/cards?${params.toString()}`;
  }

  // Game is still applied immediately — it controls which sub-filter options load
  function handleGameChange(game: string) {
    setPendingSet("");
    setPendingRarities([]);
    setPendingColors([]);
    const params = new URLSearchParams();
    if (currentQ)                                params.set("q",    currentQ);
    if (game)                                    params.set("game", game);
    if (pendingSort && pendingSort !== "recent") params.set("sort", pendingSort);
    if (!pendingInStock)                         params.set("instock", "0");
    navigate(`/cards?${params.toString()}`);
  }

  // A filter is "active" when it deviates from its default value
  const hasAnyFilter = Boolean(
    currentGame || currentSet || currentRarities.length || currentColors.length || currentQ ||
    (currentSort && currentSort !== "recent") || !currentInStock
  );

  return (
    <div className="flex flex-col gap-5">

      {/* ── Ordenar ─────────────────────────────────────────────────── */}
      <FilterGroup label="Ordenar">
        {SORT_OPTIONS.map((opt) => {
          const active = pendingSort === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPendingSort(opt.value)}
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
          onClick={() => setPendingInStock((v) => !v)}
          className={cn(
            "flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-sans transition-all text-left",
            pendingInStock
              ? "bg-primary/10 text-primary font-semibold"
              : "text-text-secondary hover:bg-secondary hover:text-text-primary"
          )}
        >
          <span>Solo con stock</span>
          <div className={cn(
            "w-8 h-4 rounded-full transition-colors relative shrink-0",
            pendingInStock ? "bg-primary" : "bg-border"
          )}>
            <div className={cn(
              "absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform",
              pendingInStock ? "translate-x-4" : "translate-x-0.5"
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
            <FilterGroup label="Set" collapsible defaultOpen={Boolean(currentSet)}>
              <OptionList
                options={filterOptions.sets.map((s) => ({ value: s.code, label: `${s.code} ${s.name}` }))}
                selected={pendingSet}
                onSelect={(v) => setPendingSet(v === pendingSet ? "" : v)}
                searchable
              />
            </FilterGroup>
          )}

          {(filterOptions.rarities.length > 0 || currentGame === "pokemon") && (
            <FilterGroup label="Rareza">
              <PillList
                options={currentGame === "pokemon" ? POKEMON_RARITIES : sortAndLabelRarities(filterOptions.rarities)}
                selected={pendingRarities}
                onSelect={(v) => {
                  setPendingRarities((prev) =>
                    prev.includes(v) ? prev.filter((r) => r !== v) : [...prev, v]
                  );
                }}
              />
            </FilterGroup>
          )}

          {filterOptions.colors.length > 0 && (
            <FilterGroup label={currentGame === "pokemon" ? "Tipos" : "Color"}>
              <PillList
                options={filterOptions.colors.filter((c) => c !== "Character").map((c) => ({ value: c, label: c }))}
                selected={pendingColors}
                onSelect={(v) => {
                  setPendingColors((prev) =>
                    prev.includes(v) ? prev.filter((c) => c !== v) : [...prev, v]
                  );
                }}
                colorized
              />
            </FilterGroup>
          )}
        </>
      )}

      {/* ── Buscar — always visible ───────────────────────────────── */}
      <button
        type="button"
        onClick={() => navigate(buildUrl())}
        className={cn(
          "flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-sans font-semibold transition-all",
          hasPendingChanges
            ? "bg-primary text-white hover:bg-primary/90 shadow-sm"
            : "bg-primary/10 text-primary hover:bg-primary/20"
        )}
      >
        <Search size={14} />
        Buscar
      </button>

      {/* ── Clear all ──────────────────────────────────────────────── */}
      {hasAnyFilter && (
        <button
          type="button"
          onClick={() => navigate("/cards")}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-error font-sans transition-colors mt-1"
        >
          <X size={12} />
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
