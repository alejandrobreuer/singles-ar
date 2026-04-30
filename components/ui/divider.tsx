import * as React from "react";
import { cn } from "@/lib/utils";

export interface DividerProps {
  orientation?: "horizontal" | "vertical";
  label?:       string;
  className?:   string;
}

export function Divider({
  orientation = "horizontal",
  label,
  className,
}: DividerProps) {
  if (orientation === "vertical") {
    return (
      <span
        role="separator"
        aria-orientation="vertical"
        className={cn("inline-block w-px self-stretch bg-border", className)}
      />
    );
  }

  if (label) {
    return (
      <div
        role="separator"
        className={cn("flex items-center gap-3 w-full", className)}
      >
        <span className="flex-1 h-px bg-border" />
        <span className="text-xs text-text-muted font-sans font-medium whitespace-nowrap">
          {label}
        </span>
        <span className="flex-1 h-px bg-border" />
      </div>
    );
  }

  return (
    <hr
      role="separator"
      className={cn("border-none h-px bg-border w-full", className)}
    />
  );
}
