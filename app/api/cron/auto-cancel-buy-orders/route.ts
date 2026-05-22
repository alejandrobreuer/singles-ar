import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyMany }        from "@/lib/notifications";

// ─── Auth guard ───────────────────────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

// ─── GET /api/cron/auto-cancel-buy-orders ─────────────────────────────────────
// Runs hourly (vercel.json: "0 * * * *").
// Finds transactions stuck in pending_buyer_confirmation for > 24h,
// cancels them, and resets the buy orders to active.

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin  = createAdminClient();
  const now    = new Date().toISOString();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: expired, error: fetchErr } = await admin
    .from("transactions")
    .select("id, buy_order_id, buyer_id, seller_id, price")
    .eq("status", "pending_buyer_confirmation")
    .lt("created_at", cutoff);

  if (fetchErr) {
    return NextResponse.json({ ok: false, error: fetchErr.message }, { status: 500 });
  }

  let cancelled = 0;
  const errors: string[] = [];

  for (const tx of expired ?? []) {
    try {
      await Promise.all([
        admin.from("transactions")
          .update({ status: "cancelled", updated_at: now })
          .eq("id", tx.id),
        tx.buy_order_id
          ? admin.from("buy_orders")
              .update({ status: "active", accepted_by: null, updated_at: now })
              .eq("id", tx.buy_order_id)
          : Promise.resolve(),
      ]);

      await admin.from("chat_messages").insert({
        transaction_id: tx.id,
        sender_id:      null,
        body:           "El buy order volvió a estar activo. El comprador no confirmó el pago a tiempo.",
        message_type:   "system",
      });

      const priceLabel = new Intl.NumberFormat("es-AR", {
        style: "currency", currency: "ARS", maximumFractionDigits: 0,
      }).format(tx.price);

      await notifyMany([
        {
          user_id: tx.buyer_id,
          type:    "buy_order_accepted",
          title:   "Tu buy order volvió a estar activo",
          body:    `No confirmaste el pago de ${priceLabel} a tiempo. El buy order está disponible nuevamente.`,
          link:    "/profile",
        },
        {
          user_id: tx.seller_id,
          type:    "buy_order_accepted",
          title:   "El comprador no confirmó el pago",
          body:    `El comprador no confirmó el pago de ${priceLabel} a tiempo. El buy order volvió a estar disponible.`,
          link:    "/cards",
        },
      ]);

      cancelled++;
    } catch (err: unknown) {
      errors.push(`tx ${tx.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`[cron/auto-cancel] Cancelled ${cancelled} expired pending_buyer_confirmation transactions.`);
  return NextResponse.json({ ok: errors.length === 0, timestamp: now, cancelled, errors });
}
