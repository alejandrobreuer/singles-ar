import { NextRequest, NextResponse } from "next/server";
import { z }                         from "zod";
import { requireAdmin }              from "@/lib/admin/auth";
import { createAdminClient }         from "@/lib/supabase/admin";

const bodySchema = z.object({
  resolution: z.enum(["buyer", "seller"]),
});

// ─── POST /api/admin/transactions/[id]/resolve-dispute ────────────────────────
//
// resolution = "buyer"  → admin manually processes refund via MP dashboard,
//                          then calls this to record the outcome.
// resolution = "seller" → dispute dismissed, no refund.
//
// In both cases the transaction stays "disputed" but gets dispute_resolved_at
// and dispute_resolution set so the UI can show the outcome.

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 422 }
    );
  }

  const admin = createAdminClient();

  const { data: tx } = await admin
    .from("transactions")
    .select("id, status, buyer_id, seller_id")
    .eq("id", params.id)
    .single();

  if (!tx) return NextResponse.json({ error: "Transacción no encontrada." }, { status: 404 });
  if (tx.status !== "disputed") {
    return NextResponse.json({ error: "Solo se pueden resolver transacciones en disputa." }, { status: 422 });
  }

  const { resolution } = parsed.data;
  const now = new Date().toISOString();

  const finalStatus = resolution === "seller" ? "completed" : "disputed";

  // Checked on its own: supabase-js resolves query calls with { error }
  // instead of rejecting, so bundling this into an unchecked Promise.all
  // would let a failed update return 200 without the transaction actually
  // changing state.
  const { error: updateErr } = await admin.from("transactions").update({
    dispute_resolved_at: now,
    dispute_resolution:  resolution,
    status:              finalStatus,
    ...(resolution === "seller" ? { completed_at: now } : {}),
    updated_at:          now,
  }).eq("id", params.id);

  if (updateErr) {
    console.error(`resolve-dispute: failed to update transaction ${tx.id}:`, updateErr.message);
    return NextResponse.json({ error: "No se pudo resolver la disputa." }, { status: 500 });
  }

  const results = await Promise.all([
    admin.from("chat_messages").insert({
      transaction_id: tx.id,
      sender_id:      null,
      body: resolution === "buyer"
        ? "⚖️ Disputa resuelta a favor del comprador. El vendedor deberá procesar el reembolso vía MercadoPago."
        : "⚖️ Disputa resuelta a favor del vendedor. La transacción fue cerrada.",
      message_type: "system",
    }),

    // If resolved in seller's favour, record the sale
    ...(resolution === "seller" ? [
      admin.rpc("increment_total_sales",     { seller_id: tx.seller_id }),
      admin.rpc("increment_total_purchases", { buyer_id:  tx.buyer_id  }),
    ] : []),
  ]);

  for (const { error } of results) {
    if (error) console.error(`resolve-dispute: side effect failed for ${tx.id}:`, error.message);
  }

  console.log(`[dispute] Resolved ${params.id} in favour of ${resolution}`);

  return NextResponse.json({ ok: true, resolution, finalStatus });
}
