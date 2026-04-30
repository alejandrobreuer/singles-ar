import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  selected?:  boolean;
  as?:        React.ElementType;
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function Card({
  className,
  hoverable = false,
  selected  = false,
  as: Tag   = "div",
  ...props
}: CardProps) {
  return (
    <Tag
      data-selected={selected || undefined}
      className={cn(
        // base
        "relative bg-surface rounded-xl border border-border shadow-card overflow-hidden",
        // hoverable
        hoverable &&
          "cursor-pointer transition-all duration-200 hover:shadow-card-md hover:-translate-y-0.5",
        // selected
        selected &&
          "border-primary ring-2 ring-primary/20 shadow-card-md",
        className
      )}
      {...props}
    />
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-start justify-between gap-3 px-5 pt-5 pb-0", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-serif font-semibold text-base text-text-primary leading-snug", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-text-muted leading-relaxed", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-5 pb-5 pt-0 border-t border-border/60 mt-2",
        className
      )}
      {...props}
    />
  );
}

export function CardImage({
  className,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt=""
      className={cn("w-full object-cover", className)}
      {...props}
    />
  );
}
