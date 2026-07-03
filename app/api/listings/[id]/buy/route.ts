import { NextRequest, NextResponse } from "next/server";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify }            from "@/lib/notifications";

// ─── POST /api/listings/[id]/buy ──────────────────────────────────────────────
// Creates an in_chat transaction for a direct listing purchase (no buy-order).
// In dev mode, payment is skipped — both parties confirm delivery via chat.

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  // Parse optional qty from body (defaults to 1)
  let qty = 1;
  try {
    const body = await req.json();
    if (body?.qty != null) {
      qty = parseInt(String(body.qty), 10);
      if (!Number.isInteger(qty) || qty < 1) {
        return NextResponse.json({ error: "Cantidad inválida." }, { status: 422 });
      }
    }
  } catch { /* body absent — use default qty 1 */ }

  const admin = createAdminClient();

  const { data: listing, error: listingErr } = await admin
    .from("listings")
    .select("id, card_id, seller_id, price, status, listing_type, quantity, cards(name)")
    .eq("id", params.id)
    .single();

  if (listingErr || !listing) {
    return NextResponse.json({ error: "Listing no encontrado." }, { status: 404 });
  }
  if (listing.seller_id === user.id) {
    return NextResponse.json({ error: "No podés comprar tu propio listing." }, { status: 422 });
  }
  if (listing.status !== "active") {
    return NextResponse.json({ error: "Este listing ya no está disponible." }, { status: 422 });
  }
  if (listing.listing_type !== "sale" || !listing.price) {
    return NextResponse.json({ error: "Este listing no es de venta directa." }, { status: 422 });
  }
  if (qty > listing.quantity) {
    return NextResponse.json({ error: `Solo hay ${listing.quantity} unidad(es) disponible(s).` }, { status: 422 });
  }

  // Return existing open transaction instead of creating a duplicate
  const { data: existing } = await admin
    .from("transactions")
    .select("id")
    .eq("listing_id", params.id)
    .eq("buyer_id", user.id)
    .in("status", ["in_chat", "payment_pending"])
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ data: { transactionId: existing.id } });
  }

  // ── Platform commission ────────────────────────────────────────────────────
  const { data: setting } = await admin
    .from("admin_settings")
    .select("value")
    .eq("key", "platform_commission_percent")
    .single();
  const commissionPct = setting ? parseFloat(String(setting.value)) : 5;
  const unitPrice     = Number(listing.price);
  const totalPrice    = unitPrice * qty;
  const platformFee   = Math.round(totalPrice * (commissionPct / 100) * 100) / 100;

  const now = new Date().toISOString();

  const { data: tx, error: txErr } = await admin
    .from("transactions")
    .insert({
      listing_id:   listing.id,
      card_id:      listing.card_id,
      buyer_id:     user.id,
      seller_id:    listing.seller_id,
      price:        totalPrice,
      currency:     "ARS",
      platform_fee: platformFee,
      status:       "in_chat",
      created_at:   now,
      updated_at:   now,
    })
    .select("id")
    .single();

  if (txErr || !tx) {
    return NextResponse.json({ error: "Error al crear la transacción." }, { status: 500 });
  }

  // Reduce stock by qty; mark reserved if stock hits 0
  const remaining = listing.quantity - qty;
  if (remaining === 0) {
    await admin.from("listings").update({ status: "reserved", updated_at: now }).eq("id", listing.id);
  } else {
    await admin.from("listings").update({ quantity: remaining, updated_at: now }).eq("id", listing.id);
  }

  const qtyNote = qty > 1 ? ` (${qty} unidades)` : "";
  await admin.from("chat_messages").insert({
    transaction_id: tx.id,
    sender_id:      null,
    body:           `Compra iniciada${qtyNote}. Coordiná la entrega con el vendedor y confirmá cuando se realice.`,
    message_type:   "system",
  });

  // Notify seller — awaited so it completes before the serverless function exits
  const cardName = (listing.cards as unknown as { name: string } | null)?.name ?? "tu carta";
  await notify({
    user_id: listing.seller_id,
    type:    "card_sold",
    title:   `Quieren comprar: ${cardName}`,
    link:    `/chat/${tx.id}`,
  });

  return NextResponse.json({ data: { transactionId: tx.id } });
}
