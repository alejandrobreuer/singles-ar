"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { z } from "zod";
import { AlertCircle, ChevronLeft, Clock, ShieldAlert, Tag } from "lucide-react";
import { Button }            from "@/components/ui/button";
import { Input }             from "@/components/ui/input";
import { Badge }             from "@/components/ui/badge";
import { Spinner }           from "@/components/ui/spinner";
import { Divider }           from "@/components/ui/divider";
import { toast }             from "sonner";
import { CardAutocomplete }  from "@/components/sell/CardAutocomplete";
import { PriceValidator }    from "@/components/sell/PriceValidator";
import { formatARS, parseARSInput } from "@/lib/formatting";
import type { CardSearchResult } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

type Condition = "NM" | "LP" | "MP" | "HP" | "DMG";

const CONDITIONS: { value: Condition; label: string; sub: string }[] = [
  { value: "NM",  label: "NM",  sub: "Near Mint"    },
  { value: "LP",  label: "LP",  sub: "Light Played"  },
  { value: "MP",  label: "MP",  sub: "Moderately Played" },
  { value: "HP",  label: "HP",  sub: "Heavy Played"  },
  { value: "DMG", label: "DMG", sub: "Damaged"       },
];

const DURATIONS: { days: number; label: string }[] = [
  { days: 15, label: "15 días" },
  { days: 30, label: "30 días" },
  { days: 60, label: "60 días" },
];

// ─── Platform median price fetch ─────────────────────────────────────────────

interface PriceResult {
  price_ars: number | null;
  count:     number;
}

async function fetchPrice(cardId: string): Promise<PriceResult | null> {
  try {
    const res = await fetch(`/api/cards/${cardId}/price`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2].map((n) => (
        <div
          key={n}
          className={[
            "h-2 rounded-full transition-all duration-300",
            step === n ? "w-6 bg-primary" : "w-2 bg-border",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewBuyOrderPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  // ── State ──────────────────────────────────────────────────────────────────
  const [step,         setStep]       = React.useState(1);
  const [card,         setCard]        = React.useState<CardSearchResult | null>(null);
  const [priceResult,  setPriceResult] = React.useState<PriceResult | null>(null);
  const [priceLoading, setPriceLoading] = React.useState(false);

  // Step 2 fields
  const [priceRaw,   setPriceRaw]   = React.useState("");
  const [condition,  setCondition]  = React.useState<Condition | null>(null);
  const [quantity,   setQuantity]   = React.useState(1);
  const [duration,   setDuration]   = React.useState(30);
  const [notes,      setNotes]      = React.useState("");

  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const priceNum = parseARSInput(priceRaw);

  // ── Pre-select card from ?card_id= ─────────────────────────────────────────
  React.useEffect(() => {
    const cardId = searchParams.get("card_id");
    if (!cardId) return;

    fetch(`/api/cards/search?q=&limit=1&id=${cardId}`)
      .then((r) => r.json())
      .then((json) => {
        const found = json.data?.[0];
        if (found) handleCardSelect(found);
      })
      .catch(() => null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleCardSelect(selected: CardSearchResult) {
    setCard(selected);
    setPriceResult(null);
    setPriceLoading(true);
    const result = await fetchPrice(selected.id);
    setPriceResult(result);
    setPriceLoading(false);
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!card || priceNum === null || priceNum <= 0) return;
    setSubmitError(null);
    setSubmitting(true);

    const res = await fetch("/api/buy-orders", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        card_id:       card.id,
        price:         priceNum,
        condition:     condition ?? null,
        quantity,
        duration_days: duration,
        notes:         notes.trim() || null,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      setSubmitError(json.error ?? "Error al crear la orden.");
      setSubmitting(false);
      return;
    }

    toast.success("¡Orden de compra publicada!");
    router.push(`/cards/${card.id}`);
  }

  const showValidator = priceNum !== null && priceNum > 0 && !priceLoading;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-surface">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link
            href="/"
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <ChevronLeft size={20} />
          </Link>
          <h1 className="font-serif text-lg font-semibold text-text-primary">
            Nueva orden de compra
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
        <StepDots step={step} />

        {/* ── STEP 1: Card selection ──────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-serif font-semibold text-text-primary mb-1 text-center">
              ¿Qué carta estás buscando?
            </h2>
            <p className="text-sm text-text-muted font-sans text-center mb-8">
              Buscá la carta que querés comprar.
            </p>
            <CardAutocomplete onSelect={handleCardSelect} />
          </div>
        )}

        {/* ── STEP 2: Order details ───────────────────────────────────────── */}
        {step === 2 && card && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Selected card */}
            <div className="surface-raised p-4 flex items-center gap-4">
              <div className="relative shrink-0 w-14 aspect-[2.5/3.5] rounded-lg overflow-hidden border border-border bg-secondary">
                {card.image_url ? (
                  <Image src={card.image_url} alt={card.name} fill className="object-cover" sizes="56px" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Tag size={18} className="text-border" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold font-sans text-text-primary truncate">{card.name}</p>
                <p className="text-xs text-text-muted font-sans">{card.set_name}</p>
                {priceLoading && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Spinner size="xs" />
                    <span className="text-xs text-text-muted font-sans">Cargando precio de referencia…</span>
                  </div>
                )}
                {priceResult?.price_ars != null && !priceLoading && (
                  <p className="text-xs text-text-muted font-sans mt-0.5">
                    Mediana Singles.ar:{" "}
                    <span className="text-text-primary font-medium font-price">
                      {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(priceResult.price_ars)}
                    </span>
                    <span className="ml-1 text-2xs">({priceResult.count} transacciones)</span>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => { setCard(null); setStep(1); }}
                className="text-xs text-text-muted hover:text-primary font-sans transition-colors shrink-0"
              >
                Cambiar
              </button>
            </div>

            {/* Price */}
            <div>
              <Input
                label="Tu precio máximo (ARS)"
                placeholder="Ej: 15000"
                value={priceRaw}
                onChange={(e) => setPriceRaw(e.target.value)}
                leftAddon="$"
                helperText="El vendedor verá este precio como tu oferta."
                required
              />
              {showValidator && (
                <div className="mt-3">
                  <PriceValidator
                    priceARS={priceNum!}
                    platformMedianARS={priceResult?.price_ars ?? null}
                    transactionCount={priceResult?.count ?? 0}
                  />
                </div>
              )}
            </div>

            {/* Condition (optional) */}
            <div>
              <p className="text-sm font-medium text-text-primary font-sans mb-2">
                Condición aceptada <span className="text-text-muted font-normal">(opcional)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {CONDITIONS.map(({ value, label, sub }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCondition(condition === value ? null : value)}
                    className={[
                      "flex flex-col items-center px-3 py-2 rounded-lg border text-xs font-sans transition-all",
                      condition === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-surface text-text-secondary hover:border-primary/50",
                    ].join(" ")}
                  >
                    <span className="font-semibold">{label}</span>
                    <span className="text-2xs text-text-muted">{sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-text-primary font-sans mb-2">
                Cantidad
              </label>
              <div className="flex items-center gap-3">
                {[1, 2, 3, 4].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuantity(q)}
                    className={[
                      "w-9 h-9 rounded-lg border text-sm font-sans font-medium transition-all",
                      quantity === q
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-surface text-text-secondary hover:border-primary/50",
                    ].join(" ")}
                  >
                    {q}
                  </button>
                ))}
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.min(99, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-20"
                />
              </div>
            </div>

            {/* Duration */}
            <div>
              <p className="text-sm font-medium text-text-primary font-sans mb-2 flex items-center gap-1.5">
                <Clock size={14} />
                Duración de la orden
              </p>
              <div className="flex gap-2">
                {DURATIONS.map(({ days, label }) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setDuration(days)}
                    className={[
                      "flex-1 py-2.5 rounded-lg border text-sm font-sans font-medium transition-all",
                      duration === days
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-surface text-text-secondary hover:border-primary/50",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-text-muted font-sans mt-1.5">
                La orden expira automáticamente al final del período.
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-text-primary font-sans mb-1">
                Notas <span className="text-text-muted font-normal">(opcional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="Ej: Acepto solo NM o LP, prefiero con sobre original..."
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-sans text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
              <p className="text-2xs text-text-muted font-sans text-right mt-0.5">
                {notes.length}/300
              </p>
            </div>

            <Divider />

            {/* Cancellation warning */}
            <div className="flex items-start gap-3 p-4 rounded-xl border border-warning/30 bg-warning/5">
              <ShieldAlert size={16} className="shrink-0 text-warning mt-0.5" />
              <p className="text-xs text-text-secondary font-sans leading-relaxed">
                <strong className="font-semibold text-text-primary">Política de cancelación:</strong>{" "}
                Si aceptás que un vendedor tome tu orden y luego la cancelás,
                acumularás un punto de cancelación. Acumular demasiados puntos
                puede afectar tu reputación como comprador.
              </p>
            </div>

            {/* Submit error */}
            {submitError && (
              <div className="flex items-start gap-2 p-3 rounded-lg border border-error/30 bg-error/5">
                <AlertCircle size={15} className="shrink-0 text-error mt-0.5" />
                <p className="text-sm text-error font-sans">{submitError}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => setStep(1)}
                className="flex-1"
              >
                Atrás
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={submitting}
                disabled={priceNum === null || priceNum <= 0}
                className="flex-1"
              >
                Publicar orden de compra
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
