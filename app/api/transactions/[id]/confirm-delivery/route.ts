import { NextRequest, NextResponse } from "next/server";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── POST /api/transactions/[id]/confirm-delivery ─────────────────────────────
//
// Two roles, two transitions:
//
//   Seller (status = in_chat, mp_payment_id set)
//     → delivered_at = now(), release_at = now()+72h, status = 'delivered'
//
//   Buyer (status = delivered)
//     → completed_at = now(), status = 'completed'
//     → triggers price_history + reputation RPCs

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const admin = createAdminClient();

  const { data: tx, error: fetchErr } = await admin
    .from("transactions")
    .select("id, buyer_id, seller_id, card_id, price, status, listing_id, mp_payment_id")
    .eq("id", params.id)
    .single();

  if (fetchErr || !tx) {
    return NextResponse.json({ error: "Transacción no encontrada." }, { status: 404 });
  }

  const isBuyer  = tx.buyer_id  === user.id;
  const isSeller = tx.seller_id === user.id;

  if (!isBuyer && !isSeller) {
    return NextResponse.json({ error: "Sin acceso." }, { status: 403 });
  }

  const now = new Date();

  // ── Seller confirms delivery ──────────────────────────────────────────────────
  if (isSeller) {
    if (tx.status !== "in_chat" || !tx.mp_payment_id) {
      return NextResponse.json(
        { error: "Solo podés confirmar la entrega después de que el pago sea confirmado." },
        { status: 422 }
      );
    }

    const releaseAt = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();

    await Promise.all([
      admin.from("transactions").update({
        status:       "delivered",
        delivered_at: now.toISOString(),
        release_at:   releaseAt,
        updated_at:   now.toISOString(),
      }).eq("id", params.id),

      admin.from("chat_messages").insert({
        transaction_id: tx.id,
        sender_id:      null,
        body:           "📦 El vendedor confirmó la entrega. El comprador tiene 72 horas para reportar cualquier problema. Si no hay disputa, la transacción se cerrará automáticamente.",
        message_type:   "system",
      }),
    ]);

    return NextResponse.json({ ok: true, transition: "delivered" });
  }

  // ── Buyer confirms receipt ────────────────────────────────────────────────────
  if (isBuyer) {
    if (tx.status !== "delivered") {
      return NextResponse.json(
        { error: "Solo podés confirmar la recepción después de que el vendedor confirme la entrega." },
        { status: 422 }
      );
    }

    await Promise.all([
      admin.from("transactions").update({
        status:       "completed",
        completed_at: now.toISOString(),
        updated_at:   now.toISOString(),
      }).eq("id", params.id),

      admin.rpc("increment_total_sales",     { seller_id: tx.seller_id }),
      admin.rpc("increment_total_purchases", { buyer_id:  tx.buyer_id  }),

      admin.from("price_history").insert({
        card_id:     tx.card_id,
        price_ars:   tx.price,
        price_usd:   null,
        source:      "listing",
        recorded_at: now.toISOString(),
      }),

      admin.from("chat_messages").insert({
        transaction_id: tx.id,
        sender_id:      null,
        body:           "✅ El comprador confirmó la recepción. ¡Transacción completada! Gracias por usar Card Stash.",
        message_type:   "system",
      }),
    ]);

    return NextResponse.json({ ok: true, transition: "completed" });
  }

  return NextResponse.json({ error: "Acción no válida." }, { status: 422 });
}
