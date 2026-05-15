"use client";

import * as React from "react";
import { X, ChevronDown, ChevronUp, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useExploreNavigation } from "./ExploreTransitionProvider";

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

const RARITY_LABELS: Record<string, string> = {
  C:   "Common",
  UC:  "Uncommon",
  R:   "Rare",
  M:   "Mythic Rare",
  TR:  "Treasure Rare",
  PR:  "Promo",
  SR:  "Super Rare",
  SEC: "Secret Rare",
  L:   "Leader",
};

const RARITY_ORDER = ["C", "UC", "R", "M", "TR", "PR", "SR", "SEC", "L"];

const POKEMON_RARITIES: { value: string; label: string }[] = [
  { value: "Common",                    label: "Common"                    },
  { value: "Uncommon",                  label: "Uncommon"                  },
  { value: "Rare",                      label: "Rare"                      },
  { value: "Rare Holo",                 label: "Rare Holo"                 },
  { value: "Double Rare",               label: "Double Rare"               },
  { value: "Ultra Rare",                label: "Ultra Rare"                },
  { value: "Illustration Rare",         label: "Illustration Rare"         },
  { value: "Special Illustration Rare", label: "Special Illustration Rare" },
  { value: "Hyper Rare",                label: "Hyper Rare"                },
  { value: "Shiny Rare",                label: "Shiny Rare"                },
  { value: "Promo",                     label: "Promo"                     },
];

function sortAndLabelRarities(rarities: string[]): { value: string; label: string }[] {
  const known   = RARITY_ORDER.filter((r) => rarities.includes(r));
  const unknown = rarities.filter((r) => !RARITY_ORDER.includes(r)).sort();
  return [...known, ...unknown].map((r) => ({ value: r, label: RARITY_LABELS[r] ?? r }));
}

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

// ─── FilterGroup ──────────────────────────────────────────────────────────────

function FilterGroup({
  label, children, collapsible = false, defaultOpen = true,
}: {
  label: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div>
      <div
        role={collapsible ? "button" : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onClick={collapsible ? () => setOpen((v) => !v) : undefined}
        onKeyDown={collapsible ? (e) => { if (e.key === "Enter" || e.key === " ") setOpen((v) => !v); } : undefined}
        className={cn(
          "flex items-center justify-between font-semibold font-sans text-white uppercase tracking-widest mb-2 rounded-lg bg-primary transition-colors",
          collapsible
            ? "text-xs px-3 py-2.5 cursor-pointer select-none hover:bg-primary/80"
            : "text-xs px-2.5 py-1.5 justify-center rounded-md"
        )}
      >
        <span>{label}</span>
        {collapsible && (open
          ? <ChevronUp size={15} className="shrink-0 opacity-80" />
          : <ChevronDown size={15} className="shrink-0 opacity-80" />
        )}
      </div>
      {(!collapsible || open) && (
        collapsible ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 shadow-md p-2 mt-1">
            {children}
          </div>
        ) : children
      )}
    </div>
  );
}

// ─── Color map ────────────────────────────────────────────────────────────────

const COLOR_DOT: Record<string, string> = {
  // One Piece / Magic shared
  red:       "#dc2626",
  blue:      "#2563eb",
  green:     "#16a34a",
  yellow:    "#ca8a04",
  purple:    "#9333ea",
  black:     "#292524",
  white:     "#e7e5e4",
  // Magic extras
  colorless: "#a8a29e",
  // Pokémon types
  fire:      "#f97316",
  water:     "#0ea5e9",
  grass:     "#22c55e",
  lightning: "#eab308",
  psychic:   "#e879f9",
  fighting:  "#a16207",
  darkness:  "#374151",
  metal:     "#94a3b8",
  dragon:    "#7c3aed",
  fairy:     "#f472b6",
};

function colorDotFor(value: string): string | null {
  return COLOR_DOT[value.toLowerCase()] ?? null;
}

// ─── PillList ─────────────────────────────────────────────────────────────────

function PillList({
  options, selected, onSelect, colorized = false,
}: {
  options:    { value: string; label: string }[];
  selected:   string[];
  onSelect:   (v: string) => void;
  colorized?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5 px-0.5">
      {options.map((opt) => {
        const active  = selected.includes(opt.value);
        const dotColor = colorized ? colorDotFor(opt.value) : null;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={cn(
              "flex items-center justify-center gap-1 px-2 py-1 rounded-full text-2xs font-sans font-medium transition-all",
              active
                ? "bg-primary text-white"
                : "bg-background border border-border text-text-secondary hover:border-primary/40 hover:text-text-primary"
            )}
          >
            {dotColor && (
              <span
                className="shrink-0 size-2.5 rounded-full border border-black/10"
                style={{ backgroundColor: dotColor }}
              />
            )}
            <span className="truncate">{opt.label}</span>
          </button>
        );
      })}
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

      <div className={cn(
        "flex flex-col gap-0.5",
        searchable && "min-h-[200px] max-h-[260px] overflow-y-auto pr-0.5"
      )}>
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
      </div>

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
