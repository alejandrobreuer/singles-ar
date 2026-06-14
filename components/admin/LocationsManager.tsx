"use client";

import * as React from "react";
import { Plus, Trash2, Star, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LocationTree, Province, Zone, Area, Store } from "@/types/database";

const TABS = [
  { value: "provinces", label: "Provincias" },
  { value: "zones",     label: "Zonas" },
  { value: "areas",     label: "Áreas" },
  { value: "stores",    label: "Tiendas" },
] as const;

type Tab = typeof TABS[number]["value"];

export function LocationsManager({ initialTree }: { initialTree: LocationTree }) {
  const [tree, setTree] = React.useState(initialTree);
  const [tab,  setTab]  = React.useState<Tab>("provinces");
  const [error, setError] = React.useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/admin/locations");
    const json = await res.json();
    if (res.ok) setTree(json.data);
  }

  async function create(payload: Record<string, unknown>) {
    setError(null);
    const res = await fetch("/api/admin/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Error al crear."); return false; }
    await refresh();
    return true;
  }

  async function update(type: string, id: string, payload: Record<string, unknown>) {
    setError(null);
    const res = await fetch(`/api/admin/locations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ...payload }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Error al actualizar."); return false; }
    await refresh();
    return true;
  }

  async function remove(type: string, id: string, label: string) {
    if (!confirm(`¿Eliminar "${label}"?`)) return;
    setError(null);
    const res = await fetch(`/api/admin/locations/${id}?type=${type}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setError(json.error ?? "Error al eliminar."); return; }
    await refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              "px-3 py-2 text-sm font-sans font-medium transition-colors border-b-2 -mb-px",
              tab === t.value
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text-primary"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-error font-sans">{error}</p>}

      {tab === "provinces" && <ProvincesTab tree={tree} create={create} update={update} />}
      {tab === "zones"     && <ZonesTab     tree={tree} create={create} remove={remove} />}
      {tab === "areas"     && <AreasTab     tree={tree} create={create} remove={remove} />}
      {tab === "stores"    && <StoresTab    tree={tree} create={create} update={update} remove={remove} />}
    </div>
  );
}

// ─── Shared bits ──────────────────────────────────────────────────────────────

function AddBar({ children, onAdd, disabled }: { children: React.ReactNode; onAdd: () => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap items-end gap-2 p-3 rounded-lg border border-border bg-secondary/30">
      {children}
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium font-sans hover:bg-primary/90 disabled:opacity-50 transition-colors h-9"
      >
        <Plus size={14} />
        Agregar
      </button>
    </div>
  );
}

const inputClass = "rounded-lg border border-border bg-surface px-3 h-9 text-sm font-sans text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";

// ─── Provincias ───────────────────────────────────────────────────────────────

function ProvincesTab({
  tree, create, update,
}: {
  tree: LocationTree;
  create: (p: Record<string, unknown>) => Promise<boolean>;
  update: (type: string, id: string, p: Record<string, unknown>) => Promise<boolean>;
}) {
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");

  async function handleAdd() {
    if (!name.trim() || !code.trim()) return;
    const ok = await create({ type: "province", name: name.trim(), code: code.trim().toUpperCase() });
    if (ok) { setName(""); setCode(""); }
  }

  const provinces = [...tree.provinces].sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="flex flex-col gap-3">
      <AddBar onAdd={handleAdd} disabled={!name.trim() || !code.trim()}>
        <input className={cn(inputClass, "flex-1 min-w-[160px]")} placeholder="Nombre (ej: Mendoza)" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={cn(inputClass, "w-28")} placeholder="Código (ej: MEN)" value={code} onChange={(e) => setCode(e.target.value)} maxLength={10} />
      </AddBar>

      <div className="flex flex-col gap-1.5">
        {provinces.map((p: Province) => (
          <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-surface">
            <button
              type="button"
              onClick={() => update("province", p.id, { is_favorite: !p.is_favorite })}
              className="shrink-0 text-text-muted hover:text-accent transition-colors"
              title={p.is_favorite ? "Quitar de favoritos" : "Marcar como favorita"}
            >
              <Star size={15} className={p.is_favorite ? "fill-accent text-accent" : ""} />
            </button>
            <span className="flex-1 text-sm font-sans text-text-primary">{p.name}</span>
            <span className="text-xs text-text-muted font-sans">{p.code}</span>
            <span className="text-2xs text-text-muted font-sans w-8 text-right">#{p.display_order}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Zonas ────────────────────────────────────────────────────────────────────

function ZonesTab({
  tree, create, remove,
}: {
  tree: LocationTree;
  create: (p: Record<string, unknown>) => Promise<boolean>;
  remove: (type: string, id: string, label: string) => Promise<void>;
}) {
  const [provinceId, setProvinceId] = React.useState("");
  const [name, setName] = React.useState("");

  const provinces = [...tree.provinces].sort((a, b) => a.name.localeCompare(b.name));
  const provinceName = (id: string) => tree.provinces.find((p) => p.id === id)?.name ?? "";

  async function handleAdd() {
    if (!provinceId || !name.trim()) return;
    const ok = await create({ type: "zone", province_id: provinceId, name: name.trim() });
    if (ok) setName("");
  }

  const zones = [...tree.zones].sort((a, b) => provinceName(a.province_id).localeCompare(provinceName(b.province_id)) || a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-3">
      <AddBar onAdd={handleAdd} disabled={!provinceId || !name.trim()}>
        <select className={cn(inputClass, "w-48")} value={provinceId} onChange={(e) => setProvinceId(e.target.value)}>
          <option value="">Provincia…</option>
          {provinces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input className={cn(inputClass, "flex-1 min-w-[160px]")} placeholder="Nombre de la zona" value={name} onChange={(e) => setName(e.target.value)} />
      </AddBar>

      <div className="flex flex-col gap-1.5">
        {zones.map((z: Zone) => (
          <div key={z.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-surface">
            <span className="flex-1 text-sm font-sans text-text-primary">{z.name}</span>
            <span className="text-xs text-text-muted font-sans">{provinceName(z.province_id)}</span>
            <button
              type="button"
              onClick={() => remove("zone", z.id, z.name)}
              className="shrink-0 text-text-muted hover:text-error transition-colors"
              title="Eliminar"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Áreas ────────────────────────────────────────────────────────────────────

function AreasTab({
  tree, create, remove,
}: {
  tree: LocationTree;
  create: (p: Record<string, unknown>) => Promise<boolean>;
  remove: (type: string, id: string, label: string) => Promise<void>;
}) {
  const [provinceId, setProvinceId] = React.useState("");
  const [zoneId, setZoneId] = React.useState("");
  const [name, setName] = React.useState("");

  const provinces = [...tree.provinces].sort((a, b) => a.name.localeCompare(b.name));
  const provinceName = (id: string) => tree.provinces.find((p) => p.id === id)?.name ?? "";
  const zoneName = (id: string | null) => id ? (tree.zones.find((z) => z.id === id)?.name ?? "") : null;
  const zonesForProvince = tree.zones.filter((z) => z.province_id === provinceId).sort((a, b) => a.name.localeCompare(b.name));

  async function handleAdd() {
    if (!provinceId || !name.trim()) return;
    const ok = await create({ type: "area", province_id: provinceId, zone_id: zoneId || null, name: name.trim() });
    if (ok) setName("");
  }

  const areas = [...tree.areas].sort((a, b) => provinceName(a.province_id).localeCompare(provinceName(b.province_id)) || a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-3">
      <AddBar onAdd={handleAdd} disabled={!provinceId || !name.trim()}>
        <select className={cn(inputClass, "w-48")} value={provinceId} onChange={(e) => { setProvinceId(e.target.value); setZoneId(""); }}>
          <option value="">Provincia…</option>
          {provinces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className={cn(inputClass, "w-48")} value={zoneId} onChange={(e) => setZoneId(e.target.value)} disabled={!provinceId}>
          <option value="">Sin zona</option>
          {zonesForProvince.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
        <input className={cn(inputClass, "flex-1 min-w-[160px]")} placeholder="Nombre del barrio/localidad" value={name} onChange={(e) => setName(e.target.value)} />
      </AddBar>

      <div className="flex flex-col gap-1.5">
        {areas.map((a: Area) => (
          <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-surface">
            <span className="flex-1 text-sm font-sans text-text-primary">{a.name}</span>
            <span className="text-xs text-text-muted font-sans">
              {zoneName(a.zone_id) ? `${zoneName(a.zone_id)}, ` : ""}{provinceName(a.province_id)}
            </span>
            <button
              type="button"
              onClick={() => remove("area", a.id, a.name)}
              className="shrink-0 text-text-muted hover:text-error transition-colors"
              title="Eliminar"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tiendas ──────────────────────────────────────────────────────────────────

function StoresTab({
  tree, create, update, remove,
}: {
  tree: LocationTree;
  create: (p: Record<string, unknown>) => Promise<boolean>;
  update: (type: string, id: string, p: Record<string, unknown>) => Promise<boolean>;
  remove: (type: string, id: string, label: string) => Promise<void>;
}) {
  const [provinceId, setProvinceId] = React.useState("");
  const [zoneId, setZoneId] = React.useState("");
  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");

  const provinces = [...tree.provinces].sort((a, b) => a.name.localeCompare(b.name));
  const provinceName = (id: string) => tree.provinces.find((p) => p.id === id)?.name ?? "";
  const zoneName = (id: string | null) => id ? (tree.zones.find((z) => z.id === id)?.name ?? "") : null;
  const zonesForProvince = tree.zones.filter((z) => z.province_id === provinceId).sort((a, b) => a.name.localeCompare(b.name));

  async function handleAdd() {
    if (!provinceId || !name.trim()) return;
    const ok = await create({
      type: "store",
      province_id: provinceId,
      zone_id: zoneId || null,
      name: name.trim(),
      address: address.trim() || null,
    });
    if (ok) { setName(""); setAddress(""); }
  }

  const stores = [...tree.stores].sort((a, b) => provinceName(a.province_id).localeCompare(provinceName(b.province_id)) || a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-3">
      <AddBar onAdd={handleAdd} disabled={!provinceId || !name.trim()}>
        <select className={cn(inputClass, "w-40")} value={provinceId} onChange={(e) => { setProvinceId(e.target.value); setZoneId(""); }}>
          <option value="">Provincia…</option>
          {provinces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className={cn(inputClass, "w-40")} value={zoneId} onChange={(e) => setZoneId(e.target.value)} disabled={!provinceId}>
          <option value="">Sin zona</option>
          {zonesForProvince.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
        <input className={cn(inputClass, "flex-1 min-w-[140px]")} placeholder="Nombre de la tienda" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={cn(inputClass, "flex-1 min-w-[140px]")} placeholder="Dirección (opcional)" value={address} onChange={(e) => setAddress(e.target.value)} />
      </AddBar>

      <div className="flex flex-col gap-1.5">
        {stores.map((s: Store) => (
          <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-surface">
            <button
              type="button"
              onClick={() => update("store", s.id, { is_verified: !s.is_verified })}
              className="shrink-0 text-text-muted hover:text-success transition-colors"
              title={s.is_verified ? "Marcar como no verificada" : "Marcar como verificada"}
            >
              {s.is_verified ? <CheckCircle2 size={15} className="text-success" /> : <Circle size={15} />}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-sans text-text-primary truncate">{s.name}</p>
              {s.address && <p className="text-2xs text-text-muted font-sans truncate">{s.address}</p>}
            </div>
            <span className="text-xs text-text-muted font-sans shrink-0">
              {zoneName(s.zone_id) ? `${zoneName(s.zone_id)}, ` : ""}{provinceName(s.province_id)}
            </span>
            <button
              type="button"
              onClick={() => remove("store", s.id, s.name)}
              className="shrink-0 text-text-muted hover:text-error transition-colors"
              title="Eliminar"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
