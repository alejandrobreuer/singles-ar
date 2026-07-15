import { NextRequest, NextResponse } from "next/server";
import { createClient }        from "@/lib/supabase/server";
import { createAdminClient }   from "@/lib/supabase/admin";
import { completeTransaction } from "@/lib/transactions";

// ─── POST /api/transactions/[id]/mark-received ─────────────────────────────────
//
// Buyer-only. Marks the card as received and closes the transaction as
// completed — independent of whether the seller ever clicked "Confirmar
// entrega". Allowed as soon as payment is confirmed (status = in_chat with
// mp_payment_id set), and still allowed once the seller has confirmed
// delivery (status = delivered). Either way it's the buyer's own attestation
// that the card arrived, so it doesn't wait on the seller.

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
    .select("id, buyer_id, seller_id, card_id, price, status, mp_payment_id")
    .eq("id", params.id)
    .single();

  if (fetchErr || !tx) {
    return NextResponse.json({ error: "Transacción no encontrada." }, { status: 404 });
  }

  if (tx.buyer_id !== user.id) {
    return NextResponse.json({ error: "Sin acceso." }, { status: 403 });
  }

  const canMarkReceived =
    tx.status === "delivered" ||
    (tx.status === "in_chat" && !!tx.mp_payment_id);

  if (!canMarkReceived) {
    return NextResponse.json(
      { error: "Solo podés confirmar la recepción después de que el pago sea confirmado." },
      { status: 422 }
    );
  }

  try {
    await completeTransaction(admin, {
      id:            tx.id,
      cardId:        tx.card_id,
      price:         tx.price,
      buyerId:       tx.buyer_id,
      sellerId:      tx.seller_id,
      systemMessage: "✅ El comprador confirmó la recepción. ¡Transacción completada! Gracias por usar Card Stash.",
    });
  } catch (err: unknown) {
    console.error(`mark-received: failed to complete transaction ${tx.id}:`, err);
    return NextResponse.json({ error: "No se pudo confirmar la recepción. Intentá de nuevo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, transition: "completed" });
}
