"use client";

import * as React from "react";
import { Star, CheckCircle2, Loader2, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";

// ─── Props ────────────────────────────────────────────────────────────────────

const REVIEW_WINDOW_DAYS = 15;

function reviewDeadline(completedAt: string | null): Date | null {
  if (!completedAt) return null;
  const d = new Date(completedAt);
  d.setDate(d.getDate() + REVIEW_WINDOW_DAYS);
  return d;
}

interface ReviewFormProps {
  transactionId: string;
  reviewee: {
    id:         string;
    username:   string;
    avatar_url: string | null;
  };
  /** Pre-populated from server if user already reviewed */
  alreadyReviewed?: boolean;
  /** ISO string of when the transaction was completed */
  completedAt?: string | null;
}

// ─── Star Picker ──────────────────────────────────────────────────────────────

function StarPicker({
  value,
  onChange,
}: {
  value:    number;
  onChange: (n: number) => void;
}) {
  const [hovered, setHovered] = React.useState(0);
  const display = hovered || value;

  const LABELS = ["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(n)}
            className="transition-transform hover:scale-110"
            aria-label={`${n} estrella${n !== 1 ? "s" : ""}`}
          >
            <Star
              size={28}
              className={
                n <= display
                  ? "fill-accent text-accent"
                  : "fill-transparent text-border"
              }
            />
          </button>
        ))}
      </div>
      {display > 0 && (
        <span className="text-xs font-sans text-text-muted animate-fade-in">
          {LABELS[display]}
        </span>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReviewForm({ transactionId, reviewee, alreadyReviewed, completedAt }: ReviewFormProps) {
  const [rating,    setRating]    = React.useState(0);
  const [comment,   setComment]   = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [done,       setDone]       = React.useState(alreadyReviewed ?? false);
  const [error,      setError]      = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { setError("Seleccioná una calificación."); return; }
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/reviews", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          transactionId,
          rating,
          comment: comment.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al enviar.");
      setDone(true);
      toast.success("¡Reseña enviada!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Deadline calculation ─────────────────────────────────────────────────────
  const deadline    = reviewDeadline(completedAt ?? null);
  const now         = new Date();
  const windowOpen  = !deadline || now <= deadline;
  const daysLeft    = deadline
    ? Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : REVIEW_WINDOW_DAYS;

  // ── Window expired ───────────────────────────────────────────────────────────
  if (!windowOpen && !done) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 bg-warning/5 border border-warning/20 rounded-xl">
        <AlertCircle size={16} className="shrink-0 text-warning" />
        <p className="text-sm font-sans text-text-secondary">
          El período de 15 días para dejar una reseña ya expiró.
        </p>
      </div>
    );
  }

  // ── Already reviewed ────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 bg-success/5 border border-success/20 rounded-xl">
        <CheckCircle2 size={16} className="shrink-0 text-success" />
        <p className="text-sm font-sans text-text-secondary">
          Reseña enviada. ¡Gracias por calificar a{" "}
          <span className="font-semibold text-text-primary">{reviewee.username}</span>!
        </p>
      </div>
    );
  }

  // ── Review form ─────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4 bg-secondary/60 border border-border rounded-xl">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <Avatar
          src={reviewee.avatar_url}
          name={reviewee.username}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold font-sans text-text-primary leading-tight">
            Calificá a {reviewee.username}
          </p>
          <p className="text-xs text-text-muted font-sans">
            Tu experiencia ayuda a la comunidad
          </p>
        </div>
        {deadline && daysLeft <= 5 && (
          <div className="shrink-0 flex items-center gap-1 text-warning text-xs font-sans">
            <Clock size={12} />
            {daysLeft === 1 ? "1 día" : `${daysLeft} días`}
          </div>
        )}
      </div>

      {/* Stars */}
      <StarPicker value={rating} onChange={setRating} />

      {/* Comment */}
      <div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Comentario opcional (máx. 500 caracteres)"
          className={[
            "w-full resize-none rounded-lg border border-border bg-surface",
            "px-3 py-2.5 text-sm font-sans text-text-primary placeholder:text-text-muted",
            "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
            "transition-colors",
          ].join(" ")}
        />
        <p className="text-2xs text-text-muted font-sans text-right mt-0.5">
          {comment.length}/500
        </p>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-error font-sans">{error}</p>
      )}

      {/* Submit */}
      <Button
        type="submit"
        variant="primary"
        size="md"
        loading={submitting}
        disabled={rating === 0}
        className="w-full"
      >
        {submitting
          ? <Loader2 size={14} className="animate-spin" />
          : "Dejar reseña"
        }
      </Button>
    </form>
  );
}
