import { NextRequest, NextResponse } from "next/server";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify }            from "@/lib/notifications";
import {
  unauthorized, notFound, dbError,
} from "@/lib/api-error";

// ─── POST /api/buy-orders/[id]/accept ────────────────────────────────────────
// Seller accepts a buy order:
//   1. Verifies seller has MP connected (access_token required for payment)
//   2. Reserves buy order (optimistic lock on status = 'active')
//   3. Creates transaction with status = 'pending_buyer_confirmation'
//   4. Seeds chat with system message
//   5. Notifies buyer (24h window to confirm payment)

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const admin = createAdminClient();

  // ── Fetch buy order ────────────────────────────────────────────────────────
  const { data: order } = await admin
    .from("buy_orders")
    .select(`
      id, buyer_id, card_id, price, currency, status,
      cards ( id, name, set_name )
    `)
    .eq("id", params.id)
    .single();

  if (!order) return notFound("Buy order");

  if (order.buyer_id === user.id) {
    return NextResponse.json(
      { error: "No podés aceptar tu propia orden de compra." },
      { status: 403 },
    );
  }

  if (order.status !== "active") {
    return NextResponse.json(
      { error: "La orden ya fue tomada por otro vendedor." },
      { status: 409 },
    );
  }

  // ── Verify seller has MP access token ─────────────────────────────────────
  const { data: seller } = await admin
    .from("profiles")
    .select("mercadopago_access_token, username")
    .eq("id", user.id)
    .single();

  if (!seller?.mercadopago_access_token) {
    return NextResponse.json(
      { error: "Necesitás vincular tu cuenta de MercadoPago para aceptar buy orders. Hacelo desde tu perfil." },
      { status: 403 },
    );
  }

  // ── Platform commission ────────────────────────────────────────────────────
  const { data: setting } = await admin
    .from("admin_settings")
    .select("value")
    .eq("key", "platform_commission_percent")
    .single();
  const commissionPct = setting ? parseFloat(String(setting.value)) : 5;
  const price         = Number(order.price);
  const platformFee   = Math.round(price * (commissionPct / 100) * 100) / 100;
  const now           = new Date().toISOString();

  // ── Reserve buy order first (race-condition guard via .eq("status","active")) ─
  const { error: reserveErr } = await admin
    .from("buy_orders")
    .update({ status: "reserved", accepted_by: user.id, updated_at: now })
    .eq("id", params.id)
    .eq("status", "active");

  if (reserveErr) return dbError();

  // ── Create transaction ─────────────────────────────────────────────────────
  const { data: tx, error: txErr } = await admin
    .from("transactions")
    .insert({
      buy_order_id: params.id,
      buyer_id:     order.buyer_id,
      seller_id:    user.id,
      card_id:      order.card_id,
      price,
      currency:     order.currency ?? "ARS",
      platform_fee: platformFee,
      status:       "pending_buyer_confirmation",
    })
    .select("id")
    .single();

  if (txErr || !tx) {
    // Roll back the reservation so the order stays available
    await admin
      .from("buy_orders")
      .update({ status: "active", accepted_by: null, updated_at: now })
      .eq("id", params.id);
    return dbError();
  }

  // ── System message ─────────────────────────────────────────────────────────
  const card       = order.cards as unknown as { id: string; name: string; set_name: string | null } | null;
  const priceLabel = new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(price);

  await admin.from("chat_messages").insert({
    transaction_id: tx.id,
    sender_id:      null,
    body:           `${seller.username} aceptó tu buy order de ${priceLabel}. Confirmá el pago para continuar.`,
    message_type:   "system",
  });

  // ── Notify buyer ───────────────────────────────────────────────────────────
  await notify({
    user_id: order.buyer_id,
    type:    "buy_order_accepted",
    title:   "¡Tu buy order fue aceptado!",
    body:    `${seller.username} quiere venderte ${card?.name ?? "la carta"} por ${priceLabel}. Tenés 24hs para confirmar.`,
    link:    `/chat/${tx.id}`,
  });

  return NextResponse.json({
    data: {
      transactionId: tx.id,
      chat_url:      `/chat/${tx.id}`,
    },
  });
}
