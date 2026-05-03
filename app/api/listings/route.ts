import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_SETTINGS } from "@/lib/priceValidation";

// ─── Schema ───────────────────────────────────────────────────────────────────

const createListingSchema = z.object({
  card_id:      z.string().uuid("card_id inválido."),
  listing_type: z.enum(["sale", "trade"]),
  price:        z.number().positive("El precio debe ser mayor a 0.").nullable(),
  condition:    z.enum(["NM", "LP", "MP", "HP", "DMG"]),
  quantity:     z.number().int().min(1).max(99).default(1),
  notes:            z.string().max(300).nullable().optional(),
  trade_for:        z.string().max(500).nullable().optional(),
  price_diff:       z.number().nullable().optional(),
  delivery_stores:  z.array(z.string()).max(20).nullable().optional(),
}).refine(
  (d) => d.listing_type === "trade" || (d.price != null && d.price > 0),
  { message: "Las ventas directas requieren un precio.", path: ["price"] }
).refine(
  (d) => d.listing_type === "sale" || (d.trade_for && d.trade_for.trim().length > 0),
  { message: "Los canjes requieren indicar qué pedís a cambio.", path: ["trade_for"] }
);

// ─── Fetch admin settings helper ─────────────────────────────────────────────

async function getSettings() {
  const admin = createAdminClient();
  const { data } = await admin.from("admin_settings").select("key, value");
  if (!data) return DEFAULT_SETTINGS;

  const settings = { ...DEFAULT_SETTINGS };
  for (const row of data) {
    const val = parseFloat(String(row.value));
    if (!isNaN(val) && row.key in DEFAULT_SETTINGS) {
      (settings as Record<string, number>)[row.key] = val;
    }
  }
  return settings;
}

// ─── POST /api/listings ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Necesitás iniciar sesión para publicar." }, { status: 401 });
  }

  // Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const parsed = createListingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 422 }
    );
  }

  const input = parsed.data;

  // ── Insert listing ─────────────────────────────────────────────────────────
  const { data: listing, error: insertError } = await supabase
    .from("listings")
    .insert({
      card_id:      input.card_id,
      seller_id:    user.id,
      listing_type: input.listing_type,
      price:        input.price,
      currency:     "ARS",
      condition:    input.condition,
      quantity:     input.quantity,
      status:       "active",
      notes:           input.notes           ?? null,
      trade_for:       input.trade_for       ?? null,
      price_diff:      input.price_diff      ?? null,
      delivery_stores: input.delivery_stores ?? null,
    })
    .select("id, card_id")
    .single();

  if (insertError) {
    console.error("[POST /api/listings]", insertError.message, insertError.details);
    return NextResponse.json({ error: "No se pudo crear el listing.", detail: insertError.message }, { status: 500 });
  }

  // ── Wishlist notification targets (non-blocking) ──────────��───────────────
  // Find users who have this card in their wishlist, excluding the seller.
  // TODO: trigger push/email notifications once notification system is built.
  const admin = createAdminClient();
  admin
    .from("wishlist")
    .select("user_id")
    .eq("card_id", input.card_id)
    .neq("user_id", user.id)
    .then(({ data: targets }) => {
      if (targets && targets.length > 0) {
        const userIds = targets.map((t) => t.user_id);
        console.log(
          `[listings] New listing ${listing.id} for card ${input.card_id}. ` +
          `Notify wishlist users: ${userIds.join(", ")}`
        );
      }
    })
    .catch(() => null);

  return NextResponse.json({ data: listing }, { status: 201 });
}
