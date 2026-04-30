import { NextRequest, NextResponse } from "next/server";
import { addDays } from "date-fns";
import { z } from "zod";
import { createClient }       from "@/lib/supabase/server";
import { createAdminClient }  from "@/lib/supabase/admin";
import { getCardPrice }       from "@/lib/tcgplayer";
import { validatePrice, DEFAULT_SETTINGS } from "@/lib/priceValidation";

// ─── Schema ───────────────────────────────────────────────────────────────────

const createBuyOrderSchema = z.object({
  card_id:       z.string().uuid("card_id inválido."),
  price:         z.number().positive("El precio debe ser mayor a 0."),
  condition:     z.enum(["NM", "LP", "MP", "HP", "DMG"]).nullable().optional(),
  quantity:      z.number().int().min(1).max(99).default(1),
  duration_days: z.number().int().refine((d) => [15, 30, 60].includes(d), {
    message: "La duración debe ser 15, 30 o 60 días.",
  }).default(30),
  notes: z.string().max(300).nullable().optional(),
});

// ─── Settings helper ──────────────────────────────────────────────────────────

async function getSettings() {
  const admin = createAdminClient();
  const { data } = await admin.from("admin_settings").select("key, value");
  if (!data) return { ...DEFAULT_SETTINGS, max_cancels_before_flag: 3, buy_order_default_days: 30 };

  const s = { ...DEFAULT_SETTINGS, max_cancels_before_flag: 3, buy_order_default_days: 30 } as Record<string, number>;
  for (const row of data) {
    const val = parseFloat(String(row.value));
    if (!isNaN(val)) s[row.key] = val;
  }
  return s;
}

// ─── POST /api/buy-orders ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Necesitás iniciar sesión." }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = createBuyOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 422 }
    );
  }

  const input = parsed.data;

  // ── Price validation against TCGPlayer ────────────────────────────────────
  const admin = createAdminClient();
  const { data: card } = await admin
    .from("cards")
    .select("tcgplayer_id")
    .eq("id", input.card_id)
    .single();

  if (card?.tcgplayer_id) {
    const [priceResult, settings] = await Promise.all([
      getCardPrice(input.card_id, card.tcgplayer_id).catch(() => null),
      getSettings(),
    ]);

    if (priceResult?.price_usd != null) {
      const validation = validatePrice(
        input.price,
        priceResult.price_usd,
        settings.usd_to_ars_rate,
        settings.price_tolerance_percent
      );

      if (!validation.valid) {
        const { formatARS } = await import("@/lib/formatting");
        return NextResponse.json(
          {
            error: `El precio ofrecido está fuera del rango permitido. Debe estar entre ${formatARS(validation.min)} y ${formatARS(validation.max)}.`,
            validation,
          },
          { status: 422 }
        );
      }
    }
  }

  // ── Insert ─────────────────────────────────────────────────────────────────
  const expires_at = addDays(new Date(), input.duration_days).toISOString();

  const { data: order, error } = await supabase
    .from("buy_orders")
    .insert({
      card_id:    input.card_id,
      buyer_id:   user.id,
      price:      input.price,
      currency:   "ARS",
      condition:  input.condition ?? null,
      quantity:   input.quantity,
      status:     "active",
      expires_at,
      notes:      input.notes ?? null,
    })
    .select("id, card_id")
    .single();

  if (error) {
    console.error("[POST /api/buy-orders]", error);
    return NextResponse.json({ error: "No se pudo crear la orden de compra." }, { status: 500 });
  }

  return NextResponse.json({ data: order }, { status: 201 });
}
