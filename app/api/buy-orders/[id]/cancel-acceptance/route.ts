import { NextRequest, NextResponse } from "next/server";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { unauthorized, notFound, forbidden, dbError } from "@/lib/api-error";

// ─── POST /api/buy-orders/[id]/cancel-acceptance ──────────────────────────────
// Buyer rejects a pending acceptance:
//   - Cancels the pending_buyer_confirmation transaction
//   - Resets buy order back to 'active' so other sellers can accept it

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const admin = createAdminClient();

  // ── Find the pending transaction for this buy order ────────────────────────
  const { data: tx } = await admin
    .from("transactions")
    .select("id, buyer_id, seller_id, status")
    .eq("buy_order_id", params.id)
    .eq("status", "pending_buyer_confirmation")
    .single();

  if (!tx) return notFound("Transacción pendiente");
  if (tx.buyer_id !== user.id) return forbidden();

  const now = new Date().toISOString();

  // ── Cancel transaction + reset buy order ───────────────────────────────────
  const [txUpdate, orderUpdate] = await Promise.all([
    admin.from("transactions")
      .update({ status: "cancelled", updated_at: now })
      .eq("id", tx.id),
    admin.from("buy_orders")
      .update({ status: "active", accepted_by: null, updated_at: now })
      .eq("id", params.id),
  ]);

  if (txUpdate.error || orderUpdate.error) return dbError();

  // System message in chat
  await admin.from("chat_messages").insert({
    transaction_id: tx.id,
    sender_id:      null,
    body:           "El comprador rechazó la oferta. El buy order volvió a estar activo.",
    message_type:   "system",
  });

  return NextResponse.json({ data: { ok: true } });
}
