import { NextResponse } from "next/server";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomBytes }       from "crypto";

// ─── GET /api/auth/mercadopago — start OAuth flow ────────────────────────────
// Builds the MP Marketplace authorization URL and redirects the browser to it.
// The `state` parameter is required for Marketplace apps so that the seller
// token returned by MP is linked to the marketplace (enabling marketplace_fee).

export async function GET() {
  const clientId    = process.env.MP_CLIENT_ID;
  const redirectUri = process.env.MP_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "MercadoPago no está configurado en el servidor." },
      { status: 500 }
    );
  }

  const state = randomBytes(16).toString("hex");

  const url = new URL("https://auth.mercadopago.com.ar/authorization");
  url.searchParams.set("client_id",     clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("platform_id",   "mp");
  url.searchParams.set("state",         state);
  url.searchParams.set("redirect_uri",  redirectUri);

  return NextResponse.redirect(url.toString());
}

// ─── DELETE /api/auth/mercadopago — disconnect ────────────────────────────────
// Clears all MP credentials from the seller's profile.

export async function DELETE() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      mercadopago_access_token:  null,
      mercadopago_refresh_token: null,
      mercadopago_user_id:       null,
      mercadopago_connected_at:  null,
    })
    .eq("id", user.id);

  if (error) {
    console.error("[DELETE /api/auth/mercadopago]", error);
    return NextResponse.json({ error: "Error al desconectar." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
