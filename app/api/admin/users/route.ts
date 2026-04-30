import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin }    from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── GET /api/admin/users?q=&page=&limit= ─────────────────────────────────────

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q     = searchParams.get("q")?.trim() ?? "";
  const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "25", 10));
  const from  = (page - 1) * limit;

  const admin = createAdminClient();
  let query = admin
    .from("profiles")
    .select(
      "id, username, email, reputation_score, total_sales, total_purchases, " +
      "cancel_count, is_reliable_buyer, created_at, suspended_at, suspend_reason",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (q) {
    query = query.or(`username.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data, error: dbErr, count } = await query;
  if (dbErr) return NextResponse.json({ error: "DB error." }, { status: 500 });

  return NextResponse.json({ data, total: count ?? 0, page, limit });
}

// ─── PATCH /api/admin/users ────────────────────────────────────────────────────

const patchSchema = z.object({
  userId:         z.string().uuid(),
  action:         z.enum(["suspend", "unsuspend", "unflag"]),
  suspend_reason: z.string().max(300).optional(),
});

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
  }

  const { userId, action, suspend_reason } = parsed.data;
  const admin = createAdminClient();

  if (action === "suspend") {
    const { error: dbErr } = await admin
      .from("profiles")
      .update({ suspended_at: new Date().toISOString(), suspend_reason: suspend_reason ?? null })
      .eq("id", userId);
    if (dbErr) return NextResponse.json({ error: "DB error." }, { status: 500 });
  } else if (action === "unsuspend") {
    const { error: dbErr } = await admin
      .from("profiles")
      .update({ suspended_at: null, suspend_reason: null })
      .eq("id", userId);
    if (dbErr) return NextResponse.json({ error: "DB error." }, { status: 500 });
  } else if (action === "unflag") {
    const { error: dbErr } = await admin
      .from("profiles")
      .update({ is_reliable_buyer: true, cancel_count: 0 })
      .eq("id", userId);
    if (dbErr) return NextResponse.json({ error: "DB error." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
