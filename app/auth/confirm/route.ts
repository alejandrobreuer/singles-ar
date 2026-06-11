import { createServerClient } from "@supabase/ssr";
import { cookies }            from "next/headers";
import { NextResponse }       from "next/server";
import type { NextRequest }   from "next/server";
import type { EmailOtpType }  from "@supabase/supabase-js";

// ─── GET /auth/confirm ────────────────────────────────────────────────────────
// Handles the PKCE email confirmation callback. Supabase sends users here after
// they click the link in their confirmation email:
//   /auth/confirm?token_hash=...&type=signup&next=/onboarding/username
//
// Without this route the token is never exchanged and email stays unconfirmed.

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type       = searchParams.get("type") as EmailOtpType | null;
  const next       = searchParams.get("next") ?? "/onboarding/username";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  if (!token_hash || !type) {
    return NextResponse.redirect(`${appUrl}/login?error=invalid_confirmation_link`);
  }

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.verifyOtp({ token_hash, type });

  if (error) {
    console.error("[auth/confirm] verifyOtp error:", error.message);
    // Most likely cause: the link was already used (e.g. an email security
    // scanner pre-visited it), so the account is probably already confirmed.
    return NextResponse.redirect(`${appUrl}/login?error=link_already_used`);
  }

  return NextResponse.redirect(`${appUrl}${next}`);
}
