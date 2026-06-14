import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin }      from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LocationTree } from "@/types/database";

const createSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("province"),
    name: z.string().min(1).max(80),
    code: z.string().min(1).max(10),
    is_favorite: z.boolean().optional(),
    display_order: z.number().int().optional(),
  }),
  z.object({
    type: z.literal("zone"),
    name: z.string().min(1).max(80),
    province_id: z.string().uuid(),
  }),
  z.object({
    type: z.literal("area"),
    name: z.string().min(1).max(80),
    province_id: z.string().uuid(),
    zone_id: z.string().uuid().nullable().optional(),
  }),
  z.object({
    type: z.literal("store"),
    name: z.string().min(1).max(120),
    province_id: z.string().uuid(),
    zone_id: z.string().uuid().nullable().optional(),
    address: z.string().max(300).nullable().optional(),
    is_verified: z.boolean().optional(),
  }),
]);

const TYPE_TABLE: Record<string, "provinces" | "zones" | "areas" | "stores"> = {
  province: "provinces",
  zone:     "zones",
  area:     "areas",
  store:    "stores",
};

// ─── GET /api/admin/locations ────────────────────────────────────────────────
// Returns the full provinces/zones/areas/stores tree for the admin manager.

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();

  const [provinces, zones, areas, stores] = await Promise.all([
    admin.from("provinces").select("*").order("display_order", { ascending: true }),
    admin.from("zones").select("*").order("name", { ascending: true }),
    admin.from("areas").select("*").order("name", { ascending: true }),
    admin.from("stores").select("*").order("name", { ascending: true }),
  ]);

  if (provinces.error || zones.error || areas.error || stores.error) {
    return NextResponse.json({ error: "Error al cargar ubicaciones." }, { status: 500 });
  }

  const data: LocationTree = {
    provinces: provinces.data ?? [],
    zones:     zones.data ?? [],
    areas:     areas.data ?? [],
    stores:    stores.data ?? [],
  };

  return NextResponse.json({ data });
}

// ─── POST /api/admin/locations ───────────────────────────────────────────────
// body: { type: "province" | "zone" | "area" | "store", ...fields }

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

  const { type, ...fields } = parsed.data;
  const table = TYPE_TABLE[type];

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin
    .from(table)
    .insert(fields)
    .select("*")
    .single();

  if (dbErr) {
    const msg = dbErr.code === "23505" ? "Ya existe una ubicación con esos datos." : "Error al crear ubicación.";
    return NextResponse.json({ error: msg }, { status: dbErr.code === "23505" ? 409 : 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
