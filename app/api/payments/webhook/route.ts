import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
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

  const { type, data, action } = rawBody as {
    type?:   string;
    data?:   { id?: string };
    action?: string;
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

  // ── Fetch full payment details from MP ──────────────────────────────────────
  let payment: Awaited<ReturnType<typeof mpPayment.get>>;
  try {
    payment = await mpPayment.get({ id: paymentId });
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

  const admin = createAdminClient();

  // ── Fetch transaction ────────────────────────────────────────────────────────
  const { data: tx } = await admin
    .from("transactions")
    .select("id, buyer_id, seller_id, card_id, buy_order_id, listing_id, status, price")
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

  // ── Run all side-effects in parallel ────────────────────────────────────────
  const ops: Promise<unknown>[] = [

    // 1. Update transaction status → paid + store payment ID
    admin
      .from("transactions")
      .update({ status: "paid", mp_payment_id: paymentId, updated_at: now })
      .eq("id", transactionId),

    // 4. Increment seller total_sales
    admin.rpc("increment_total_sales",     { seller_id: tx.seller_id }),

    // 4. Increment buyer total_purchases
    admin.rpc("increment_total_purchases", { buyer_id:  tx.buyer_id  }),

    // 5. Record price in price_history
    admin.from("price_history").insert({
      card_id:     tx.card_id,
      price_ars:   tx.price,
      price_usd:   null,
      source:      "listing",
      recorded_at: now,
    }),

    // System message in chat
    admin.from("chat_messages").insert({
      transaction_id: transactionId,
      sender_id:      null,
      body:           "Pago confirmado por MercadoPago.",
      message_type:   "system",
    }),
  ];

  // 2. Mark listing as sold (if from a listing)
  if (tx.listing_id) {
    ops.push(
      admin
        .from("listings")
        .update({ status: "sold", updated_at: now })
        .eq("id", tx.listing_id)
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
