import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin }      from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: { id: string } };

const patchSchema = z.object({
  name:       z.string().min(1).max(80).optional(),
  is_active:  z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

// ─── PATCH /api/admin/delivery-stores/[id] ───────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from("delivery_store_options")
    .update(parsed.data)
    .eq("id", params.id)
    .select("*")
    .single();

  if (dbErr) return NextResponse.json({ error: "Error al actualizar tienda." }, { status: 500 });
  return NextResponse.json({ data });
}

// ─── DELETE /api/admin/delivery-stores/[id] ──────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();
  const { error: dbErr } = await admin
    .from("delivery_store_options")
    .delete()
    .eq("id", params.id);

  if (dbErr) return NextResponse.json({ error: "Error al eliminar tienda." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
