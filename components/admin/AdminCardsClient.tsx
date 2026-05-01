"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Pencil, Plus, RefreshCw, X } from "lucide-react";
import type { Game } from "@/types/database";

interface AdminCard {
  id:                  string;
  name:                string;
  set_name:            string | null;
  set_code:            string | null;
  card_number:         string | null;
  rarity:              string | null;
  image_url:           string | null;
  image_override_url:  string | null;
  game:                Game;
  lang:                string;
  created_at:          string;
}

interface Props {
  cards: AdminCard[];
  total: number;
  page:  number;
  limit: number;
  q:     string;
  game:  string;
}

const GAME_LABELS: Record<string, string> = {
  magic:    "MTG",
  pokemon:  "Pokémon",
  onepiece: "One Piece",
};

// ─── Image Override Modal ─────────────────────────────────────────────────────

function ImageOverrideModal({
  card,
  onClose,
}: {
  card: AdminCard;
  onClose: () => void;
}) {
  const router = useRouter();
  const [url, setUrl]     = React.useState(card.image_override_url ?? "");
  const [saving, setSaving] = React.useState(false);
  const [err, setErr]       = React.useState("");

  async function handleSave() {
    setSaving(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/cards", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id: card.id, image_override_url: url || null }),
      });
      if (res.ok) { router.refresh(); onClose(); }
      else { const j = await res.json().catch(() => ({})); setErr(j.error ?? "Error"); }
    } finally {
      setSaving(false);
    }
  }

  const displayUrl = url || card.image_url;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border rounded-2xl p-5 max-w-sm w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold font-sans text-text-primary truncate pr-4">
            {card.name}
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={16} />
          </button>
        </div>

        {displayUrl && (
          <div className="flex justify-center mb-4">
            <Image
              src={displayUrl}
              alt={card.name}
              width={120}
              height={168}
              className="rounded-lg object-cover border border-border"
              unoptimized
            />
          </div>
        )}

        <label className="block text-xs text-text-muted font-sans mb-1">
          URL de imagen override (deja vacío para usar la original)
        </label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm font-sans text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 mb-3"
        />

        {err && <p className="text-xs text-red-400 font-sans mb-2">{err}</p>}

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-medium font-sans hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-secondary text-text-primary text-sm font-medium font-sans hover:bg-secondary/80 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Card Modal ────────────────────────────────────────────────────────

function CreateCardModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = React.useState({
    name: "", game: "magic" as Game, set_name: "", set_code: "",
    card_number: "", rarity: "", image_url: "", lang: "es",
  });
  const [saving, setSaving] = React.useState(false);
  const [err, setErr]       = React.useState("");

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleCreate() {
    if (!form.name.trim()) { setErr("El nombre es requerido."); return; }
    setSaving(true);
    setErr("");
    try {
      const body: Record<string, string> = { name: form.name, game: form.game, lang: form.lang };
      if (form.set_name)    body.set_name    = form.set_name;
      if (form.set_code)    body.set_code    = form.set_code;
      if (form.card_number) body.card_number = form.card_number;
      if (form.rarity)      body.rarity      = form.rarity;
      if (form.image_url)   body.image_url   = form.image_url;
      const res = await fetch("/api/admin/cards", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      if (res.ok) { router.refresh(); onClose(); }
      else { const j = await res.json().catch(() => ({})); setErr(j.error ?? "Error"); }
    } finally {
      setSaving(false);
    }
  }

  const fields: { key: string; label: string; placeholder?: string }[] = [
    { key: "set_name",    label: "Set",           placeholder: "e.g. Scarlet & Violet" },
    { key: "set_code",    label: "Código de set", placeholder: "e.g. sv1" },
    { key: "card_number", label: "Número",        placeholder: "e.g. 001/165" },
    { key: "rarity",      label: "Rareza",        placeholder: "e.g. rare" },
    { key: "image_url",   label: "URL imagen",    placeholder: "https://…" },
    { key: "lang",        label: "Idioma",        placeholder: "es" },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-surface border border-border rounded-2xl p-5 max-w-sm w-full my-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold font-sans text-text-primary">Nueva carta</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-text-muted font-sans mb-1">Nombre *</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Nombre de la carta"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm font-sans text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted font-sans mb-1">Juego *</label>
            <select
              value={form.game}
              onChange={(e) => set("game", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm font-sans text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="magic">Magic: The Gathering</option>
              <option value="pokemon">Pokémon</option>
              <option value="onepiece">One Piece</option>
            </select>
          </div>
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-xs text-text-muted font-sans mb-1">{f.label}</label>
              <input
                value={(form as Record<string, string>)[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm font-sans text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          ))}
        </div>

        {err && <p className="text-xs text-red-400 font-sans mt-2">{err}</p>}

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleCreate}
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-medium font-sans hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "Creando…" : "Crear carta"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-secondary text-text-primary text-sm font-medium font-sans hover:bg-secondary/80 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminCardsClient({ cards, total, page, limit, q, game }: Props) {
  const router  = useRouter();
  const [search, setSearch] = React.useState(q);
  const [gameFilter, setGameFilter] = React.useState(game);
  const [overrideCard, setOverrideCard] = React.useState<AdminCard | null>(null);
  const [showCreate, setShowCreate]     = React.useState(false);
  const [syncingOP,  setSyncingOP]  = React.useState(false);
  const [syncingMTG, setSyncingMTG] = React.useState(false);
  const [syncMsg, setSyncMsg]       = React.useState<{ ok: boolean; text: string } | null>(null);
  const totalPages = Math.ceil(total / limit);
  const anySyncing = syncingOP || syncingMTG;

  async function handleSyncOPTCG() {
    setSyncingOP(true);
    setSyncMsg(null);
    try {
      const res  = await fetch("/api/admin/sync/optcg", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setSyncMsg({ ok: true,  text: json.message ?? "Sync complete." });
        router.refresh();
      } else {
        setSyncMsg({ ok: false, text: json.error ?? "Error al sincronizar." });
      }
    } catch {
      setSyncMsg({ ok: false, text: "Error de red." });
    } finally {
      setSyncingOP(false);
    }
  }

  async function handleSyncMTG() {
    setSyncingMTG(true);
    setSyncMsg(null);
    try {
      const res  = await fetch("/api/admin/sync/scryfall", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setSyncMsg({ ok: true,  text: json.message ?? "Sync complete." });
        router.refresh();
      } else {
        setSyncMsg({ ok: false, text: json.error ?? "Error al sincronizar." });
      }
    } catch {
      setSyncMsg({ ok: false, text: "Error de red." });
    } finally {
      setSyncingMTG(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search)     params.set("q",    search);
    if (gameFilter) params.set("game", gameFilter);
    params.set("page", "1");
    router.push(`/admin/cards?${params.toString()}`);
  }

  return (
    <div>
      {overrideCard && (
        <ImageOverrideModal card={overrideCard} onClose={() => setOverrideCard(null)} />
      )}
      {showCreate && (
        <CreateCardModal onClose={() => setShowCreate(false)} />
      )}

      {/* Toolbar */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-2 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre…"
          className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface border border-border text-sm font-sans text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <select
          value={gameFilter}
          onChange={(e) => setGameFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-surface border border-border text-sm font-sans text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">Todos los juegos</option>
          <option value="magic">MTG</option>
          <option value="pokemon">Pokémon</option>
          <option value="onepiece">One Piece</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium font-sans hover:bg-primary/90 transition-colors"
        >
          Buscar
        </button>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface border border-border text-sm font-medium font-sans text-text-primary hover:bg-secondary transition-colors"
        >
          <Plus size={14} />
          Nueva carta
        </button>
        <button
          type="button"
          onClick={handleSyncOPTCG}
          disabled={anySyncing}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface border border-border text-sm font-medium font-sans text-text-primary hover:bg-secondary transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={syncingOP ? "animate-spin" : ""} />
          Sync One Piece
        </button>
        <button
          type="button"
          onClick={handleSyncMTG}
          disabled={anySyncing}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface border border-border text-sm font-medium font-sans text-text-primary hover:bg-secondary transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={syncingMTG ? "animate-spin" : ""} />
          MTG Sync
        </button>
      </form>

      {syncMsg && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-sans border ${syncMsg.ok ? "bg-success/10 border-success/20 text-success" : "bg-error/10 border-error/20 text-error"}`}>
          {syncMsg.text}
        </div>
      )}

      {/* Table */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-sans">
            <thead>
              <tr className="text-xs text-text-muted border-b border-border">
                <th className="text-left px-4 py-2.5 font-medium w-14">Imagen</th>
                <th className="text-left px-4 py-2.5 font-medium">Nombre</th>
                <th className="text-left px-4 py-2.5 font-medium">Juego</th>
                <th className="text-left px-4 py-2.5 font-medium">Set</th>
                <th className="text-left px-4 py-2.5 font-medium">Número</th>
                <th className="text-left px-4 py-2.5 font-medium">Override</th>
                <th className="text-left px-4 py-2.5 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((c) => {
                const imgSrc = c.image_override_url ?? c.image_url;
                return (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-2">
                      {imgSrc ? (
                        <Image
                          src={imgSrc}
                          alt={c.name}
                          width={36}
                          height={50}
                          className="rounded object-cover border border-border"
                          unoptimized
                        />
                      ) : (
                        <div className="w-9 h-12 rounded bg-secondary border border-border" />
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-text-primary font-medium max-w-[200px] truncate">
                      {c.name}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {GAME_LABELS[c.game] ?? c.game}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary truncate max-w-[140px]">
                      {c.set_name ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-text-muted">
                      {c.card_number ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {c.image_override_url ? (
                        <span className="text-xs text-emerald-400">Sí</span>
                      ) : (
                        <span className="text-xs text-text-muted">No</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => setOverrideCard(c)}
                        title="Editar imagen"
                        className="p-1 rounded hover:bg-primary/10 text-primary transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {cards.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-text-muted">
                    No se encontraron cartas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm font-sans">
          <p className="text-text-muted">Página {page} de {totalPages}</p>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={`/admin/cards?q=${encodeURIComponent(q)}&game=${game}&page=${page - 1}`}
                className="px-3 py-1.5 rounded-lg bg-surface border border-border text-text-secondary hover:bg-secondary transition-colors"
              >
                Anterior
              </a>
            )}
            {page < totalPages && (
              <a
                href={`/admin/cards?q=${encodeURIComponent(q)}&game=${game}&page=${page + 1}`}
                className="px-3 py-1.5 rounded-lg bg-surface border border-border text-text-secondary hover:bg-secondary transition-colors"
              >
                Siguiente
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
