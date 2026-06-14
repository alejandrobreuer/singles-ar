import * as React from "react";
import { cn } from "@/lib/utils";
import { LANGUAGE_LABELS, LANGUAGE_FLAGS } from "@/lib/cardAttributes";
import type { CardLanguage } from "@/types/database";

interface LanguageBadgeProps {
  language:  CardLanguage | null | undefined;
  variant?:  "short" | "long";
  className?: string;
}

export function LanguageBadge({ language, variant = "short", className }: LanguageBadgeProps) {
  const lang  = language ?? "en";
  const flag  = LANGUAGE_FLAGS[lang]  ?? "";
  const label = LANGUAGE_LABELS[lang] ?? lang.toUpperCase();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded font-sans text-2xs text-text-muted shrink-0",
        className
      )}
    >
      {flag} {variant === "short" ? lang.toUpperCase() : label}
    </span>
  );
}
