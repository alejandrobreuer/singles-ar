import { NextRequest, NextResponse } from "next/server";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify }            from "@/lib/notifications";

// ─── POST /api/buy-orders/[id]/accept ────────────────────────────────────────
// Seller accepts a buy order:
//   1. Sets buy_order.status = 'reserved', accepted_by = seller
//   2. Creates a transaction row with status = 'in_chat'
//   3. Returns transaction id (chat room will be keyed to this)

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const admin = createAdminClient();

  // ── Fetch the buy order ───────────────────────────────────────────────────
  const { data: order, error: fetchError } = await admin
    .from("buy_orders")
    .select("id, buyer_id, card_id, price, currency, status")
    .eq("id", params.id)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: "Orden no encontrada." }, { status: 404 });
  }

  // Guard: can't accept your own order
  if (order.buyer_id === user.id) {
    return NextResponse.json(
      { error: "No podés aceptar tu propia orden de compra." },
      { status: 422 }
    );
  }

  if (order.status !== "active") {
    return NextResponse.json(
      { error: "Esta orden ya no está disponible." },
      { status: 422 }
    );
  }

  // ── Verify seller has MercadoPago connected ───────────────────────────────
  const { data: sellerProfile } = await admin
    .from("profiles")
    .select("mercadopago_user_id")
    .eq("id", user.id)
    .single();

  if (!sellerProfile?.mercadopago_user_id) {
    return NextResponse.json(
      { error: "Necesitás conectar MercadoPago antes de aceptar órdenes de compra." },
      { status: 422 }
    );
  }

  const now = new Date().toISOString();

  // ── Run both updates as a logical unit (best-effort — no DB transaction) ──
  const [reserveResult, txResult] = await Promise.all([
    admin
      .from("buy_orders")
      .update({
        status:      "reserved",
        accepted_by: user.id,
        updated_at:  now,
      })
      .eq("id", params.id)
      .eq("status", "active"),   // optimistic lock: only update if still active

    admin
      .from("transactions")
      .insert({
        buy_order_id: order.id,
        buyer_id:     order.buyer_id,
        seller_id:    user.id,
        card_id:      order.card_id,
        price:        order.price,
        currency:     order.currency,
        status:       "in_chat",
      })
      .select("id")
      .single(),
  ]);

  if (reserveResult.error) {
    console.error("[accept buy-order] reserve error:", reserveResult.error);
    return NextResponse.json(
      { error: "La orden ya fue tomada por otro vendedor." },
      { status: 409 }
    );
  }

  if (txResult.error || !txResult.data) {
    console.error("[accept buy-order] transaction error:", txResult.error);
    // Rollback reservation
    await admin
      .from("buy_orders")
      .update({ status: "active", accepted_by: null, updated_at: now })
      .eq("id", params.id);
    return NextResponse.json({ error: "Error al crear la transacción." }, { status: 500 });
  }

  const transactionId = txResult.data.id;

  // ── Seed the chat with a system message ──────────────────────────────────
  const { data: sellerData } = await admin
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  await admin.from("chat_messages").insert([
    {
      transaction_id: transactionId,
      sender_id:      null,
      body:           "Transacción iniciada.",
      message_type:   "system",
    },
    {
      transaction_id: transactionId,
      sender_id:      null,
      body:           `${sellerData?.username ?? "El vendedor"} aceptó la orden de compra.`,
      message_type:   "system",
    },
  ]);

  // Non-blocking: notify buyer that their order was accepted
  const _buyerId = order.buyer_id;
  const _cardId  = order.card_id;
  const _txId    = transactionId;
  admin
    .from("cards").select("name").eq("id", _cardId).single()
    .then(
      ({ data: card }) => notify({
        user_id: _buyerId,
        type:    "card_bought",
        title:   `Tu orden fue aceptada: ${card?.name ?? "tu carta"}`,
        link:    `/chat/${_txId}`,
      }),
      () => null
    );

  return NextResponse.json({
    data: {
      transaction_id: transactionId,
      chat_url: `/chat/${transactionId}`,
    },
  });
}
