import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { LANGUAGES_BY_GAME } from "@/lib/cardAttributes";
import { computeDiscountedPrice } from "@/lib/pricing";
import type { Game } from "@/types/database";

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
    .select(`
      *,
      cards(id, name, image_url, game, set_name),
      listing_locations (
        id, province_id, zone_id, area_id, store_id,
        provinces ( name ),
        zones ( name ),
        areas ( name ),
        stores ( name, address )
      )
    `)
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
  language:     z.enum(["en", "es", "pt", "ja"]).optional(),
  quantity:     z.number().int().min(1).max(99).optional(),
  notes:            z.string().max(300).nullable().optional(),
  trade_for:        z.string().max(500).nullable().optional(),
  price_diff:       z.number().nullable().optional(),
  delivery_stores:  z.array(z.string()).max(20).nullable().optional(),
  locations: z.array(z.object({
    province_id: z.string().uuid(),
    zone_id:     z.string().uuid().nullable().optional(),
    area_id:     z.string().uuid().nullable().optional(),
    store_id:    z.string().uuid().nullable().optional(),
  })).max(5).optional(),
  status:           z.enum(["active", "reserved"]).optional(),
  discount_type:  z.enum(["fixed", "percentage"]).nullable().optional(),
  discount_value: z.number().positive().nullable().optional(),
}).strict().refine(
  (d) => (d.discount_type === undefined || d.discount_type === null) === (d.discount_value === undefined || d.discount_value === null),
  { message: "discount_type y discount_value deben enviarse juntos (o ambos null).", path: ["discount_value"] },
).refine(
  (d) => d.discount_type !== "percentage" || (d.discount_value != null && d.discount_value < 100),
  { message: "El porcentaje de descuento debe ser menor a 100.", path: ["discount_value"] },
);

// ─── Ownership guard ──────────────────────────────────────────────────────────

async function getOwnedListing(userId: string, listingId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("listings")
    .select("id, seller_id, status, price, original_price, discount_type, discount_value, cards ( game )")
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

  if (parsed.data.language) {
    const game = (listing as unknown as { cards: { game: Game } | null }).cards?.game;
    if (game && !LANGUAGES_BY_GAME[game].includes(parsed.data.language)) {
      return NextResponse.json({ error: "Idioma inválido para este juego." }, { status: 422 });
    }
  }

  const { locations, discount_type, discount_value, price: bodyPrice, ...restFields } = parsed.data;

  let priceUpdate: Record<string, unknown> = {};

  if (discount_type !== undefined && discount_type !== null) {
    // Setting or editing a discount. Base is always the listing's own current
    // original_price (if already discounted) or current price (first time) —
    // never a client-supplied value, so re-applying a discount never compounds
    // on top of a previous discount.
    const base = listing.original_price ?? listing.price;
    if (base == null) {
      return NextResponse.json({ error: "No se puede aplicar un descuento a un listing sin precio." }, { status: 422 });
    }
    if (discount_type === "fixed" && discount_value! >= base) {
      return NextResponse.json({ error: "El descuento no puede ser mayor o igual al precio original." }, { status: 422 });
    }
    const computed = computeDiscountedPrice(base, discount_type, discount_value!);
    if (computed <= 0) {
      return NextResponse.json({ error: "El descuento deja el precio en cero o negativo." }, { status: 422 });
    }
    priceUpdate = { original_price: base, discount_type, discount_value, price: computed };
  } else if (discount_type === null) {
    // Explicit removal — use the client-provided price if given (the seller may
    // have edited it in the same request), else revert to the pre-discount price.
    const base = listing.original_price ?? listing.price;
    priceUpdate = { original_price: null, discount_type: null, discount_value: null, price: bodyPrice ?? base };
  } else if (bodyPrice !== undefined) {
    // Ordinary direct price edit (quick-edit / bulk price / full-edit "Precio de venta").
    // If this listing currently has an active discount, a direct price write is an
    // implicit "set the exact price I typed" — silently keeping stale discount
    // metadata around would misrepresent the listing to buyers (still showing a
    // strikethrough) and would resurrect the discount formula against a stale
    // base on the next edit. So a bare `price` write always clears any discount.
    priceUpdate = { price: bodyPrice };
    if (listing.discount_type) {
      priceUpdate = { ...priceUpdate, original_price: null, discount_type: null, discount_value: null };
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from("listings")
    .update({ ...restFields, ...priceUpdate, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: "Error al actualizar." }, { status: 500 });
  }

  // ── Replace delivery locations ─────────────────────────────────────────────
  if (locations !== undefined) {
    await supabase.from("listing_locations").delete().eq("listing_id", params.id);

    if (locations.length > 0) {
      const { error: locError } = await supabase
        .from("listing_locations")
        .insert(locations.map((loc) => ({
          listing_id:  params.id,
          province_id: loc.province_id,
          zone_id:     loc.zone_id  ?? null,
          area_id:     loc.area_id  ?? null,
          store_id:    loc.store_id ?? null,
        })));

      if (locError) {
        console.error("[PATCH /api/listings/:id] listing_locations insert error:", locError);
      }
    }
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
