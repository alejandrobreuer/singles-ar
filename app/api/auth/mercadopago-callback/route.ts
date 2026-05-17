import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── MP token exchange ────────────────────────────────────────────────────────

interface MPTokenResponse {
  access_token:  string;
  refresh_token: string;
  user_id:       number;
  expires_in:    number;
  token_type:    string;
}

async function exchangeCodeForToken(code: string): Promise<MPTokenResponse> {
  const res = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id:     process.env.MP_CLIENT_ID,
      client_secret: process.env.MP_CLIENT_SECRET,
      code,
      grant_type:    "authorization_code",
      redirect_uri:  process.env.MP_REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MercadoPago token error: ${res.status} — ${body}`);
  }

  return res.json() as Promise<MPTokenResponse>;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const error = searchParams.get("error");

  const redirectBase = process.env.NEXT_PUBLIC_APP_URL ?? "";

  // MP returned an error (e.g. user denied)
  if (error || !code) {
    return NextResponse.redirect(
      `${redirectBase}/profile?mp_error=${encodeURIComponent(error ?? "access_denied")}`
    );
  }

  // Get the authenticated Supabase user from the session cookie
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${redirectBase}/login?next=/onboarding/mercadopago`);
  }

  try {
    const token = await exchangeCodeForToken(code);

    // Persist the tokens via admin client (bypasses RLS)
    const admin = createAdminClient();
    const { error: upsertError } = await admin
      .from("profiles")
      .update({
        mercadopago_access_token:  token.access_token,
        mercadopago_refresh_token: token.refresh_token,
        mercadopago_user_id:       String(token.user_id),
        mercadopago_connected_at:  new Date().toISOString(),
      })
      .eq("id", user.id);

    if (upsertError) {
      console.error("[MP callback] DB update error:", upsertError);
      return NextResponse.redirect(`${redirectBase}/profile?mp_error=db_error`);
    }

    return NextResponse.redirect(`${redirectBase}/profile?mp_success=1`);
  } catch (err) {
    console.error("[MP callback] Token exchange error:", err);
    return NextResponse.redirect(`${redirectBase}/profile?mp_error=token_exchange`);
  }
}
