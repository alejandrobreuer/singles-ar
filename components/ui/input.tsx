"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:       string;
  helperText?:  string;
  error?:       string;
  leftAddon?:   React.ReactNode;
  rightAddon?:  React.ReactNode;
  wrapperClassName?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      leftAddon,
      rightAddon,
      wrapperClassName,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const helperId = `${inputId}-helper`;
    const errorId  = `${inputId}-error`;
    const hasError = Boolean(error);

    return (
      <div className={cn("flex flex-col gap-1.5", wrapperClassName)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-text-primary select-none"
          >
            {label}
          </label>
        )}

        {/* Input row */}
        <div className="relative flex items-center">
          {leftAddon && (
            <span className="absolute left-3 flex items-center text-text-muted pointer-events-none">
              {leftAddon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            aria-describedby={
              hasError ? errorId : helperText ? helperId : undefined
            }
            aria-invalid={hasError || undefined}
            className={cn(
              // base
              "w-full h-10 rounded-lg border bg-surface font-sans text-sm text-text-primary",
              "placeholder:text-text-muted transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60",
              // normal border
              !hasError && "border-border hover:border-primary/30",
              // error state
              hasError && "border-error/70 focus:ring-error/25 focus:border-error",
              // addon padding
              leftAddon  ? "pl-9"  : "pl-3",
              rightAddon ? "pr-9"  : "pr-3",
              // disabled
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-secondary",
              className
            )}
            {...props}
          />

          {rightAddon && (
            <span className="absolute right-3 flex items-center text-text-muted">
              {rightAddon}
            </span>
          )}
        </div>

        {/* Helper / Error text */}
        {hasError ? (
          <p id={errorId} role="alert" className="text-xs text-error font-sans">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-text-muted font-sans">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";
