import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

interface CompleteTransactionParams {
  id:            string;
  cardId:        string;
  price:         number;
  buyerId:       string;
  sellerId:      string;
  systemMessage: string;
}

// Marks a transaction as completed: flips status, records the sale/purchase
// counters, logs a price_history point, and posts the closing system message.
// Shared by the buyer "mark received" action and the 72h auto-close cron so
// both paths stay in sync.
export async function completeTransaction(
  admin: AdminClient,
  params: CompleteTransactionParams
): Promise<void> {
  const now = new Date().toISOString();

  await Promise.all([
    admin.from("transactions").update({
      status:       "completed",
      completed_at: now,
      updated_at:   now,
    }).eq("id", params.id),

    admin.rpc("increment_total_sales",     { seller_id: params.sellerId }),
    admin.rpc("increment_total_purchases", { buyer_id:  params.buyerId }),

    admin.from("price_history").insert({
      card_id:     params.cardId,
      price_ars:   params.price,
      price_usd:   null,
      source:      "listing",
      recorded_at: now,
    }),

    admin.from("chat_messages").insert({
      transaction_id: params.id,
      sender_id:      null,
      body:           params.systemMessage,
      message_type:   "system",
    }),
  ]);
}
