import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type BadgeVariant =
  | "navy"
  | "green"
  | "red"
  | "blue"
  | "amber"
  | "gold"
  | "slate"
  | "poke"
  | "magic"
  | "op";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?:     boolean;    // show colored dot prefix
  size?:    "sm" | "md";
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const base =
  "inline-flex items-center gap-1.5 rounded-full font-sans font-medium tracking-wide uppercase";

const variants: Record<BadgeVariant, string> = {
  navy:  "bg-primary/10 text-primary",
  green: "bg-success-subtle text-success",
  red:   "bg-error-subtle text-error",
  blue:  "bg-blue-50 text-blue-700",
  amber: "bg-warning-subtle text-warning",
  gold:  "bg-accent/10 text-accent-dark",
  slate: "bg-border text-text-secondary",
  // TCG-specific
  poke:  "bg-yellow-100 text-yellow-800",
  magic: "bg-violet-100 text-violet-800",
  op:    "bg-red-100 text-red-800",
};

const dotColors: Record<BadgeVariant, string> = {
  navy:  "bg-primary",
  green: "bg-success",
  red:   "bg-error",
  blue:  "bg-blue-500",
  amber: "bg-warning",
  gold:  "bg-accent",
  slate: "bg-text-muted",
  poke:  "bg-yellow-500",
  magic: "bg-violet-500",
  op:    "bg-red-500",
};

const sizes = {
  sm: "px-2 py-0.5 text-2xs",
  md: "px-2.5 py-1 text-xs",
};

// ─── Label map (for TCG badges) ───────────────────────────────────────────────

const defaultLabels: Partial<Record<BadgeVariant, string>> = {
  poke:  "Pokémon",
  magic: "Magic",
  op:    "One Piece",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Badge({
  className,
  variant = "slate",
  dot     = false,
  size    = "md",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {dot && (
        <span
          className={cn("size-1.5 rounded-full shrink-0", dotColors[variant])}
        />
      )}
      {children ?? defaultLabels[variant]}
    </span>
  );
}
