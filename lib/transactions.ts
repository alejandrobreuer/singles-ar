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
//
// The status update is the operation that actually matters to the caller, so
// it's awaited and checked on its own and throws on failure — Supabase-js
// resolves query calls with { error } instead of rejecting, so an
// unchecked `Promise.all` would silently report success even if the row was
// never updated (e.g. a missing column or a failed CHECK constraint). The
// remaining side effects (counters, price history, chat message) run after
// and are logged rather than thrown on failure, since the transaction is
// already genuinely closed at that point.
export async function completeTransaction(
  admin: AdminClient,
  params: CompleteTransactionParams
): Promise<void> {
  const now = new Date().toISOString();

  const { error: updateErr } = await admin.from("transactions").update({
    status:       "completed",
    completed_at: now,
    updated_at:   now,
  }).eq("id", params.id);

  if (updateErr) {
    throw new Error(`Failed to mark transaction ${params.id} completed: ${updateErr.message}`);
  }

  const results = await Promise.all([
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

  for (const { error } of results) {
    if (error) console.error(`completeTransaction(${params.id}) side effect failed:`, error.message);
  }
}
