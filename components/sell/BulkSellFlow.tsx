"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  X, ChevronRight, Tag, ShoppingBag, Pencil, Lock,
  Check, MapPin, MessageSquare, Package, Search, Loader2,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SellFilterSidebar } from "@/components/sell/SellFilterSidebar";
import { CONDITIONS, CONDITION_DETAILS } from "@/components/sell/ConditionModals";
import { LanguageSelector } from "@/components/sell/LanguageSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Divider } from "@/components/ui/divider";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { LocationPickerList } from "@/components/ui/LocationPickerList";
import { HoverTooltip } from "@/components/ui/HoverTooltip";
import { toast } from "sonner";
import { parseARSInput, formatARSNumber, formatARS, setLabel } from "@/lib/formatting";
import { RARITY_DESCRIPTIONS, COLOR_DESCRIPTIONS, LANGUAGES_BY_GAME } from "@/lib/cardAttributes";
import type {
  CardSearchResult, Condition, CardLanguage, ListingType,
  AdminSettings, Game, LocationValue,
} from "@/types/database";

// ─── Constants ────────────────────────────────────────────────────────────────

const GAME_BADGE: Record<Game, React.ComponentProps<typeof Badge>["variant"]> = {
  magic: "magic", pokemon: "poke", onepiece: "op",
};

const GAME_LABELS: Record<Game, string> = {
  magic: "Magic", pokemon: "Pokémon", onepiece: "One Piece",
};

const GAME_OPTIONS: Array<{ game: Game; label: string; sublabel: string; accent: string; badge: React.ComponentProps<typeof Badge>["variant"] }> = [
  { game: "onepiece", label: "One Piece",  sublabel: "Card Game",     accent: "bg-red-50 border-red-200 hover:border-red-400 text-red-900",         badge: "op" },
  { game: "magic",    label: "Magic",      sublabel: "the Gathering", accent: "bg-purple-50 border-purple-200 hover:border-purple-400 text-purple-900", badge: "magic" },
  { game: "pokemon",  label: "Pokémon",    sublabel: "TCG",           accent: "bg-yellow-50 border-yellow-200 hover:border-yellow-400 text-yellow-900", badge: "poke" },
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

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export function BulkSellFlow({ settings }: BulkSellFlowProps) {
  const router = useRouter();
  const [step, setStep] = React.useState<1 | 2>(1);
  const [items, setItems] = React.useState<BulkCardItem[]>([]);

  // Step 1 — game + filter + search
  const [selectedGame,    setSelectedGame]    = React.useState<Game | null>(null);
  const [filterOptions,   setFilterOptions]   = React.useState<FilterOptions | null>(null);
  const [filtersLoading,  setFiltersLoading]  = React.useState(false);
  const [filterSet,       setFilterSet]       = React.useState("");
  const [filterRarities,  setFilterRarities]  = React.useState<string[]>([]);
  const [filterColors,    setFilterColors]    = React.useState<string[]>([]);
  const [searchQuery,     setSearchQuery]     = React.useState("");
  const [cardResults,     setCardResults]     = React.useState<CardSearchResult[]>([]);
  const [resultsMeta,     setResultsMeta]     = React.useState<{ total: number; pages: number; page: number } | null>(null);
  const [searching,       setSearching]       = React.useState(false);
  const [searchError,     setSearchError]     = React.useState<string | null>(null);
  const [hasSearched,     setHasSearched]     = React.useState(false);

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

  // ── Step 1 helpers ─────────────────────────────────────────────────────────

  async function handleGameSelect(game: Game) {
    setSelectedGame(game);
    setFilterSet("");
    setFilterRarities([]);
    setFilterColors([]);
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

  async function handleSearch(e?: React.FormEvent, page = 1) {
    e?.preventDefault();
    if (!selectedGame) return;
    setSearching(true);
    setSearchError(null);
    try {
      const params = new URLSearchParams({ game: selectedGame, page: String(page), limit: "24" });
      if (searchQuery.trim())    params.set("q", searchQuery.trim());
      if (filterSet)             params.set("set", filterSet);
      if (filterRarities.length) params.set("rarity", filterRarities.join(","));
      if (filterColors.length)   params.set("color", filterColors.join(","));

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

  // ── Batch helpers ──────────────────────────────────────────────────────────

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
    toast.success(`${card.name} agregada al lote`);
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

  // Check if a card is already in the batch
  function isInBatch(cardId: string): boolean {
    return items.some((item) => item.card.id === cardId);
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
                  <a href={`/cards/${c.card_id}`} className="text-primary hover:underline">
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

  // ── Step 1 — Card selection (full game + filter + search) ──────────────────
  if (step === 1) {
    return (
      <div className="animate-fade-in flex flex-col gap-5">

        {/* Header with counter */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold font-sans text-text-primary">
            Seleccioná las cartas que querés publicar
          </h2>
          {items.length > 0 && (
            <span className="text-sm font-sans text-accent font-medium">
              {items.length} carta{items.length !== 1 ? "s" : ""} en el lote
            </span>
          )}
        </div>

        {/* Game picker */}
        {!selectedGame ? (
          <div className="surface-raised p-6">
            <h3 className="text-base font-semibold font-sans text-text-primary mb-1">
              ¿Qué tipo de carta querés agregar?
            </h3>
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
          </div>
        ) : (
          /* Filters + search */
          <div className="flex flex-col lg:flex-row gap-6 items-start">

            {/* Left sidebar — filters */}
            <aside className="w-full lg:w-64 lg:shrink-0 lg:sticky lg:top-24">
              {filtersLoading ? (
                <div className="surface-raised p-4 flex items-center gap-2 text-sm text-text-muted font-sans">
                  <Spinner size="xs" /> Cargando filtros…
                </div>
              ) : filterOptions && (
                filterOptions.sets.length > 0 ||
                filterOptions.rarities.length > 0 ||
                filterOptions.colors.length > 0 ||
                selectedGame === "pokemon"
              ) && (
                <SellFilterSidebar
                  game={selectedGame}
                  filterOptions={filterOptions}
                  selectedSet={filterSet}
                  onSetChange={setFilterSet}
                  selectedRarities={filterRarities}
                  onRaritiesChange={setFilterRarities}
                  selectedColors={filterColors}
                  onColorsChange={setFilterColors}
                />
              )}
            </aside>

            {/* Main — search + results */}
            <div className="surface-raised p-6 flex-1 min-w-0">
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
                        {cardResults.map((card) => {
                          const alreadyAdded = isInBatch(card.id);
                          return (
                            <BulkCardTile
                              key={card.id}
                              card={card}
                              added={alreadyAdded}
                              onClick={() => addCard(card)}
                            />
                          );
                        })}
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
            </div>
          </div>
        )}

        {!selectedGame && items.length === 0 && (
          <p className="text-xs text-text-muted font-sans text-center">
            ¿No encontrás la carta? El catálogo se actualiza semanalmente.
          </p>
        )}

        {/* Batch list */}
        {items.length > 0 && (
          <div className="surface-raised overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-secondary/40 flex items-center justify-between">
              <p className="text-sm font-semibold font-sans text-text-primary">
                Lote ({items.length} carta{items.length !== 1 ? "s" : ""})
              </p>
            </div>
            <div className="divide-y divide-border">
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
          </div>
        )}

        {items.length === 0 && selectedGame && (
          <div className="surface-raised p-8 text-center">
            <Package size={32} className="mx-auto text-border mb-3" />
            <p className="text-sm text-text-muted font-sans">
              Buscá y agregá cartas para empezar el lote
            </p>
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

// ─── Card tile for bulk search results ───────────────────────────────────────

function BulkCardTile({ card, added, onClick }: { card: CardSearchResult; added: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-xl border border-border",
        "transition-all duration-150 p-2 text-left group cursor-pointer relative",
        added
          ? "bg-success/5 border-success/30"
          : "bg-surface hover:border-primary/50 hover:bg-secondary/30"
      )}
    >
      <div className="w-full aspect-[3/4] rounded-lg overflow-hidden bg-secondary border border-border/50 relative">
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
        {/* Add / added overlay */}
        <div className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity",
          added ? "opacity-100 bg-success/20" : "opacity-0 group-hover:opacity-100 bg-black/20"
        )}>
          {added ? (
            <span className="size-7 rounded-full bg-success text-white flex items-center justify-center">
              <Check size={14} />
            </span>
          ) : (
            <span className="size-7 rounded-full bg-primary text-white flex items-center justify-center">
              <Plus size={14} />
            </span>
          )}
        </div>
      </div>
      <p className="text-xs font-medium font-sans text-text-primary text-center leading-tight line-clamp-2 w-full">
        {card.name}
      </p>
      {(card.set_code || card.set_name) && (
        <p className="text-2xs text-text-muted font-sans text-center truncate w-full">
          {setLabel(card.set_code, card.set_name)}
        </p>
      )}
      {(card.rarity || card.color) && (
        <div className="flex flex-wrap justify-center gap-1 w-full">
          {card.rarity && (
            <HoverTooltip label={card.rarity} detail={RARITY_DESCRIPTIONS[card.rarity]}>
              <span className="text-2xs font-sans text-text-muted opacity-70 cursor-default">
                {card.rarity}
              </span>
            </HoverTooltip>
          )}
          {card.color && (() => {
            const primary = card.color.split(/[/ ]+/)[0];
            return (
              <HoverTooltip label={card.color} detail={primary ? COLOR_DESCRIPTIONS[primary] : undefined}>
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
