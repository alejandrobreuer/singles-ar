"use client";

import * as React from "react";
import { Plus, Trash2, GripVertical, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface Store {
  id:         string;
  name:       string;
  is_active:  boolean;
  sort_order: number;
}

export function DeliveryStoresManager({ initialStores }: { initialStores: Store[] }) {
  const [stores,  setStores]  = React.useState<Store[]>(initialStores);
  const [newName, setNewName] = React.useState("");
  const [adding,  setAdding]  = React.useState(false);
  const [error,   setError]   = React.useState<string | null>(null);

  // ── Add ──────────────────────────────────────────────────────────────────────
  async function handleAdd() {
    if (!newName.trim()) {
      setError("Escribí el nombre del lugar primero.");
      return;
    }
    setAdding(true);
    setError(null);

    try {
      const nextOrder = stores.length > 0 ? Math.max(...stores.map((s) => s.sort_order)) + 1 : 1;

      const res  = await fetch("/api/admin/delivery-stores", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: newName.trim(), sort_order: nextOrder }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Error al agregar lugar.");
      } else {
        setStores((prev) => [...prev, json.data]);
        setNewName("");
      }
    } catch {
      setError("Error de red. Intentá de nuevo.");
    } finally {
      setAdding(false);
    }
  }

  // ── Toggle active ────────────────────────────────────────────────────────────
  async function toggleActive(store: Store) {
    const optimistic = stores.map((s) =>
      s.id === store.id ? { ...s, is_active: !s.is_active } : s
    );
    setStores(optimistic);

    const res = await fetch(`/api/admin/delivery-stores/${store.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ is_active: !store.is_active }),
    });
    if (!res.ok) setStores(stores); // revert on error
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  async function handleDelete(store: Store) {
    if (!confirm(`¿Eliminar "${store.name}"?`)) return;

    setStores((prev) => prev.filter((s) => s.id !== store.id));

    const res = await fetch(`/api/admin/delivery-stores/${store.id}`, { method: "DELETE" });
    if (!res.ok) {
      setStores(stores); // revert
    }
  }

  // ── Move (reorder) ────────────────────────────────────────────────────────────
  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= stores.length) return;

    const next = [...stores];
    [next[index], next[target]] = [next[target], next[index]];

    // Reassign sort_order values based on new positions
    const reordered = next.map((s, i) => ({ ...s, sort_order: i + 1 }));
    setStores(reordered);

    // Persist both swapped rows
    await Promise.all([
      fetch(`/api/admin/delivery-stores/${reordered[index].id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: reordered[index].sort_order }),
      }),
      fetch(`/api/admin/delivery-stores/${reordered[target].id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: reordered[target].sort_order }),
      }),
    ]);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Add row */}
      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => { setNewName(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder="Nombre del lugar o tienda"
          maxLength={80}
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-sans text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium font-sans hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Plus size={14} />
          {adding ? "Agregando…" : "Agregar"}
        </button>
      </div>

      {error && <p className="text-xs text-error font-sans">{error}</p>}

      {/* Store list */}
      <div className="flex flex-col gap-1.5">
        {stores.map((store, i) => (
          <div
            key={store.id}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors",
              store.is_active
                ? "border-border bg-surface"
                : "border-border bg-secondary/50 opacity-60",
            )}
          >
            {/* Drag handle / order buttons */}
            <div className="flex flex-col gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="text-text-muted hover:text-text-primary disabled:opacity-20 transition-colors"
                aria-label="Subir"
              >
                <GripVertical size={14} className="rotate-90" />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === stores.length - 1}
                className="text-text-muted hover:text-text-primary disabled:opacity-20 transition-colors"
                aria-label="Bajar"
              >
                <GripVertical size={14} className="-rotate-90" />
              </button>
            </div>

            <span className="text-xs text-text-muted font-sans w-5 shrink-0 text-right">
              {store.sort_order}
            </span>

            <span className="flex-1 text-sm font-sans text-text-primary truncate">{store.name}</span>

            {/* Toggle active */}
            <button
              type="button"
              onClick={() => toggleActive(store)}
              className="shrink-0 text-text-muted hover:text-text-primary transition-colors"
              title={store.is_active ? "Desactivar" : "Activar"}
            >
              {store.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={() => handleDelete(store)}
              className="shrink-0 text-text-muted hover:text-error transition-colors"
              title="Eliminar"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-text-muted font-sans">
        {stores.filter((s) => s.is_active).length} activas · {stores.filter((s) => !s.is_active).length} inactivas
      </p>
    </div>
  );
}
