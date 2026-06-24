"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  X, ChevronRight, Tag, ShoppingBag, Pencil, Lock,
  Check, MapPin, MessageSquare, Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CardAutocomplete } from "@/components/sell/CardAutocomplete";
import { CONDITIONS, CONDITION_DETAILS } from "@/components/sell/ConditionModals";
import { LanguageSelector } from "@/components/sell/LanguageSelector";
import { CommissionBreakdown } from "@/components/sell/CommissionBreakdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Divider } from "@/components/ui/divider";
import { Badge } from "@/components/ui/badge";
import { LocationPickerList } from "@/components/ui/LocationPickerList";
import { HoverTooltip } from "@/components/ui/HoverTooltip";
import { toast } from "sonner";
import { parseARSInput, formatARSNumber, formatARS, setLabel } from "@/lib/formatting";
import { LANGUAGES_BY_GAME } from "@/lib/cardAttributes";
import type {
  CardSearchResult, Condition, CardLanguage, ListingType,
  AdminSettings, Game, LocationValue,
} from "@/types/database";

const GAME_BADGE: Record<Game, React.ComponentProps<typeof Badge>["variant"]> = {
  magic: "magic", pokemon: "poke", onepiece: "op",
};

const GAME_LABELS: Record<Game, string> = {
  magic: "Magic", pokemon: "Pokémon", onepiece: "One Piece",
};

interface BulkCardItem {
  card: CardSearchResult;
  listingType: ListingType;
  priceRaw: string;
  condition: Condition;
  language: CardLanguage;
  quantity: string;
  locations: LocationValue[];
  notes: string;
  overridden: boolean;
}

interface BulkSellFlowProps {
  settings: AdminSettings;
}

export function BulkSellFlow({ settings }: BulkSellFlowProps) {
  const router = useRouter();
  const [step, setStep] = React.useState<1 | 2>(1);
  const [items, setItems] = React.useState<BulkCardItem[]>([]);

  // Step 2 — global defaults
  const [defaultType, setDefaultType] = React.useState<ListingType>("sale");
  const [defaultPriceRaw, setDefaultPriceRaw] = React.useState("");
  const [defaultCondition, setDefaultCondition] = React.useState<Condition>("NM");
  const [defaultQuantity, setDefaultQuantity] = React.useState("1");
  const [defaultLocations, setDefaultLocations] = React.useState<LocationValue[]>([]);
  const [defaultNotes, setDefaultNotes] = React.useState("");

  // Step 2 — editing / publishing
  const [editingIdx, setEditingIdx] = React.useState<number | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<{
    created: { card_id: string; card_name: string }[];
    failed: { card_name: string; error: string }[];
  } | null>(null);

  // beforeunload warning
  React.useEffect(() => {
    if (items.length === 0) return;
    function handler(e: BeforeUnloadEvent) { e.preventDefault(); }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [items.length]);

  function addCard(card: CardSearchResult) {
    setItems((prev) => [
      ...prev,
      {
        card,
        listingType: "sale",
        priceRaw: "",
        condition: "NM",
        language: LANGUAGES_BY_GAME[card.game][0],
        quantity: "1",
        locations: [],
        notes: "",
        overridden: false,
      },
    ]);
  }

  function removeCard(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
    else if (editingIdx !== null && editingIdx > idx) setEditingIdx(editingIdx - 1);
  }

  function updateItem(idx: number, patch: Partial<BulkCardItem>) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  }

  function applyDefaults() {
    let applied = 0;
    setItems((prev) =>
      prev.map((item) => {
        if (item.overridden) return item;
        applied++;
        return {
          ...item,
          listingType: defaultType,
          priceRaw: defaultPriceRaw,
          condition: defaultCondition,
          quantity: defaultQuantity,
          locations: [...defaultLocations],
          notes: defaultNotes,
        };
      })
    );
    toast.success(`Valores aplicados a ${applied} carta${applied !== 1 ? "s" : ""}`);
  }

  function resetOverride(idx: number) {
    updateItem(idx, {
      overridden: false,
      listingType: defaultType,
      priceRaw: defaultPriceRaw,
      condition: defaultCondition,
      quantity: defaultQuantity,
      locations: [...defaultLocations],
      notes: defaultNotes,
    });
    setEditingIdx(null);
  }

  // Validation
  function isRowValid(item: BulkCardItem): boolean {
    if (item.listingType === "sale") {
      return parseARSInput(item.priceRaw) > 0;
    }
    return true;
  }

  const allValid = items.length >= 2 && items.every(isRowValid);
  const totalCommission = items.reduce((sum, item) => {
    const price = parseARSInput(item.priceRaw);
    return sum + price * (settings.platform_commission_percent / 100);
  }, 0);

  // Publish
  async function handlePublish() {
    if (!allValid) return;
    setSubmitting(true);

    const listings = items.map((item) => ({
      card_id: item.card.id,
      listing_type: item.listingType,
      price: item.listingType === "sale" ? parseARSInput(item.priceRaw) : null,
      condition: item.condition,
      language: item.language,
      quantity: parseInt(item.quantity, 10) || 1,
      notes: item.notes.trim() || null,
      locations: item.locations.filter((l) => l.province_id),
    }));

    try {
      const res = await fetch("/api/listings/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listings }),
      });
      const data = await res.json();

      if (!res.ok && !data.created) {
        toast.error(data.error ?? "Error al publicar listings.");
        setSubmitting(false);
        return;
      }

      setResult({
        created: data.created ?? [],
        failed: data.failed ?? [],
      });
    } catch {
      toast.error("Error de red. Verificá tu conexión.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Result screen ──────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="animate-fade-in flex flex-col gap-6">
        {result.created.length > 0 && (
          <div className="surface-raised p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="size-8 rounded-full bg-success/10 text-success flex items-center justify-center">
                <Check size={16} />
              </span>
              <h2 className="text-lg font-serif font-semibold text-text-primary">
                {result.created.length} listing{result.created.length !== 1 ? "s" : ""} publicado{result.created.length !== 1 ? "s" : ""} correctamente
              </h2>
            </div>
            <ul className="space-y-2">
              {result.created.map((c, i) => (
                <li key={i} className="flex items-center gap-2 text-sm font-sans">
                  <Check size={14} className="text-success shrink-0" />
                  <a
                    href={`/cards/${c.card_id}`}
                    className="text-primary hover:underline"
                  >
                    {c.card_name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.failed.length > 0 && (
          <div className="surface-raised p-6 border-error/20">
            <h3 className="text-base font-semibold font-sans text-error mb-3">
              {result.failed.length} listing{result.failed.length !== 1 ? "s" : ""} fallaron
            </h3>
            <ul className="space-y-2">
              {result.failed.map((f, i) => (
                <li key={i} className="text-sm font-sans text-text-secondary">
                  <span className="font-medium">{f.card_name}:</span> {f.error}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" size="lg" className="flex-1" onClick={() => router.push("/profile")}>
            Ver mis listings
          </Button>
          {result.failed.length > 0 && (
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              onClick={() => {
                setItems((prev) =>
                  prev.filter((item) =>
                    result.failed.some((f) => f.card_name === item.card.name)
                  )
                );
                setResult(null);
                setStep(2);
              }}
            >
              Reintentar fallidos
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Step 1 — Card selection ────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="animate-fade-in flex flex-col gap-5">
        <div className="surface-raised p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-semibold font-sans text-text-primary">
              Seleccioná las cartas que querés publicar
            </h2>
            {items.length > 0 && (
              <span className="text-sm font-sans text-text-muted">
                {items.length} carta{items.length !== 1 ? "s" : ""} en el lote
              </span>
            )}
          </div>
          <p className="text-sm text-text-muted font-sans mb-5">
            Buscá y agregá cartas. Vas a poder configurar precio y detalles en el paso siguiente.
          </p>

          <CardAutocomplete
            onSelect={(card) => {
              addCard(card);
            }}
          />
        </div>

        {/* Batch list */}
        {items.length === 0 ? (
          <div className="surface-raised p-8 text-center">
            <Package size={32} className="mx-auto text-border mb-3" />
            <p className="text-sm text-text-muted font-sans">
              Buscá y agregá cartas para empezar el lote
            </p>
          </div>
        ) : (
          <div className="surface-raised divide-y divide-border overflow-hidden">
            {items.map((item, idx) => (
              <div
                key={`${item.card.id}-${idx}`}
                className="flex items-center gap-3 px-4 py-3"
              >
                <div className="shrink-0 w-8 h-11 rounded-md overflow-hidden bg-secondary border border-border/50">
                  {item.card.image_url ? (
                    <Image
                      src={item.card.image_url}
                      alt={item.card.name}
                      width={32}
                      height={44}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Tag size={12} className="text-border" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium font-sans text-text-primary truncate">
                    {item.card.name}
                  </p>
                  <p className="text-xs text-text-muted font-sans truncate">
                    {setLabel(item.card.set_code, item.card.set_name)} · {GAME_LABELS[item.card.game]}
                  </p>
                </div>
                <Badge variant={GAME_BADGE[item.card.game]} size="sm" className="shrink-0" />
                <button
                  type="button"
                  onClick={() => removeCard(idx)}
                  className="p-1 rounded hover:bg-error/10 text-text-muted hover:text-error transition-colors shrink-0"
                  title="Quitar del lote"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Hint for single card */}
        {items.length === 1 && (
          <p className="text-xs text-text-muted font-sans text-center">
            Para una sola carta usá el modo individual.
          </p>
        )}

        <Button
          variant="primary"
          size="lg"
          disabled={items.length < 2}
          rightIcon={<ChevronRight size={16} />}
          onClick={() => setStep(2)}
          className="w-full"
        >
          Continuar con {items.length} carta{items.length !== 1 ? "s" : ""}
        </Button>
      </div>
    );
  }

  // ── Step 2 — Batch details ─────────────────────────────────────────────────
  return (
    <div className="animate-fade-in flex flex-col gap-6">
      {/* Back to step 1 */}
      <button
        type="button"
        onClick={() => setStep(1)}
        className="text-sm text-text-muted hover:text-primary font-sans transition-colors self-start"
      >
        ← Volver a selección de cartas
      </button>

      {/* Section 1 — Global defaults */}
      <div className="surface-raised p-6">
        <h2 className="text-base font-semibold font-sans text-text-primary mb-1">
          Valores por defecto
        </h2>
        <p className="text-sm text-text-muted font-sans mb-5">
          Configurá los valores que se aplicarán a todas las cartas del lote.
        </p>

        <div className="flex flex-col gap-5">
          {/* Listing type */}
          <div>
            <p className="text-sm font-medium text-text-primary font-sans mb-3">
              Tipo de listing
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDefaultType("sale")}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all duration-150 text-center",
                  defaultType === "sale"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-surface text-text-secondary hover:border-primary/30"
                )}
              >
                <ShoppingBag size={14} />
                <span className="text-sm font-semibold font-sans">Venta directa</span>
              </button>
              <div className="flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center border-border bg-surface opacity-50 cursor-not-allowed select-none">
                <span className="text-sm font-semibold font-sans text-text-muted">Trade</span>
                <span className="text-2xs font-sans text-text-muted italic">Próximamente</span>
              </div>
            </div>
          </div>

          <Divider />

          {/* Price */}
          <Input
            label="Precio (ARS)"
            type="text"
            inputMode="numeric"
            placeholder="Ej: 15000"
            value={defaultPriceRaw}
            onChange={(e) => setDefaultPriceRaw(e.target.value.replace(/[^0-9.,]/g, ""))}
            leftAddon={<span className="text-sm font-sans font-medium text-text-muted">$</span>}
            rightAddon={
              parseARSInput(defaultPriceRaw) > 0
                ? <span className="text-xs text-text-muted font-sans whitespace-nowrap">
                    {formatARSNumber(parseARSInput(defaultPriceRaw))} ARS
                  </span>
                : undefined
            }
          />

          <Divider />

          {/* Condition */}
          <div>
            <p className="text-sm font-medium text-text-primary font-sans mb-3">Condición</p>
            <div className="grid grid-cols-5 gap-1.5">
              {CONDITIONS.map((c) => {
                const detail = CONDITION_DETAILS[c.value];
                return (
                  <HoverTooltip key={c.value} label={detail.fullName} detail={detail.subtitle} className="contents">
                    <button
                      type="button"
                      onClick={() => setDefaultCondition(c.value)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border-2 py-2.5 px-1 transition-all duration-100",
                        "text-text-secondary bg-surface hover:bg-secondary/60",
                        defaultCondition === c.value
                          ? "border-primary bg-primary/5 !text-primary"
                          : c.color
                      )}
                    >
                      <span className="text-xs font-bold font-sans">{c.label}</span>
                    </button>
                  </HoverTooltip>
                );
              })}
            </div>
          </div>

          <Divider />

          {/* Quantity */}
          <Input
            label="Cantidad"
            type="number"
            min={1}
            max={99}
            value={defaultQuantity}
            onChange={(e) => setDefaultQuantity(e.target.value)}
            wrapperClassName="w-32"
          />

          <Divider />

          {/* Location */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-text-primary font-sans flex items-center gap-1.5">
              <MapPin size={14} className="text-text-muted" />
              Ubicación
            </label>
            <LocationPickerList value={defaultLocations} onChange={setDefaultLocations} />
          </div>

          <Divider />

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary font-sans flex items-center gap-1.5">
              <MessageSquare size={14} className="text-text-muted" />
              Comentario (opcional)
            </label>
            <textarea
              rows={2}
              maxLength={300}
              value={defaultNotes}
              onChange={(e) => setDefaultNotes(e.target.value)}
              placeholder="Ej: Cartas en excelente estado."
              className={cn(
                "w-full rounded-lg border border-border bg-surface px-3 py-2.5",
                "font-sans text-sm text-text-primary placeholder:text-text-muted",
                "resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
              )}
            />
            <span className={cn(
              "text-xs font-sans self-end",
              defaultNotes.length >= 280 ? "text-warning" : "text-text-muted"
            )}>
              {defaultNotes.length}/300
            </span>
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          className="w-full mt-5"
          onClick={applyDefaults}
        >
          Aplicar a todas las cartas
        </Button>
      </div>

      {/* Section 2 — Card list with overrides */}
      <div className="surface-raised overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary/40">
          <p className="text-sm font-semibold font-sans text-text-primary">
            {items.length} carta{items.length !== 1 ? "s" : ""} en el lote
          </p>
        </div>

        <div className="divide-y divide-border">
          {items.map((item, idx) => {
            const price = parseARSInput(item.priceRaw);
            const valid = isRowValid(item);
            const isEditing = editingIdx === idx;

            return (
              <div key={`${item.card.id}-${idx}`} className={cn(!valid && "bg-error/5")}>
                {/* Summary row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="shrink-0 w-8 h-11 rounded-md overflow-hidden bg-secondary border border-border/50">
                    {item.card.image_url ? (
                      <Image
                        src={item.card.image_url}
                        alt={item.card.name}
                        width={32}
                        height={44}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Tag size={12} className="text-border" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium font-sans text-text-primary truncate">
                      {item.card.name}
                      {item.overridden && (
                        <Lock size={11} className="inline ml-1.5 text-accent" />
                      )}
                    </p>
                    <p className="text-xs text-text-muted font-sans truncate">
                      {setLabel(item.card.set_code, item.card.set_name)} · {GAME_LABELS[item.card.game]}
                    </p>
                    {price > 0 && (
                      <p className="text-xs font-sans mt-0.5">
                        <span className="font-price text-text-primary">{formatARS(price)}</span>
                        <span className="text-text-muted ml-1.5">
                          · {item.condition} · Qty: {item.quantity}
                        </span>
                      </p>
                    )}
                    {!valid && (
                      <p className="text-xs text-error font-sans mt-0.5">Precio requerido</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingIdx(isEditing ? null : idx)}
                      className={cn(
                        "p-1.5 rounded transition-colors",
                        isEditing
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-secondary text-text-muted hover:text-text-primary"
                      )}
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCard(idx)}
                      className="p-1.5 rounded hover:bg-error/10 text-text-muted hover:text-error transition-colors"
                      title="Quitar"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Expanded editor */}
                {isEditing && (
                  <div className="px-4 pb-4 pt-1 border-t border-border/50 bg-secondary/20">
                    <div className="flex flex-col gap-4">
                      {/* Price */}
                      <Input
                        label="Precio (ARS)"
                        type="text"
                        inputMode="numeric"
                        placeholder="Ej: 15000"
                        value={item.priceRaw}
                        onChange={(e) =>
                          updateItem(idx, {
                            priceRaw: e.target.value.replace(/[^0-9.,]/g, ""),
                            overridden: true,
                          })
                        }
                        leftAddon={<span className="text-sm font-sans font-medium text-text-muted">$</span>}
                      />

                      {/* Condition */}
                      <div>
                        <p className="text-xs font-medium text-text-primary font-sans mb-2">Condición</p>
                        <div className="grid grid-cols-5 gap-1">
                          {CONDITIONS.map((c) => (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => updateItem(idx, { condition: c.value, overridden: true })}
                              className={cn(
                                "rounded-lg border-2 py-1.5 text-xs font-bold font-sans transition-all",
                                item.condition === c.value
                                  ? "border-primary bg-primary/5 text-primary"
                                  : "border-border bg-surface text-text-secondary hover:bg-secondary/60"
                              )}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Language */}
                      <div>
                        <p className="text-xs font-medium text-text-primary font-sans mb-2">Idioma</p>
                        <LanguageSelector
                          game={item.card.game}
                          value={item.language}
                          onChange={(lang) => updateItem(idx, { language: lang, overridden: true })}
                        />
                      </div>

                      {/* Quantity */}
                      <Input
                        label="Cantidad"
                        type="number"
                        min={1}
                        max={99}
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, { quantity: e.target.value, overridden: true })}
                        wrapperClassName="w-28"
                      />

                      {/* Location */}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-medium text-text-primary font-sans flex items-center gap-1.5">
                          <MapPin size={12} className="text-text-muted" />
                          Ubicación
                        </label>
                        <LocationPickerList
                          value={item.locations}
                          onChange={(locs) => updateItem(idx, { locations: locs, overridden: true })}
                        />
                      </div>

                      {/* Notes */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-text-primary font-sans">
                          Comentario
                        </label>
                        <textarea
                          rows={2}
                          maxLength={300}
                          value={item.notes}
                          onChange={(e) => updateItem(idx, { notes: e.target.value, overridden: true })}
                          className={cn(
                            "w-full rounded-lg border border-border bg-surface px-3 py-2",
                            "font-sans text-sm text-text-primary placeholder:text-text-muted",
                            "resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
                          )}
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setEditingIdx(null)}
                        >
                          Guardar cambios
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setEditingIdx(null)}
                        >
                          Cancelar
                        </Button>
                        {item.overridden && (
                          <button
                            type="button"
                            onClick={() => resetOverride(idx)}
                            className="ml-auto flex items-center gap-1 text-xs text-text-muted hover:text-primary font-sans transition-colors"
                            title="Restaurar valores por defecto"
                          >
                            <Lock size={11} />
                            Restaurar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Commission preview + publish */}
      <div className="surface-raised p-6">
        <p className="text-sm font-semibold font-sans text-text-primary mb-1">
          Vas a crear {items.length} listing{items.length !== 1 ? "s" : ""}
        </p>
        {totalCommission > 0 && (
          <p className="text-xs text-text-muted font-sans mb-4">
            Comisión total estimada de plataforma: {formatARS(totalCommission)}
          </p>
        )}

        {!allValid && items.length >= 2 && (
          <p className="text-xs text-error font-sans mb-4">
            Todas las cartas deben tener un precio válido antes de publicar.
          </p>
        )}

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!allValid || submitting}
          loading={submitting}
          leftIcon={!submitting ? <Check size={16} /> : undefined}
          onClick={handlePublish}
        >
          Publicar {items.length} listing{items.length !== 1 ? "s" : ""}
        </Button>

        <p className="text-xs text-text-muted font-sans text-center mt-3">
          Al publicar aceptás los{" "}
          <a href="/terminos" className="underline hover:text-text-secondary">
            Términos y Condiciones
          </a>{" "}
          de Card Stash
        </p>
      </div>
    </div>
  );
}
