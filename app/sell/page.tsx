"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingBag, Repeat2, ChevronRight,
  MessageSquare, Camera, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Topbar }               from "@/components/layout/Topbar";
import { StepIndicator }        from "@/components/auth/StepIndicator";
import { CardAutocomplete }     from "@/components/sell/CardAutocomplete";
import { PriceValidator }       from "@/components/sell/PriceValidator";
import { CommissionBreakdown }  from "@/components/sell/CommissionBreakdown";
import { ListingPreview }       from "@/components/sell/ListingPreview";
import { Button }               from "@/components/ui/button";
import { Input }                from "@/components/ui/input";
import { Divider }              from "@/components/ui/divider";
import { Spinner }              from "@/components/ui/spinner";
import { toast }               from "sonner";
import { useUser }              from "@/hooks/useUser";
import { parseARSInput, formatARSNumber } from "@/lib/formatting";
import { DEFAULT_SETTINGS }     from "@/lib/priceValidation";
import type { CardSearchResult, Condition, ListingType, AdminSettings } from "@/types/database";

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Carta",    sublabel: "Elegí qué vendés" },
  { label: "Detalles", sublabel: "Precio y condición" },
  { label: "Publicar", sublabel: "Revisión final" },
];

const CONDITIONS: Array<{ value: Condition; label: string; desc: string; color: string }> = [
  { value: "NM",  label: "NM",  desc: "Near Mint",           color: "border-success/40 data-[selected]:bg-success-subtle data-[selected]:border-success data-[selected]:text-success" },
  { value: "LP",  label: "LP",  desc: "Lightly Played",      color: "border-blue-200 data-[selected]:bg-blue-50 data-[selected]:border-blue-500 data-[selected]:text-blue-700" },
  { value: "MP",  label: "MP",  desc: "Moderately Played",   color: "border-warning/30 data-[selected]:bg-warning-subtle data-[selected]:border-warning data-[selected]:text-warning" },
  { value: "HP",  label: "HP",  desc: "Heavily Played",      color: "border-orange-200 data-[selected]:bg-orange-50 data-[selected]:border-orange-500 data-[selected]:text-orange-700" },
  { value: "DMG", label: "DMG", desc: "Damaged",             color: "border-error/30 data-[selected]:bg-error-subtle data-[selected]:border-error data-[selected]:text-error" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SellPage() {
  const router        = useRouter();
  const { user, profile, loading: userLoading } = useUser();

  // ── Step state ────────────────────────────────────────────────────────────
  const [step,         setStep]         = React.useState<1 | 2 | 3>(1);
  const [selectedCard, setSelectedCard] = React.useState<CardSearchResult | null>(null);

  // ── Form state ────────────────────────────────────────────────────────────
  const [listingType, setListingType] = React.useState<ListingType>("sale");
  const [condition,   setCondition]   = React.useState<Condition>("NM");
  const [priceRaw,    setPriceRaw]    = React.useState("");   // raw input string
  const [quantity,    setQuantity]    = React.useState("1");
  const [notes,       setNotes]       = React.useState("");
  const [tradeFor,    setTradeFor]    = React.useState("");
  const [priceDiff,   setPriceDiff]   = React.useState("");

  // ── Price reference (fetched when card selected) ──────────────────────────
  const [cardPriceUSD,  setCardPriceUSD]  = React.useState<number | null>(null);
  const [usdToARS,      setUsdToARS]      = React.useState<number>(DEFAULT_SETTINGS.usd_to_ars_rate);
  const [settings,      setSettings]      = React.useState<AdminSettings>(DEFAULT_SETTINGS);
  const [priceLoading,  setPriceLoading]  = React.useState(false);

  // ── Submission ────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // ── Fetch settings once ───────────────────────────────────────────────────
  React.useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: AdminSettings) => setSettings(data))
      .catch(() => {});
  }, []);

  // ── When card is selected, fetch its TCGPlayer price ─────────────────────
  async function handleCardSelect(card: CardSearchResult) {
    setSelectedCard(card);
    setPriceLoading(true);
    setCardPriceUSD(null);

    try {
      const res  = await fetch(`/api/cards/${card.id}/price`);
      const data = await res.json() as { price_usd: number | null; usd_to_ars: number };
      setCardPriceUSD(data.price_usd ?? null);
      if (data.usd_to_ars) setUsdToARS(data.usd_to_ars);
    } catch {
      // Non-critical: just skip price reference
    } finally {
      setPriceLoading(false);
    }

    setStep(2);
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const priceARS  = parseARSInput(priceRaw);
  const priceDiffNum = priceDiff ? parseARSInput(priceDiff) : null;

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!selectedCard) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/listings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          card_id:      selectedCard.id,
          listing_type: listingType,
          price:        listingType === "sale" ? priceARS : null,
          condition,
          quantity:     parseInt(quantity, 10) || 1,
          notes:        notes.trim() || null,
          trade_for:    listingType === "trade" ? tradeFor.trim() : null,
          price_diff:   listingType === "trade" ? priceDiffNum : null,
        }),
      });

      const data = await res.json() as { data?: { card_id: string }; error?: string };

      if (!res.ok) {
        setSubmitError(data.error ?? "Error al publicar.");
        return;
      }

      toast.success("¡Publicación creada con éxito!");
      router.push(`/cards/${data.data!.card_id}`);
    } catch {
      setSubmitError("Error de red. Verificá tu conexión.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Redirect if not logged in ─────────────────────────────────────────────
  if (!userLoading && !user) {
    router.replace("/login?next=/sell");
    return null;
  }

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Topbar user={null} />
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  // ─── Step 2 validation ────────────────────────────────────────────────────
  const step2Valid =
    listingType === "trade"
      ? tradeFor.trim().length > 0
      : priceARS > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Topbar />

      <main className="flex-1">
        {/* ── Page header ───────────────────────────────────────────────────── */}
        <div className="border-b border-border bg-surface">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6">
            <h1 className="text-2xl font-serif font-semibold text-text-primary mb-1">
              Publicar listing
            </h1>
            <p className="text-sm text-text-secondary font-sans">
              Vendé o intercambiá una carta en Singles.ar
            </p>
          </div>
        </div>

        {/* ── Content ───────────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
          {/* Step indicator */}
          <StepIndicator steps={STEPS} currentStep={step - 1} className="mb-8" />

          {/* ════════════════════════════════════════════════════
              STEP 1 — Card search
          ════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="animate-fade-in">
              <div className="surface-raised p-6">
                <h2 className="text-base font-semibold font-sans text-text-primary mb-1">
                  ¿Qué carta querés publicar?
                </h2>
                <p className="text-sm text-text-muted font-sans mb-5">
                  Buscá por nombre. Soportamos Magic, Pokémon y One Piece.
                </p>

                <CardAutocomplete onSelect={handleCardSelect} />

                <p className="text-xs text-text-muted font-sans mt-4 text-center">
                  ¿No encontrás la carta? El catálogo se actualiza semanalmente.
                </p>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════
              STEP 2 — Listing details
          ════════════════════════════════════════════════════ */}
          {step === 2 && selectedCard && (
            <div className="animate-fade-in flex flex-col gap-6">

              {/* Selected card recap */}
              <SelectedCardRecap card={selectedCard} onChangeCard={() => setStep(1)} />

              <div className="surface-raised p-6 flex flex-col gap-6">

                {/* Listing type toggle */}
                <div>
                  <p className="text-sm font-medium text-text-primary font-sans mb-3">
                    Tipo de publicación
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: "sale"  as ListingType, icon: <ShoppingBag size={16} />, label: "Venta directa", desc: "Precio fijo en ARS" },
                      { value: "trade" as ListingType, icon: <Repeat2     size={16} />, label: "Trade / Canje",  desc: "Intercambio de cartas" },
                    ]).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setListingType(opt.value)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 transition-all duration-150 text-center",
                          listingType === opt.value
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border bg-surface text-text-secondary hover:border-primary/30 hover:bg-secondary/50"
                        )}
                      >
                        {opt.icon}
                        <span className="text-sm font-semibold font-sans">{opt.label}</span>
                        <span className="text-xs font-sans opacity-70">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Divider />

                {/* Condition selector */}
                <div>
                  <p className="text-sm font-medium text-text-primary font-sans mb-3">
                    Estado de la carta
                  </p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {CONDITIONS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        data-selected={condition === c.value || undefined}
                        onClick={() => setCondition(c.value)}
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-lg border-2 py-2.5 px-1 transition-all duration-100",
                          "text-text-secondary bg-surface hover:bg-secondary/60",
                          c.color
                        )}
                      >
                        <span className="text-xs font-bold font-sans">{c.label}</span>
                        <span className="text-2xs font-sans leading-none text-center opacity-70 hidden sm:block">
                          {c.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <Divider />

                {/* Sale: price input */}
                {listingType === "sale" && (
                  <div className="flex flex-col gap-4">
                    <Input
                      label="Precio de venta (ARS)"
                      type="text"
                      inputMode="numeric"
                      placeholder="Ej: 15000"
                      value={priceRaw}
                      onChange={(e) => setPriceRaw(e.target.value.replace(/[^0-9.,]/g, ""))}
                      leftAddon={<span className="text-sm font-sans font-medium text-text-muted">$</span>}
                      rightAddon={
                        priceARS > 0
                          ? <span className="text-xs text-text-muted font-sans whitespace-nowrap">
                              {formatARSNumber(priceARS)} ARS
                            </span>
                          : undefined
                      }
                      helperText="Ingresá el precio que querés cobrar. Verás las comisiones abajo."
                    />

                    {/* Live price validation */}
                    {priceLoading ? (
                      <div className="flex items-center gap-2 text-sm text-text-muted font-sans py-2">
                        <Spinner size="xs" />
                        Consultando precio de referencia…
                      </div>
                    ) : (
                      priceARS > 0 && (
                        <PriceValidator
                          priceARS={priceARS}
                          tcgMedianUSD={cardPriceUSD}
                          usdToARS={usdToARS}
                          tolerancePercent={settings.price_tolerance_percent}
                        />
                      )
                    )}

                    {/* Live commission preview */}
                    {priceARS > 0 && (
                      <CommissionBreakdown
                        priceARS={priceARS}
                        platformFeePercent={settings.platform_fee_percent}
                        mpFeePercent={settings.mp_fee_percent}
                      />
                    )}
                  </div>
                )}

                {/* Trade: what they want */}
                {listingType === "trade" && (
                  <div className="flex flex-col gap-4">
                    <Input
                      label="¿Qué pedís a cambio?"
                      placeholder="Ej: Counterspell de cualquier set, o cartas de Pauper…"
                      value={tradeFor}
                      onChange={(e) => setTradeFor(e.target.value)}
                      helperText="Describí qué cartas o valor esperás recibir."
                    />
                    <Input
                      label="Diferencia de precio (opcional)"
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={priceDiff}
                      onChange={(e) => setPriceDiff(e.target.value.replace(/[^0-9.,-]/g, ""))}
                      leftAddon={<span className="text-sm font-sans font-medium text-text-muted">$</span>}
                      helperText="Positivo = te deben dar plata. Negativo = vos pagás la diferencia."
                    />
                  </div>
                )}

                <Divider />

                {/* Quantity */}
                <div className="flex items-end gap-4">
                  <Input
                    label="Cantidad disponible"
                    type="number"
                    min={1}
                    max={99}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    wrapperClassName="w-32"
                  />
                  <p className="text-xs text-text-muted font-sans pb-2.5">
                    ¿Tenés más de una copia para vender?
                  </p>
                </div>

                <Divider />

                {/* Notes */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-primary font-sans flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-text-muted" />
                    Comentario adicional (opcional)
                  </label>
                  <textarea
                    rows={3}
                    maxLength={300}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej: Carta en excelente estado, comprada en sobre. Envío por correo disponible."
                    className={cn(
                      "w-full rounded-lg border border-border bg-surface px-3 py-2.5",
                      "font-sans text-sm text-text-primary placeholder:text-text-muted",
                      "resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
                      "hover:border-primary/25"
                    )}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted font-sans flex items-center gap-1.5">
                      <Camera size={11} />
                      Podés compartir fotos en el chat con el comprador
                    </span>
                    <span className={cn(
                      "text-xs font-sans",
                      notes.length >= 280 ? "text-warning" : "text-text-muted"
                    )}>
                      {notes.length}/300
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  size="lg"
                  className="flex-1"
                  onClick={() => setStep(1)}
                >
                  Volver
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  disabled={!step2Valid}
                  rightIcon={<ChevronRight size={16} />}
                  onClick={() => setStep(3)}
                >
                  Revisar y publicar
                </Button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════
              STEP 3 — Preview + confirm
          ════════════════════════════════════════════════════ */}
          {step === 3 && selectedCard && (
            <div className="animate-fade-in flex flex-col gap-6">

              <ListingPreview
                card={selectedCard}
                listingType={listingType}
                price={listingType === "sale" ? priceARS : null}
                condition={condition}
                quantity={parseInt(quantity, 10) || 1}
                notes={notes}
                tradeFor={tradeFor}
                priceDiff={priceDiffNum}
                sellerUsername={profile?.username ?? "vos"}
                platformFeePercent={settings.platform_fee_percent}
                mpFeePercent={settings.mp_fee_percent}
              />

              {/* Error */}
              {submitError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-lg bg-error-subtle border border-error/20 px-4 py-3"
                >
                  <span className="mt-0.5 size-4 shrink-0 rounded-full bg-error/15 text-error flex items-center justify-center text-xs font-bold">!</span>
                  <p className="text-sm text-error font-sans">{submitError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  size="lg"
                  className="flex-1"
                  disabled={submitting}
                  onClick={() => setStep(2)}
                >
                  Editar
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  loading={submitting}
                  leftIcon={!submitting ? <Check size={16} /> : undefined}
                  onClick={handleSubmit}
                >
                  Publicar listing
                </Button>
              </div>

              <p className="text-xs text-text-muted font-sans text-center">
                Al publicar aceptás los{" "}
                <a href="/terminos" className="underline hover:text-text-secondary">
                  Términos y Condiciones
                </a>{" "}
                de Singles.ar
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Selected card recap ──────────────────────────────────────────────────────

function SelectedCardRecap({
  card,
  onChangeCard,
}: {
  card:          CardSearchResult;
  onChangeCard:  () => void;
}) {
  const GAME_LABELS: Record<string, string> = {
    magic: "Magic", pokemon: "Pokémon", onepiece: "One Piece",
  };

  return (
    <div className="flex items-center gap-3 bg-surface rounded-xl border border-border px-4 py-3 shadow-card">
      <div className="shrink-0 w-8 h-11 rounded-md overflow-hidden border border-border bg-secondary">
        {card.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-border" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold font-sans text-text-primary truncate">{card.name}</p>
        <p className="text-xs text-text-muted font-sans truncate">
          {card.set_name} · {GAME_LABELS[card.game] ?? card.game}
        </p>
      </div>
      <button
        type="button"
        onClick={onChangeCard}
        className="text-xs text-text-muted hover:text-primary font-sans transition-colors shrink-0"
      >
        Cambiar
      </button>
    </div>
  );
}
