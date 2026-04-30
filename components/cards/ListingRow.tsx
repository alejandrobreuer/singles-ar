import * as React from "react";
import Link from "next/link";
import { ShieldCheck, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import type { Condition, ListingWithSeller } from "@/types/database";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CONDITION_META: Record<Condition, { label: string; color: string }> = {
  NM:  { label: "NM",  color: "bg-success-subtle text-success border-success/20" },
  LP:  { label: "LP",  color: "bg-blue-50 text-blue-700 border-blue-200" },
  MP:  { label: "MP",  color: "bg-warning-subtle text-warning border-warning/20" },
  HP:  { label: "HP",  color: "bg-orange-50 text-orange-700 border-orange-200" },
  DMG: { label: "DMG", color: "bg-error-subtle text-error border-error/20" },
};

function formatARS(price: number): string {
  return new Intl.NumberFormat("es-AR", {
    style:    "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ListingRowProps {
  listing:   ListingWithSeller;
  className?: string;
}

export function ListingRow({ listing, className }: ListingRowProps) {
  const { profiles: seller } = listing;
  const cond = CONDITION_META[listing.condition] ?? CONDITION_META.NM;

  return (
    <div
      className={cn(
        "flex items-center gap-4 px-4 py-3.5 rounded-xl border border-border",
        "bg-surface hover:bg-secondary/60 transition-colors duration-150",
        className
      )}
    >
      {/* Condition badge */}
      <span
        className={cn(
          "shrink-0 inline-flex items-center justify-center w-10 h-6 rounded text-2xs font-sans font-bold border",
          cond.color
        )}
      >
        {cond.label}
      </span>

      {/* Seller info */}
      <Link
        href={`/perfil/${seller.username}`}
        className="flex items-center gap-2 min-w-0 flex-1 no-underline group"
      >
        <Avatar name={seller.username} size="sm" className="shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium font-sans text-text-primary truncate group-hover:text-primary transition-colors">
            {seller.username}
          </p>
          <div className="flex items-center gap-1">
            <Star size={10} className="text-accent fill-accent" />
            <span className="text-2xs text-text-muted font-sans">
              {seller.reputation_score.toFixed(1)}
            </span>
            <span className="text-2xs text-text-muted font-sans">
              · {seller.total_sales} ventas
            </span>
          </div>
        </div>
      </Link>

      {/* Qty */}
      {listing.quantity > 1 && (
        <span className="shrink-0 text-xs text-text-muted font-sans">
          ×{listing.quantity}
        </span>
      )}

      {/* MP badge — seller connected */}
      {seller.id && (
        <ShieldCheck size={14} className="shrink-0 text-success" aria-label="Vendedor verificado MP" />
      )}

      {/* Price */}
      <span className="shrink-0 font-price text-base text-text-primary ml-auto">
        {formatARS(listing.price)}
      </span>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function ListingRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-border bg-surface animate-pulse">
      <div className="w-10 h-6 bg-border rounded" />
      <div className="flex items-center gap-2 flex-1">
        <div className="size-7 rounded-full bg-border" />
        <div className="flex flex-col gap-1.5">
          <div className="h-3.5 bg-border rounded w-24" />
          <div className="h-2.5 bg-border rounded w-16" />
        </div>
      </div>
      <div className="h-4 bg-border rounded w-20" />
    </div>
  );
}
