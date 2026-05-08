"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Condition } from "@/types/database";

// ─── Shared condition data & modals used by sell + edit pages ─────────────────

export const CONDITIONS: Array<{ value: Condition; label: string; desc: string; color: string }> = [
  { value: "NM",  label: "NM",  desc: "Near Mint",           color: "border-success/40 data-[selected]:bg-success-subtle data-[selected]:border-success data-[selected]:text-success" },
  { value: "LP",  label: "LP",  desc: "Lightly Played",      color: "border-blue-200 data-[selected]:bg-blue-50 data-[selected]:border-blue-500 data-[selected]:text-blue-700" },
  { value: "MP",  label: "MP",  desc: "Moderately Played",   color: "border-warning/30 data-[selected]:bg-warning-subtle data-[selected]:border-warning data-[selected]:text-warning" },
  { value: "HP",  label: "HP",  desc: "Heavily Played",      color: "border-orange-200 data-[selected]:bg-orange-50 data-[selected]:border-orange-500 data-[selected]:text-orange-700" },
  { value: "DMG", label: "DMG", desc: "Damaged",             color: "border-error/30 data-[selected]:bg-error-subtle data-[selected]:border-error data-[selected]:text-error" },
];

export interface ConditionDetail {
  fullName:    string;
  subtitle:    string;
  description: string;
  criteria:    { icon: string; label: string; value: string }[];
  tournament:  { label: string; variant: "always" | "usually" | "sometimes" | "never" };
  priceImpact: string;
  dotsFilled:  number;
  colors: { badge: string; header: string; dot: string; dotEmpty: string };
}

export const CONDITION_DETAILS: Record<Condition, ConditionDetail> = {
  NM: {
    fullName:    "Near Mint — Casi Nueva",
    subtitle:    "El estándar más alto. Como recién salida del sobre.",
    description: "La carta está en condición prácticamente perfecta. Puede haber imperfecciones mínimas por el manejo normal al salir del sobre, pero son imperceptibles a distancia normal.",
    criteria: [
      { icon: "⬡", label: "Esquinas y bordes", value: "Perfectos, sin desgaste visible" },
      { icon: "✦", label: "Superficie",         value: "Limpia, sin rayones ni marcas" },
      { icon: "〰", label: "Pliegues",           value: "Ninguno" },
      { icon: "💧", label: "Daño por agua",      value: "Ninguno" },
    ],
    tournament:  { label: "✓ Legal en torneos — Siempre", variant: "always" },
    priceImpact: "Precio base de referencia",
    dotsFilled:  5,
    colors: { badge: "bg-success/10 text-success border border-success/40", header: "bg-success/5 border-success/20", dot: "bg-success", dotEmpty: "bg-success/20" },
  },
  LP: {
    fullName:    "Lightly Played — Poco Jugada",
    subtitle:    "Jugada pero bien cuidada. Sigue luciendo muy bien.",
    description: "La carta fue usada pero con cuidado. Tiene desgaste muy leve, típico del uso normal. La mayoría de los jugadores competitivos aceptan cartas LP sin problema.",
    criteria: [
      { icon: "⬡", label: "Esquinas y bordes", value: "Leve blanqueado en 1–2 esquinas" },
      { icon: "✦", label: "Superficie",         value: "Rayaduras muy leves bajo luz directa" },
      { icon: "〰", label: "Pliegues",           value: "Ninguno" },
      { icon: "💧", label: "Daño por agua",      value: "Ninguno" },
    ],
    tournament:  { label: "✓ Legal en torneos — Siempre", variant: "always" },
    priceImpact: "10–20% menos que NM",
    dotsFilled:  4,
    colors: { badge: "bg-blue-500/10 text-blue-500 border border-blue-500/30", header: "bg-blue-500/5 border-blue-500/20", dot: "bg-blue-500", dotEmpty: "bg-blue-200" },
  },
  MP: {
    fullName:    "Moderately Played — Moderadamente Jugada",
    subtitle:    "Desgaste visible pero estructuralmente en buen estado.",
    description: "La carta muestra desgaste notorio en múltiples puntos, pero no compromete su integridad estructural. Sigue siendo funcional para jugar.",
    criteria: [
      { icon: "⬡", label: "Esquinas y bordes", value: "Blanqueado visible en varias esquinas" },
      { icon: "✦", label: "Superficie",         value: "Rayaduras o marcas notorias" },
      { icon: "〰", label: "Pliegues",           value: "Posible pliegue muy leve" },
      { icon: "💧", label: "Daño por agua",      value: "Posible mínimo en los bordes" },
    ],
    tournament:  { label: "✓ Legal — Generalmente", variant: "usually" },
    priceImpact: "30–50% menos que NM",
    dotsFilled:  3,
    colors: { badge: "bg-amber-500/10 text-amber-600 border border-amber-400/30", header: "bg-amber-500/5 border-amber-400/20", dot: "bg-amber-500", dotEmpty: "bg-amber-200" },
  },
  HP: {
    fullName:    "Heavily Played — Muy Jugada",
    subtitle:    "Desgaste significativo. Se nota que tuvo mucho uso.",
    description: "La carta muestra desgaste severo en esquinas, bordes y superficie. Puede tener un doblez o ligera curvatura. Es reconocible dentro de un mazo ensleevado.",
    criteria: [
      { icon: "⬡", label: "Esquinas y bordes", value: "Chipping o despostillado severo" },
      { icon: "✦", label: "Superficie",         value: "Rayaduras profundas, textura rugosa" },
      { icon: "〰", label: "Pliegues",           value: "Posible pliegue o leve curvatura" },
      { icon: "💧", label: "Daño por agua",      value: "Posible en bordes o esquinas" },
    ],
    tournament:  { label: "⚠ Legal — A veces (puede ser objetada)", variant: "sometimes" },
    priceImpact: "50–70% menos que NM",
    dotsFilled:  2,
    colors: { badge: "bg-orange-500/10 text-orange-600 border border-orange-400/30", header: "bg-orange-500/5 border-orange-400/20", dot: "bg-orange-500", dotEmpty: "bg-orange-200" },
  },
  DMG: {
    fullName:    "Damaged — Dañada",
    subtitle:    "Daño estructural. Generalmente no apta para torneos.",
    description: "La carta tiene daño estructural que afecta su integridad. Puede tener roturas, agujeros, marcas de escritura o deformaciones permanentes.",
    criteria: [
      { icon: "⬡", label: "Esquinas y bordes", value: "Chipping severo, piezas faltantes" },
      { icon: "✦", label: "Superficie",         value: "Roturas, agujeros o marcas de tinta" },
      { icon: "〰", label: "Pliegues",           value: "Sí — doblez o curvatura permanente" },
      { icon: "💧", label: "Daño por agua",      value: "Posible daño severo o alabeo" },
    ],
    tournament:  { label: "✗ No legal en torneos", variant: "never" },
    priceImpact: "70–90% menos que NM",
    dotsFilled:  1,
    colors: { badge: "bg-error/10 text-error border border-error/30", header: "bg-error/5 border-error/20", dot: "bg-error", dotEmpty: "bg-error/20" },
  },
};

export const TOURNAMENT_BADGE: Record<ConditionDetail["tournament"]["variant"], string> = {
  always:    "bg-success/10 text-success border border-success/40",
  usually:   "bg-blue-500/10 text-blue-500 border border-blue-500/30",
  sometimes: "bg-amber-500/10 text-amber-600 border border-amber-400/30",
  never:     "bg-error/10 text-error border border-error/30",
};

// ─── Condition guide modal ────────────────────────────────────────────────────

export function ConditionGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto p-4 py-8"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-2xl border border-border w-full max-w-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-background rounded-t-2xl z-10">
          <div>
            <h2 className="text-base font-serif font-semibold text-text-primary">
              Guía de condición de cartas
            </h2>
            <p className="text-xs text-text-muted font-sans mt-0.5">
              Estándar internacional usado en Magic, Pokémon y One Piece TCG
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-secondary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Condition cards */}
        <div className="px-5 py-5 space-y-3">
          {CONDITIONS.map((c) => {
            const detail = CONDITION_DETAILS[c.value];
            return (
              <div key={c.value} className={cn("rounded-xl border overflow-hidden", detail.colors.header)}>
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/60">
                  <span className={cn("text-xs font-bold font-sans px-2.5 py-1 rounded-md shrink-0", detail.colors.badge)}>
                    {c.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold font-sans text-text-primary leading-tight">{detail.fullName}</p>
                    <p className="text-2xs text-text-muted font-sans mt-0.5">{detail.subtitle}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className={cn("w-2 h-2 rounded-full", i < detail.dotsFilled ? detail.colors.dot : detail.colors.dotEmpty)} />
                    ))}
                  </div>
                </div>

                <div className="px-4 py-3 bg-background">
                  <p className="text-xs text-text-secondary font-sans leading-relaxed mb-3">
                    {detail.description}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {detail.criteria.map((cr) => (
                      <div key={cr.label} className="flex items-start gap-2 bg-surface rounded-lg border border-border px-3 py-2">
                        <span className="text-sm leading-none mt-0.5 shrink-0">{cr.icon}</span>
                        <div>
                          <p className="text-2xs font-semibold text-text-muted font-sans uppercase tracking-wide mb-0.5">{cr.label}</p>
                          <p className="text-xs text-text-primary font-sans font-medium">{cr.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className={cn("text-2xs font-semibold px-2 py-0.5 rounded-md", TOURNAMENT_BADGE[detail.tournament.variant])}>
                      {detail.tournament.label}
                    </span>
                    <span className="text-2xs text-text-muted font-sans">
                      Precio: <strong className="text-text-secondary">{detail.priceImpact}</strong>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex gap-3 bg-surface border border-border rounded-xl px-4 py-3 mt-1">
            <span className="text-base shrink-0 mt-0.5">📦</span>
            <div>
              <p className="text-xs font-semibold font-sans text-text-primary mb-0.5">Consejo para vendedores</p>
              <p className="text-xs text-text-secondary font-sans leading-relaxed">
                Siempre es mejor declarar una condición más baja de lo que creés. Un comprador satisfecho te deja una buena reseña. Una disputa por condición incorrecta daña tu reputación permanentemente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Condition confirm modal ──────────────────────────────────────────────────

export function ConditionConfirmModal({
  condition,
  onConfirm,
  onCancel,
}: {
  condition: Condition;
  onConfirm: (c: Condition) => void;
  onCancel:  () => void;
}) {
  const cond   = CONDITIONS.find((c) => c.value === condition)!;
  const detail = CONDITION_DETAILS[condition];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-background rounded-2xl border border-border w-full max-w-sm shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn("px-5 py-4 border-b border-border", detail.colors.header)}>
          <div className="flex items-center gap-2.5 mb-2">
            <span className={cn("text-xs font-bold font-sans px-2.5 py-1 rounded-md", detail.colors.badge)}>
              {cond.label}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={cn("w-1.5 h-1.5 rounded-full", i < detail.dotsFilled ? detail.colors.dot : detail.colors.dotEmpty)} />
              ))}
            </div>
          </div>
          <p className="text-sm font-semibold font-sans text-text-primary">{detail.fullName}</p>
          <p className="text-2xs text-text-muted font-sans mt-0.5">{detail.subtitle}</p>
        </div>

        <div className="px-5 py-4">
          <p className="text-xs text-text-secondary font-sans leading-relaxed mb-3">
            {detail.description}
          </p>
          <div className="grid grid-cols-2 gap-1.5 mb-4">
            {detail.criteria.map((cr) => (
              <div key={cr.label} className="flex items-start gap-1.5 bg-surface rounded-lg border border-border px-2.5 py-2">
                <span className="text-xs leading-none mt-0.5 shrink-0">{cr.icon}</span>
                <div>
                  <p className="text-2xs font-semibold text-text-muted font-sans uppercase tracking-wide leading-none mb-0.5">{cr.label}</p>
                  <p className="text-2xs text-text-primary font-sans font-medium leading-snug">{cr.value}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-text-secondary font-sans mb-4 leading-relaxed">
            ¿Tu carta cumple estas condiciones? Confirmá para seleccionar el estado <strong>{cond.label}</strong>.
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-surface text-sm font-medium font-sans text-text-secondary hover:bg-secondary transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onConfirm(condition)}
              className={cn("flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold font-sans transition-colors", detail.colors.badge)}
            >
              Confirmar — {cond.label}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
