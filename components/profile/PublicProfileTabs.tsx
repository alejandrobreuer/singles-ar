"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Star, Tag, Package, MessageSquare } from "lucide-react";
import { Badge }    from "@/components/ui/badge";
import { Avatar }   from "@/components/ui/avatar";
import { formatARS } from "@/lib/formatting";
import type { ListingWithCard, ReviewWithReviewer, Game } from "@/types/database";

// ─── Stars ────────────────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={13}
          className={i < rating ? "text-accent fill-accent" : "text-border fill-transparent"}
        />
      ))}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  listings:    ListingWithCard[];
  reviews:     ReviewWithReviewer[];
  gameVariant: Record<Game, React.ComponentProps<typeof Badge>["variant"]>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PublicProfileTabs({ listings, reviews, gameVariant }: Props) {
  const [tab, setTab] = React.useState<"listings" | "reviews">("listings");

  const tabs = [
    { key: "listings" as const, label: "Vendiendo",  count: listings.length, icon: <Package size={14} /> },
    { key: "reviews"  as const, label: "Reseñas",    count: reviews.length,  icon: <MessageSquare size={14} /> },
  ];

  return (
    <div className="surface-raised overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              "flex items-center gap-2 px-5 py-3.5 text-sm font-medium font-sans transition-colors",
              "border-b-2 -mb-px",
              tab === t.key
                ? "text-primary border-primary"
                : "text-text-muted border-transparent hover:text-text-primary",
            ].join(" ")}
          >
            {t.icon}
            {t.label}
            <span className={[
              "text-2xs px-1.5 py-0.5 rounded-full font-sans",
              tab === t.key ? "bg-primary/10 text-primary" : "bg-secondary text-text-muted",
            ].join(" ")}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Listings tab ──────────────────────────────────────────────────── */}
      {tab === "listings" && (
        <div className="p-4">
          {listings.length === 0 ? (
            <EmptyState icon={<Package size={24} />} text="Sin publicaciones activas." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {listings.map((listing) => {
                const card = listing.cards as { id: string; name: string; set_name: string | null; image_url: string | null; game: Game } | null;
                return (
                  <Link
                    key={listing.id}
                    href={card ? `/cards/${card.id}` : "#"}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-secondary/60 transition-colors no-underline group"
                  >
                    {/* Card image */}
                    <div className="relative shrink-0 w-10 h-14 rounded-lg overflow-hidden border border-border bg-secondary">
                      {card?.image_url ? (
                        <Image src={card.image_url} alt={card.name} fill sizes="40px" className="object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Tag size={14} className="text-border" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold font-sans text-text-primary truncate group-hover:text-primary transition-colors">
                        {card?.name ?? "Carta"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {card?.game && (
                          <Badge variant={gameVariant[card.game]} size="sm" />
                        )}
                        <span className="text-2xs text-text-muted font-sans">{listing.condition}</span>
                        {listing.listing_type === "trade" && (
                          <Badge variant="amber" size="sm">Trade</Badge>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="shrink-0 text-right">
                      {listing.price != null ? (
                        <p className="font-price text-base text-text-primary">
                          {formatARS(listing.price)}
                        </p>
                      ) : (
                        <p className="text-xs text-text-muted font-sans">Ver oferta</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Reviews tab ───────────────────────────────────────────────────── */}
      {tab === "reviews" && (
        <div className="divide-y divide-border">
          {reviews.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={<MessageSquare size={24} />} text="Sin reseñas todavía." />
            </div>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="p-4 flex gap-3">
                <Avatar
                  src={review.reviewer?.avatar_url ?? null}
                  name={review.reviewer?.username ?? "?"}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold font-sans text-text-primary">
                      {review.reviewer?.username ?? "Usuario"}
                    </span>
                    <Stars rating={review.rating} />
                    <span className="text-2xs text-text-muted font-sans ml-auto shrink-0">
                      {formatDistanceToNow(new Date(review.created_at), { locale: es, addSuffix: true })}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-text-secondary font-sans leading-relaxed">
                      {review.comment}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center text-text-muted">
      {icon}
      <p className="text-sm font-sans">{text}</p>
    </div>
  );
}
