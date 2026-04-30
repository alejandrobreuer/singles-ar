"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type AvatarSize = "sm" | "md" | "lg";

export interface AvatarProps {
  src?:      string;
  alt?:      string;
  name?:     string;     // used to generate initials fallback
  size?:     AvatarSize;
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

/** Deterministic background color from name string */
const PALETTE = [
  "bg-primary   text-white",
  "bg-accent    text-white",
  "bg-success   text-white",
  "bg-blue-600  text-white",
  "bg-violet-600 text-white",
  "bg-rose-600  text-white",
];
function colorFromName(name: string): string {
  const hash = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return PALETTE[hash % PALETTE.length];
}

// ─── Sizes ────────────────────────────────────────────────────────────────────

const sizes: Record<AvatarSize, { wrap: string; text: string }> = {
  sm: { wrap: "size-7  text-xs",    text: "" },
  md: { wrap: "size-9  text-sm",    text: "" },
  lg: { wrap: "size-12 text-base",  text: "" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Avatar({
  src,
  alt,
  name = "",
  size = "md",
  className,
}: AvatarProps) {
  const [imgError, setImgError] = React.useState(false);
  const showImage = src && !imgError;
  const initials  = name ? getInitials(name) : "?";
  const colorClass = name ? colorFromName(name) : "bg-border text-text-muted";

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full overflow-hidden",
        "border border-border/50 select-none",
        sizes[size].wrap,
        !showImage && colorClass,
        className
      )}
      aria-label={alt ?? name}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt ?? name}
          className="size-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className={cn("font-sans font-medium leading-none", sizes[size].text)}>
          {initials}
        </span>
      )}
    </span>
  );
}
