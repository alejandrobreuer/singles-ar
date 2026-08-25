import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin }    from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── GET /api/admin/cards?q=&game=&page=&limit= ───────────────────────────────

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q     = searchParams.get("q")?.trim() ?? "";
  const game  = searchParams.get("game") ?? "";
  const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50", 10));
  const from  = (page - 1) * limit;

  const admin = createAdminClient();
  let query = admin
    .from("cards")
    .select(
      "id, name, set_name, set_code, card_number, rarity, image_url, image_override_url, game, lang, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (q)    query = query.ilike("name", `%${q}%`);
  if (game) query = query.eq("game", game);

  const { data, error: dbErr, count } = await query;
  if (dbErr) return NextResponse.json({ error: "DB error." }, { status: 500 });

  return NextResponse.json({ data, total: count ?? 0, page, limit });
}

// ─── POST /api/admin/cards ─────────────────────────────────────────────────────
// Manual card creation

const createSchema = z.object({
  name:         z.string().min(1).max(200),
  game:         z.enum(["magic", "pokemon", "onepiece", "dbz"]),
  set_name:     z.string().max(200).optional(),
  set_code:     z.string().max(20).optional(),
  card_number:  z.string().max(20).optional(),
  rarity:       z.string().max(30).optional(),
  image_url:    z.string().url().optional(),
  lang:         z.string().default("es"),
});

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
  }

  const admin = createAdminClient();
  const externalId = `manual_${Date.now()}`;
  const { data, error: dbErr } = await admin
    .from("cards")
    .insert({ ...parsed.data, external_id: externalId })
    .select("id")
    .single();

  if (dbErr) return NextResponse.json({ error: "DB error." }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

// ─── PATCH /api/admin/cards ────────────────────────────────────────────────────
// Update image_override_url or other editable fields

const patchSchema = z.object({
  id:                   z.string().uuid(),
  image_override_url:   z.string().url().nullable().optional(),
  name:                 z.string().min(1).max(200).optional(),
  set_name:             z.string().max(200).nullable().optional(),
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

  const { id, ...fields } = parsed.data;
  const updates = Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v !== undefined)
  );

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Sin cambios." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error: dbErr } = await admin
    .from("cards")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (dbErr) return NextResponse.json({ error: "DB error." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
