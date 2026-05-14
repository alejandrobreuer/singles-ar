"use client";

import * as React    from "react";
import Image         from "next/image";
import Link          from "next/link";
import {
  TrendingUp, TrendingDown, ShoppingCart, Flame,
  User, Calendar, Search,
} from "lucide-react";
import { formatARS } from "@/lib/formatting";
import { cn }        from "@/lib/utils";
import type { Game } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PriceMover {
  id:        string;
  name:      string;
  image_url: string | null;
  game:      Game;
  prevPrice: number;
  currPrice: number;
  pctChange: number;   // positive = up, negative = down
}

export interface TrendingCard {
  id:             string;
  name:           string;
  image_url:      string | null;
  game:           Game;
  lowest_price:   number | null;
  listing_count:  number;
  wishlist_count: number;
}

export interface ActiveBuyOrder {
  id:         string;
  price:      number;
  quantity:   number;
  expires_at: string;
  created_at: string;
  cards: {
    id:                 string;
    name:               string;
    image_url:          string | null;
    image_override_url: string | null;
    game:               Game;
  } | null;
  profiles: { username: string } | null;
}

type SectionId = "orders" | "trending" | "up" | "down";
type SortKey   = "price_desc" | "price_asc" | "newest";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GAME_LABEL: Record<Game, string> = {
  magic:    "Magic",
  pokemon:  "Pokémon",
  onepiece: "One Piece",
};

const GAME_COLOR: Record<Game, string> = {
  magic:    "bg-purple-100 text-purple-700",
  pokemon:  "bg-yellow-100 text-yellow-700",
  onepiece: "bg-red-100 text-red-700",
};

function formatExpiry(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ─── Buy order row ────────────────────────────────────────────────────────────

const ROW_GRID = "grid grid-cols-[40px_1fr_120px_160px_72px] items-center gap-4";

function BuyOrderRow({ order }: { order: ActiveBuyOrder }) {
  const card     = order.cards;
  const buyer    = order.profiles;
  const imageUrl = card?.image_override_url ?? card?.image_url ?? null;
  const game     = card?.game ?? "magic";

  return (
    <div className={cn(ROW_GRID, "py-3 border-b border-border last:border-0")}>
      <div className="relative w-10 h-14 rounded-md overflow-hidden bg-secondary">
        {imageUrl ? (
          <Image src={imageUrl} alt={card?.name ?? "Carta"} fill sizes="40px" className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">?</div>
        )}
      </div>

      <div className="min-w-0">
        <p className="text-sm font-semibold font-sans text-text-primary truncate">{card?.name ?? "—"}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={cn("text-2xs font-sans font-medium px-1.5 py-0.5 rounded-full", GAME_COLOR[game])}>
            {GAME_LABEL[game]}
          </span>
          {order.quantity > 1 && (
            <span className="text-2xs font-sans text-text-muted">×{order.quantity}</span>
          )}
        </div>
      </div>

      <div>
        <p className="font-price text-sm font-semibold text-text-primary">{formatARS(order.price)}</p>
        <p className="text-2xs font-sans text-text-muted">por unidad</p>
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="flex items-center gap-1 text-xs font-sans text-text-secondary">
          <User size={11} className="text-text-muted" />
          {buyer?.username ?? "—"}
        </span>
        <span className="flex items-center gap-1 text-2xs font-sans text-text-muted">
          <Calendar size={10} />
          Vence {formatExpiry(order.expires_at)}
        </span>
      </div>

      <Link
        href={`/cards/${card?.id ?? ""}?highlight=${order.id}#buy-orders`}
        className={cn(
          "px-3 py-1.5 rounded-lg text-xs font-sans font-semibold no-underline text-center",
          "bg-primary text-white hover:bg-primary/90 transition-colors duration-150"
        )}
      >
        Vender
      </Link>
    </div>
  );
}

// ─── Controls ─────────────────────────────────────────────────────────────────

interface OrdersControlsProps {
  search:    string;
  game:      Game | "";
  sort:      SortKey;
  onSearch:  (v: string) => void;
  onGame:    (v: Game | "") => void;
  onSort:    (v: SortKey) => void;
}

const selectClass = cn(
  "h-9 rounded-lg border border-[#1a2744] bg-surface px-3 py-0",
  "text-sm font-sans text-text-primary",
  "focus:outline-none focus:ring-2 focus:ring-primary/20",
  "transition-colors duration-150 cursor-pointer"
);

function OrdersControls({ search, game, sort, onSearch, onGame, onSort }: OrdersControlsProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar por carta..."
          className={cn(
            "w-full h-9 pl-8 pr-3 rounded-lg border border-[#1a2744] bg-surface",
            "text-sm font-sans text-text-primary placeholder:text-text-muted",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-150"
          )}
        />
      </div>

      {/* Game filter */}
      <select value={game} onChange={(e) => onGame(e.target.value as Game | "")} className={selectClass}>
        <option value="">Todos los juegos</option>
        <option value="magic">Magic</option>
        <option value="pokemon">Pokémon</option>
        <option value="onepiece">One Piece</option>
      </select>

      {/* Sort */}
      <select value={sort} onChange={(e) => onSort(e.target.value as SortKey)} className={selectClass}>
        <option value="price_desc">Mayor precio</option>
        <option value="price_asc">Menor precio</option>
        <option value="newest">Más reciente</option>
      </select>
    </div>
  );
}

// ─── Buy orders content ───────────────────────────────────────────────────────

function BuyOrdersContent({ orders }: { orders: ActiveBuyOrder[] }) {
  const [search, setSearch] = React.useState("");
  const [game,   setGame]   = React.useState<Game | "">("");
  const [sort,   setSort]   = React.useState<SortKey>("price_desc");

  const filtered = React.useMemo(() => {
    let list = [...orders];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((o) => o.cards?.name.toLowerCase().includes(q));
    }
    if (game) {
      list = list.filter((o) => o.cards?.game === game);
    }
    if (sort === "price_desc") list.sort((a, b) => b.price - a.price);
    if (sort === "price_asc")  list.sort((a, b) => a.price - b.price);
    if (sort === "newest")     list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  }, [orders, search, game, sort]);

  return (
    <div>
      <OrdersControls
        search={search} game={game} sort={sort}
        onSearch={setSearch} onGame={setGame} onSort={setSort}
      />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3 border border-dashed border-border rounded-xl bg-background/50">
          <ShoppingCart size={24} className="text-text-muted" />
          <p className="text-sm font-sans text-text-muted">
            {orders.length === 0
              ? "Por ahora no hay órdenes de compra."
              : "Ninguna orden coincide con los filtros."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className={cn(ROW_GRID, "pb-2 border-b border-border")}>
            <span />
            <span className="text-2xs font-sans font-semibold text-text-muted uppercase tracking-wide">Carta</span>
            <span className="text-2xs font-sans font-semibold text-text-muted uppercase tracking-wide">Precio</span>
            <span className="text-2xs font-sans font-semibold text-text-muted uppercase tracking-wide">Comprador</span>
            <span />
          </div>
          {filtered.map((order) => (
            <BuyOrderRow key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Coming soon ──────────────────────────────────────────────────────────────

function ComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 border border-dashed border-border rounded-xl bg-background/50">
      <span className="text-2xl">🚧</span>
      <p className="text-sm font-sans font-medium text-text-secondary">Próximamente</p>
      <p className="text-xs font-sans text-text-muted text-center max-w-xs">
        Estamos trabajando en esta sección. ¡Volvé pronto!
      </p>
    </div>
  );
}

// ─── Trending cards ───────────────────────────────────────────────────────────

const TRENDING_ROW_GRID = "grid grid-cols-[40px_1fr_110px_110px_80px] items-center gap-4";

type TrendingSort = "demand" | "price_asc" | "price_desc";

function TrendingCardsContent({ cards }: { cards: TrendingCard[] }) {
  const [search, setSearch] = React.useState("");
  const [game,   setGame]   = React.useState<Game | "">("");
  const [sort,   setSort]   = React.useState<TrendingSort>("demand");

  const filtered = React.useMemo(() => {
    let list = [...cards];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (game) list = list.filter((c) => c.game === game);
    if (sort === "demand")     list.sort((a, b) => b.wishlist_count - a.wishlist_count);
    if (sort === "price_asc")  list.sort((a, b) => (a.lowest_price ?? Infinity) - (b.lowest_price ?? Infinity));
    if (sort === "price_desc") list.sort((a, b) => (b.lowest_price ?? -Infinity) - (a.lowest_price ?? -Infinity));
    return list;
  }, [cards, search, game, sort]);

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por carta..."
            className={cn(
              "w-full h-9 pl-8 pr-3 rounded-lg border border-[#1a2744] bg-surface",
              "text-sm font-sans text-text-primary placeholder:text-text-muted",
              "focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-150"
            )}
          />
        </div>
        <select
          value={game}
          onChange={(e) => setGame(e.target.value as Game | "")}
          className={cn("h-9 rounded-lg border border-[#1a2744] bg-surface px-3 text-sm font-sans text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer")}
        >
          <option value="">Todos los juegos</option>
          <option value="magic">Magic</option>
          <option value="pokemon">Pokémon</option>
          <option value="onepiece">One Piece</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as TrendingSort)}
          className={cn("h-9 rounded-lg border border-[#1a2744] bg-surface px-3 text-sm font-sans text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer")}
        >
          <option value="demand">Más buscadas</option>
          <option value="price_asc">Menor precio</option>
          <option value="price_desc">Mayor precio</option>
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3 border border-dashed border-border rounded-xl bg-background/50">
          <Flame size={24} className="text-text-muted" />
          <p className="text-sm font-sans text-text-muted">
            {cards.length === 0
              ? "Todavía no hay cartas en listas de deseos."
              : "Ninguna carta coincide con los filtros."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {/* Header */}
          <div className={cn(TRENDING_ROW_GRID, "pb-2 border-b border-border")}>
            <span />
            <span className="text-2xs font-sans font-semibold text-text-muted uppercase tracking-wide">Carta</span>
            <span className="text-2xs font-sans font-semibold text-text-muted uppercase tracking-wide">Buscando</span>
            <span className="text-2xs font-sans font-semibold text-text-muted uppercase tracking-wide">Precio</span>
            <span />
          </div>
          {filtered.map((card) => (
            <TrendingCardRow key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}

function TrendingCardRow({ card }: { card: TrendingCard }) {
  return (
    <div className={cn(TRENDING_ROW_GRID, "py-3 border-b border-border last:border-0")}>
      {/* Image */}
      <div className="relative w-10 h-14 rounded-md overflow-hidden bg-secondary shrink-0">
        {card.image_url ? (
          <Image src={card.image_url} alt={card.name} fill sizes="40px" className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">?</div>
        )}
      </div>

      {/* Name + game */}
      <div className="min-w-0">
        <p className="text-sm font-semibold font-sans text-text-primary truncate">{card.name}</p>
        <span className={cn("text-2xs font-sans font-medium px-1.5 py-0.5 rounded-full", GAME_COLOR[card.game])}>
          {GAME_LABEL[card.game]}
        </span>
      </div>

      {/* Demand */}
      <div>
        <p className="text-sm font-semibold font-sans text-text-primary">{card.wishlist_count}</p>
        <p className="text-2xs font-sans text-text-muted">
          {card.wishlist_count === 1 ? "persona" : "personas"}
        </p>
      </div>

      {/* Price */}
      <div>
        {card.lowest_price != null ? (
          <>
            <p className="font-price text-sm font-semibold text-text-primary">{formatARS(card.lowest_price)}</p>
            <p className="text-2xs font-sans text-text-muted">más barata</p>
          </>
        ) : (
          <p className="text-sm font-sans text-text-muted italic">Sin oferta</p>
        )}
      </div>

      {/* CTA */}
      <Link
        href={`/cards/${card.id}`}
        className={cn(
          "px-3 py-1.5 rounded-lg text-xs font-sans font-semibold no-underline text-center",
          "bg-primary text-white hover:bg-primary/90 transition-colors duration-150"
        )}
      >
        Ver carta
      </Link>
    </div>
  );
}

// ─── Price movers (shared for up & down) ─────────────────────────────────────

const MOVER_ROW_GRID = "grid grid-cols-[40px_1fr_130px_90px_80px] items-center gap-4";

type MoverSort = "pct" | "abs" | "price_desc" | "price_asc";

function PriceMoversContent({
  cards,
  direction,
}: {
  cards:     PriceMover[];
  direction: "up" | "down";
}) {
  const [search, setSearch] = React.useState("");
  const [game,   setGame]   = React.useState<Game | "">("");
  const [sort,   setSort]   = React.useState<MoverSort>("pct");

  const filtered = React.useMemo(() => {
    let list = [...cards];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (game) list = list.filter((c) => c.game === game);
    if (sort === "pct")        list.sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange));
    if (sort === "abs")        list.sort((a, b) => Math.abs(b.currPrice - b.prevPrice) - Math.abs(a.currPrice - a.prevPrice));
    if (sort === "price_desc") list.sort((a, b) => b.currPrice - a.currPrice);
    if (sort === "price_asc")  list.sort((a, b) => a.currPrice - b.currPrice);
    return list;
  }, [cards, search, game, sort]);

  const emptyIcon = direction === "up"
    ? <TrendingUp size={24} className="text-text-muted" />
    : <TrendingDown size={24} className="text-text-muted" />;

  const emptyText = cards.length === 0
    ? "No hay movimientos de precio en los últimos 30 días."
    : "Ninguna carta coincide con los filtros.";

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por carta..."
            className={cn(
              "w-full h-9 pl-8 pr-3 rounded-lg border border-[#1a2744] bg-surface",
              "text-sm font-sans text-text-primary placeholder:text-text-muted",
              "focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-150"
            )}
          />
        </div>
        <select
          value={game}
          onChange={(e) => setGame(e.target.value as Game | "")}
          className="h-9 rounded-lg border border-[#1a2744] bg-surface px-3 text-sm font-sans text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
        >
          <option value="">Todos los juegos</option>
          <option value="magic">Magic</option>
          <option value="pokemon">Pokémon</option>
          <option value="onepiece">One Piece</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as MoverSort)}
          className="h-9 rounded-lg border border-[#1a2744] bg-surface px-3 text-sm font-sans text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
        >
          <option value="pct">Mayor % de cambio</option>
          <option value="abs">Mayor cambio absoluto</option>
          <option value="price_desc">Precio actual más alto</option>
          <option value="price_asc">Precio actual más bajo</option>
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3 border border-dashed border-border rounded-xl bg-background/50">
          {emptyIcon}
          <p className="text-sm font-sans text-text-muted">{emptyText}</p>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className={cn(MOVER_ROW_GRID, "pb-2 border-b border-border")}>
            <span />
            <span className="text-2xs font-sans font-semibold text-text-muted uppercase tracking-wide">Carta</span>
            <span className="text-2xs font-sans font-semibold text-text-muted uppercase tracking-wide">Precio actual</span>
            <span className="text-2xs font-sans font-semibold text-text-muted uppercase tracking-wide">Cambio</span>
            <span />
          </div>
          {filtered.map((card) => (
            <PriceMoverRow key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}

function PriceMoverRow({ card }: { card: PriceMover }) {
  const isUp = card.pctChange >= 0;

  return (
    <div className={cn(MOVER_ROW_GRID, "py-3 border-b border-border last:border-0")}>
      {/* Image */}
      <div className="relative w-10 h-14 rounded-md overflow-hidden bg-secondary shrink-0">
        {card.image_url ? (
          <Image src={card.image_url} alt={card.name} fill sizes="40px" className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">?</div>
        )}
      </div>

      {/* Name + game */}
      <div className="min-w-0">
        <p className="text-sm font-semibold font-sans text-text-primary truncate">{card.name}</p>
        <span className={cn("text-2xs font-sans font-medium px-1.5 py-0.5 rounded-full", GAME_COLOR[card.game])}>
          {GAME_LABEL[card.game]}
        </span>
      </div>

      {/* Current price */}
      <div>
        <p className="font-price text-sm font-semibold text-text-primary">{formatARS(card.currPrice)}</p>
      </div>

      {/* % change */}
      <div className={cn(
        "text-sm font-sans font-bold",
        isUp ? "text-success" : "text-error"
      )}>
        {isUp ? "+" : ""}{card.pctChange}%
      </div>

      {/* CTA */}
      <Link
        href={`/cards/${card.id}`}
        className={cn(
          "px-3 py-1.5 rounded-lg text-xs font-sans font-semibold no-underline text-center",
          "bg-primary text-white hover:bg-primary/90 transition-colors duration-150"
        )}
      >
        Ver carta
      </Link>
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

const TABS: { id: SectionId; label: string; icon: React.ReactNode }[] = [
  { id: "orders",   label: "Órdenes de compra",      icon: <ShoppingCart size={16} /> },
  { id: "trending", label: "Más buscadas",            icon: <Flame        size={16} /> },
  { id: "up",       label: "Subieron de precio",      icon: <TrendingUp   size={16} /> },
  { id: "down",     label: "Bajaron de precio",       icon: <TrendingDown size={16} /> },
];

// ─── Root client component ────────────────────────────────────────────────────

export function MarketClient({
  orders,
  trendingCards,
  priceRisers,
  priceFallers,
}: {
  orders:        ActiveBuyOrder[];
  trendingCards: TrendingCard[];
  priceRisers:   PriceMover[];
  priceFallers:  PriceMover[];
}) {
  const [active, setActive] = React.useState<SectionId>("orders");

  return (
    <div className="bg-surface rounded-lg border-[3px] border-[#1a2744] overflow-hidden shadow-card">
      {/* Tab bar */}
      <div className="border-b border-border overflow-x-auto">
        <div className="flex min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={cn(
                "flex items-center gap-2 px-6 py-4 text-sm font-sans font-medium whitespace-nowrap",
                "border-b-[3px] transition-colors duration-150",
                active === tab.id
                  ? "border-[#1a2744] text-[#1a2744]"
                  : "border-transparent text-text-secondary hover:text-text-primary hover:border-border"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-6">
        {active === "orders"   && <BuyOrdersContent    orders={orders} />}
        {active === "trending" && <TrendingCardsContent cards={trendingCards} />}
        {active === "up"       && <PriceMoversContent   cards={priceRisers} direction="up" />}
        {active === "down"     && <PriceMoversContent cards={priceFallers} direction="down" />}
      </div>
    </div>
  );
}
