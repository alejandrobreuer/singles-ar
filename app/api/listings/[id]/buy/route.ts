import { NextRequest, NextResponse } from "next/server";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── POST /api/listings/[id]/buy ──────────────────────────────────────────────
// Creates an in_chat transaction for a direct listing purchase (no buy-order).
// In dev mode, payment is skipped — both parties confirm delivery via chat.

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const admin = createAdminClient();

  const { data: listing, error: listingErr } = await admin
    .from("listings")
    .select("id, card_id, seller_id, price, status, listing_type, quantity")
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

  const now = new Date().toISOString();

  const { data: tx, error: txErr } = await admin
    .from("transactions")
    .insert({
      listing_id: listing.id,
      card_id:    listing.card_id,
      buyer_id:   user.id,
      seller_id:  listing.seller_id,
      price:      listing.price,
      currency:   "ARS",
      status:     "in_chat",
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (txErr || !tx) {
    return NextResponse.json({ error: "Error al crear la transacción." }, { status: 500 });
  }

  // Reserve or reduce listing stock
  if (listing.quantity === 1) {
    await admin.from("listings").update({ status: "reserved", updated_at: now }).eq("id", listing.id);
  } else {
    await admin.from("listings").update({ quantity: listing.quantity - 1, updated_at: now }).eq("id", listing.id);
  }

  await admin.from("chat_messages").insert({
    transaction_id: tx.id,
    sender_id:      null,
    body:           "Compra iniciada. Coordiná la entrega con el vendedor y confirmá cuando se realice.",
    message_type:   "system",
  });

  return NextResponse.json({ data: { transactionId: tx.id } });
}
