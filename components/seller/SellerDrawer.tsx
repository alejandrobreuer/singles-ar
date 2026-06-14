"use client";

import * as React from "react";
import Link from "next/link";
import { Star, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { fantasyName } from "@/lib/fantasy-name";
import { formatARS } from "@/lib/formatting";
import { useSellerDrawer } from "@/hooks/useSellerDrawer";
import { LanguageBadge } from "@/components/ui/LanguageBadge";
import type { Game, CardLanguage } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DrawerListing {
  id:       string;
  price:    number | null;
  currency: string;
  card_id:  string;
  language: CardLanguage;
  cards: {
    id:       string;
    name:     string;
    set_name: string | null;
    game:     Game;
  };
}

interface SellerStats {
  reputation_score: number;
  total_sales:      number;
  created_at:       string;
}

const GAME_FILTERS: { value: Game | "all"; label: string }[] = [
  { value: "all",      label: "Todos" },
  { value: "magic",    label: "Magic" },
  { value: "pokemon",  label: "Pokémon" },
  { value: "onepiece", label: "OP" },
];

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function memberSince(dateStr: string): string {
  const d = new Date(dateStr);
  return `${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SellerDrawer() {
  const { isOpen, sellerId, close } = useSellerDrawer();

  const [listings, setListings] = React.useState<DrawerListing[]>([]);
  const [stats,    setStats]    = React.useState<SellerStats | null>(null);
  const [loading,  setLoading]  = React.useState(false);
  const [search,   setSearch]   = React.useState("");
  const [gameFilter, setGameFilter] = React.useState<Game | "all">("all");

  React.useEffect(() => {
    if (!isOpen || !sellerId) return;

    let cancelled = false;
    setLoading(true);
    setSearch("");
    setGameFilter("all");

    const supabase = createClient();

    void (async () => {
      const [{ data: listingRows }, { data: profileRow }] = await Promise.all([
        supabase
          .from("listings")
          .select(`
            id, price, currency, card_id, language,
            cards ( id, name, set_name, game )
          `)
          .eq("seller_id", sellerId)
          .eq("status", "active")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("reputation_score, total_sales, created_at")
          .eq("id", sellerId)
          .single(),
      ]);

      if (cancelled) return;
      setListings((listingRows ?? []) as unknown as DrawerListing[]);
      setStats((profileRow ?? null) as SellerStats | null);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [isOpen, sellerId]);

  const filtered = listings.filter((listing) => {
    if (gameFilter !== "all" && listing.cards.game !== gameFilter) return false;
    if (search.trim() && !listing.cards.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-200",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={close}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-surface shadow-xl",
          "flex flex-col transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
        role="dialog"
        aria-label="Más listings de este vendedor"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
          <h2 className="text-sm font-semibold font-sans text-text-primary">
            Más listings de este vendedor
          </h2>
          <button onClick={close} className="text-text-muted hover:text-text-primary transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="px-4 py-3 border-b border-border flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-sm font-sans text-text-primary">
              <Star size={13} className="text-accent fill-accent" />
              {stats.reputation_score.toFixed(1)}
            </span>
            <span className="text-sm text-text-muted font-sans">
              · {stats.total_sales} ventas
            </span>
            <span className="text-xs text-text-muted font-sans ml-auto">
              Miembro desde {memberSince(stats.created_at)}
            </span>
          </div>
        )}

        {/* Search */}
        <div className="px-4 py-3 border-b border-border">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en estos listings..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-secondary/40 text-sm font-sans text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Game filter pills */}
        <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 overflow-x-auto">
          {GAME_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setGameFilter(f.value)}
              className={cn(
                "shrink-0 px-3 py-1 rounded-full text-xs font-medium font-sans border transition-colors",
                gameFilter === f.value
                  ? "bg-primary text-white border-primary"
                  : "bg-surface text-text-secondary border-border hover:bg-secondary/60",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col gap-3 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2 animate-pulse">
                  <div className="h-4 bg-border rounded w-2/3" />
                  <div className="h-3 bg-border rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
              <p className="text-sm text-text-muted font-sans">
                {listings.length === 0
                  ? "Este vendedor no tiene otros listings activos en este momento."
                  : "Ningún listing coincide con tu búsqueda."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {filtered.map((listing) => (
                <div key={listing.id} className="px-4 py-3 border-b border-border last:border-b-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold font-serif text-text-primary leading-snug">
                      {listing.cards.name}
                    </p>
                    <span className="shrink-0 font-price text-sm text-text-primary">
                      {listing.price != null ? formatARS(listing.price) : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    {listing.cards.set_name && (
                      <span className="text-xs text-text-muted font-sans">{listing.cards.set_name}</span>
                    )}
                    <LanguageBadge language={listing.language} />
                    <Badge
                      variant={listing.cards.game === "magic" ? "magic" : listing.cards.game === "pokemon" ? "poke" : "op"}
                      size="sm"
                    />
                  </div>
                  <p className="text-2xs text-text-muted font-sans mb-1.5">
                    {fantasyName(listing.id)}
                  </p>
                  <Link
                    href={`/cards/${listing.card_id}`}
                    onClick={close}
                    className="text-xs font-medium font-sans text-primary hover:underline"
                  >
                    Ver carta →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
