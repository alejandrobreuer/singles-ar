"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CardSearchBarProps {
  placeholder?: string;
  className?:   string;
  autoFocus?:   boolean;
  /** If true, navigates to /cards?q=... instead of updating current page params */
  navigateTo?:  string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CardSearchBar({
  placeholder = "Buscar cartas, sets, colecciones…",
  className,
  autoFocus   = false,
  navigateTo,
}: CardSearchBarProps) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const [value,   setValue]   = React.useState(searchParams.get("q") ?? "");
  const [pending, setPending] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef    = React.useRef<HTMLInputElement>(null);

  // Sync with URL changes (e.g. browser back/forward)
  React.useEffect(() => {
    setValue(searchParams.get("q") ?? "");
  }, [searchParams]);

  function pushSearch(q: string) {
    const target = navigateTo ?? pathname;
    const params = new URLSearchParams(searchParams.toString());

    if (q) {
      params.set("q", q);
    } else {
      params.delete("q");
    }
    params.delete("page");   // reset pagination on new search

    setPending(true);
    router.push(`${target}?${params.toString()}`);
    // pending cleared by useEffect on searchParams change
  }

  React.useEffect(() => {
    setPending(false);
  }, [searchParams]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setValue(v);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushSearch(v), 400);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    pushSearch(value);
  }

  function handleClear() {
    setValue("");
    pushSearch("");
    inputRef.current?.focus();
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={cn("relative flex items-center", className)}
    >
      {/* Search icon */}
      <span className="absolute left-4 flex items-center pointer-events-none text-text-muted">
        {pending
          ? <Loader2 size={18} className="animate-spin" />
          : <Search size={18} />
        }
      </span>

      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        aria-label="Buscar cartas"
        className={cn(
          "w-full h-12 rounded-xl border border-border bg-surface",
          "pl-12 pr-10 font-sans text-sm text-text-primary",
          "placeholder:text-text-muted",
          "transition-all duration-150",
          "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
          "hover:border-primary/25",
          // clear native search cancel button in webkit
          "[&::-webkit-search-cancel-button]:appearance-none"
        )}
      />

      {/* Clear button */}
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Limpiar búsqueda"
          className="absolute right-3 text-text-muted hover:text-text-secondary transition-colors p-1 rounded"
        >
          <X size={15} />
        </button>
      )}
    </form>
  );
}
