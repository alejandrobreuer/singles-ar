import { NextRequest, NextResponse } from "next/server";
import { createAdminClient }   from "@/lib/supabase/admin";
import { completeTransaction } from "@/lib/transactions";
import { notifyMany }          from "@/lib/notifications";

// ─── Auth guard ───────────────────────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

// ─── GET /api/cron/auto-complete-transactions ──────────────────────────────────
// Runs hourly (vercel.json: "0 * * * *").
// Closes transactions that have sat in "delivered" past their 72h buyer-
// protection window (release_at) without a dispute — same completion path as
// the buyer clicking "Recibí la carta".

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();
  const now   = new Date().toISOString();

  const { data: expired, error: fetchErr } = await admin
    .from("transactions")
    .select("id, card_id, price, buyer_id, seller_id")
    .eq("status", "delivered")
    .lt("release_at", now);

  if (fetchErr) {
    return NextResponse.json({ ok: false, error: fetchErr.message }, { status: 500 });
  }

  let completed = 0;
  const errors: string[] = [];

  for (const tx of expired ?? []) {
    try {
      await completeTransaction(admin, {
        id:            tx.id,
        cardId:        tx.card_id,
        price:         tx.price,
        buyerId:       tx.buyer_id,
        sellerId:      tx.seller_id,
        systemMessage: "✅ Se cumplieron las 72 horas del período de protección sin disputas. La transacción se cerró automáticamente como exitosa.",
      });

      await notifyMany([
        {
          user_id: tx.seller_id,
          type:    "card_sold",
          title:   "Venta completada",
          body:    "Se cerró automáticamente tu transacción tras el período de protección de 72 horas.",
          link:    `/chat/${tx.id}`,
        },
        {
          user_id: tx.buyer_id,
          type:    "card_bought",
          title:   "Compra completada",
          body:    "Tu transacción se cerró automáticamente tras el período de protección de 72 horas.",
          link:    `/chat/${tx.id}`,
        },
      ]);

      completed++;
    } catch (err: unknown) {
      errors.push(`tx ${tx.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`[cron/auto-complete] Completed ${completed} transactions past their 72h release window.`);
  return NextResponse.json({ ok: errors.length === 0, timestamp: now, completed, errors });
}
