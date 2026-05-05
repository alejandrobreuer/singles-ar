import { NextRequest, NextResponse } from "next/server";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── GET /api/notifications ───────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("[GET /api/notifications]", error);
    return NextResponse.json({ error: "Error al cargar notificaciones." }, { status: 500 });
  }

  const notifications = data ?? [];
  const unreadCount   = notifications.filter((n) => !n.read_at).length;

  return NextResponse.json({ data: notifications, unreadCount });
}

// ─── PATCH /api/notifications — mark as read ──────────────────────────────────
// Body: { ids?: string[] } — omit to mark all unread as read.

export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const admin = createAdminClient();
  const now   = new Date().toISOString();

  let ids: string[] | undefined;
  try {
    const body = await req.json() as { ids?: string[] };
    ids = body.ids;
  } catch { /* no body → mark all */ }

  if (ids && ids.length > 0) {
    await admin
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", user.id)
      .is("read_at", null)
      .in("id", ids);
  } else {
    await admin
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", user.id)
      .is("read_at", null);
  }

  return NextResponse.json({ ok: true });
}
