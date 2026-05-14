"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShoppingBag, Repeat2, ChevronRight, ChevronDown,
  MessageSquare, Camera, Check, Search, Loader2, Tag, X, MapPin, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StepIndicator }        from "@/components/auth/StepIndicator";
import { PriceValidator }       from "@/components/sell/PriceValidator";
import { CommissionBreakdown }  from "@/components/sell/CommissionBreakdown";
import { ListingPreview }       from "@/components/sell/ListingPreview";
import { Button }               from "@/components/ui/button";
import { Input }                from "@/components/ui/input";
import { Divider }              from "@/components/ui/divider";
import { Spinner }              from "@/components/ui/spinner";
import { Badge }                from "@/components/ui/badge";
import { HoverTooltip }         from "@/components/ui/HoverTooltip";
import { SearchableSelect }     from "@/components/ui/SearchableSelect";
import { CONDITIONS, CONDITION_DETAILS, ConditionGuideModal, ConditionConfirmModal } from "@/components/sell/ConditionModals";
import { toast }               from "sonner";
import { RARITY_DESCRIPTIONS, COLOR_DESCRIPTIONS } from "@/lib/cardAttributes";
import { useUser }              from "@/hooks/useUser";
import { parseARSInput, formatARSNumber, setLabel } from "@/lib/formatting";
import { DEFAULT_SETTINGS }     from "@/lib/priceValidation";
import type { CardSearchResult, Condition, ListingType, AdminSettings, Game } from "@/types/database";

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Carta",    sublabel: "Elegí qué vendés" },
  { label: "Detalles", sublabel: "Precio y condición" },
  { label: "Publicar", sublabel: "Revisión final" },
];

const GAME_OPTIONS: Array<{ game: Game; label: string; sublabel: string; accent: string; badge: React.ComponentProps<typeof Badge>["variant"] }> = [
  { game: "onepiece", label: "One Piece",        sublabel: "Card Game",     accent: "bg-red-50 border-red-200 hover:border-red-400 text-red-900",     badge: "op" },
  { game: "magic",    label: "Magic",            sublabel: "the Gathering", accent: "bg-purple-50 border-purple-200 hover:border-purple-400 text-purple-900", badge: "magic" },
  { game: "pokemon",  label: "Pokémon",          sublabel: "TCG",           accent: "bg-yellow-50 border-yellow-200 hover:border-yellow-400 text-yellow-900", badge: "poke" },
];

const GAME_LABEL: Record<Game, string> = {
  onepiece: "One Piece",
  magic:    "Magic: the Gathering",
  pokemon:  "Pokémon TCG",
};

interface FilterOptions {
  sets:     { code: string; name: string }[];
  rarities: string[];
  colors:   string[];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SellPage() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const { user, profile, loading: userLoading } = useUser();

  // ── Step state ────────────────────────────────────────────────────────────
  const [step,         setStep]         = React.useState<1 | 2 | 3>(1);
  const [selectedCard, setSelectedCard] = React.useState<CardSearchResult | null>(null);

  // ── Step 1: game + filter + search state ─────────────────────────────────
  const [selectedGame,    setSelectedGame]    = React.useState<Game | null>(null);
  const [filterOptions,   setFilterOptions]   = React.useState<FilterOptions | null>(null);
  const [filtersLoading,  setFiltersLoading]  = React.useState(false);
  const [filterSet,       setFilterSet]       = React.useState("");
  const [filterRarity,    setFilterRarity]    = React.useState("");
  const [filterColor,     setFilterColor]     = React.useState("");
  const [searchQuery,     setSearchQuery]     = React.useState("");
  const [cardResults,     setCardResults]     = React.useState<CardSearchResult[]>([]);
  const [resultsMeta,     setResultsMeta]     = React.useState<{ total: number; pages: number; page: number } | null>(null);
  const [searching,       setSearching]       = React.useState(false);
  const [searchError,     setSearchError]     = React.useState<string | null>(null);
  const [hasSearched,     setHasSearched]     = React.useState(false);

  // ── Form state ────────────────────────────────────────────────────────────
  const [listingType, setListingType] = React.useState<ListingType>("sale");
  const [condition,   setCondition]   = React.useState<Condition>("NM");
  const [priceRaw,    setPriceRaw]    = React.useState("");
  const [quantity,    setQuantity]    = React.useState("1");
  const [notes,           setNotes]           = React.useState("");
  const [deliveryStores,    setDeliveryStores]    = React.useState<string[]>([]);
  const [storeOptions,      setStoreOptions]      = React.useState<string[]>([]);
  const [tradeFor,        setTradeFor]        = React.useState("");
  const [priceDiff,   setPriceDiff]   = React.useState("");

  // ── Price reference ───────────────────────────────────────────────────────
  const [platformMedianARS,   setPlatformMedianARS]   = React.useState<number | null>(null);
  const [platformTxCount,     setPlatformTxCount]     = React.useState(0);
  const [settings,            setSettings]            = React.useState<AdminSettings>(DEFAULT_SETTINGS);
  const [priceLoading,        setPriceLoading]        = React.useState(false);

  // ── Submission ────────────────────────────────────────────────────────────
  const [submitting,   setSubmitting]   = React.useState(false);
  const [submitError,  setSubmitError]  = React.useState<string | null>(null);

  // ── Condition guide + confirmation ────────────────────────────────────────
  const [conditionGuideOpen, setConditionGuideOpen] = React.useState(false);
  const [pendingCondition,   setPendingCondition]   = React.useState<Condition | null>(null);

  // ── Fetch settings + store options once ──────────────────────────────────
  React.useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: AdminSettings) => setSettings(data))
      .catch(() => {});

    fetch("/api/delivery-stores")
      .then((r) => r.json())
      .then((json) => setStoreOptions((json.data ?? []).map((s: { name: string }) => s.name)))
      .catch(() => {});
  }, []);

  // ── Auto-select card when navigating from a card page ────────────────────
  // Build CardSearchResult from URL params to avoid an extra fetch.
  // Falls back to GET /api/cards/:id only when name/game are missing.
  React.useEffect(() => {
    const cardId = searchParams.get("card_id");
    if (!cardId || userLoading || selectedCard) return;

    const name  = searchParams.get("name");
    const game  = searchParams.get("game") as Game | null;

    async function autoSelect() {
      let card: CardSearchResult;

      if (name && game) {
        // All data already in the URL — no fetch needed
        card = {
          id:          cardId!,
          name,
          game,
          external_id: searchParams.get("external_id") ?? "",
          image_url:   searchParams.get("image_url")   || null,
          set_name:    searchParams.get("set_name")    || null,
          set_code:    searchParams.get("set_code")    || null,
          card_number: searchParams.get("card_number") || null,
          rarity:      searchParams.get("rarity")      || null,
          color:       searchParams.get("color")       || null,
        };
      } else {
        // Fallback: only card_id was passed
        const res = await fetch(`/api/cards/${cardId}`);
        if (!res.ok) return;
        const json = await res.json() as { data: CardSearchResult };
        card = json.data;
      }

      setSelectedGame(card.game);
      await handleCardSelect(card);
    }

    void autoSelect();
  // handleCardSelect omitted intentionally — changes every render but is stable in practice
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading, searchParams]);

  // ── Load filter options when game is selected ─────────────────────────────
  async function handleGameSelect(game: Game) {
    setSelectedGame(game);
    setFilterSet("");
    setFilterRarity("");
    setFilterColor("");
    setSearchQuery("");
    setCardResults([]);
    setHasSearched(false);
    setResultsMeta(null);
    setFiltersLoading(true);
    try {
      const res  = await fetch(`/api/cards/filters?game=${game}`);
      const data = await res.json() as FilterOptions;
      setFilterOptions(data);
    } catch {
      setFilterOptions({ sets: [], rarities: [], colors: [] });
    } finally {
      setFiltersLoading(false);
    }
  }

  // ── Search cards ──────────────────────────────────────────────────────────
  async function handleSearch(e?: React.FormEvent, page = 1) {
    e?.preventDefault();
    if (!selectedGame) return;
    setSearching(true);
    setSearchError(null);
    try {
      const params = new URLSearchParams({ game: selectedGame, page: String(page), limit: "24" });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (filterSet)          params.set("set", filterSet);
      if (filterRarity)       params.set("rarity", filterRarity);
      if (filterColor)        params.set("color", filterColor);

      const res  = await fetch(`/api/cards/search?${params}`);
      const data = await res.json() as { data?: CardSearchResult[]; error?: string; meta?: { total: number; pages: number; page: number } };

      if (!res.ok) {
        setSearchError(data.error ?? "Error al buscar cartas.");
        setHasSearched(true);
        return;
      }

      if (page === 1) {
        setCardResults(data.data ?? []);
      } else {
        setCardResults((prev) => [...prev, ...(data.data ?? [])]);
      }
      setResultsMeta(data.meta ?? null);
      setHasSearched(true);
    } catch {
      setSearchError("Error de red al buscar cartas.");
      setHasSearched(true);
    } finally {
      setSearching(false);
    }
  }

  // ── When card is selected, fetch platform median price ───────────────────
  async function handleCardSelect(card: CardSearchResult) {
    setSelectedCard(card);
    setPriceLoading(true);
    setPlatformMedianARS(null);
    setPlatformTxCount(0);

    try {
      const res  = await fetch(`/api/cards/${card.id}/price`);
      const data = await res.json() as { price_ars: number | null; count: number };
      setPlatformMedianARS(data.price_ars ?? null);
      setPlatformTxCount(data.count ?? 0);
    } catch {
      // Non-critical
    } finally {
      setPriceLoading(false);
    }

    setStep(2);
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const priceARS     = parseARSInput(priceRaw);
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
          notes:            notes.trim() || null,
          trade_for:        listingType === "trade" ? tradeFor.trim() : null,
          price_diff:       listingType === "trade" ? priceDiffNum : null,
          delivery_stores:  deliveryStores.length > 0 ? deliveryStores : null,
        }),
      });

      const data = await res.json() as {
        data?:   { card_id: string };
        error?:  string;
        code?:   string;
        detail?: string;
        hint?:   string;
        pg?:     string;
        field?:  string;
      };

      if (!res.ok) {
        const parts = [data.error ?? "Error al publicar."];
        if (data.code)   parts.push(`[${data.code}]`);
        if (data.field)  parts.push(`Campo: ${data.field}`);
        if (data.detail) parts.push(data.detail);
        if (data.hint)   parts.push(data.hint);
        if (data.pg)     parts.push(`PG: ${data.pg}`);
        setSubmitError(parts.join(" — "));
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
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  // ── Step 2 validation ─────────────────────────────────────────────────────
  const step2Valid =
    listingType === "trade"
      ? tradeFor.trim().length > 0
      : priceARS > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">

      <main className="flex-1">
        {/* ── Page header ───────────────────────────────────────────────── */}
        <div className="border-b border-border bg-surface">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6">
            <h1 className="text-2xl font-serif font-semibold text-text-primary mb-1">
              Publicar listing
            </h1>
            <p className="text-sm text-text-secondary font-sans">
              Vendé o intercambiá una carta en Card Stash
            </p>
          </div>
        </div>

        {/* ── Content ───────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
          <StepIndicator steps={STEPS} currentStep={step - 1} className="mb-8" />

          {/* ════════════════════════════════════════════════════
              STEP 1 — Game picker + card search
          ════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="animate-fade-in flex flex-col gap-5">
              <div className="surface-raised p-6">

                {/* ── 1a: Game picker ─────────────────────────────────── */}
                {!selectedGame ? (
                  <>
                    <h2 className="text-base font-semibold font-sans text-text-primary mb-1">
                      ¿Qué tipo de carta querés publicar?
                    </h2>
                    <p className="text-sm text-text-muted font-sans mb-5">
                      Elegí el juego para ver los filtros disponibles.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {GAME_OPTIONS.map((opt) => (
                        <button
                          key={opt.game}
                          type="button"
                          onClick={() => handleGameSelect(opt.game)}
                          className={cn(
                            "rounded-xl border-2 px-4 py-5 text-center transition-all duration-150 flex flex-col items-center gap-1",
                            opt.accent
                          )}
                        >
                          <Badge variant={opt.badge} size="sm" className="mb-1" />
                          <span className="text-sm font-semibold font-sans">{opt.label}</span>
                          <span className="text-xs font-sans opacity-60">{opt.sublabel}</span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  /* ── 1b: Filters + search ──────────────────────────── */
                  <>
                    {/* Game indicator */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={GAME_OPTIONS.find((o) => o.game === selectedGame)!.badge}
                          size="sm"
                        />
                        <span className="text-sm font-semibold font-sans text-text-primary">
                          {GAME_LABEL[selectedGame]}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setSelectedGame(null); setCardResults([]); setHasSearched(false); }}
                        className="text-xs text-text-muted hover:text-primary font-sans transition-colors"
                      >
                        Cambiar juego
                      </button>
                    </div>

                    {/* Filters row */}
                    {filtersLoading ? (
                      <div className="flex items-center gap-2 text-sm text-text-muted font-sans py-3 mb-4">
                        <Spinner size="xs" /> Cargando filtros…
                      </div>
                    ) : filterOptions && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {/* Set filter */}
                        {filterOptions.sets.length > 0 && (
                          <SearchableSelect
                            label="Set"
                            value={filterSet}
                            onChange={setFilterSet}
                            options={filterOptions.sets.map((s) => ({ value: s.code, label: `${s.code} ${s.name}` }))}
                          />
                        )}

                        {/* Rarity filter */}
                        {filterOptions.rarities.length > 0 && (
                          <FilterSelect
                            label="Rareza"
                            value={filterRarity}
                            onChange={setFilterRarity}
                            options={filterOptions.rarities.map((r) => ({ value: r, label: r }))}
                          />
                        )}

                        {/* Color filter (One Piece only) */}
                        {selectedGame === "onepiece" && filterOptions.colors.length > 0 && (
                          <FilterSelect
                            label="Color"
                            value={filterColor}
                            onChange={setFilterColor}
                            options={filterOptions.colors.map((c) => ({ value: c, label: c }))}
                          />
                        )}
                      </div>
                    )}

                    {/* Search bar */}
                    <form onSubmit={handleSearch} className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                          {searching
                            ? <Loader2 size={16} className="animate-spin" />
                            : <Search size={16} />
                          }
                        </span>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Buscar por nombre…"
                          className={cn(
                            "w-full h-10 rounded-lg border border-border bg-surface",
                            "pl-9 pr-3 font-sans text-sm text-text-primary",
                            "placeholder:text-text-muted transition-colors",
                            "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                          )}
                        />
                      </div>
                      <Button type="submit" variant="primary" size="sm" loading={searching} disabled={searching}>
                        Buscar
                      </Button>
                    </form>

                    {/* Results */}
                    {hasSearched && (
                      <div className="mt-5">
                        {searchError ? (
                          <p className="text-sm text-error font-sans text-center py-8">{searchError}</p>
                        ) : cardResults.length === 0 && !searching ? (
                          <p className="text-sm text-text-muted font-sans text-center py-8">
                            Sin resultados. Probá con otro nombre o filtros distintos.
                          </p>
                        ) : (
                          <>
                            {resultsMeta && (
                              <p className="text-xs text-text-muted font-sans mb-3">
                                {resultsMeta.total.toLocaleString()} carta{resultsMeta.total !== 1 ? "s" : ""} encontrada{resultsMeta.total !== 1 ? "s" : ""}
                              </p>
                            )}

                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                              {cardResults.map((card) => (
                                <CardTile key={card.id} card={card} onClick={() => handleCardSelect(card)} />
                              ))}
                            </div>

                            {/* Load more */}
                            {resultsMeta && resultsMeta.page < resultsMeta.pages && (
                              <div className="mt-4 flex justify-center">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  loading={searching}
                                  onClick={() => handleSearch(undefined, (resultsMeta.page ?? 1) + 1)}
                                >
                                  Cargar más
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {!selectedGame && (
                <p className="text-xs text-text-muted font-sans text-center">
                  ¿No encontrás la carta? El catálogo se actualiza semanalmente.
                </p>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════
              STEP 2 — Listing details
          ════════════════════════════════════════════════════ */}
          {step === 2 && selectedCard && (
            <div className="animate-fade-in flex flex-col gap-6">

              <SelectedCardRecap card={selectedCard} onChangeCard={() => setStep(1)} />

              <div className="surface-raised p-6 flex flex-col gap-6">

                {/* Listing type toggle */}
                <div>
                  <p className="text-sm font-medium text-text-primary font-sans mb-3">
                    Tipo de publicación
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setListingType("sale")}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 transition-all duration-150 text-center",
                        listingType === "sale"
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-surface text-text-secondary hover:border-primary/30 hover:bg-secondary/50"
                      )}
                    >
                      <ShoppingBag size={16} />
                      <span className="text-sm font-semibold font-sans">Venta directa</span>
                      <span className="text-xs font-sans opacity-70">Precio fijo en ARS</span>
                    </button>

                    <div className="flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 text-center border-border bg-surface opacity-50 cursor-not-allowed select-none">
                      <Repeat2 size={16} className="text-text-muted" />
                      <span className="text-sm font-semibold font-sans text-text-muted">Trade / Canje</span>
                      <span className="text-xs font-sans text-text-muted">Intercambio de cartas</span>
                      <span className="text-2xs font-sans text-text-muted italic">Próximamente</span>
                    </div>
                  </div>
                </div>

                <Divider />

                {/* Condition selector */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-text-primary font-sans">
                      Estado de la carta
                    </p>
                    <button
                      type="button"
                      onClick={() => setConditionGuideOpen(true)}
                      className="flex items-center gap-1 text-xs text-text-muted hover:text-primary font-sans transition-colors"
                    >
                      <Info size={13} />
                      Ver guía
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {CONDITIONS.map((c) => {
                      const detail = CONDITION_DETAILS[c.value];
                      return (
                        <HoverTooltip
                          key={c.value}
                          label={detail.fullName}
                          detail={detail.subtitle}
                          className="contents"
                        >
                          <button
                            type="button"
                            data-selected={condition === c.value || undefined}
                            onClick={() => setPendingCondition(c.value)}
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
                        </HoverTooltip>
                      );
                    })}
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

                    {priceLoading ? (
                      <div className="flex items-center gap-2 text-sm text-text-muted font-sans py-2">
                        <Spinner size="xs" />
                        Consultando precio de referencia…
                      </div>
                    ) : (
                      priceARS > 0 && (
                        <PriceValidator
                          priceARS={priceARS}
                          platformMedianARS={platformMedianARS}
                          transactionCount={platformTxCount}
                        />
                      )
                    )}

                    {priceARS > 0 && (
                      <CommissionBreakdown
                        priceARS={priceARS}
                        platformFeePercent={settings.platform_commission_percent}
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

                <Divider />

                {/* Delivery stores */}
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-medium text-text-primary font-sans flex items-center gap-1.5">
                    <MapPin size={14} className="text-text-muted" />
                    Lugar de entrega — Tiendas
                  </label>
                  <p className="text-xs text-text-muted font-sans -mt-1">
                    Seleccioná las tiendas o zonas donde podés encontrarte con el comprador.
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

              <div className="flex gap-3">
                <Button variant="secondary" size="lg" className="flex-1" onClick={() => setStep(1)}>
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
                platformFeePercent={settings.platform_commission_percent}
                mpFeePercent={settings.mp_fee_percent}
              />

              {submitError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-lg bg-error-subtle border border-error/20 px-4 py-3"
                >
                  <span className="mt-0.5 size-4 shrink-0 rounded-full bg-error/15 text-error flex items-center justify-center text-xs font-bold">!</span>
                  <p className="text-sm text-error font-sans">{submitError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="secondary" size="lg" className="flex-1" disabled={submitting} onClick={() => setStep(2)}>
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
                de Card Stash
              </p>
            </div>
          )}
        </div>
      </main>

      {conditionGuideOpen && (
        <ConditionGuideModal onClose={() => setConditionGuideOpen(false)} />
      )}
      {pendingCondition && (
        <ConditionConfirmModal
          condition={pendingCondition}
          onConfirm={(c) => { setCondition(c); setPendingCondition(null); }}
          onCancel={() => setPendingCondition(null)}
        />
      )}
    </div>
  );
}

// ─── Card tile (results grid) ─────────────────────────────────────────────────

function CardTile({ card, onClick }: { card: CardSearchResult; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-xl border border-border",
        "bg-surface hover:border-primary/50 hover:bg-secondary/30",
        "transition-all duration-150 p-2 text-left group cursor-pointer"
      )}
    >
      <div className="w-full aspect-[3/4] rounded-lg overflow-hidden bg-secondary border border-border/50">
        {card.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.image_url}
            alt={card.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Tag size={14} className="text-border" />
          </div>
        )}
      </div>
      <p className="text-xs font-medium font-sans text-text-primary text-center leading-tight line-clamp-2 w-full">
        {card.name}
      </p>
      {(card.set_code || card.set_name) && (
        <p className="text-2xs text-text-muted font-sans text-center truncate w-full">
          {setLabel(card.set_code, card.set_name)}
        </p>
      )}
      {card.external_id && (
        <p className="text-2xs font-mono text-text-muted/50 font-sans text-center truncate w-full">
          {card.external_id}
        </p>
      )}
      {(card.rarity || card.color) && (
        <div className="flex flex-wrap justify-center gap-1 w-full">
          {card.rarity && (
            <HoverTooltip
              label={card.rarity}
              detail={RARITY_DESCRIPTIONS[card.rarity]}
            >
              <span className="text-2xs font-sans text-text-muted opacity-70 cursor-default">
                {card.rarity}
              </span>
            </HoverTooltip>
          )}
          {card.color && (() => {
            const primary = card.color.split(/[/ ]+/)[0];
            return (
              <HoverTooltip
                label={card.color}
                detail={primary ? COLOR_DESCRIPTIONS[primary] : undefined}
              >
                <span className="text-2xs font-sans text-text-muted opacity-70 cursor-default">
                  {card.color}
                </span>
              </HoverTooltip>
            );
          })()}
        </div>
      )}
    </button>
  );
}

// ─── Filter select ────────────────────────────────────────────────────────────

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label:    string;
  value:    string;
  onChange: (v: string) => void;
  options:  { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "appearance-none h-8 pl-3 pr-7 rounded-lg border border-border bg-surface",
          "font-sans text-xs text-text-primary transition-colors cursor-pointer",
          "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
          "hover:border-primary/30",
          !value && "text-text-muted"
        )}
      >
        <option value="">{label}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={12}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
          aria-label={`Limpiar filtro ${label}`}
        >
          <X size={11} />
        </button>
      )}
    </div>
  );
}

// ─── Selected card recap ──────────────────────────────────────────────────────

function SelectedCardRecap({
  card,
  onChangeCard,
}: {
  card:         CardSearchResult;
  onChangeCard: () => void;
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
          {setLabel(card.set_code, card.set_name)} · {GAME_LABELS[card.game] ?? card.game}
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
