import { NextRequest, NextResponse } from "next/server";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── POST /api/transactions/[id]/confirm-delivery ─────────────────────────────
// Each party calls this once. When both have confirmed, the transaction
// is automatically marked completed.

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
    .select("id, buyer_id, seller_id, card_id, price, status, listing_id, buyer_confirmed_delivery_at, seller_confirmed_delivery_at")
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
  if (tx.status !== "in_chat") {
    return NextResponse.json({ error: "Solo se puede confirmar durante el chat." }, { status: 422 });
  }

  // Idempotent — if already confirmed by this party, return early
  if (isBuyer  && tx.buyer_confirmed_delivery_at)  return NextResponse.json({ ok: true });
  if (isSeller && tx.seller_confirmed_delivery_at) return NextResponse.json({ ok: true });

  const now = new Date().toISOString();
  const update: Record<string, string | null> = { updated_at: now };

  if (isBuyer) {
    update.buyer_confirmed_delivery_at = now;
  } else {
    update.seller_confirmed_delivery_at = now;
  }

  const buyerConfirmed  = isBuyer  ? true : !!tx.buyer_confirmed_delivery_at;
  const sellerConfirmed = isSeller ? true : !!tx.seller_confirmed_delivery_at;
  const bothConfirmed   = buyerConfirmed && sellerConfirmed;

  if (bothConfirmed) {
    update.status       = "completed";
    update.completed_at = now;
  }

  await admin.from("transactions").update(update).eq("id", params.id);

  if (bothConfirmed) {
    await admin.from("price_history").insert({
      card_id:     tx.card_id,
      price_ars:   tx.price,
      price_usd:   null,
      source:      "listing",
      recorded_at: now,
    });

    // Delete listing if it was reserved (last copy sold), leave active ones alone (qty already decremented at purchase)
    if (tx.listing_id) {
      const { data: lst } = await admin
        .from("listings")
        .select("status")
        .eq("id", tx.listing_id)
        .maybeSingle();
      if (lst?.status === "reserved") {
        await admin.from("listings").delete().eq("id", tx.listing_id);
      }
    }
  }

  // System message for this party's confirmation
  const confirmMsg = isBuyer
    ? "El comprador confirmó la entrega."
    : "El vendedor confirmó la entrega.";

  const messagesToInsert = [
    { transaction_id: tx.id, sender_id: null, body: confirmMsg, message_type: "system" },
  ];

  if (bothConfirmed) {
    messagesToInsert.push({
      transaction_id: tx.id,
      sender_id:      null,
      body:           "Ambas partes confirmaron la entrega. ¡Transacción completada!",
      message_type:   "system",
    });
    await admin.rpc("increment_total_sales",     { seller_id: tx.seller_id });
    await admin.rpc("increment_total_purchases", { buyer_id:  tx.buyer_id  });
  }

  await admin.from("chat_messages").insert(messagesToInsert);

  return NextResponse.json({ ok: true, bothConfirmed });
}
