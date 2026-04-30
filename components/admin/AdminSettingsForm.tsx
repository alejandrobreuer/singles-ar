"use client";

import * as React from "react";
import type { AdminSettings } from "@/types/database";

interface Props {
  settings: AdminSettings;
}

interface FieldDef {
  key: keyof AdminSettings;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  suffix?: string;
}

const FIELDS: FieldDef[] = [
  {
    key:         "usd_to_ars_rate",
    label:       "Tipo de cambio USD → ARS",
    description: "Tasa usada para mostrar precios en pesos.",
    min: 100, max: 99999, step: 1,
  },
  {
    key:         "platform_commission_percent",
    label:       "Comisión de plataforma",
    description: "Porcentaje que retiene Singles.ar de cada transacción completada.",
    min: 0.1, max: 20, step: 0.1, suffix: "%",
  },
  {
    key:         "mp_fee_percent",
    label:       "Fee de MercadoPago",
    description: "Fee estimado de MP para mostrar al usuario (informativo).",
    min: 0, max: 20, step: 0.1, suffix: "%",
  },
  {
    key:         "price_tolerance_percent",
    label:       "Tolerancia de precio",
    description: "Variación máxima permitida respecto al precio de referencia.",
    min: 1, max: 50, step: 1, suffix: "%",
  },
  {
    key:         "buy_order_default_days",
    label:       "Días predeterminados de orden de compra",
    description: "Duración por defecto al crear una orden de compra (15, 30 o 60).",
    min: 15, max: 60, step: 15,
  },
  {
    key:         "max_cancels_before_flag",
    label:       "Máximo de cancelaciones",
    description: "Cuántas cancelaciones antes de marcar al comprador como no confiable.",
    min: 1, max: 10, step: 1,
  },
];

export function AdminSettingsForm({ settings }: Props) {
  const [values, setValues] = React.useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of FIELDS) {
      init[f.key] = String(settings[f.key] ?? "");
    }
    return init;
  });
  const [saving, setSaving]   = React.useState(false);
  const [message, setMessage] = React.useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const body: Record<string, number> = {};
    for (const f of FIELDS) {
      const n = parseFloat(values[f.key]);
      if (!isNaN(n)) body[f.key] = n;
    }

    try {
      const res = await fetch("/api/admin/settings", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      if (res.ok) {
        setMessage({ ok: true, text: "Configuración guardada." });
      } else {
        const json = await res.json().catch(() => ({}));
        setMessage({ ok: false, text: json.error ?? "Error al guardar." });
      }
    } catch {
      setMessage({ ok: false, text: "Error de red." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {FIELDS.map((f) => (
        <div key={f.key} className="bg-surface border border-border rounded-xl p-4">
          <label className="block text-sm font-medium font-sans text-text-primary mb-0.5">
            {f.label}
          </label>
          <p className="text-xs text-text-muted font-sans mb-3">{f.description}</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={f.min}
              max={f.max}
              step={f.step}
              value={values[f.key]}
              onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
              className="w-36 px-3 py-1.5 rounded-lg bg-background border border-border text-sm font-sans text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
            {f.suffix && (
              <span className="text-sm text-text-muted font-sans">{f.suffix}</span>
            )}
          </div>
        </div>
      ))}

      {message && (
        <p className={`text-sm font-sans ${message.ok ? "text-emerald-400" : "text-red-400"}`}>
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium font-sans hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
