"use client";

import * as React from "react";
import Image from "next/image";
import { Search, Loader2, X, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { setLabel } from "@/lib/formatting";
import type { CardSearchResult, Game } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CardAutocompleteProps {
  onSelect:   (card: CardSearchResult) => void;
  disabled?:  boolean;
  className?: string;
}

const GAME_BADGE: Record<Game, React.ComponentProps<typeof Badge>["variant"]> = {
  magic:    "magic",
  pokemon:  "poke",
  onepiece: "op",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function CardAutocomplete({ onSelect, disabled, className }: CardAutocompleteProps) {
  const [query,       setQuery]       = React.useState("");
  const [results,     setResults]     = React.useState<CardSearchResult[]>([]);
  const [loading,     setLoading]     = React.useState(false);
  const [open,        setOpen]        = React.useState(false);
  const [highlighted, setHighlighted] = React.useState(-1);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef     = React.useRef<HTMLInputElement>(null);
  const debounceRef  = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Outside click closes dropdown ─────────────────────────────────────────
  React.useEffect(() => {
    function onMousedown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMousedown);
    return () => document.removeEventListener("mousedown", onMousedown);
  }, []);

  // ── Search ────────────────────────────────────────────────────────────────
  async function search(q: string) {
    if (!q.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res  = await fetch(`/api/cards/search?q=${encodeURIComponent(q)}&limit=8`);
      const data = await res.json() as { data: CardSearchResult[] };
      setResults(data.data ?? []);
      setOpen(true);
      setHighlighted(-1);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 300);
  }

  function handleSelect(card: CardSearchResult) {
    onSelect(card);
    setQuery(card.name);
    setOpen(false);
    setResults([]);
  }

  function handleClear() {
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  }

  // ── Keyboard navigation ───────────────────────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlighted((h) => Math.min(h + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlighted((h) => Math.max(h - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlighted >= 0 && results[highlighted]) {
          handleSelect(results[highlighted]);
        }
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Input */}
      <div className="relative flex items-center">
        <span className="absolute left-3.5 text-text-muted pointer-events-none">
          {loading
            ? <Loader2 size={17} className="animate-spin" />
            : <Search size={17} />
          }
        </span>

        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls="card-autocomplete-listbox"
          autoComplete="off"
          disabled={disabled}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Buscar carta por nombre…"
          className={cn(
            "w-full h-12 rounded-xl border border-border bg-surface",
            "pl-10 pr-10 font-sans text-sm text-text-primary",
            "placeholder:text-text-muted transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
            "hover:border-primary/25",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Limpiar búsqueda"
            className="absolute right-3 text-text-muted hover:text-text-secondary transition-colors"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <ul
          id="card-autocomplete-listbox"
          role="listbox"
          className={cn(
            "absolute z-50 top-full mt-1.5 w-full",
            "bg-surface border border-border rounded-xl shadow-card-lg",
            "overflow-hidden animate-fade-in",
            "max-h-[360px] overflow-y-auto"
          )}
        >
          {results.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-text-muted font-sans">
              Sin resultados para "{query}"
            </li>
          ) : (
            results.map((card, i) => (
              <li
                key={card.id}
                role="option"
                aria-selected={i === highlighted}
                onMouseEnter={() => setHighlighted(i)}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(card); }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                  i === highlighted ? "bg-primary/5" : "hover:bg-secondary/70",
                  i > 0 && "border-t border-border/50"
                )}
              >
                {/* Thumbnail */}
                <div className="shrink-0 w-8 h-11 rounded-md overflow-hidden bg-secondary border border-border/50">
                  {card.image_url ? (
                    <Image
                      src={card.image_url}
                      alt={card.name}
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

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium font-sans text-text-primary truncate">
                    {card.name}
                  </p>
                  <p className="text-xs text-text-muted font-sans truncate">
                    {setLabel(card.set_code, card.set_name)}
                    {card.external_id && (
                      <span className="ml-1.5 font-mono opacity-50">{card.external_id}</span>
                    )}
                  </p>
                </div>

                {/* Game badge */}
                <Badge
                  variant={GAME_BADGE[card.game]}
                  size="sm"
                  className="shrink-0"
                />
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
