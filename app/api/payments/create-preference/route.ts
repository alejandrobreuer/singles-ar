import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient }        from "@/lib/supabase/server";
import { createAdminClient }   from "@/lib/supabase/admin";
import { createSellerPreference } from "@/lib/mercadopago/client";

// ─── Schema ───────────────────────────────────────────────────────────────────

const bodySchema = z.object({
  transactionId: z.string().uuid(),
});

// ─── Settings helper ──────────────────────────────────────────────────────────

async function getCommissionPercent(): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("admin_settings")
    .select("value")
    .eq("key", "platform_commission_percent")
    .single();
  return data ? parseFloat(String(data.value)) : 5;
}

// ─── POST /api/payments/create-preference ─────────────────────────────────────
//
// Creates a MercadoPago payment preference using the seller's access token
// (marketplace split-payment flow). The platform_fee (marketplace_fee) is
// automatically routed to our MP account.

export async function POST(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  // ── Body ────────────────────────────────────────────────────────────────────
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

  const { transactionId } = parsed.data;
  const admin = createAdminClient();

  // ── Fetch transaction ────────────────────────────────────────────────────────
  const { data: tx, error: txError } = await admin
    .from("transactions")
    .select(`
      id, buyer_id, seller_id, price, currency, status, card_id,
      card:cards!card_id ( name, set_name )
    `)
    .eq("id", transactionId)
    .single();

  if (txError || !tx) {
    return NextResponse.json({ error: "Transacción no encontrada." }, { status: 404 });
  }

  // Buyer must be the caller
  if (tx.buyer_id !== user.id) {
    return NextResponse.json({ error: "Solo el comprador puede iniciar el pago." }, { status: 403 });
  }

  if (tx.status !== "in_chat") {
    return NextResponse.json(
      { error: "La transacción no está en estado de pago." },
      { status: 422 }
    );
  }

  // ── Fetch seller's MP access token ───────────────────────────────────────────
  const { data: sellerProfile, error: sellerError } = await admin
    .from("profiles")
    .select("mercadopago_access_token, mercadopago_user_id, username")
    .eq("id", tx.seller_id)
    .single();

  if (sellerError || !sellerProfile?.mercadopago_access_token) {
    return NextResponse.json(
      { error: "El vendedor no tiene MercadoPago conectado." },
      { status: 422 }
    );
  }

  // ── Calculate fees ───────────────────────────────────────────────────────────
  const commissionPct  = await getCommissionPercent();
  const price          = Number(tx.price);
  const platformFee    = Math.round(price * (commissionPct / 100) * 100) / 100;

  // ── Card details for item title ──────────────────────────────────────────────
  const card = tx.card as { name: string; set_name: string | null } | null;
  const itemTitle = card
    ? `${card.name}${card.set_name ? ` — ${card.set_name}` : ""} · Singles.ar`
    : "Carta TCG — Singles.ar";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://singles.ar";

  // ── Create MP Preference with seller's token ─────────────────────────────────
  const sellerPreference = createSellerPreference(sellerProfile.mercadopago_access_token);

  let preference: Awaited<ReturnType<typeof sellerPreference.create>>;
  try {
    preference = await sellerPreference.create({
      body: {
        items: [
          {
            id:         transactionId,
            title:      itemTitle,
            unit_price: price,
            quantity:   1,
            currency_id: tx.currency ?? "ARS",
          },
        ],
        marketplace_fee: platformFee,
        back_urls: {
          success: `${appUrl}/payment/success`,
          failure: `${appUrl}/payment/failure`,
          pending: `${appUrl}/payment/pending`,
        },
        auto_return:        "approved",
        external_reference: transactionId,   // used to look up tx on the success page
        notification_url:   `${appUrl}/api/payments/webhook`,
        metadata:           { transaction_id: transactionId },
      },
    });
  } catch (err) {
    console.error("[create-preference] MP error:", err);
    return NextResponse.json(
      { error: "No se pudo crear el pago. Intentá de nuevo." },
      { status: 502 }
    );
  }

  if (!preference.id) {
    return NextResponse.json({ error: "Respuesta inválida de MercadoPago." }, { status: 502 });
  }

  // ── Persist preference ID + move to payment_pending ──────────────────────────
  const { error: updateError } = await admin
    .from("transactions")
    .update({
      mp_preference_id: preference.id,
      status:           "payment_pending",
      updated_at:       new Date().toISOString(),
    })
    .eq("id", transactionId);

  if (updateError) {
    console.error("[create-preference] DB update error:", updateError);
  }

  // System message in chat
  await admin.from("chat_messages").insert({
    transaction_id: transactionId,
    sender_id:      null,
    body:           "El comprador inició el proceso de pago.",
    message_type:   "system",
  });

  return NextResponse.json({
    data: {
      preferenceId: preference.id,
      initPoint:    preference.init_point,      // full MP checkout URL
      sandboxUrl:   preference.sandbox_init_point,
    },
  });
}
