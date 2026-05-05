"use client";

import * as React from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Bell, Package, ShoppingCart, MessageSquare, Heart, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notification {
  id:         string;
  type:       string;
  title:      string;
  body:       string | null;
  link:       string;
  read_at:    string | null;
  created_at: string;
}

// ─── Config per type ──────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  card_sold:      { icon: <Package       size={14} />, color: "text-success",  bg: "bg-success/10"  },
  card_bought:    { icon: <ShoppingCart  size={14} />, color: "text-primary",  bg: "bg-primary/10"  },
  new_message:    { icon: <MessageSquare size={14} />, color: "text-accent",   bg: "bg-accent/10"   },
  wishlist_stock: { icon: <Heart         size={14} />, color: "text-error",    bg: "bg-error/10"    },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [open,          setOpen]          = React.useState(false);
  const ref                               = React.useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  // ── Initial fetch ─────────────────────────────────────────────────────────
  React.useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then(({ data }) => { if (Array.isArray(data)) setNotifications(data); })
      .catch(() => null);
  }, []);

  // ── Realtime ──────────────────────────────────────────────────────────────
  React.useEffect(() => {
    const supabase = createClient();
    const channel  = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event:  "*",
          schema: "public",
          table:  "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setNotifications((prev) => [payload.new as Notification, ...prev.slice(0, 29)]);
          } else if (payload.eventType === "UPDATE") {
            setNotifications((prev) =>
              prev.map((n) => n.id === (payload.new as Notification).id ? (payload.new as Notification) : n)
            );
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // ── Close on outside click ────────────────────────────────────────────────
  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ── Close on Escape ───────────────────────────────────────────────────────
  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // ── Toggle + mark read ────────────────────────────────────────────────────
  function handleToggle() {
    const opening = !open;
    setOpen(opening);
    if (opening && unreadCount > 0) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
      );
      fetch("/api/notifications", { method: "PATCH" }).catch(() => null);
    }
  }

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={handleToggle}
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} nuevas)` : ""}`}
        className={cn(
          "relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
          "text-text-secondary hover:text-text-primary hover:bg-primary/5",
          open && "bg-primary/5 text-primary"
        )}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-error text-white text-[10px] font-bold font-sans leading-none px-0.5">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            "absolute right-0 top-full mt-2 z-50",
            "w-80 max-w-[calc(100vw-1rem)]",
            "bg-surface rounded-xl border border-border shadow-card-lg",
            "animate-fade-in overflow-hidden"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold font-sans text-text-primary">Notificaciones</span>
              {unreadCount > 0 && (
                <span className="text-2xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-sans font-medium">
                  {unreadCount} nuevas
                </span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-text-muted hover:text-text-primary transition-colors"
              aria-label="Cerrar"
            >
              <X size={14} />
            </button>
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center text-text-muted">
                <Bell size={22} />
                <p className="text-sm font-sans">Sin notificaciones</p>
              </div>
            ) : (
              notifications.map((n) => {
                const cfg = TYPE_CONFIG[n.type] ?? {
                  icon:  <Bell size={14} />,
                  color: "text-text-muted",
                  bg:    "bg-secondary",
                };
                return (
                  <Link
                    key={n.id}
                    href={n.link}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 transition-colors no-underline",
                      "hover:bg-primary/5",
                      !n.read_at && "bg-primary/[0.03]"
                    )}
                  >
                    {/* Type icon */}
                    <div className={cn(
                      "shrink-0 mt-0.5 flex items-center justify-center w-7 h-7 rounded-full",
                      cfg.bg, cfg.color
                    )}>
                      {cfg.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-sans leading-snug",
                        !n.read_at
                          ? "font-semibold text-text-primary"
                          : "font-medium text-text-secondary"
                      )}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs font-sans text-text-muted mt-0.5 line-clamp-1">
                          {n.body}
                        </p>
                      )}
                      <p className="text-2xs font-sans text-text-muted mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { locale: es, addSuffix: true })}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!n.read_at && (
                      <span className="shrink-0 mt-2 w-2 h-2 rounded-full bg-primary" />
                    )}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
