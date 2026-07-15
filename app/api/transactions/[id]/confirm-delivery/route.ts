import { NextRequest, NextResponse } from "next/server";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── POST /api/transactions/[id]/confirm-delivery ─────────────────────────────
//
// Seller-only: status = in_chat (mp_payment_id set) → delivered.
// Opens the 72h buyer-protection window (release_at). The transaction closes
// automatically once that window elapses without a dispute — see
// /api/cron/auto-complete-transactions. Buyers confirm receipt via
// /api/transactions/[id]/mark-received instead, which is available even
// before the seller confirms delivery.

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
    .select("id, seller_id, status, mp_payment_id")
    .eq("id", params.id)
    .single();

  if (fetchErr || !tx) {
    return NextResponse.json({ error: "Transacción no encontrada." }, { status: 404 });
  }

  if (tx.seller_id !== user.id) {
    return NextResponse.json({ error: "Sin acceso." }, { status: 403 });
  }

  if (tx.status !== "in_chat" || !tx.mp_payment_id) {
    return NextResponse.json(
      { error: "Solo podés confirmar la entrega después de que el pago sea confirmado." },
      { status: 422 }
    );
  }

  const now       = new Date();
  const releaseAt = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();

  // Checked on its own: supabase-js resolves query calls with { error }
  // instead of rejecting, so bundling this into an unchecked Promise.all
  // would let a failed update (e.g. a schema mismatch) return 200 without
  // the transaction actually changing state.
  const { error: updateErr } = await admin.from("transactions").update({
    status:       "delivered",
    delivered_at: now.toISOString(),
    release_at:   releaseAt,
    updated_at:   now.toISOString(),
  }).eq("id", params.id);

  if (updateErr) {
    console.error(`confirm-delivery: failed to update transaction ${tx.id}:`, updateErr.message);
    return NextResponse.json({ error: "No se pudo confirmar la entrega. Intentá de nuevo." }, { status: 500 });
  }

  const { error: msgErr } = await admin.from("chat_messages").insert({
    transaction_id: tx.id,
    sender_id:      null,
    body:           "📦 El vendedor confirmó la entrega. El comprador tiene 72 horas para reportar cualquier problema. Si no hay disputa, la transacción se cerrará automáticamente.",
    message_type:   "system",
  });

  if (msgErr) console.error(`confirm-delivery: failed to post system message for ${tx.id}:`, msgErr.message);

  return NextResponse.json({ ok: true, transition: "delivered" });
}
