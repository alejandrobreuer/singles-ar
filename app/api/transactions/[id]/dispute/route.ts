import { NextRequest, NextResponse } from "next/server";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── POST /api/transactions/[id]/dispute ──────────────────────────────────────
// Buyer opens a dispute within 72h of seller confirming delivery.
// Funds are already with the seller (MP transferred immediately on approval).
// A dispute flags the transaction for admin review; any refund is handled
// manually via the MP dashboard.

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
    .select("id, buyer_id, seller_id, status, delivered_at, release_at, price, card_id")
    .eq("id", params.id)
    .single();

  if (fetchErr || !tx) {
    return NextResponse.json({ error: "Transacción no encontrada." }, { status: 404 });
  }

  if (tx.buyer_id !== user.id) {
    return NextResponse.json({ error: "Solo el comprador puede abrir una disputa." }, { status: 403 });
  }

  if (tx.status !== "delivered") {
    return NextResponse.json(
      { error: "Solo podés disputar una transacción que ya fue marcada como entregada." },
      { status: 422 }
    );
  }

  // Enforce 72h window
  if (tx.release_at && new Date() > new Date(tx.release_at)) {
    return NextResponse.json(
      { error: "El período de disputa de 72 horas ya venció." },
      { status: 422 }
    );
  }

  const now = new Date().toISOString();

  const { error: updateErr } = await admin.from("transactions").update({
    status:     "disputed",
    updated_at: now,
  }).eq("id", params.id);

  if (updateErr) {
    console.error(`dispute: failed to update transaction ${tx.id}:`, updateErr.message);
    return NextResponse.json({ error: "No se pudo abrir la disputa. Intentá de nuevo." }, { status: 500 });
  }

  const { error: msgErr } = await admin.from("chat_messages").insert({
    transaction_id: tx.id,
    sender_id:      null,
    body:           "⚠️ El comprador abrió una disputa. El equipo de Card Stash la revisará. En caso de validarse, el vendedor deberá reembolsar el pago.",
    message_type:   "system",
  });

  if (msgErr) console.error(`dispute: failed to post system message for ${tx.id}:`, msgErr.message);

  // Notify admin team (console for now — replace with email/Slack webhook when ready)
  console.warn(
    `[dispute] NUEVA DISPUTA — transaction: ${tx.id} | buyer: ${user.id} | ` +
    `amount: ${tx.price} ARS | delivered_at: ${tx.delivered_at}`
  );

  return NextResponse.json({ ok: true });
}
