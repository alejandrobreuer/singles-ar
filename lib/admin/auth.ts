import { NextResponse }    from "next/server";
import { createClient }    from "@/lib/supabase/server";

// ─── Admin user ID list ───────────────────────────────────────────────────────

export function getAdminUserIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function isAdminId(userId: string): boolean {
  return getAdminUserIds().includes(userId);
}

// ─── Server component guard ───────────────────────────────────────────────────
// Use in Server Components / Route Handlers to get the authed admin user.
// Returns null if not authenticated or not an admin.

export async function getAdminUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminId(user.id)) return null;
  return user;
}

// ─── API route guard ──────────────────────────────────────────────────────────
// Use in API route handlers. Returns { user } on success or { error: Response }.

export async function requireAdmin(): Promise<
  | { user: NonNullable<Awaited<ReturnType<typeof getAdminUser>>>; error: null }
  | { user: null; error: NextResponse }
> {
  const user = await getAdminUser();
  if (!user) {
    return {
      user:  null,
      error: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    };
  }
  return { user, error: null };
}
