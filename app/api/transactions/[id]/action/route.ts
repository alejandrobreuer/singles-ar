import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: { id: string } };

const actionSchema = z.object({
  action: z.enum(["cancel", "complete"]),
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
    .select("id, buyer_id, seller_id, status, buy_order_id")
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
    if (!["in_chat", "payment_pending"].includes(tx.status)) {
      return NextResponse.json(
        { error: "Esta transacción no se puede cancelar." },
        { status: 422 }
      );
    }

    const ops: Promise<unknown>[] = [
      admin
        .from("transactions")
        .update({ status: "cancelled", updated_at: now })
        .eq("id", params.id),
    ];

    // Restore buy order to active if applicable
    if (tx.buy_order_id) {
      ops.push(
        admin
          .from("buy_orders")
          .update({ status: "active", accepted_by: null, updated_at: now })
          .eq("id", tx.buy_order_id)
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

  // ── Complete ──────────────────────────────────────────────────────────────
  if (action === "complete") {
    if (tx.status !== "paid") {
      return NextResponse.json(
        { error: "Solo podés completar transacciones que ya fueron pagadas." },
        { status: 422 }
      );
    }

    await Promise.all([
      admin
        .from("transactions")
        .update({ status: "completed", updated_at: now })
        .eq("id", params.id),

      // Mark buy_order as filled
      tx.buy_order_id
        ? admin
            .from("buy_orders")
            .update({ status: "filled", updated_at: now })
            .eq("id", tx.buy_order_id)
        : Promise.resolve(),

      // Increment seller's total_sales
      admin.rpc("increment_total_sales", { seller_id: tx.seller_id }),

      admin.from("chat_messages").insert({
        transaction_id: params.id,
        sender_id:      null,
        body:           "Transacción completada. ¡Gracias por usar Singles.ar!",
        message_type:   "system",
      }),
    ]);

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción desconocida." }, { status: 400 });
}
