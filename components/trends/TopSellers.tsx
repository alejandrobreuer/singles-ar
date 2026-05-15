import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { TopSellerItem } from "@/lib/trends";

interface Props {
  items: TopSellerItem[];
}

const GAME_COLORS: Record<string, string> = {
  "0": "bg-[#fff3e0] text-[#b54000]",
  "1": "bg-[#f0eefa] text-[#5b40b0]",
  "2": "bg-[#fdeaea] text-[#b02020]",
  "3": "bg-secondary text-text-secondary",
};

function avatarInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function reputationStars(score: number): string {
  const filled = Math.round((score / 100) * 5);
  return "★".repeat(filled) + "☆".repeat(5 - filled);
}

function sellerBadge(index: number, salesInPeriod: number): { label: string; className: string } {
  if (index === 0 && salesInPeriod >= 10)
    return { label: "Top vendedor", className: "bg-[#f5e6c0] text-accent border border-[#e8d0a0]" };
  if (salesInPeriod >= 5)
    return { label: "Verificado",   className: "bg-[#edf7f2] text-[#1a7a4a] border border-[#b8dece]" };
  return { label: "Activo", className: "bg-secondary text-text-secondary border border-border" };
}

export function TopSellers({ items }: Props) {
  if (!items.length) {
    return (
      <div className="col-span-4 text-center py-10 text-text-muted text-sm font-sans">
        Sin vendedores destacados para este período.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item, i) => {
        const badge = sellerBadge(i, item.salesInPeriod);
        return (
          <Link key={item.profile.id} href={`/profile/${item.profile.username}`} className="no-underline">
            <div className="surface-raised p-4 sm:p-5 text-center hover:-translate-y-0.5 hover:shadow-card-lg transition-all duration-200 cursor-pointer">
              {/* Avatar */}
              <div
                className={cn(
                  "size-[52px] rounded-full border-2 border-border flex items-center justify-center",
                  "font-serif text-lg font-bold mx-auto mb-2.5",
                  GAME_COLORS[String(i)] ?? GAME_COLORS["3"]
                )}
              >
                {item.profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.profile.avatar_url} alt={item.profile.username} className="size-full rounded-full object-cover" />
                ) : (
                  avatarInitials(item.profile.username)
                )}
              </div>

              <div className="font-semibold text-sm text-text-primary mb-1 truncate">
                {item.profile.username}
              </div>

              <div className="text-accent text-sm tracking-wide mb-1.5">
                {reputationStars(item.profile.reputation_score)}
              </div>

              <div className="flex items-center justify-center gap-2 flex-wrap mb-2">
                <span className="text-xs text-text-muted font-sans">
                  <strong className="text-text-secondary">{item.salesInPeriod}</strong> ventas
                </span>
                <span className="text-text-muted">·</span>
                <span className="text-xs text-text-muted font-sans">
                  <strong className="text-text-secondary">{(item.profile.reputation_score / 20).toFixed(1)}</strong> rep.
                </span>
              </div>

              <span className={cn("inline-flex text-2xs font-medium px-2 py-0.5 rounded", badge.className)}>
                {badge.label}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
