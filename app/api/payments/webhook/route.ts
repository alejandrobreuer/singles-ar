import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { mpPayment }         from "@/lib/mercadopago/client";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Signature verification ───────────────────────────────────────────────────
// Spec: https://www.mercadopago.com.ar/developers/en/docs/your-integrations/notifications/webhooks
//
// x-signature: ts=<timestamp>,v1=<hmac-sha256>
// Manifest:    id:<dataId>;request-id:<x-request-id>;ts:<ts>

function verifySignature(req: NextRequest, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // skip in dev when secret not configured

  const rawSig   = req.headers.get("x-signature") ?? "";
  const requestId = req.headers.get("x-request-id") ?? "";

  const tsMatch = rawSig.split(",").find((p) => p.startsWith("ts="));
  const v1Match = rawSig.split(",").find((p) => p.startsWith("v1="));
  if (!tsMatch || !v1Match) return false;

  const ts = tsMatch.slice(3);
  const v1 = v1Match.slice(3);

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts}`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(v1, "hex"));
}

// ─── POST /api/payments/webhook ───────────────────────────────────────────────
// MercadoPago calls this URL when a payment event occurs.
// Always return 200 quickly — MP will retry on non-2xx.

export async function POST(req: NextRequest) {
  let rawBody: Record<string, unknown>;
  try { rawBody = await req.json(); }
  catch { return NextResponse.json({ ok: true }); } // malformed — ack anyway

  const { type, data, user_id } = rawBody as {
    type?: string;
    data?: { id?: string };
    user_id?: string | number;
  };

  // We only care about approved payment events
  if (type !== "payment" || !data?.id) {
    return NextResponse.json({ ok: true });
  }

  const paymentId = String(data.id);

  // ── Verify signature ────────────────────────────────────────────────────────
  if (!verifySignature(req, paymentId)) {
    console.warn("[webhook] invalid signature for payment", paymentId);
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const admin = createAdminClient();

  // ── Fetch full payment details from MP ──────────────────────────────────────
  // Marketplace split payments are collected by the SELLER's MP account, so the
  // platform's MP_ACCESS_TOKEN can't see them — the notification's `user_id` is
  // the seller's MP user ID, used to look up their stored access token.
  let paymentClient = mpPayment;
  if (user_id != null) {
    const { data: sellerProfile } = await admin
      .from("profiles")
      .select("mercadopago_access_token")
      .eq("mercadopago_user_id", String(user_id))
      .single();

    if (sellerProfile?.mercadopago_access_token) {
      paymentClient = new Payment(new MercadoPagoConfig({ accessToken: sellerProfile.mercadopago_access_token }));
    }
  }

  let payment: Awaited<ReturnType<typeof mpPayment.get>>;
  try {
    payment = await paymentClient.get({ id: paymentId });
  } catch (err) {
    console.error("[webhook] failed to fetch payment:", err);
    return NextResponse.json({ ok: true }); // ack to stop retries for this specific issue
  }

  if (payment.status !== "approved") {
    // Not approved — nothing to do (may be pending, rejected, etc.)
    return NextResponse.json({ ok: true });
  }

  // ── Retrieve transaction from external_reference ────────────────────────────
  const transactionId = payment.external_reference ?? (payment.metadata as Record<string, string> | undefined)?.transaction_id;

  if (!transactionId) {
    console.warn("[webhook] payment has no external_reference:", paymentId);
    return NextResponse.json({ ok: true });
  }

  // ── Fetch transaction ────────────────────────────────────────────────────────
  const { data: tx } = await admin
    .from("transactions")
    .select("id, buyer_id, seller_id, card_id, buy_order_id, listing_id, status, price, platform_fee")
    .eq("id", transactionId)
    .single();

  if (!tx) {
    console.warn("[webhook] transaction not found:", transactionId);
    return NextResponse.json({ ok: true });
  }

  // Idempotency — don't reprocess if already past payment_pending
  if (!["in_chat", "payment_pending"].includes(tx.status)) {
    return NextResponse.json({ ok: true });
  }

  const now = new Date().toISOString();

  // ── Compute settlement figures ───────────────────────────────────────────────
  // fee_details includes both MercadoPago's own fee ("mercadopago_fee") and the
  // marketplace split ("application_fee", i.e. our platform_fee) — only the
  // former is MP's actual cut.
  const mpFee = (payment.fee_details ?? [])
    .filter((fee) => fee.type === "mercadopago_fee")
    .reduce((sum, fee) => sum + (fee.amount ?? 0), 0);
  const sellerNet = tx.platform_fee != null
    ? Number(tx.price) - Number(tx.platform_fee) - mpFee
    : null;

  // ── Run all side-effects in parallel ────────────────────────────────────────
  // NOTE: MP already transferred funds to the seller's account at this point.
  // We open the chat so both parties can coordinate delivery.
  const ops: PromiseLike<unknown>[] = [

    // 1. Update transaction → in_chat (chat opens), save MP payment ID + settlement info
    admin
      .from("transactions")
      .update({
        status:             "in_chat",
        mp_payment_id:      paymentId,
        mp_fee:             mpFee,
        mp_settlement_date: payment.money_release_date ?? null,
        seller_net:         sellerNet,
        updated_at:         now,
      })
      .eq("id", transactionId),

    // 2. System message — chat is now open
    admin.from("chat_messages").insert({
      transaction_id: transactionId,
      sender_id:      null,
      body:           "✅ Pago confirmado por MercadoPago. El chat está habilitado — coordiná la entrega con el vendedor.",
      message_type:   "system",
    }),
  ];

  // 3. Mark listing as sold only if stock is exhausted (status = "reserved").
  // If quantity > 0 the buy route left it "active" — leave it alone so
  // remaining units stay visible.
  if (tx.listing_id) {
    ops.push(
      admin
        .from("listings")
        .update({ status: "sold", updated_at: now })
        .eq("id", tx.listing_id)
        .eq("status", "reserved")
    );
  }

  // 2. Mark buy order as filled (if from a buy order)
  if (tx.buy_order_id) {
    ops.push(
      admin
        .from("buy_orders")
        .update({ status: "filled", updated_at: now })
        .eq("id", tx.buy_order_id)
    );
  }

  try {
    await Promise.all(ops);
  } catch (err) {
    console.error("[webhook] side-effect error:", err);
    // Don't return an error — returning 500 would cause MP to retry indefinitely
  }

  return NextResponse.json({ ok: true });
}
