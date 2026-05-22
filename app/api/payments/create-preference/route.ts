import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient }           from "@/lib/supabase/server";
import { createAdminClient }      from "@/lib/supabase/admin";
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

export async function POST(req: NextRequest) {
  try {

  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  // ── Body ──────────────────────────────────────────────────────────────────
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
  console.log("[create-preference] 1. Request arrived — transactionId:", transactionId, "| buyerId:", user.id);

  const admin = createAdminClient();

  // ── Fetch transaction ──────────────────────────────────────────────────────
  const { data: tx, error: txError } = await admin
    .from("transactions")
    .select(`
      id, buyer_id, seller_id, price, currency, status, card_id,
      card:cards!card_id ( name, set_name )
    `)
    .eq("id", transactionId)
    .single();

  console.log("[create-preference] 2. Transaction fetch result:", JSON.stringify(tx, null, 2));
  if (txError) console.error("[create-preference] 2. Transaction fetch error:", txError);

  if (txError || !tx) {
    const resp = { error: "Transacción no encontrada." };
    console.log("[create-preference] RETURNING 404:", resp);
    return NextResponse.json(resp, { status: 404 });
  }

  if (tx.buyer_id !== user.id) {
    const resp = { error: "Solo el comprador puede iniciar el pago." };
    console.log("[create-preference] RETURNING 403:", resp);
    return NextResponse.json(resp, { status: 403 });
  }

  const PAYABLE_STATUSES = ["pending_buyer_confirmation", "in_chat", "payment_pending"];
  if (!PAYABLE_STATUSES.includes(tx.status)) {
    const resp = { error: "La transacción no puede procesarse en su estado actual.", status: tx.status };
    console.log("[create-preference] RETURNING 422 (bad status):", resp);
    return NextResponse.json(resp, { status: 422 });
  }

  // ── Fetch seller profile ───────────────────────────────────────────────────
  const { data: sellerProfile, error: sellerError } = await admin
    .from("profiles")
    .select("mercadopago_access_token, mercadopago_user_id, username")
    .eq("id", tx.seller_id)
    .single();

  console.log("[create-preference] 3. Seller profile — username:", sellerProfile?.username,
    "| mp_user_id:", sellerProfile?.mercadopago_user_id,
    "| access_token (first 20):", sellerProfile?.mercadopago_access_token?.slice(0, 20) ?? "NULL");
  if (sellerError) console.error("[create-preference] 3. Seller fetch error:", sellerError);

  if (sellerError || !sellerProfile?.mercadopago_access_token) {
    const resp = { error: "El vendedor no tiene MercadoPago conectado." };
    console.log("[create-preference] RETURNING 422 (no MP token):", resp);
    return NextResponse.json(resp, { status: 422 });
  }

  // ── Calculate fees ─────────────────────────────────────────────────────────
  const commissionPct = await getCommissionPercent();
  const price         = Number(tx.price);
  const platformFee   = Math.round(price * (commissionPct / 100) * 100) / 100;
  console.log("[create-preference] Commission:", commissionPct, "% | price:", price, "| platformFee:", platformFee);

  // ── Build preference payload ───────────────────────────────────────────────
  const card      = tx.card as unknown as { name: string; set_name: string | null } | null;
  const itemTitle = card
    ? `${card.name}${card.set_name ? ` — ${card.set_name}` : ""} · Card Stash`
    : "Carta TCG — Card Stash";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://singles.ar";

  const preferenceBody = {
    ...(platformFee > 0 && { marketplace_fee: platformFee }),
    items: [
      {
        id:          transactionId,
        title:       itemTitle,
        unit_price:  price,
        quantity:    1,
        currency_id: tx.currency ?? "ARS",
      },
    ],
    back_urls: {
      success: `${appUrl}/payment/success`,
      failure: `${appUrl}/payment/failure`,
      pending: `${appUrl}/payment/pending`,
    },
    ...(appUrl.startsWith("https://") && { auto_return: "approved" }),
    external_reference: transactionId,
    notification_url:   `${appUrl}/api/payments/webhook`,
    metadata:           { transaction_id: transactionId },
  };

  console.log("[create-preference] 4. Preference payload:", JSON.stringify(preferenceBody, null, 2));

  // ── Call MP ────────────────────────────────────────────────────────────────
  const sellerPreference = createSellerPreference(sellerProfile.mercadopago_access_token);

  let preference: Awaited<ReturnType<typeof sellerPreference.create>>;
  try {
    preference = await sellerPreference.create({ body: preferenceBody });

    const _pref = preference as unknown as Record<string, unknown>;
    console.log("[create-preference] 5. MP response:", JSON.stringify({
      status:             _pref.status,
      id:                 _pref.id,
      init_point:         _pref.init_point,
      sandbox_init_point: _pref.sandbox_init_point,
      error:              _pref.error,
      message:            _pref.message,
      cause:              _pref.cause,
    }, null, 2));

  } catch (err: unknown) {
    console.error("[create-preference] 5. MP SDK threw:", err);
    if (err && typeof err === "object") {
      const e = err as Record<string, unknown>;
      console.error("[create-preference] 5. err.message:", e.message);
      console.error("[create-preference] 5. err.cause:",   e.cause);
      console.error("[create-preference] 5. err.stack:",   e.stack);
      console.error("[create-preference] 5. full JSON:",   JSON.stringify(e, null, 2));
    }
    const cause = (err as Record<string, unknown>)?.cause as Record<string, unknown> | undefined;
    const mpMessage =
      (cause?.message as string | undefined) ??
      (cause?.error   as string | undefined) ??
      ((err as Record<string, unknown>)?.message as string | undefined) ??
      JSON.stringify(err, null, 2).slice(0, 300);
    const resp = { error: mpMessage ?? "No se pudo crear el pago en MercadoPago." };
    console.log("[create-preference] RETURNING 502:", resp);
    return NextResponse.json(resp, { status: 502 });
  }

  if (!preference.id) {
    const resp = { error: "Respuesta inválida de MercadoPago." };
    console.log("[create-preference] RETURNING 502 (no preference.id):", resp);
    return NextResponse.json(resp, { status: 502 });
  }

  // ── Persist + status update ────────────────────────────────────────────────
  const { error: updateError } = await admin
    .from("transactions")
    .update({
      mp_preference_id: preference.id,
      status:           "payment_pending",
      updated_at:       new Date().toISOString(),
    })
    .eq("id", transactionId)
    .in("status", ["pending_buyer_confirmation", "in_chat", "payment_pending"]);

  if (updateError) console.error("[create-preference] DB update error:", updateError);

  // System message in chat
  await admin.from("chat_messages").insert({
    transaction_id: transactionId,
    sender_id:      null,
    body:           "El comprador inició el proceso de pago.",
    message_type:   "system",
  });

  const responsePayload = {
    data: {
      preferenceId: preference.id,
      initPoint:    preference.init_point,
      sandboxUrl:   preference.sandbox_init_point,
    },
  };
  console.log("[create-preference] 6. Returning to frontend:", JSON.stringify(responsePayload, null, 2));
  return NextResponse.json(responsePayload);

  } catch (outerErr: unknown) {
    console.error("[create-preference] UNHANDLED ERROR:", outerErr);
    if (outerErr && typeof outerErr === "object") {
      console.error("[create-preference] stack:", (outerErr as Record<string, unknown>).stack);
    }
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}
