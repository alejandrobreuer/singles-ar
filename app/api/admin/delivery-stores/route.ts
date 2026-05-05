import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin }      from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const createSchema = z.object({
  name:       z.string().min(1).max(80),
  sort_order: z.number().int().optional(),
});

// ─── GET /api/admin/delivery-stores ──────────────────────────────────────────

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("delivery_store_options")
    .select("*")
    .order("sort_order", { ascending: true });

  if (dbErr) return NextResponse.json({ error: "Error al cargar tiendas." }, { status: 500 });
  return NextResponse.json({ data });
}

// ─── POST /api/admin/delivery-stores ─────────────────────────────────────────

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
  const { data, error: dbErr } = await admin
    .from("delivery_store_options")
    .insert(parsed.data)
    .select("*")
    .single();

  if (dbErr) {
    const msg = dbErr.code === "23505" ? "Ese nombre ya existe." : "Error al crear tienda.";
    return NextResponse.json({ error: msg }, { status: dbErr.code === "23505" ? 409 : 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
