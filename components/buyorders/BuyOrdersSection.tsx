"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, Plus } from "lucide-react";
import { BuyOrderCard } from "@/components/buyorders/BuyOrderCard";
import type { BuyOrderWithBuyer, Card } from "@/types/database";

// ─── Props ────────────────────────────────────────────────────────────────────

interface BuyOrdersSectionProps {
  initialOrders:      BuyOrderWithBuyer[];
  currentUserId?:     string | null;
  currentUserHasMp?:  boolean;
  cardId:             string;
  card?:              Card;
  highlightOrderId?:  string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BuyOrdersSection({
  initialOrders,
  currentUserId,
  currentUserHasMp,
  cardId,
  card,
  highlightOrderId,
}: BuyOrdersSectionProps) {
  const router = useRouter();
  const [orders, setOrders] = React.useState<BuyOrderWithBuyer[]>(initialOrders);

  async function handleAccept(orderId: string) {
    const res = await fetch(`/api/buy-orders/${orderId}/accept`, {
      method: "POST",
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error ?? "Error al aceptar la orden.");
    }

    // Remove the accepted order from local state (it's now "reserved")
    setOrders((prev) => prev.filter((o) => o.id !== orderId));

    // Navigate to the chat/transaction page
    router.push(json.data.chat_url);
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center rounded-xl border border-dashed border-border bg-secondary/40">
        <TrendingUp size={22} className="text-text-muted" />
        <p className="text-sm font-medium font-sans text-text-secondary">Sin órdenes de compra</p>
        <p className="text-xs text-text-muted font-sans max-w-xs">
          Nadie está buscando esta carta activamente.
        </p>
        {currentUserId && (
          <div className="mt-1">
            <a href={card
              ? `/buy-orders/new?card_id=${card.id}&card_name=${encodeURIComponent(card.name)}&card_set=${encodeURIComponent(card.set_name ?? "")}&card_image=${encodeURIComponent(card.image_url ?? "")}&card_game=${card.game}`
              : `/buy-orders/new?card_id=${cardId}`
            }>
              <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium font-sans hover:bg-primary/90 transition-colors">
                <Plus size={13} />
                Crear una orden de compra
              </button>
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {orders.map((order) => (
        <BuyOrderCard
          key={order.id}
          order={order}
          currentUserId={currentUserId}
          currentUserHasMp={currentUserHasMp}
          onAccept={handleAccept}
          highlighted={order.id === highlightOrderId}
        />
      ))}
    </div>
  );
}
