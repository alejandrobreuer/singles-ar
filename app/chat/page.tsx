import * as React from "react";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Tag } from "lucide-react";
import { createClient }       from "@/lib/supabase/server";
import { createAdminClient }  from "@/lib/supabase/admin";
import { Avatar }             from "@/components/ui/avatar";
import { Badge }              from "@/components/ui/badge";
import { formatARS }          from "@/lib/formatting";
import type {
  TransactionWithDetails, ChatMessage,
} from "@/types/database";

// ─── Status labels ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }> = {
  in_chat:         { label: "En chat",       variant: "blue"  },
  payment_pending: { label: "Pago pendiente", variant: "amber" },
  paid:            { label: "Pagado",         variant: "green" },
  completed:       { label: "Completado",     variant: "green" },
  cancelled:       { label: "Cancelado",      variant: "red"   },
  disputed:        { label: "En disputa",     variant: "red"   },
};

// ─── Last-message preview ─────────────────────────────────────────────────────

function lastMessagePreview(msg: ChatMessage | undefined): string {
  if (!msg) return "Sin mensajes aún";
  if (msg.message_type === "system") return `Sistema: ${msg.body ?? ""}`;
  if (msg.message_type === "image")  return msg.body ? `[Imagen] ${msg.body}` : "[Imagen]";
  return msg.body ?? "";
}

// ─── Chat row ─────────────────────────────────────────────────────────────────

function ChatRow({
  transaction,
  currentUserId,
  lastMessage,
  unread,
}: {
  transaction:   TransactionWithDetails;
  currentUserId: string;
  lastMessage:   ChatMessage | undefined;
  unread:        boolean;
}) {
  const isBuyer     = transaction.buyer_id  === currentUserId;
  const counterpart = isBuyer ? transaction.seller : transaction.buyer;
  const statusInfo  = STATUS_LABELS[transaction.status] ?? { label: transaction.status, variant: "slate" as const };
  const preview     = lastMessagePreview(lastMessage);
  const time        = lastMessage
    ? new Date(lastMessage.created_at).toLocaleTimeString("es-AR", {
        hour: "2-digit", minute: "2-digit",
      })
    : null;

  return (
    <Link
      href={`/chat/${transaction.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60 transition-colors no-underline group"
    >
      {/* Card thumbnail */}
      <div className="relative shrink-0 w-9 h-12 rounded-lg overflow-hidden border border-border bg-secondary">
        {transaction.card.image_url ? (
          <Image
            src={transaction.card.image_url}
            alt={transaction.card.name}
            fill
            sizes="36px"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Tag size={12} className="text-border" />
          </div>
        )}
      </div>

      {/* Counterpart + info */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <Avatar
          src={counterpart.avatar_url ?? undefined}
          name={counterpart.username}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          {/* Row 1: username + status + time */}
          <div className="flex items-center gap-2 justify-between">
            <span className={[
              "text-sm font-sans truncate",
              unread ? "font-semibold text-text-primary" : "font-medium text-text-secondary",
            ].join(" ")}>
              {counterpart.username}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={statusInfo.variant} size="sm">{statusInfo.label}</Badge>
              {time && (
                <span className="text-2xs text-text-muted font-sans">{time}</span>
              )}
            </div>
          </div>
          {/* Row 2: card name + price */}
          <p className="text-xs text-text-muted font-sans truncate">
            {transaction.card.name} · {formatARS(transaction.price)}
          </p>
          {/* Row 3: last message preview */}
          <p className={[
            "text-xs truncate mt-0.5 font-sans",
            unread ? "text-text-primary font-medium" : "text-text-muted",
          ].join(" ")}>
            {preview}
          </p>
        </div>

        {/* Unread dot */}
        {unread && (
          <div className="shrink-0 w-2 h-2 rounded-full bg-primary" />
        )}
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ChatListPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/chat");

  const admin = createAdminClient();

  // ── Fetch all active transactions ─────────────────────────────────────────
  const { data: rawTxs } = await admin
    .from("transactions")
    .select(`
      *,
      card:cards!card_id ( id, name, image_url, set_name ),
      buyer:profiles!buyer_id ( id, username, avatar_url ),
      seller:profiles!seller_id ( id, username, avatar_url )
    `)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .not("status", "eq", "cancelled")
    .order("updated_at", { ascending: false });

  const transactions = (rawTxs ?? []) as unknown as TransactionWithDetails[];

  // ── Fetch last messages for all transactions ──────────────────────────────
  const lastMessageMap = new Map<string, ChatMessage>();

  if (transactions.length > 0) {
    const txIds = transactions.map((t) => t.id);

    const { data: recentMsgs } = await admin
      .from("chat_messages")
      .select("id, transaction_id, sender_id, body, image_url, message_type, created_at")
      .in("transaction_id", txIds)
      .order("created_at", { ascending: false });

    // Take first (latest) message per transaction
    for (const msg of recentMsgs ?? []) {
      if (!lastMessageMap.has(msg.transaction_id)) {
        lastMessageMap.set(msg.transaction_id, msg as ChatMessage);
      }
    }
  }

  // ── Compute unread per transaction ────────────────────────────────────────
  function isUnread(tx: TransactionWithDetails): boolean {
    const isBuyer   = tx.buyer_id === user!.id;
    const lastRead  = isBuyer ? tx.buyer_last_read_at : tx.seller_last_read_at;
    const lastMsg   = lastMessageMap.get(tx.id);
    if (!lastMsg) return false;
    if (!lastRead)  return true;
    return new Date(lastMsg.created_at) > new Date(lastRead);
  }

  const unreadCount = transactions.filter(isUnread).length;

  return (
    <div className="min-h-screen bg-background">

      <div className="mx-auto max-w-2xl px-0 sm:px-4 py-0 sm:py-6">
        {/* Header */}
        <div className="px-4 py-4 sm:py-0 sm:mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MessageCircle size={20} className="text-primary" />
            <h1 className="text-xl font-serif font-semibold text-text-primary">
              Mis chats
            </h1>
            {unreadCount > 0 && (
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-2xs font-semibold font-sans">
                {unreadCount}
              </span>
            )}
          </div>
          <span className="text-sm text-text-muted font-sans">
            {transactions.length} {transactions.length === 1 ? "conversación" : "conversaciones"}
          </span>
        </div>

        {/* List */}
        <div className="bg-surface sm:rounded-xl sm:border sm:border-border overflow-hidden divide-y divide-border">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center px-4">
              <MessageCircle size={32} className="text-border" />
              <p className="text-base font-medium font-sans text-text-secondary">
                Sin conversaciones activas
              </p>
              <p className="text-sm text-text-muted font-sans max-w-xs">
                Los chats se abren cuando aceptás o te aceptan una orden de compra.
              </p>
            </div>
          ) : (
            transactions.map((tx) => (
              <ChatRow
                key={tx.id}
                transaction={tx}
                currentUserId={user.id}
                lastMessage={lastMessageMap.get(tx.id)}
                unread={isUnread(tx)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
