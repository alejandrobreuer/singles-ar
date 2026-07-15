import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: { id: string } };

const actionSchema = z.object({
  action: z.enum(["cancel"]),
});

// ─── PATCH /api/transactions/[id]/action ──────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Acción inválida." },
      { status: 422 }
    );
  }

  const admin = createAdminClient();

  // Fetch transaction + verify participation
  const { data: tx, error: fetchError } = await admin
    .from("transactions")
    .select("id, buyer_id, seller_id, card_id, price, status, buy_order_id, listing_id, mp_payment_id")
    .eq("id", params.id)
    .single();

  if (fetchError || !tx) {
    return NextResponse.json({ error: "Transacción no encontrada." }, { status: 404 });
  }

  if (tx.buyer_id !== user.id && tx.seller_id !== user.id) {
    return NextResponse.json({ error: "Sin acceso." }, { status: 403 });
  }

  const now = new Date().toISOString();
  const { action } = parsed.data;

  // ── Cancel ────────────────────────────────────────────────────────────────
  if (action === "cancel") {
    // Cannot cancel once MP has already transferred funds to the seller
    const paymentDone = tx.mp_payment_id != null;
    if (paymentDone || !["in_chat", "payment_pending"].includes(tx.status)) {
      return NextResponse.json(
        { error: "Esta transacción no se puede cancelar porque el pago ya fue procesado." },
        { status: 422 }
      );
    }

    // Checked on its own: supabase-js resolves query calls with { error }
    // instead of rejecting, so bundling this into an unchecked Promise.all
    // would let a failed update return 200 without the transaction actually
    // changing state.
    const { error: updateErr } = await admin
      .from("transactions")
      .update({ status: "cancelled", updated_at: now })
      .eq("id", params.id);

    if (updateErr) {
      console.error(`action/cancel: failed to update transaction ${tx.id}:`, updateErr.message);
      return NextResponse.json({ error: "No se pudo cancelar. Intentá de nuevo." }, { status: 500 });
    }

    const ops: PromiseLike<unknown>[] = [];

    // Restore buy order to active if applicable
    if (tx.buy_order_id) {
      ops.push(
        admin
          .from("buy_orders")
          .update({ status: "active", accepted_by: null, updated_at: now })
          .eq("id", tx.buy_order_id)
      );
    }

    // Restore listing stock if applicable
    if (tx.listing_id) {
      ops.push(
        (async () => {
          const { data: lst } = await admin
            .from("listings")
            .select("status, quantity")
            .eq("id", tx.listing_id!)
            .maybeSingle();
          if (!lst) return;
          if (lst.status === "reserved") {
            await admin.from("listings").update({ status: "active", updated_at: now }).eq("id", tx.listing_id!);
          } else if (lst.status === "active") {
            await admin.from("listings").update({ quantity: lst.quantity + 1, updated_at: now }).eq("id", tx.listing_id!);
          }
        })()
      );
    }

    // System message
    ops.push(
      admin.from("chat_messages").insert({
        transaction_id: params.id,
        sender_id:      null,
        body:           "La transacción fue cancelada.",
        message_type:   "system",
      })
    );

    await Promise.all(ops);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción desconocida." }, { status: 400 });
}
