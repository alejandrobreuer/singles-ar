"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { MessageSquare, Camera, ShoppingBag, Repeat2, Tag, MapPin } from "lucide-react";
import { cn }                    from "@/lib/utils";
import { Topbar }                from "@/components/layout/Topbar";
import { Button }                from "@/components/ui/button";
import { Input }                 from "@/components/ui/input";
import { Divider }               from "@/components/ui/divider";
import { Spinner }               from "@/components/ui/spinner";
import { PriceValidator }        from "@/components/sell/PriceValidator";
import { CommissionBreakdown }   from "@/components/sell/CommissionBreakdown";
import { toast }                 from "sonner";
import { parseARSInput, formatARSNumber } from "@/lib/formatting";
import { DEFAULT_SETTINGS }      from "@/lib/priceValidation";
import type { Condition, ListingType, AdminSettings } from "@/types/database";

// ─── Constants (same as sell page) ───────────────────────────────────────────

const CONDITIONS: Array<{ value: Condition; label: string; desc: string; color: string }> = [
  { value: "NM",  label: "NM",  desc: "Near Mint",         color: "border-success/40 data-[selected]:bg-success-subtle data-[selected]:border-success data-[selected]:text-success" },
  { value: "LP",  label: "LP",  desc: "Lightly Played",    color: "border-blue-200 data-[selected]:bg-blue-50 data-[selected]:border-blue-500 data-[selected]:text-blue-700" },
  { value: "MP",  label: "MP",  desc: "Moderately Played", color: "border-warning/30 data-[selected]:bg-warning-subtle data-[selected]:border-warning data-[selected]:text-warning" },
  { value: "HP",  label: "HP",  desc: "Heavily Played",    color: "border-orange-200 data-[selected]:bg-orange-50 data-[selected]:border-orange-500 data-[selected]:text-orange-700" },
  { value: "DMG", label: "DMG", desc: "Damaged",           color: "border-error/30 data-[selected]:bg-error-subtle data-[selected]:border-error data-[selected]:text-error" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditListingPage() {
  const router     = useRouter();
  const { id }     = useParams<{ id: string }>();

  // ── Remote state ──────────────────────────────────────────────────────────
  const [loading,  setLoading]  = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [cardName, setCardName] = React.useState("");
  const [cardImage, setCardImage] = React.useState<string | null>(null);
  const [cardId,   setCardId]   = React.useState("");

  // ── Form state ────────────────────────────────────────────────────────────
  const [listingType, setListingType] = React.useState<ListingType>("sale");
  const [condition,   setCondition]   = React.useState<Condition>("NM");
  const [priceRaw,    setPriceRaw]    = React.useState("");
  const [quantity,    setQuantity]    = React.useState("1");
  const [notes,           setNotes]           = React.useState("");
  const [deliveryStores,  setDeliveryStores]  = React.useState<string[]>([]);
  const [storeOptions,    setStoreOptions]    = React.useState<string[]>([]);
  const [tradeFor,        setTradeFor]        = React.useState("");
  const [priceDiff,   setPriceDiff]   = React.useState("");

  // ── Settings & price ref ──────────────────────────────────────────────────
  const [settings,    setSettings]    = React.useState<AdminSettings>(DEFAULT_SETTINGS);
  const [cardPriceUSD, setCardPriceUSD] = React.useState<number | null>(null);
  const [usdToARS,    setUsdToARS]    = React.useState(DEFAULT_SETTINGS.usd_to_ars_rate);

  // ── Submission ────────────────────────────────────────────────────────────
  const [saving,    setSaving]    = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // ── Load existing listing + settings ──────────────────────────────────────
  React.useEffect(() => {
    async function load() {
      try {
        const [listingRes, settingsRes, storesRes] = await Promise.all([
          fetch(`/api/listings/${id}`),
          fetch("/api/settings"),
          fetch("/api/delivery-stores"),
        ]);

        if (!listingRes.ok) { setNotFound(true); return; }

        const { data: listing } = await listingRes.json();
        const settingsData      = await settingsRes.json().catch(() => DEFAULT_SETTINGS);
        const storesData        = await storesRes.json().catch(() => ({ data: [] }));
        setStoreOptions((storesData.data ?? []).map((s: { name: string }) => s.name));

        // Pre-fill form
        setListingType(listing.listing_type ?? "sale");
        setCondition(listing.condition ?? "NM");
        setPriceRaw(listing.price != null ? String(listing.price) : "");
        setQuantity(String(listing.quantity ?? 1));
        setNotes(listing.notes ?? "");
        setDeliveryStores(listing.delivery_stores ?? []);
        setTradeFor(listing.trade_for ?? "");
        setPriceDiff(listing.price_diff != null ? String(listing.price_diff) : "");

        // Card info (joined)
        const card = listing.cards ?? listing.card ?? null;
        setCardName(card?.name ?? "Carta");
        setCardImage(card?.image_url ?? null);
        setCardId(listing.card_id ?? card?.id ?? "");

        setSettings(settingsData);

        // Fetch card price reference
        if (listing.card_id) {
          fetch(`/api/cards/${listing.card_id}/price`)
            .then((r) => r.json())
            .then((d) => { setCardPriceUSD(d.price_usd ?? null); if (d.usd_to_ars) setUsdToARS(d.usd_to_ars); })
            .catch(() => {});
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const priceARS     = parseARSInput(priceRaw);
  const priceDiffNum = priceDiff ? parseARSInput(priceDiff) : null;
  const isValid      = listingType === "trade" ? tradeFor.trim().length > 0 : priceARS > 0;

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_type: listingType,
          condition,
          price:      listingType === "sale" ? priceARS : null,
          quantity:   parseInt(quantity, 10) || 1,
          notes:            notes.trim() || null,
          trade_for:        listingType === "trade" ? tradeFor.trim() : null,
          price_diff:       listingType === "trade" ? priceDiffNum : null,
          delivery_stores:  deliveryStores.length > 0 ? deliveryStores : null,
        }),
      });

      const json = await res.json();
      if (!res.ok) { setSaveError(json.error ?? "Error al guardar."); return; }

      toast.success("Publicación actualizada.");
      router.push("/profile");
    } catch {
      setSaveError("Error de red. Verificá tu conexión.");
    } finally {
      setSaving(false);
    }
  }

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Topbar />
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Topbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-text-muted">
          <Tag size={32} />
          <p className="font-sans text-sm">Publicación no encontrada o sin permisos.</p>
          <Button variant="secondary" size="sm" onClick={() => router.push("/profile")}>
            Volver a mi perfil
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Topbar />

      <main className="flex-1">
        {/* Header */}
        <div className="border-b border-border bg-surface">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6">
            <h1 className="text-2xl font-serif font-semibold text-text-primary mb-1">
              Editar publicación
            </h1>
            <p className="text-sm text-text-secondary font-sans">
              Modificá los detalles de tu listing
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 flex flex-col gap-6">

          {/* Card recap */}
          <div className="flex items-center gap-3 bg-surface rounded-xl border border-border px-4 py-3 shadow-card">
            <div className="shrink-0 w-8 h-11 rounded-md overflow-hidden border border-border bg-secondary">
              {cardImage
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={cardImage} alt={cardName} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-border" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold font-sans text-text-primary truncate">{cardName}</p>
              <p className="text-xs text-text-muted font-sans">La carta no puede cambiarse al editar</p>
            </div>
            {cardId && (
              <a href={`/cards/${cardId}`} className="text-xs text-text-muted hover:text-primary font-sans transition-colors shrink-0">
                Ver carta
              </a>
            )}
          </div>

          {/* Form */}
          <div className="surface-raised p-6 flex flex-col gap-6">

            {/* Listing type */}
            <div>
              <p className="text-sm font-medium text-text-primary font-sans mb-3">Tipo de publicación</p>
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

            {/* Condition */}
            <div>
              <p className="text-sm font-medium text-text-primary font-sans mb-3">Estado de la carta</p>
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
                    <span className="text-2xs font-sans leading-none text-center opacity-70 hidden sm:block">{c.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <Divider />

            {/* Sale fields */}
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
                      ? <span className="text-xs text-text-muted font-sans whitespace-nowrap">{formatARSNumber(priceARS)} ARS</span>
                      : undefined
                  }
                />
                {priceARS > 0 && (
                  <>
                    <PriceValidator
                      priceARS={priceARS}
                      tcgMedianUSD={cardPriceUSD}
                      usdToARS={usdToARS}
                      tolerancePercent={settings.price_tolerance_percent}
                    />
                    <CommissionBreakdown
                      priceARS={priceARS}
                      platformFeePercent={settings.platform_fee_percent}
                      mpFeePercent={settings.mp_fee_percent}
                    />
                  </>
                )}
              </div>
            )}

            {/* Trade fields */}
            {listingType === "trade" && (
              <div className="flex flex-col gap-4">
                <Input
                  label="¿Qué pedís a cambio?"
                  placeholder="Ej: Counterspell de cualquier set…"
                  value={tradeFor}
                  onChange={(e) => setTradeFor(e.target.value)}
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
            <Input
              label="Cantidad disponible"
              type="number"
              min={1}
              max={99}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              wrapperClassName="w-32"
            />

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
                placeholder="Ej: Carta en excelente estado, envío por correo disponible."
                className={cn(
                  "w-full rounded-lg border border-border bg-surface px-3 py-2.5",
                  "font-sans text-sm text-text-primary placeholder:text-text-muted",
                  "resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                )}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted font-sans flex items-center gap-1.5">
                  <Camera size={11} /> Podés compartir fotos en el chat con el comprador
                </span>
                <span className={cn("text-xs font-sans", notes.length >= 280 ? "text-warning" : "text-text-muted")}>
                  {notes.length}/300
                </span>
              </div>
            </div>

            <Divider />

            {/* Delivery stores */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-text-primary font-sans flex items-center gap-1.5">
                <MapPin size={14} className="text-text-muted" />
                Lugar de entrega — Tiendas
              </label>
              <p className="text-xs text-text-muted font-sans -mt-1">
                Seleccioná las tiendas donde podés encontrarte con el comprador.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                {storeOptions.map((store) => {
                  const checked = deliveryStores.includes(store);
                  return (
                    <label key={store} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setDeliveryStores((prev) =>
                            checked ? prev.filter((s) => s !== store) : [...prev, store]
                          )
                        }
                        className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                      />
                      <span className="text-sm font-sans text-text-secondary group-hover:text-text-primary transition-colors">
                        {store}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Error */}
          {saveError && (
            <div role="alert" className="flex items-start gap-2.5 rounded-lg bg-error-subtle border border-error/20 px-4 py-3">
              <span className="mt-0.5 size-4 shrink-0 rounded-full bg-error/15 text-error flex items-center justify-center text-xs font-bold">!</span>
              <p className="text-sm text-error font-sans">{saveError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="secondary" size="lg" className="flex-1" onClick={() => router.push("/profile")}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              disabled={!isValid}
              loading={saving}
              onClick={handleSave}
            >
              Guardar cambios
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
