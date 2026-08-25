"use client";

import * as React from "react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Star, Tag, MessageSquare, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge }    from "@/components/ui/badge";
import { Avatar }   from "@/components/ui/avatar";
import { formatARS } from "@/lib/formatting";
import type { ReviewWithReviewer, Game } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HistoryItem {
  id:           string;
  price:        number | null;
  completed_at: string | null;
  card: {
    id:        string;
    name:      string;
    set_name:  string | null;
    image_url: string | null;
    game:      Game;
  };
}

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

// ─── Filter chip ──────────────────────────────────────────────────────────────

function Chip({
  active,
  onClick,
  children,
}: {
  active:   boolean;
  onClick:  () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 rounded-full text-xs font-medium font-sans transition-colors whitespace-nowrap",
        active
          ? "bg-primary text-white"
          : "bg-secondary text-text-secondary hover:text-text-primary"
      )}
    >
      {children}
    </button>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  reviews:     ReviewWithReviewer[];
  history:     HistoryItem[];
  gameVariant: Record<Game, React.ComponentProps<typeof Badge>["variant"]>;
}

const GAME_LABELS: Record<Game, string> = {
  magic:    "MTG",
  pokemon:  "Pokémon",
  onepiece: "One Piece",
  dbz:      "Dragon Ball",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function PublicProfileTabs({ reviews, history, gameVariant }: Props) {
  const [tab, setTab] = React.useState<"reviews" | "history">("reviews");

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [reviewRating, setReviewRating] = React.useState<number | null>(null);
  const [historyGame, setHistoryGame]   = React.useState<Game | null>(null);

  // ── Review lookup map (transaction_id → review) ──────────────────────────────
  const reviewByTxId = React.useMemo(
    () => new Map(reviews.map((r) => [r.transaction_id, r])),
    [reviews]
  );

  // ── Distinct games present ────────────────────────────────────────────────────
  const historyGames = Array.from(new Set(
    history.map((h) => h.card?.game).filter(Boolean) as Game[]
  ));

  // ── Filtered lists ────────────────────────────────────────────────────────────
  const filteredReviews = reviews.filter((r) => {
    if (reviewRating !== null && r.rating !== reviewRating) return false;
    return true;
  });

  const filteredHistory = history.filter((h) => {
    if (historyGame && h.card?.game !== historyGame) return false;
    return true;
  });

  const tabs = [
    { key: "reviews"  as const, label: "Reseñas",   count: reviews.length,  icon: <MessageSquare size={14} /> },
    { key: "history"  as const, label: "Historial",  count: history.length,  icon: <CheckCircle  size={14} /> },
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

      {/* ── Filter row: Reviews ────────────────────────────────────────────── */}
      {tab === "reviews" && reviews.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-border bg-background/40">
          <Chip active={reviewRating === null} onClick={() => setReviewRating(null)}>Todas</Chip>
          {[5, 4, 3, 2, 1].map((n) => (
            <Chip
              key={n}
              active={reviewRating === n}
              onClick={() => setReviewRating(reviewRating === n ? null : n)}
            >
              {n} ★
            </Chip>
          ))}
        </div>
      )}

      {/* ── Filter row: History ────────────────────────────────────────────── */}
      {tab === "history" && history.length > 0 && historyGames.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-border bg-background/40">
          <Chip active={historyGame === null} onClick={() => setHistoryGame(null)}>Todos</Chip>
          {historyGames.map((g) => (
            <Chip
              key={g}
              active={historyGame === g}
              onClick={() => setHistoryGame(historyGame === g ? null : g)}
            >
              {GAME_LABELS[g]}
            </Chip>
          ))}
        </div>
      )}

      {/* ── Reviews tab ───────────────────────────────────────────────────── */}
      {tab === "reviews" && (
        <div className="divide-y divide-border">
          {filteredReviews.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<MessageSquare size={24} />}
                text={reviews.length === 0 ? "Sin reseñas todavía." : "Ninguna reseña coincide con el filtro."}
              />
            </div>
          ) : (
            filteredReviews.map((review) => (
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

      {/* ── History tab ───────────────────────────────────────────────────── */}
      {tab === "history" && (
        <div className="divide-y divide-border">
          {filteredHistory.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<CheckCircle size={24} />}
                text={history.length === 0 ? "Sin ventas completadas todavía." : "Ninguna venta coincide con el filtro."}
              />
            </div>
          ) : (
            filteredHistory.map((item) => {
              const review = reviewByTxId.get(item.id);
              return (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  {/* Card image */}
                  <div className="relative shrink-0 w-9 h-12 rounded-lg overflow-hidden border border-border bg-secondary">
                    {item.card?.image_url ? (
                      <Image src={item.card.image_url} alt={item.card.name} fill sizes="36px" className="object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Tag size={12} className="text-border" />
                      </div>
                    )}
                  </div>

                  {/* Card info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold font-sans text-text-primary truncate">
                      {item.card?.name ?? "Carta"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.card?.game && <Badge variant={gameVariant[item.card.game]} size="sm" />}
                      {item.completed_at && (
                        <span className="text-2xs text-text-muted font-sans">
                          {formatDistanceToNow(new Date(item.completed_at), { locale: es, addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price + review score */}
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {item.price != null ? (
                      <p className="font-price text-sm text-text-primary">{formatARS(item.price)}</p>
                    ) : (
                      <span className="text-xs text-accent font-sans font-medium">Trade</span>
                    )}
                    {review ? (
                      <Stars rating={review.rating} />
                    ) : (
                      <span className="text-2xs text-text-muted font-sans">Sin reseña</span>
                    )}
                  </div>
                </div>
              );
            })
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
