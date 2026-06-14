"use client";

import * as React from "react";
import { ChevronDown, ChevronLeft, X, Search, MapPin, Store as StoreIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LocationValue, LocationTree, Province, Zone } from "@/types/database";

interface LocationPickerProps {
  value:       LocationValue;
  onChange:    (location: LocationValue) => void;
  placeholder?: string;
  mode:        "delivery" | "filter";
  className?:  string;
}

type Step =
  | { level: "province" }
  | { level: "zone";  province: Province }
  | { level: "area";  province: Province; zone: Zone | null }
  | { level: "store"; province: Province; zone: Zone | null };

let cachedTree: LocationTree | null = null;
let cachedTreePromise: Promise<LocationTree> | null = null;

function fetchTree(): Promise<LocationTree> {
  if (cachedTree) return Promise.resolve(cachedTree);
  if (!cachedTreePromise) {
    cachedTreePromise = fetch("/api/locations")
      .then((res) => res.json())
      .then((json) => {
        const tree: LocationTree = json.data ?? { provinces: [], zones: [], areas: [], stores: [] };
        cachedTree = tree;
        return tree;
      });
  }
  return cachedTreePromise;
}

export function locationLabel(value: LocationValue, tree: LocationTree | null): string {
  if (!tree) return "";

  if (value.store_id) {
    const store = tree.stores.find((s) => s.id === value.store_id);
    return store ? `🏪 ${store.name}` : "";
  }

  const province = tree.provinces.find((p) => p.id === value.province_id);
  if (!province) return "";

  if (value.area_id) {
    const area = tree.areas.find((a) => a.id === value.area_id);
    return area ? `📍 ${area.name}, ${province.name}` : "";
  }

  if (value.zone_id) {
    const zone = tree.zones.find((z) => z.id === value.zone_id);
    return zone ? `📍 ${zone.name}, ${province.name}` : "";
  }

  return `📍 ${province.name}`;
}

export function LocationPicker({ value, onChange, placeholder = "¿Dónde podés entregar?", mode, className }: LocationPickerProps) {
  const [open, setOpen]   = React.useState(false);
  const [tree, setTree]   = React.useState<LocationTree | null>(null);
  const [step, setStep]   = React.useState<Step>({ level: "province" });
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    fetchTree().then(setTree);
  }, []);

  // Close on outside click
  React.useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Reset drill-down step and search whenever the panel closes
  React.useEffect(() => {
    if (!open) {
      setStep({ level: "province" });
      setSearch("");
    }
  }, [open]);

  const label = locationLabel(value, tree);

  function selectProvince(province: Province) {
    if (!tree) return;
    const zones = tree.zones.filter((z) => z.province_id === province.id);
    if (zones.length > 0) {
      setStep({ level: "zone", province });
      setSearch("");
      return;
    }
    const areas = tree.areas.filter((a) => a.province_id === province.id && !a.zone_id);
    const stores = tree.stores.filter((s) => s.province_id === province.id && !s.zone_id);
    if (areas.length > 0 || stores.length > 0) {
      setStep({ level: "area", province, zone: null });
      setSearch("");
      return;
    }
    onChange({ province_id: province.id, zone_id: null, area_id: null, store_id: null });
    setOpen(false);
  }

  function selectZone(zone: Zone, province: Province) {
    if (!tree) return;
    const areas = tree.areas.filter((a) => a.zone_id === zone.id);
    const stores = tree.stores.filter((s) => s.zone_id === zone.id);
    if (areas.length > 0 || stores.length > 0) {
      setStep({ level: "area", province, zone });
      setSearch("");
      return;
    }
    onChange({ province_id: province.id, zone_id: zone.id, area_id: null, store_id: null });
    setOpen(false);
  }

  function selectProvinceOnly(province: Province) {
    onChange({ province_id: province.id, zone_id: null, area_id: null, store_id: null });
    setOpen(false);
  }

  function selectZoneOnly(zone: Zone, province: Province) {
    onChange({ province_id: province.id, zone_id: zone.id, area_id: null, store_id: null });
    setOpen(false);
  }

  function selectArea(areaId: string, province: Province, zone: Zone | null) {
    onChange({ province_id: province.id, zone_id: zone?.id ?? null, area_id: areaId, store_id: null });
    setOpen(false);
  }

  function selectStore(storeId: string, province: Province, zone: Zone | null) {
    onChange({ province_id: province.id, zone_id: zone?.id ?? null, area_id: null, store_id: storeId });
    setOpen(false);
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange({ province_id: null, zone_id: null, area_id: null, store_id: null });
  }

  function back() {
    if (step.level === "zone") setStep({ level: "province" });
    else if (step.level === "area" || step.level === "store") {
      if (step.zone) setStep({ level: "zone", province: step.province });
      else setStep({ level: "province" });
    }
    setSearch("");
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-2 h-10 pl-3 pr-2.5 rounded-lg border border-border bg-surface",
          "font-sans text-sm transition-colors cursor-pointer select-none text-left",
          "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
          "hover:border-primary/30",
          label ? "text-text-primary" : "text-text-muted",
          open && "border-primary/50 ring-2 ring-primary/30",
        )}
      >
        <MapPin size={14} className="text-text-muted shrink-0" />
        <span className="flex-1 truncate">{label || placeholder}</span>

        {label && value.province_id ? (
          <span
            role="button"
            tabIndex={-1}
            onClick={clear}
            className="text-text-muted hover:text-text-primary transition-colors shrink-0"
            aria-label="Limpiar ubicación"
          >
            <X size={13} />
          </span>
        ) : (
          <ChevronDown size={14} className={cn("text-text-muted transition-transform shrink-0", open && "rotate-180")} />
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className={cn(
            "absolute top-full left-0 mt-1 z-40 w-full sm:w-[320px]",
            "bg-surface border border-border rounded-xl shadow-lg overflow-hidden",
          )}
        >
          {!tree ? (
            <p className="text-xs text-text-muted font-sans text-center py-6 px-3">Cargando…</p>
          ) : step.level === "province" ? (
            <ProvinceStep
              tree={tree}
              search={search}
              setSearch={setSearch}
              onSelect={selectProvince}
              mode={mode}
            />
          ) : step.level === "zone" ? (
            <ZoneStep
              tree={tree}
              province={step.province}
              onBack={back}
              onSelectZone={(z) => selectZone(z, step.province)}
              onSelectProvinceOnly={() => selectProvinceOnly(step.province)}
              onViewProvinceStores={() => { setStep({ level: "area", province: step.province, zone: null }); setSearch(""); }}
            />
          ) : (
            <AreaStep
              tree={tree}
              province={step.province}
              zone={step.zone}
              onBack={back}
              onSelectArea={(id) => selectArea(id, step.province, step.zone)}
              onSelectStore={(id) => selectStore(id, step.province, step.zone)}
              onSelectZoneOnly={step.zone ? () => selectZoneOnly(step.zone!, step.province) : undefined}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Step 1: Province ───────────────────────────────────────────────────────────

function ProvinceStep({
  tree, search, setSearch, onSelect, mode,
}: {
  tree:     LocationTree;
  search:   string;
  setSearch: (v: string) => void;
  onSelect: (province: Province) => void;
  mode:     "delivery" | "filter";
}) {
  const favorites = tree.provinces.filter((p) => p.is_favorite).sort((a, b) => a.display_order - b.display_order);

  const filtered = React.useMemo(() => {
    const all = [...tree.provinces].sort((a, b) => a.name.localeCompare(b.name));
    if (!search.trim()) return all;
    return all.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()));
  }, [tree.provinces, search]);

  return (
    <div>
      {/* Favorites row */}
      {favorites.length > 0 && !search.trim() && (
        <div className="flex flex-wrap gap-1.5 p-2 border-b border-border">
          {favorites.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-sans font-medium",
                "bg-primary/8 text-primary hover:bg-primary/15 transition-colors",
              )}
            >
              ★ {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={mode === "filter" ? "Buscar provincia…" : "Buscar provincia…"}
            className={cn(
              "w-full h-8 pl-7 pr-2 rounded-lg border border-border bg-background",
              "font-sans text-xs text-text-primary placeholder:text-text-muted",
              "focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/50",
            )}
          />
        </div>
      </div>

      {/* Province list */}
      <div className="max-h-60 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-text-muted font-sans text-center py-4 px-3">Sin resultados.</p>
        ) : (
          filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p)}
              className={cn(
                "flex w-full items-center justify-between px-3 py-2 text-left text-xs font-sans transition-colors",
                "text-text-secondary hover:bg-secondary/60 hover:text-text-primary",
              )}
            >
              {p.name}
              {p.is_favorite && <span className="text-accent text-2xs">★</span>}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Step 2: Zone ─────────────────────────────────────────────────────────────

function ZoneStep({
  tree, province, onBack, onSelectZone, onSelectProvinceOnly, onViewProvinceStores,
}: {
  tree: LocationTree;
  province: Province;
  onBack: () => void;
  onSelectZone: (zone: Zone) => void;
  onSelectProvinceOnly: () => void;
  onViewProvinceStores: () => void;
}) {
  const zones = tree.zones.filter((z) => z.province_id === province.id).sort((a, b) => a.name.localeCompare(b.name));
  const provinceStores = tree.stores.filter((s) => s.province_id === province.id && !s.zone_id);

  return (
    <div>
      <StepHeader title={province.name} onBack={onBack} />
      <div className="max-h-60 overflow-y-auto">
        <button
          type="button"
          onClick={onSelectProvinceOnly}
          className="flex w-full items-center px-3 py-2 text-left text-xs font-sans text-text-muted hover:bg-secondary/60 hover:text-text-primary transition-colors italic"
        >
          Usar solo &quot;{province.name}&quot;
        </button>
        {zones.map((z) => (
          <button
            key={z.id}
            type="button"
            onClick={() => onSelectZone(z)}
            className="flex w-full items-center px-3 py-2 text-left text-xs font-sans text-text-secondary hover:bg-secondary/60 hover:text-text-primary transition-colors"
          >
            {z.name}
          </button>
        ))}
        {provinceStores.length > 0 && (
          <button
            type="button"
            onClick={onViewProvinceStores}
            className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-xs font-sans text-primary hover:bg-primary/8 transition-colors font-medium"
          >
            <StoreIcon size={12} />
            Ver tiendas en {province.name}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Step 3: Area / Store ────────────────────────────────────────────────────

function AreaStep({
  tree, province, zone, onBack, onSelectArea, onSelectStore, onSelectZoneOnly,
}: {
  tree: LocationTree;
  province: Province;
  zone: Zone | null;
  onBack: () => void;
  onSelectArea: (id: string) => void;
  onSelectStore: (id: string) => void;
  onSelectZoneOnly?: () => void;
}) {
  const areas = (zone
    ? tree.areas.filter((a) => a.zone_id === zone.id)
    : tree.areas.filter((a) => a.province_id === province.id && !a.zone_id)
  ).sort((a, b) => a.name.localeCompare(b.name));

  const stores = (zone
    ? tree.stores.filter((s) => s.zone_id === zone.id)
    : tree.stores.filter((s) => s.province_id === province.id && !s.zone_id)
  ).sort((a, b) => a.name.localeCompare(b.name));

  const title = zone ? `${zone.name}, ${province.name}` : province.name;
  const [showStores, setShowStores] = React.useState(areas.length === 0 && stores.length > 0);

  return (
    <div>
      <StepHeader title={title} onBack={onBack} />
      <div className="max-h-60 overflow-y-auto">
        {onSelectZoneOnly && (
          <button
            type="button"
            onClick={onSelectZoneOnly}
            className="flex w-full items-center px-3 py-2 text-left text-xs font-sans text-text-muted hover:bg-secondary/60 hover:text-text-primary transition-colors italic"
          >
            Usar solo &quot;{zone!.name}&quot;
          </button>
        )}

        {!showStores ? (
          <>
            {areas.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onSelectArea(a.id)}
                className="flex w-full items-center px-3 py-2 text-left text-xs font-sans text-text-secondary hover:bg-secondary/60 hover:text-text-primary transition-colors"
              >
                {a.name}
              </button>
            ))}
            {stores.length > 0 && (
              <button
                type="button"
                onClick={() => setShowStores(true)}
                className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-xs font-sans text-primary hover:bg-primary/8 transition-colors font-medium"
              >
                <StoreIcon size={12} />
                Ver tiendas en {title}
              </button>
            )}
          </>
        ) : (
          <>
            {areas.length > 0 && (
              <button
                type="button"
                onClick={() => setShowStores(false)}
                className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-xs font-sans text-text-muted hover:bg-secondary/60 hover:text-text-primary transition-colors"
              >
                <ChevronLeft size={12} />
                Volver a barrios
              </button>
            )}
            {stores.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectStore(s.id)}
                className="flex w-full items-start gap-1.5 px-3 py-2 text-left text-xs font-sans text-text-secondary hover:bg-secondary/60 hover:text-text-primary transition-colors"
              >
                <StoreIcon size={12} className="mt-0.5 shrink-0 text-text-muted" />
                <span>
                  {s.name}
                  {s.is_verified && <span className="ml-1 text-accent text-2xs">✓</span>}
                  {s.address && <span className="block text-2xs text-text-muted">{s.address}</span>}
                </span>
              </button>
            ))}
          </>
        )}

        {areas.length === 0 && stores.length === 0 && (
          <p className="text-xs text-text-muted font-sans text-center py-4 px-3">Sin opciones disponibles.</p>
        )}
      </div>
    </div>
  );
}

function StepHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-2 border-b border-border">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center justify-center w-6 h-6 rounded-md text-text-muted hover:bg-secondary/60 hover:text-text-primary transition-colors"
        aria-label="Volver"
      >
        <ChevronLeft size={14} />
      </button>
      <span className="text-xs font-sans font-semibold text-text-primary truncate">{title}</span>
    </div>
  );
}
