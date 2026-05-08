import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ─── Protected route prefixes ─────────────────────────────────────────────────

// Exact paths that require auth
const PROTECTED_EXACT = ["/profile", "/orders", "/accept-terms"];

// Prefix paths that require auth (all sub-paths protected)
const PROTECTED_PREFIX = ["/sell", "/chat", "/listings", "/buy-orders"];

// Public sub-paths that are carved out from protected prefixes
// e.g. /profile/[username] is public, /profile itself is auth-required
function isProtected(pathname: string): boolean {
  if (PROTECTED_EXACT.includes(pathname)) return true;
  if (PROTECTED_PREFIX.some((p) => pathname.startsWith(p + "/") || pathname === p)) return true;
  return false;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  // Skip if Supabase isn't configured yet (local dev without .env)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!supabaseUrl.startsWith("http")) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — MUST be called before checking user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Redirect unauthenticated users away from protected routes
  if (!user && isProtected(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Redirect authenticated users who haven't accepted terms
  if (user && isProtected(pathname) && pathname !== "/accept-terms") {
    if (!user.user_metadata?.terms_accepted) {
      const acceptUrl = request.nextUrl.clone();
      acceptUrl.pathname = "/accept-terms";
      acceptUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(acceptUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static, _next/image (Next.js internals)
     * - favicon, public assets
     * - api routes handled separately
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
