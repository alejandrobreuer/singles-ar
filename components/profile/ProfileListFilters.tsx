"use client";

import * as React from "react";
import { Search, SlidersHorizontal, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  PillList, OptionList,
  POKEMON_RARITIES, sortAndLabelRarities,
} from "@/components/cards/FilterPrimitives";
import type { Game } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CardFilterFields {
  game:     Game;
  set_code: string | null;
  set_name: string | null;
  rarity:   string | null;
  color:    string | null;
}

const GAME_VARIANT: Record<Game, React.ComponentProps<typeof Badge>["variant"]> = {
  magic:    "magic",
  pokemon:  "poke",
  onepiece: "op",
  dbz:      "dbz",
};

const GAME_LABEL: Record<Game, string> = {
  magic:    "Magic",
  pokemon:  "Pokémon",
  onepiece: "One Piece",
  dbz:      "Dragon Ball",
};

function toggle<T>(list: T[], value: T, onChange: (v: T[]) => void) {
  onChange(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCardListFilters<T>(
  items:   T[],
  getCard: (item: T) => CardFilterFields | null,
  getName: (item: T) => string,
) {
  const [search,   setSearch]   = React.useState("");
  const [games,    setGames]    = React.useState<Game[]>([]);
  const [sets,     setSets]     = React.useState<string[]>([]);
  const [rarities, setRarities] = React.useState<string[]>([]);
  const [colors,   setColors]   = React.useState<string[]>([]);

  // Sub-filter options are scoped to the currently selected game(s)
  const scoped = React.useMemo(
    () => games.length
      ? items.filter((item) => { const c = getCard(item); return c && games.includes(c.game); })
      : items,
    [items, games, getCard],
  );

  const options = React.useMemo(() => {
    const gameSet   = new Set<Game>();
    const setMap    = new Map<string, string>();
    const raritySet = new Set<string>();
    const colorSet  = new Set<string>();

    for (const item of items) {
      const card = getCard(item);
      if (card) gameSet.add(card.game);
    }
    for (const item of scoped) {
      const card = getCard(item);
      if (!card) continue;
      if (card.set_code) setMap.set(card.set_code, card.set_name ?? card.set_code);
      if (card.rarity)   raritySet.add(card.rarity);
      if (card.color) {
        card.color.split(/[\s,/]+/).filter(Boolean).forEach((c) => colorSet.add(c));
      }
    }

    return {
      games:    Array.from(gameSet),
      sets:     Array.from(setMap.entries()).map(([code, name]) => ({ code, name })).sort((a, b) => a.code.localeCompare(b.code)),
      rarities: Array.from(raritySet),
      colors:   Array.from(colorSet).sort(),
    };
  }, [items, scoped, getCard]);

  const filtered = React.useMemo(() => items.filter((item) => {
    if (search.trim() && !getName(item).toLowerCase().includes(search.trim().toLowerCase())) return false;

    const card = getCard(item);
    if (games.length || sets.length || rarities.length || colors.length) {
      if (!card) return false;
      if (games.length    && !games.includes(card.game)) return false;
      if (sets.length     && !(card.set_code && sets.includes(card.set_code))) return false;
      if (rarities.length && !(card.rarity   && rarities.includes(card.rarity))) return false;
      if (colors.length) {
        const cardColors = (card.color ?? "").split(/[\s,/]+/).filter(Boolean);
        if (!colors.some((c) => cardColors.includes(c))) return false;
      }
    }
    return true;
  }), [items, search, games, sets, rarities, colors, getCard, getName]);

  const hasAnyFilter = Boolean(search || games.length || sets.length || rarities.length || colors.length);

  function clear() {
    setSearch("");
    setGames([]);
    setSets([]);
    setRarities([]);
    setColors([]);
  }

  return {
    search, setSearch,
    games, setGames,
    sets, setSets,
    rarities, setRarities,
    colors, setColors,
    options, filtered, hasAnyFilter, clear,
  };
}

export type CardListFilters<T> = ReturnType<typeof useCardListFilters<T>>;

// ─── Filter bar ───────────────────────────────────────────────────────────────

export function ProfileListFilters<T>({
  filters, searchPlaceholder = "Buscar por nombre…",
}: {
  filters: CardListFilters<T>;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = React.useState(false);

  const {
    search, setSearch,
    games, setGames,
    sets, setSets,
    rarities, setRarities,
    colors, setColors,
    options, hasAnyFilter, clear,
  } = filters;

  const activeSubFilterCount = games.length + sets.length + rarities.length + colors.length;

  return (
    <div className="px-4 pt-3 flex flex-col gap-2.5">
      {/* Search box */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className={cn(
              "w-full h-9 pl-9 pr-8 rounded-lg border border-border bg-background",
              "font-sans text-sm text-text-primary placeholder:text-text-muted",
              "focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/50",
              "transition-colors",
            )}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-sans font-medium transition-colors shrink-0",
            open || activeSubFilterCount
              ? "bg-primary/10 text-primary"
              : "border border-border text-text-secondary hover:border-primary/40 hover:text-text-primary"
          )}
        >
          <SlidersHorizontal size={14} />
          Filtros
          {activeSubFilterCount > 0 && (
            <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-2xs font-semibold">
              {activeSubFilterCount}
            </span>
          )}
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        {hasAnyFilter && (
          <button
            type="button"
            onClick={clear}
            className="flex items-center gap-1 px-2.5 h-9 rounded-lg text-sm font-sans text-text-muted hover:text-error transition-colors shrink-0"
            title="Limpiar filtros"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Expandable sub-filters */}
      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 rounded-lg border border-border bg-secondary/30">
          {/* Juego */}
          {options.games.length > 1 && (
            <div>
              <p className="text-2xs font-semibold font-sans text-text-muted uppercase tracking-wide mb-1.5">Juego</p>
              <div className="flex flex-wrap gap-1.5">
                {options.games.map((g) => {
                  const active = games.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggle(games, g, setGames)}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-full text-2xs font-sans font-medium transition-all",
                        active
                          ? "bg-primary text-white"
                          : "bg-background border border-border text-text-secondary hover:border-primary/40 hover:text-text-primary"
                      )}
                    >
                      <Badge variant={GAME_VARIANT[g]} size="sm" className="pointer-events-none" />
                      {GAME_LABEL[g]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Set */}
          {options.sets.length > 0 && (
            <div>
              <p className="text-2xs font-semibold font-sans text-text-muted uppercase tracking-wide mb-1.5">Set</p>
              <OptionList
                options={options.sets.map((s) => ({ value: s.code, label: `${s.code} ${s.name}` }))}
                selected={sets[0] ?? ""}
                onSelect={(v) => setSets(v === sets[0] ? [] : [v])}
                searchable
              />
            </div>
          )}

          {/* Rareza */}
          {options.rarities.length > 0 && (
            <div>
              <p className="text-2xs font-semibold font-sans text-text-muted uppercase tracking-wide mb-1.5">Rareza</p>
              <PillList
                options={
                  games.length === 1 && games[0] === "pokemon"
                    ? POKEMON_RARITIES.filter((r) => options.rarities.includes(r.value))
                    : sortAndLabelRarities(options.rarities)
                }
                selected={rarities}
                onSelect={(v) => toggle(rarities, v, setRarities)}
              />
            </div>
          )}

          {/* Color / Tipos */}
          {options.colors.length > 0 && (
            <div>
              <p className="text-2xs font-semibold font-sans text-text-muted uppercase tracking-wide mb-1.5">
                {games.length === 1 && games[0] === "pokemon" ? "Tipos" : "Color"}
              </p>
              <PillList
                options={options.colors.filter((c) => c !== "Character").map((c) => ({ value: c, label: c }))}
                selected={colors}
                onSelect={(v) => toggle(colors, v, setColors)}
                colorized
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
