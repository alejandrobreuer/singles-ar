import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// ─── GET /api/listings/[id] ───────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("listings")
    .select("*, cards(id, name, image_url, game, set_name)")
    .eq("id", params.id)
    .eq("seller_id", user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Listing no encontrado o sin permisos." }, { status: 404 });
  }

  return NextResponse.json({ data });
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const patchSchema = z.object({
  listing_type: z.enum(["sale", "trade"]).optional(),
  price:        z.number().positive().nullable().optional(),
  condition:    z.enum(["NM", "LP", "MP", "HP", "DMG"]).optional(),
  quantity:     z.number().int().min(1).max(99).optional(),
  notes:            z.string().max(300).nullable().optional(),
  trade_for:        z.string().max(500).nullable().optional(),
  price_diff:       z.number().nullable().optional(),
  delivery_stores:  z.array(z.string()).max(20).nullable().optional(),
  status:           z.enum(["active", "reserved"]).optional(),
}).strict();

// ─── Ownership guard ──────────────────────────────────────────────────────────

async function getOwnedListing(userId: string, listingId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("listings")
    .select("id, seller_id, status")
    .eq("id", listingId)
    .single();

  if (error || !data) return { listing: null, supabase };
  if (data.seller_id !== userId) return { listing: null, supabase };
  return { listing: data, supabase };
}

// ─── PATCH /api/listings/[id] ─────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { listing } = await getOwnedListing(user.id, params.id);
  if (!listing) {
    return NextResponse.json({ error: "Listing no encontrado o sin permisos." }, { status: 404 });
  }

  if (listing.status === "sold" || listing.status === "cancelled") {
    return NextResponse.json(
      { error: "No podés editar un listing ya cerrado." },
      { status: 422 }
    );
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 422 }
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("listings")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: "Error al actualizar." }, { status: 500 });
  }

  return NextResponse.json({ data: updated });
}

// ─── DELETE /api/listings/[id] ────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { listing } = await getOwnedListing(user.id, params.id);
  if (!listing) {
    return NextResponse.json({ error: "Listing no encontrado o sin permisos." }, { status: 404 });
  }

  if (listing.status === "sold") {
    return NextResponse.json({ error: "No podés cancelar un listing ya vendido." }, { status: 422 });
  }

  const { error } = await supabase
    .from("listings")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: "Error al cancelar." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
