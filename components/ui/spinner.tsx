import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type SpinnerSize    = "xs" | "sm" | "md" | "lg";
type SpinnerVariant = "primary" | "white" | "muted";

export interface SpinnerProps {
  size?:    SpinnerSize;
  variant?: SpinnerVariant;
  label?:   string;       // screen-reader label
  className?: string;
}

// ─── Sizes ────────────────────────────────────────────────────────────────────

const sizes: Record<SpinnerSize, string> = {
  xs: "size-3   border-[1.5px]",
  sm: "size-4   border-2",
  md: "size-6   border-2",
  lg: "size-8   border-[3px]",
};

const variants: Record<SpinnerVariant, string> = {
  primary: "border-primary/20 border-t-primary",
  white:   "border-white/30   border-t-white",
  muted:   "border-border     border-t-text-muted",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Spinner({
  size    = "md",
  variant = "primary",
  label   = "Cargando…",
  className,
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-block rounded-full animate-spin-slow", sizes[size], variants[variant], className)}
    />
  );
}

// ─── Full-page / overlay loader ───────────────────────────────────────────────

export function SpinnerOverlay({ label = "Cargando…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-text-secondary font-sans">{label}</p>
      </div>
    </div>
  );
}
