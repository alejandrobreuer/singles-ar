"use client";

import * as React from "react";
import {
  FilterGroup, PillList, OptionList,
  POKEMON_RARITIES, sortAndLabelRarities,
} from "@/components/cards/FilterPrimitives";
import type { Game } from "@/types/database";

interface FilterOptions {
  sets:     { code: string; name: string }[];
  rarities: string[];
  colors:   string[];
}

interface SellFilterSidebarProps {
  game:             Game;
  filterOptions:    FilterOptions;
  selectedSet:      string;
  onSetChange:      (v: string) => void;
  selectedRarities: string[];
  onRaritiesChange: (v: string[]) => void;
  selectedColors:   string[];
  onColorsChange:   (v: string[]) => void;
}

export function SellFilterSidebar({
  game, filterOptions,
  selectedSet, onSetChange,
  selectedRarities, onRaritiesChange,
  selectedColors, onColorsChange,
}: SellFilterSidebarProps) {
  function toggle(list: string[], value: string, onChange: (v: string[]) => void) {
    onChange(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  return (
    <div className="surface-raised p-4 flex flex-col gap-5">
      <p className="text-sm font-semibold font-serif text-text-primary">
        Filtros
      </p>

      {filterOptions.sets.length > 0 && (
        <FilterGroup label="Set" collapsible defaultOpen={Boolean(selectedSet)}>
          <OptionList
            options={filterOptions.sets.map((s) => ({ value: s.code, label: `${s.code} ${s.name}` }))}
            selected={selectedSet}
            onSelect={(v) => onSetChange(v === selectedSet ? "" : v)}
            searchable
          />
        </FilterGroup>
      )}

      {(filterOptions.rarities.length > 0 || game === "pokemon") && (
        <FilterGroup label="Rareza">
          <PillList
            options={game === "pokemon" ? POKEMON_RARITIES : sortAndLabelRarities(filterOptions.rarities)}
            selected={selectedRarities}
            onSelect={(v) => toggle(selectedRarities, v, onRaritiesChange)}
          />
        </FilterGroup>
      )}

      {filterOptions.colors.length > 0 && (
        <FilterGroup label={game === "pokemon" ? "Tipos" : "Color"}>
          <PillList
            options={filterOptions.colors.filter((c) => c !== "Character").map((c) => ({ value: c, label: c }))}
            selected={selectedColors}
            onSelect={(v) => toggle(selectedColors, v, onColorsChange)}
            colorized
          />
        </FilterGroup>
      )}
    </div>
  );
}
