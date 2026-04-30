"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize    = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   ButtonVariant;
  size?:      ButtonSize;
  loading?:   boolean;
  leftIcon?:  React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Render children as the root element (e.g. wrap a Next.js Link) */
  asChild?:   boolean;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const base =
  "inline-flex items-center justify-center gap-2 font-sans font-medium rounded-lg " +
  "transition-all duration-150 ease-smooth select-none " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 " +
  "disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-600 active:bg-primary-700 shadow-sm hover:shadow-card",
  secondary:
    "bg-surface text-text-primary border border-border hover:bg-secondary hover:border-primary/30 shadow-sm",
  ghost:
    "bg-transparent text-text-secondary hover:bg-primary/5 hover:text-text-primary",
  danger:
    "bg-error text-white hover:bg-red-700 active:bg-red-800 shadow-sm",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8  px-3 text-xs  rounded-md",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

// ─── Component ────────────────────────────────────────────────────────────────

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant  = "primary",
      size     = "md",
      loading  = false,
      leftIcon,
      rightIcon,
      disabled,
      asChild  = false,
      children,
      ...props
    },
    ref
  ) => {
    const buttonClass = cn(base, variants[variant], sizes[size], className);

    // asChild: clone the single child and inject button styles onto it
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<React.HTMLAttributes<HTMLElement>>, {
        className: cn(buttonClass, (children as React.ReactElement<React.HTMLAttributes<HTMLElement>>).props.className),
      });
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={buttonClass}
        {...props}
      >
        {loading ? (
          <>
            <LoadingDots />
            <span className="sr-only">Cargando…</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);
Button.displayName = "Button";

// Inline mini-spinner used only inside Button
function LoadingDots() {
  return (
    <span className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-current opacity-80 animate-bounce"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </span>
  );
}
