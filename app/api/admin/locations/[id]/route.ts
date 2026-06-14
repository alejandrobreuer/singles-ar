import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin }      from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: { id: string } };

const TYPE_TABLE: Record<string, "provinces" | "zones" | "areas" | "stores"> = {
  province: "provinces",
  zone:     "zones",
  area:     "areas",
  store:    "stores",
};

const patchSchema = z.object({
  type: z.enum(["province", "zone", "area", "store"]),
  is_favorite:   z.boolean().optional(),
  display_order: z.number().int().optional(),
  is_verified:   z.boolean().optional(),
  name:          z.string().min(1).max(120).optional(),
  address:       z.string().max(300).nullable().optional(),
});

// ─── PATCH /api/admin/locations/[id] ─────────────────────────────────────────
// body: { type: "province" | "zone" | "area" | "store", ...fields to update }

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

  const { type, ...fields } = parsed.data;
  const table = TYPE_TABLE[type];

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from(table)
    .update(fields)
    .eq("id", params.id)
    .select("*")
    .single();

  if (dbErr) return NextResponse.json({ error: "Error al actualizar." }, { status: 500 });
  return NextResponse.json({ data });
}

// ─── DELETE /api/admin/locations/[id]?type=province|zone|area|store ─────────

export async function DELETE(req: NextRequest, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const type = req.nextUrl.searchParams.get("type") ?? "";
  const table = TYPE_TABLE[type];
  if (!table) return NextResponse.json({ error: "Tipo inválido." }, { status: 422 });

  const admin = createAdminClient();
  const { error: dbErr } = await admin
    .from(table)
    .delete()
    .eq("id", params.id);

  if (dbErr) return NextResponse.json({ error: "Error al eliminar." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
