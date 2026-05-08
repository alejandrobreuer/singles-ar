"use client";

import * as React from "react";
import { ChevronDown, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchableSelectProps {
  label:      string;
  value:      string;
  onChange:   (v: string) => void;
  options:    { value: string; label: string }[];
  className?: string;
}

export function SearchableSelect({
  label,
  value,
  onChange,
  options,
  className,
}: SearchableSelectProps) {
  const [open,  setOpen]  = React.useState(false);
  const [query, setQuery] = React.useState("");
  const containerRef      = React.useRef<HTMLDivElement>(null);
  const searchRef         = React.useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  // Close on outside click
  React.useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Auto-focus search input when dropdown opens; clear query on close
  React.useEffect(() => {
    if (open) {
      const t = setTimeout(() => searchRef.current?.focus(), 40);
      return () => clearTimeout(t);
    } else {
      setQuery("");
    }
  }, [open]);

  // Close on Escape
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") setOpen(false);
  }

  return (
    <div ref={containerRef} className={cn("relative", className)} onKeyDown={handleKeyDown}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 h-8 pl-3 pr-2.5 rounded-lg border border-border bg-surface",
          "font-sans text-xs transition-colors cursor-pointer select-none",
          "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
          "hover:border-primary/30",
          value ? "text-text-primary" : "text-text-muted",
          open && "border-primary/50 ring-2 ring-primary/30",
        )}
      >
        <span className="max-w-[140px] truncate">
          {selected ? selected.label : label}
        </span>

        {value ? (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            className="text-text-muted hover:text-text-primary transition-colors"
            aria-label={`Limpiar filtro ${label}`}
          >
            <X size={11} />
          </span>
        ) : (
          <ChevronDown size={12} className={cn("text-text-muted transition-transform", open && "rotate-180")} />
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className={cn(
            "absolute top-full left-0 mt-1 z-40",
            "bg-surface border border-border rounded-xl shadow-lg overflow-hidden",
          )}
          style={{ minWidth: "240px" }}
        >
          {/* Search input */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar set…"
                className={cn(
                  "w-full h-7 pl-7 pr-2 rounded-lg border border-border bg-background",
                  "font-sans text-xs text-text-primary placeholder:text-text-muted",
                  "focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/50",
                )}
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-text-muted font-sans text-center py-4 px-3">
                Sin resultados.
              </p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={cn(
                    "flex w-full items-center px-3 py-2 text-left text-xs font-sans transition-colors",
                    opt.value === value
                      ? "bg-primary/8 text-primary font-semibold"
                      : "text-text-secondary hover:bg-secondary/60 hover:text-text-primary",
                  )}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
