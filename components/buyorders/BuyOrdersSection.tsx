"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TrendingUp } from "lucide-react";
import { BuyOrderCard } from "@/components/buyorders/BuyOrderCard";
import type { BuyOrderWithBuyer } from "@/types/database";

// ─── Props ────────────────────────────────────────────────────────────────────

interface BuyOrdersSectionProps {
  initialOrders:      BuyOrderWithBuyer[];
  currentUserId?:     string | null;
  currentUserHasMp?:  boolean;
  cardId:             string;
  highlightOrderId?:  string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BuyOrdersSection({
  initialOrders,
  currentUserId,
  currentUserHasMp,
  cardId,
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
          <a
            href={`/buy-orders/new?card_id=${cardId}`}
            className="mt-1 text-xs text-primary hover:underline font-sans"
          >
            Crear una orden de compra
          </a>
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
