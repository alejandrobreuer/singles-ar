"use server";

import * as React from "react";
import { notFound }          from "next/navigation";
import Link                  from "next/link";
import Image                 from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { format }            from "date-fns";
import { es }                from "date-fns/locale";
import { ArrowLeft }         from "lucide-react";
import { AdminDisputeActions } from "@/components/admin/AdminDisputeActions";

// ─── Status display ───────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  in_chat:         "bg-blue-500/10 text-blue-400",
  payment_pending: "bg-amber-500/10 text-amber-400",
  paid:            "bg-emerald-500/10 text-emerald-400",
  delivered:       "bg-purple-500/10 text-purple-400",
  completed:       "bg-emerald-600/10 text-emerald-500",
  disputed:        "bg-red-500/10 text-red-400",
  cancelled:       "bg-secondary text-text-muted",
};
const STATUS_LABELS: Record<string, string> = {
  in_chat:         "En chat",
  payment_pending: "Pago pendiente",
  paid:            "Pagado (legacy)",
  delivered:       "Entregado",
  completed:       "Completado",
  disputed:        "Disputado",
  cancelled:       "Cancelado",
};

// ─── Chat transcript ──────────────────────────────────────────────────────────

interface ChatMsg {
  id:           string;
  sender_id:    string | null;
  body:         string | null;
  image_url:    string | null;
  message_type: string;
  created_at:   string;
  sender:       { username: string; avatar_url: string | null } | null;
}

function ChatTranscript({ messages }: { messages: ChatMsg[] }) {
  if (messages.length === 0) {
    return <p className="text-sm text-text-muted font-sans">Sin mensajes.</p>;
  }
  return (
    <div className="space-y-2">
      {messages.map((m) => {
        if (m.message_type === "system") {
          return (
            <div key={m.id} className="flex justify-center">
              <span className="text-xs text-text-muted font-sans bg-secondary px-3 py-1 rounded-full">
                {m.body}
              </span>
            </div>
          );
        }
        return (
          <div key={m.id} className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-secondary border border-border shrink-0 overflow-hidden mt-0.5">
              {m.sender?.avatar_url ? (
                <Image
                  src={m.sender.avatar_url}
                  alt={m.sender.username}
                  width={24}
                  height={24}
                  className="object-cover"
                  unoptimized
                />
              ) : null}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-xs font-semibold font-sans text-text-primary">
                  @{m.sender?.username ?? "?"}
                </span>
                <span className="text-xs text-text-muted font-sans">
                  {format(new Date(m.created_at), "d MMM HH:mm", { locale: es })}
                </span>
              </div>
              {m.message_type === "image" && m.image_url ? (
                <Image
                  src={m.image_url}
                  alt="imagen"
                  width={200}
                  height={200}
                  className="rounded-lg border border-border object-cover"
                  unoptimized
                />
              ) : (
                <p className="text-sm font-sans text-text-secondary whitespace-pre-wrap break-words">
                  {m.body}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminTransactionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const admin = createAdminClient();

  const [{ data: rawTx }, { data: messages }] = await Promise.all([
    admin
      .from("transactions")
      .select(
        "id, price, platform_fee, mp_fee, seller_net, mp_settlement_date, status, currency, mp_preference_id, mp_payment_id, " +
        "delivered_at, release_at, dispute_resolved_at, dispute_resolution, " +
        "created_at, updated_at, " +
        "buyer:profiles!buyer_id(id, username, email, reputation_score, total_sales), " +
        "seller:profiles!seller_id(id, username, email, reputation_score, total_sales), " +
        "card:cards!card_id(id, name, set_name, image_url, game)"
      )
      .eq("id", params.id)
      .single(),

    admin
      .from("chat_messages")
      .select("id, sender_id, body, image_url, message_type, created_at, sender:profiles!sender_id(username, avatar_url)")
      .eq("transaction_id", params.id)
      .order("created_at", { ascending: true }),
  ]);

  type TxDetail = {
    id: string; price: number; platform_fee: number | null; status: string; currency: string;
    mp_fee: number | null; seller_net: number | null; mp_settlement_date: string | null;
    mp_preference_id: string | null; mp_payment_id: string | null;
    delivered_at: string | null; release_at: string | null;
    dispute_resolved_at: string | null; dispute_resolution: string | null;
    created_at: string; updated_at: string;
    buyer: { id: string; username: string; email: string; reputation_score: number; total_sales: number } | null;
    seller: { id: string; username: string; email: string; reputation_score: number; total_sales: number } | null;
    card: { id: string; name: string; set_name: string | null; image_url: string | null; game: string } | null;
  };
  const tx     = rawTx as unknown as TxDetail | null;
  if (!tx) notFound();
  const buyer  = tx.buyer;
  const seller = tx.seller;
  const card   = tx.card;

  function formatARS(n: number) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency", currency: "ARS", maximumFractionDigits: 0,
    }).format(n);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back */}
      <Link
        href="/admin/transactions"
        className="inline-flex items-center gap-1.5 text-sm font-sans text-text-muted hover:text-text-primary mb-5 no-underline"
      >
        <ArrowLeft size={14} />
        Volver a transacciones
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        {card?.image_url && (
          <Image
            src={card.image_url}
            alt={card.name}
            width={72}
            height={100}
            className="rounded-lg border border-border object-cover shrink-0"
            unoptimized
          />
        )}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-serif font-semibold text-text-primary">
              {card?.name ?? "Transacción"}
            </h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[tx.status] ?? ""}`}>
              {STATUS_LABELS[tx.status] ?? tx.status}
            </span>
          </div>
          <p className="text-xs text-text-muted font-sans">ID: {tx.id}</p>
          <p className="text-xs text-text-muted font-sans">
            Creada {format(new Date(tx.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Amount */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-text-muted font-sans mb-1">Monto</p>
          <p className="text-lg font-price text-text-primary">{formatARS(tx.price)}</p>
          {tx.platform_fee != null && (
            <p className="text-xs text-text-muted font-sans mt-0.5">
              Comisión plataforma: {formatARS(tx.platform_fee)}
            </p>
          )}
          {tx.mp_fee != null && (
            <p className="text-xs text-text-muted font-sans mt-0.5">
              Comisión MP: {formatARS(tx.mp_fee)}
            </p>
          )}
          {tx.seller_net != null && (
            <p className="text-xs text-text-muted font-sans mt-0.5">
              Neto vendedor: {formatARS(tx.seller_net)}
            </p>
          )}
        </div>

        {/* Buyer */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-text-muted font-sans mb-1">Comprador</p>
          {buyer ? (
            <>
              <Link href={`/profile/${buyer.username}`} className="text-sm font-medium text-primary font-sans hover:underline">
                @{buyer.username}
              </Link>
              <p className="text-xs text-text-muted font-sans">{buyer.email}</p>
              <p className="text-xs text-text-muted font-sans">
                Rep: {buyer.reputation_score} · Ventas: {buyer.total_sales}
              </p>
            </>
          ) : <p className="text-sm text-text-muted">—</p>}
        </div>

        {/* Seller */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-text-muted font-sans mb-1">Vendedor</p>
          {seller ? (
            <>
              <Link href={`/profile/${seller.username}`} className="text-sm font-medium text-primary font-sans hover:underline">
                @{seller.username}
              </Link>
              <p className="text-xs text-text-muted font-sans">{seller.email}</p>
              <p className="text-xs text-text-muted font-sans">
                Rep: {seller.reputation_score} · Ventas: {seller.total_sales}
              </p>
            </>
          ) : <p className="text-sm text-text-muted">—</p>}
        </div>
      </div>

      {/* MP IDs */}
      {(tx.mp_preference_id || tx.mp_payment_id) && (
        <div className="bg-surface border border-border rounded-xl p-4 mb-6 space-y-1">
          <p className="text-xs font-semibold font-sans text-text-muted uppercase tracking-wide mb-1">
            MercadoPago
          </p>
          {tx.mp_preference_id && (
            <p className="text-xs font-sans text-text-secondary">
              Preference ID: <span className="text-text-primary font-mono">{tx.mp_preference_id}</span>
            </p>
          )}
          {tx.mp_payment_id && (
            <p className="text-xs font-sans text-text-secondary">
              Payment ID: <span className="text-text-primary font-mono">{tx.mp_payment_id}</span>
            </p>
          )}
          {tx.mp_settlement_date && (
            <p className="text-xs font-sans text-text-secondary">
              Liberación de fondos: <span className="text-text-primary">
                {format(new Date(tx.mp_settlement_date), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Dispute resolution panel */}
      {(tx.status === "disputed") && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold font-sans text-red-400 mb-1">Disputa abierta</h2>
          {tx.dispute_resolved_at ? (
            <p className="text-xs text-text-muted font-sans mb-3">
              Resuelta a favor del <strong>{tx.dispute_resolution === "buyer" ? "comprador" : "vendedor"}</strong>{" "}
              el {format(new Date(tx.dispute_resolved_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })}.
            </p>
          ) : (
            <p className="text-xs text-text-muted font-sans mb-3">
              Pendiente de resolución.{" "}
              {tx.delivered_at && `Entregado el ${format(new Date(tx.delivered_at), "d MMM HH:mm", { locale: es })}.`}
            </p>
          )}
          {!tx.dispute_resolved_at && (
            <AdminDisputeActions transactionId={tx.id} />
          )}
        </div>
      )}

      {/* Chat transcript */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-sm font-semibold font-sans text-text-primary">
            Transcripción del chat ({messages?.length ?? 0} mensajes)
          </h2>
        </div>
        <div className="px-5 py-4 max-h-[600px] overflow-y-auto">
          <ChatTranscript messages={(messages ?? []) as unknown as ChatMsg[]} />
        </div>
      </div>
    </div>
  );
}
