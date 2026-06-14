"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { LocationPicker } from "@/components/ui/LocationPicker";
import type { LocationValue } from "@/types/database";

const EMPTY_LOCATION: LocationValue = { province_id: null, zone_id: null, area_id: null, store_id: null };
const MAX_LOCATIONS = 5;

interface LocationPickerListProps {
  value:    LocationValue[];
  onChange: (locations: LocationValue[]) => void;
}

// Lets a seller pick one or more delivery locations for a listing.
export function LocationPickerList({ value, onChange }: LocationPickerListProps) {
  const locations = value.length > 0 ? value : [EMPTY_LOCATION];

  function update(index: number, loc: LocationValue) {
    const next = [...locations];
    next[index] = loc;
    onChange(next);
  }

  function remove(index: number) {
    const next = locations.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [EMPTY_LOCATION]);
  }

  function add() {
    onChange([...locations, EMPTY_LOCATION]);
  }

  return (
    <div className="flex flex-col gap-2">
      {locations.map((loc, i) => (
        <div key={i} className="flex items-center gap-2">
          <LocationPicker mode="delivery" value={loc} onChange={(l) => update(i, l)} className="flex-1" />
          {locations.length > 1 && (
            <button
              type="button"
              onClick={() => remove(i)}
              className="shrink-0 text-text-muted hover:text-error transition-colors"
              aria-label="Quitar ubicación"
            >
              <X size={16} />
            </button>
          )}
        </div>
      ))}
      {locations.length < MAX_LOCATIONS && (
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-sans font-medium self-start transition-colors"
        >
          <Plus size={14} />
          Agregar otra ubicación
        </button>
      )}
    </div>
  );
}
