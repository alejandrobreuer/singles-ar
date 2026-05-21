import { NextRequest, NextResponse } from "next/server";
import { addDays } from "date-fns";
import { z } from "zod";
import { createClient }       from "@/lib/supabase/server";
// ─── Schema ───────────────────────────────────────────────────────────────────

const createBuyOrderSchema = z.object({
  card_id:       z.string().uuid("card_id inválido."),
  price:         z.number().positive("El precio debe ser mayor a 0."),
  condition:     z.enum(["NM", "LP", "MP", "HP", "DMG"]).nullable().optional(),
  quantity:      z.number().int().min(1).max(99).default(1),
  duration_days: z.number().int().refine((d) => [15, 30, 60].includes(d), {
    message: "La duración debe ser 15, 30 o 60 días.",
  }).default(30),
  notes:           z.string().max(300).nullable().optional(),
  delivery_stores: z.array(z.string()).nullable().optional(),
});

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

  // ── Insert ─────────────────────────────────────────────────────────────────
  const expires_at = addDays(new Date(), input.duration_days).toISOString();

  const insertPayload: Record<string, unknown> = {
    card_id:   input.card_id,
    buyer_id:  user.id,
    price:     input.price,
    currency:  "ARS",
    condition: input.condition ?? null,
    quantity:  input.quantity,
    status:    "active",
    expires_at,
    notes:     input.notes ?? null,
  };

  // Only include delivery_stores when there is actual data — omitting the key
  // entirely avoids PGRST204 if the column hasn't been migrated yet.
  if (input.delivery_stores && input.delivery_stores.length > 0) {
    insertPayload.delivery_stores = input.delivery_stores;
  }

  const { data: order, error } = await supabase
    .from("buy_orders")
    .insert(insertPayload)
    .select("id, card_id")
    .single();

  if (error) {
    console.error("[POST /api/buy-orders]", error);
    return NextResponse.json({
      error:  "No se pudo crear la orden de compra.",
      detail: error.message,
      hint:   error.hint   ?? undefined,
      pg:     error.code   ?? undefined,
    }, { status: 500 });
  }

  return NextResponse.json({ data: order }, { status: 201 });
}
