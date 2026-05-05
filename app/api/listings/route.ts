import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_SETTINGS }  from "@/lib/priceValidation";
import { notifyMany }        from "@/lib/notifications";

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
    return NextResponse.json(
      { error: "Necesitás iniciar sesión para publicar.", code: "AUTH_REQUIRED" },
      { status: 401 }
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Body inválido.", code: "INVALID_BODY" },
      { status: 400 }
    );
  }

  const parsed = createListingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
        code:  "VALIDATION_ERROR",
        field: parsed.error.issues[0]?.path?.join("."),
      },
      { status: 422 }
    );
  }

  const input = parsed.data;

  // ── Insert listing ─────────────────────────────────────────────────────────
  const insertPayload: Record<string, unknown> = {
    card_id:      input.card_id,
    seller_id:    user.id,
    listing_type: input.listing_type,
    price:        input.price,
    currency:     "ARS",
    condition:    input.condition,
    quantity:     input.quantity,
    status:       "active",
    notes:        input.notes      ?? null,
    trade_for:    input.trade_for  ?? null,
    price_diff:   input.price_diff ?? null,
  };

  // Only include delivery_stores when there is actual data — omitting the key
  // entirely avoids PGRST204 if the column hasn't been migrated yet.
  if (input.delivery_stores && input.delivery_stores.length > 0) {
    insertPayload.delivery_stores = input.delivery_stores;
  }

  const { data: listing, error: insertError } = await supabase
    .from("listings")
    .insert(insertPayload)
    .select("id, card_id")
    .single();

  if (insertError) {
    console.error("[POST /api/listings] DB error:", insertError);
    return NextResponse.json(
      {
        error:  "No se pudo crear el listing.",
        code:   "DB_INSERT_ERROR",
        detail: insertError.message,
        hint:   insertError.hint   ?? undefined,
        pg:     insertError.code   ?? undefined,
      },
      { status: 500 }
    );
  }

  // ── Wishlist stock notifications (non-blocking) ───────────────────────────
  const notifAdmin = createAdminClient();
  notifAdmin
    .from("wishlist")
    .select("user_id")
    .eq("card_id", input.card_id)
    .neq("user_id", user.id)
    .then(async ({ data: targets }) => {
      if (!targets || targets.length === 0) return;
      const { data: card } = await notifAdmin
        .from("cards").select("name").eq("id", input.card_id).single();
      const cardName = card?.name ?? "una carta";
      await notifyMany(targets.map((t) => ({
        user_id: t.user_id as string,
        type:    "wishlist_stock" as const,
        title:   `Nuevo stock: ${cardName}`,
        body:    "Un vendedor publicó una carta en tu wishlist.",
        link:    `/cards/${input.card_id}`,
      })));
    })
    .catch(() => null);

  return NextResponse.json({ data: listing }, { status: 201 });
}
