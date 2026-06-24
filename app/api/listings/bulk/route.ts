import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LANGUAGES_BY_GAME } from "@/lib/cardAttributes";

const MAX_BATCH = 50;

const listingItemSchema = z.object({
  card_id:      z.string().uuid("card_id inválido."),
  listing_type: z.enum(["sale", "trade"]),
  price:        z.number().positive("El precio debe ser mayor a 0.").nullable(),
  condition:    z.enum(["NM", "LP", "MP", "HP", "DMG"]),
  language:     z.enum(["en", "es", "pt", "ja"]).optional(),
  quantity:     z.number().int().min(1).max(99).default(1),
  notes:        z.string().max(300).nullable().optional(),
  locations:    z.array(z.object({
    province_id: z.string().uuid(),
    zone_id:     z.string().uuid().nullable().optional(),
    area_id:     z.string().uuid().nullable().optional(),
    store_id:    z.string().uuid().nullable().optional(),
  })).max(5).optional(),
}).refine(
  (d) => d.listing_type === "trade" || (d.price != null && d.price > 0),
  { message: "Las ventas directas requieren un precio.", path: ["price"] }
);

const bulkSchema = z.object({
  listings: z.array(listingItemSchema).min(2).max(MAX_BATCH),
});

export async function POST(req: NextRequest) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Necesitás iniciar sesión para publicar.", code: "AUTH_REQUIRED" },
      { status: 401 }
    );
  }

  const admin = createAdminClient();

  // Check global toggle
  const { data: settingRow } = await admin
    .from("admin_settings")
    .select("value")
    .eq("key", "bulk_listing_enabled")
    .single();

  if (!settingRow || String(settingRow.value) !== "true") {
    return NextResponse.json(
      { error: "La publicación masiva no está habilitada.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  // Check per-user toggle
  const { data: profile } = await admin
    .from("profiles")
    .select("bulk_listing_disabled, mercadopago_user_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.bulk_listing_disabled) {
    return NextResponse.json(
      { error: "Tu cuenta no tiene acceso a publicación masiva.", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  if (!profile.mercadopago_user_id) {
    return NextResponse.json(
      { error: "Necesitás vincular MercadoPago para publicar.", code: "VALIDATION_ERROR" },
      { status: 422 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Body inválido.", code: "INVALID_BODY" },
      { status: 400 }
    );
  }

  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Datos inválidos.";
    if (parsed.error.issues.some((i) => i.path.includes("listings") && i.code === "too_big")) {
      return NextResponse.json(
        { error: `Máximo ${MAX_BATCH} cartas por lote. Dividí en varios lotes.`, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: msg, code: "VALIDATION_ERROR" },
      { status: 422 }
    );
  }

  const { listings } = parsed.data;

  // Fetch all referenced cards to validate language
  const cardIds = [...new Set(listings.map((l) => l.card_id))];
  const { data: cards } = await admin
    .from("cards")
    .select("id, game, name")
    .in("id", cardIds);

  const cardMap = new Map((cards ?? []).map((c) => [c.id, c]));

  const created: { card_id: string; card_name: string }[] = [];
  const failed: { card_name: string; error: string }[] = [];

  for (const item of listings) {
    const card = cardMap.get(item.card_id);
    if (!card) {
      failed.push({ card_name: item.card_id, error: "Carta no encontrada." });
      continue;
    }

    const lang = item.language ?? LANGUAGES_BY_GAME[card.game as keyof typeof LANGUAGES_BY_GAME]?.[0] ?? "es";
    if (!LANGUAGES_BY_GAME[card.game as keyof typeof LANGUAGES_BY_GAME]?.includes(lang)) {
      failed.push({ card_name: card.name, error: "Idioma inválido para este juego." });
      continue;
    }

    const { data: listing, error: insertError } = await supabase
      .from("listings")
      .insert({
        card_id:      item.card_id,
        seller_id:    user.id,
        listing_type: item.listing_type,
        price:        item.price,
        currency:     "ARS",
        condition:    item.condition,
        language:     lang,
        quantity:     item.quantity,
        status:       "active",
        notes:        item.notes ?? null,
      })
      .select("id, card_id")
      .single();

    if (insertError) {
      failed.push({ card_name: card.name, error: insertError.message });
      continue;
    }

    // Insert delivery locations
    if (item.locations && item.locations.length > 0) {
      await supabase
        .from("listing_locations")
        .insert(item.locations.map((loc) => ({
          listing_id:  listing.id,
          province_id: loc.province_id,
          zone_id:     loc.zone_id  ?? null,
          area_id:     loc.area_id  ?? null,
          store_id:    loc.store_id ?? null,
        })));
    }

    created.push({ card_id: listing.card_id, card_name: card.name });
  }

  const status = failed.length === 0 ? 201 : created.length === 0 ? 500 : 207;
  return NextResponse.json({ created, failed }, { status });
}
