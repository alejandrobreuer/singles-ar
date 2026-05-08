import * as React from "react";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Tag, ChevronLeft, ShieldCheck } from "lucide-react";
import { createClient }       from "@/lib/supabase/server";
import { createAdminClient }  from "@/lib/supabase/admin";
import { Avatar }             from "@/components/ui/avatar";
import { Badge }              from "@/components/ui/badge";
import { ChatRoom }           from "@/components/chat/ChatRoom";
import { ReviewForm }         from "@/components/chat/ReviewForm";
import { formatARS }          from "@/lib/formatting";
import type {
  TransactionWithDetails, ChatMessageWithSender,
} from "@/types/database";

// ─── Status label map ─────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }> = {
  in_chat:         { label: "En conversación",   variant: "blue"  },
  payment_pending: { label: "Pago pendiente",    variant: "amber" },
  paid:            { label: "Pago confirmado",   variant: "green" },
  completed:       { label: "Completado",        variant: "green" },
  cancelled:       { label: "Cancelado",         variant: "red"   },
  disputed:        { label: "En disputa",        variant: "red"   },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ChatPage({
  params,
}: {
  params: { transactionId: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/chat/${params.transactionId}`);

  const admin = createAdminClient();

  // ── Fetch transaction with joined card + participants ─────────────────────
  const { data: tx, error: txError } = await admin
    .from("transactions")
    .select(`
      *,
      card:cards!card_id ( id, name, image_url, set_name ),
      buyer:profiles!buyer_id ( id, username, avatar_url ),
      seller:profiles!seller_id ( id, username, avatar_url )
    `)
    .eq("id", params.transactionId)
    .single();

  if (txError || !tx) notFound();

  const transaction = tx as unknown as TransactionWithDetails;

  // ── Guard: only participants ──────────────────────────────────────────────
  if (transaction.buyer_id !== user.id && transaction.seller_id !== user.id) {
    notFound();
  }

  // ── Fetch initial messages (page 1, 50 messages) ─────────────────────────
  const { data: rawMessages, count } = await admin
    .from("chat_messages")
    .select(`
      id,
      transaction_id,
      sender_id,
      body,
      image_url,
      message_type,
      created_at,
      sender:profiles!sender_id ( id, username, avatar_url )
    `, { count: "exact" })
    .eq("transaction_id", params.transactionId)
    .order("created_at", { ascending: true })
    .range(0, 49);

  const initialMessages = (rawMessages ?? []) as unknown as ChatMessageWithSender[];
  const initialTotal    = count ?? 0;

  const isBuyer     = transaction.buyer_id  === user.id;
  const counterpart = isBuyer ? transaction.seller : transaction.buyer;
  const statusInfo  = STATUS_LABELS[transaction.status] ?? { label: transaction.status, variant: "slate" as const };

  // ── Check if current user has already reviewed (for completed transactions) ─
  let alreadyReviewed = false;
  if (transaction.status === "completed") {
    const { data: existingReview } = await admin
      .from("reviews")
      .select("id")
      .eq("transaction_id", params.transactionId)
      .eq("reviewer_id", user.id)
      .maybeSingle();
    alreadyReviewed = !!existingReview;
  }

  return (
    <div className="flex flex-col h-screen bg-background">

      {/* ── Chat header ───────────────────────────────────────────────────── */}
      <header className="shrink-0 bg-surface border-b border-border">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center gap-3">

          {/* Back */}
          <Link
            href="/chat"
            className="shrink-0 p-1.5 -ml-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-primary/5 transition-colors"
            aria-label="Volver a chats"
          >
            <ChevronLeft size={20} />
          </Link>

          {/* Card image */}
          <div className="relative shrink-0 w-8 h-10 rounded-md overflow-hidden border border-border bg-secondary">
            {transaction.card.image_url ? (
              <Image
                src={transaction.card.image_url}
                alt={transaction.card.name}
                fill
                sizes="32px"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Tag size={12} className="text-border" />
              </div>
            )}
          </div>

          {/* Transaction info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold font-sans text-text-primary truncate leading-tight">
                {transaction.card.name}
              </p>
              <Badge variant={statusInfo.variant} size="sm">
                {statusInfo.label}
              </Badge>
            </div>
            <p className="text-xs text-text-muted font-sans">
              {formatARS(transaction.price)} · con{" "}
              <span className="text-text-secondary font-medium">{counterpart.username}</span>
            </p>
          </div>

          {/* Counterpart avatar */}
          <div className="shrink-0 flex items-center gap-1.5">
            <Avatar
              src={counterpart.avatar_url ?? undefined}
              name={counterpart.username}
              size="sm"
            />
            {isBuyer && (
              <ShieldCheck size={13} className="text-success" aria-label="Vendedor verificado" />
            )}
          </div>
        </div>
      </header>

      {/* ── Review prompt (completed transactions) ───────────────────────── */}
      {transaction.status === "completed" && (
        <div className="shrink-0 mx-auto w-full max-w-3xl px-4 py-3 border-b border-border">
          <ReviewForm
            transactionId={transaction.id}
            reviewee={counterpart}
            alreadyReviewed={alreadyReviewed}
            completedAt={transaction.completed_at ?? null}
          />
        </div>
      )}

      {/* ── Chat body (ChatRoom handles everything else) ──────────────────── */}
      <div className="flex-1 min-h-0 mx-auto w-full max-w-3xl flex flex-col">
        <ChatRoom
          transaction={transaction}
          currentUserId={user.id}
          initialMessages={initialMessages}
          initialTotal={initialTotal}
        />
      </div>
    </div>
  );
}
