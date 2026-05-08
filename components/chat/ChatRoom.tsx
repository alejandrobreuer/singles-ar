"use client";

import * as React from "react";
import Image from "next/image";
import {
  Send, ImagePlus, X, AlertTriangle, ChevronUp, Loader2,
} from "lucide-react";
import { createClient }        from "@/lib/supabase/client";
import { MessageBubble }       from "@/components/chat/MessageBubble";
import { SystemMessage }       from "@/components/chat/SystemMessage";
import { TransactionActions }  from "@/components/chat/TransactionActions";
import type {
  ChatMessage, ChatMessageWithSender, TransactionWithDetails,
} from "@/types/database";

// ─── Contact-info detection ───────────────────────────────────────────────────

const PHONE_RE   = /(\+?54)?[\s-]?9?[\s-]?11[\s-]?\d{4}[\s-]?\d{4}/;
const MENTION_RE = /@[a-zA-Z0-9_.]{2,}/;
const WSP_RE     = /whatsapp|wsp|wp\b/i;

function hasContactInfo(text: string) {
  return PHONE_RE.test(text) || MENTION_RE.test(text) || WSP_RE.test(text);
}

// ─── File validation ──────────────────────────────────────────────────────────

const MAX_BYTES   = 5 * 1024 * 1024; // 5 MB
const ACCEPT_MIME = ["image/jpeg", "image/png", "image/webp"];

function validateFile(file: File): string | null {
  if (!ACCEPT_MIME.includes(file.type)) return "Solo se aceptan JPG, PNG o WebP.";
  if (file.size > MAX_BYTES)            return "La imagen no puede superar 5 MB.";
  return null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ChatRoomProps {
  transaction:    TransactionWithDetails;
  currentUserId:  string;
  initialMessages: ChatMessageWithSender[];
  initialTotal:   number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChatRoom({
  transaction,
  currentUserId,
  initialMessages,
  initialTotal,
}: ChatRoomProps) {
  // Derived participant info
  const isBuyer     = transaction.buyer_id  === currentUserId;
  const currentUser = isBuyer ? transaction.buyer  : transaction.seller;
  const counterpart = isBuyer ? transaction.seller : transaction.buyer;

  // ── Messages state ─────────────────────────────────────────────────────────
  const [messages, setMessages] = React.useState<ChatMessageWithSender[]>(initialMessages);
  const [total,    setTotal]    = React.useState(initialTotal);
  const [page,     setPage]     = React.useState(1);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const hasMore = total > messages.length;

  // ── Input state ────────────────────────────────────────────────────────────
  const [text,        setText]        = React.useState("");
  const [file,        setFile]        = React.useState<File | null>(null);
  const [previewUrl,  setPreviewUrl]  = React.useState<string | null>(null);
  const [fileError,   setFileError]   = React.useState<string | null>(null);
  const [sending,     setSending]     = React.useState(false);

  // ── Contact-info warning ───────────────────────────────────────────────────
  const [showWarn, setShowWarn] = React.useState(false);
  const warnedRef = React.useRef(false);   // warn only once per session

  // ── Refs ───────────────────────────────────────────────────────────────────
  const bottomRef  = React.useRef<HTMLDivElement>(null);
  const inputRef   = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // ── Scroll to bottom ───────────────────────────────────────────────────────
  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    bottomRef.current?.scrollIntoView({ behavior });
  }

  React.useEffect(() => { scrollToBottom("instant"); }, []);

  // ── Realtime subscription ─────────────────────────────────────────────────
  React.useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`chat-${transaction.id}`)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "chat_messages",
          filter: `transaction_id=eq.${transaction.id}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const raw = payload.new as unknown as ChatMessage;

          // Determine sender profile from known participants
          let sender: ChatMessageWithSender["sender"] = null;
          if (raw.sender_id === currentUserId) {
            sender = currentUser;
          } else if (raw.sender_id === counterpart.id) {
            sender = counterpart;
          }

          const enriched: ChatMessageWithSender = { ...raw, sender };

          setMessages((prev) => {
            if (prev.find((m) => m.id === enriched.id)) return prev;
            return [...prev, enriched];
          });
          setTotal((n) => n + 1);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [transaction.id, currentUserId, currentUser, counterpart]);

  // ── Mark as read on mount and when messages change ────────────────────────
  React.useEffect(() => {
    const supabase = createClient();
    const col = isBuyer ? "buyer_last_read_at" : "seller_last_read_at";
    supabase
      .from("transactions")
      .update({ [col]: new Date().toISOString() })
      .eq("id", transaction.id)
      .then(() => null);
  // run only when message count changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // ── Load earlier messages ─────────────────────────────────────────────────
  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;

    const res  = await fetch(
      `/api/chat/${transaction.id}/messages?page=${nextPage}&limit=50`
    );
    const json = await res.json();

    if (res.ok && json.data) {
      setMessages((prev) => [...(json.data as ChatMessageWithSender[]), ...prev]);
      setPage(nextPage);
    }
    setLoadingMore(false);
  }

  // ── File selection ─────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const err = validateFile(f);
    if (err) { setFileError(err); return; }
    setFileError(null);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    e.target.value = ""; // reset so same file can be re-selected
  }

  function clearFile() {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFileError(null);
  }

  // ── Send ───────────────────────────────────────────────────────────────────
  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed && !file) return;

    // Contact-info check
    if (trimmed && !warnedRef.current && hasContactInfo(trimmed)) {
      warnedRef.current = true;
      setShowWarn(true);
      // Do NOT block — just warn once. Fall through to send.
    }

    setSending(true);

    try {
      let imageUrl: string | undefined;

      // Upload image if present
      if (file) {
        const supabase  = createClient();
        const ext       = file.name.split(".").pop() ?? "jpg";
        const path      = `${transaction.id}/${Date.now()}.${ext}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("chat-images")
          .upload(path, file, { contentType: file.type, upsert: false });

        if (uploadError) throw new Error("Error al subir la imagen.");

        const { data: { publicUrl } } = supabase.storage
          .from("chat-images")
          .getPublicUrl(uploadData.path);

        imageUrl = publicUrl;
        clearFile();
      }

      // Send message
      const res = await fetch(`/api/chat/${transaction.id}/messages`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          body:      trimmed || undefined,
          image_url: imageUrl,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Error al enviar.");
      }

      setText("");
      inputRef.current?.focus();
    } catch (err: unknown) {
      // Non-blocking error: show inline
      const msg = err instanceof Error ? err.message : "Error al enviar.";
      alert(msg); // simple fallback; replace with toast if available
    } finally {
      setSending(false);
    }
  }

  // ── Keyboard submit (Enter without Shift) ─────────────────────────────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const isClosed = ["cancelled", "completed"].includes(transaction.status);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* ── Transaction action bar ─────────────────────────────────────────── */}
      {!isClosed && (
        <div className="shrink-0 px-4 py-2.5 bg-secondary border-b border-border">
          <TransactionActions
            transaction={transaction}
            currentUserId={currentUserId}
          />
        </div>
      )}

      {/* ── Messages area ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">

        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-primary font-sans transition-colors disabled:opacity-50"
            >
              {loadingMore
                ? <Loader2 size={12} className="animate-spin" />
                : <ChevronUp size={12} />
              }
              Cargar mensajes anteriores
            </button>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => {
          if (msg.message_type === "system") {
            return (
              <SystemMessage
                key={msg.id}
                body={msg.body ?? ""}
                timestamp={msg.created_at}
              />
            );
          }

          const isMine     = msg.sender_id === currentUserId;
          const prevMsg    = messages[i - 1];
          const sameSender = prevMsg?.sender_id === msg.sender_id
            && prevMsg?.message_type !== "system";
          const showAvatar = !sameSender;

          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMine={isMine}
              showAvatar={showAvatar}
            />
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* ── Input area ────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-border bg-surface">

        {/* Contact-info warning banner */}
        {showWarn && (
          <div className="flex items-start gap-2.5 px-4 py-2.5 bg-warning/10 border-b border-warning/20">
            <AlertTriangle size={14} className="shrink-0 text-warning mt-0.5" />
            <p className="text-xs text-text-secondary font-sans flex-1 leading-snug">
              Compartir datos de contacto puede resultar en pérdida de protección de compra.
            </p>
            <button
              type="button"
              onClick={() => setShowWarn(false)}
              className="text-text-muted hover:text-text-primary transition-colors"
              aria-label="Cerrar aviso"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Image preview */}
        {previewUrl && (
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border">
            <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-border shrink-0">
              <Image src={previewUrl} alt="Preview" fill className="object-cover" sizes="56px" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-sans text-text-primary truncate">{file?.name}</p>
              <p className="text-2xs text-text-muted font-sans">
                {file ? `${(file.size / 1024).toFixed(0)} KB` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={clearFile}
              className="text-text-muted hover:text-error transition-colors"
              aria-label="Quitar imagen"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* File error */}
        {fileError && (
          <p className="px-4 py-1.5 text-xs text-error font-sans border-b border-error/20 bg-error/5">
            {fileError}
          </p>
        )}

        {/* Input row */}
        <div className="flex items-end gap-2 px-4 py-3">
          {/* Image upload button */}
          <button
            type="button"
            disabled={isClosed || sending}
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 p-2 rounded-lg text-text-muted hover:text-primary hover:bg-primary/5 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            aria-label="Adjuntar imagen"
          >
            <ImagePlus size={18} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_MIME.join(",")}
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Text area */}
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isClosed || sending}
            rows={1}
            placeholder={isClosed ? "Esta conversación está cerrada." : "Escribí un mensaje…"}
            className={[
              "flex-1 resize-none rounded-xl border border-border bg-secondary",
              "px-3.5 py-2.5 text-sm font-sans text-text-primary placeholder:text-text-muted",
              "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
              "max-h-32 min-h-[2.5rem] transition-colors disabled:opacity-50",
              "field-sizing-content",
            ].join(" ")}
            style={{ lineHeight: "1.4" }}
          />

          {/* Send */}
          <button
            type="button"
            disabled={isClosed || sending || (!text.trim() && !file)}
            onClick={handleSend}
            className={[
              "shrink-0 p-2.5 rounded-xl transition-all",
              "bg-primary text-white hover:bg-primary-600 active:bg-primary-700",
              "disabled:opacity-40 disabled:pointer-events-none",
              sending ? "opacity-60" : "",
            ].join(" ")}
            aria-label="Enviar mensaje"
          >
            {sending
              ? <Loader2 size={16} className="animate-spin" />
              : <Send size={16} />
            }
          </button>
        </div>
      </div>
    </div>
  );
}
