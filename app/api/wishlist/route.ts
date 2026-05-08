import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const cardSchema = z.object({ cardId: z.string().uuid() });

// ─── GET /api/wishlist ────────────────────────────────────────────────────────
// Returns current user's wishlist with card details + listing stats.

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const admin = createAdminClient();

  const { data: items, error } = await admin
    .from("wishlist")
    .select(`
      id, card_id, created_at,
      cards ( id, name, image_url, set_name, game )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Error al obtener wishlist." }, { status: 500 });
  }

  // Fetch listing stats for these cards
  const cardIds = (items ?? []).map((i) => i.card_id);
  const statsMap: Record<string, { listing_count: number; lowest_price: number | null }> = {};

  if (cardIds.length > 0) {
    const { data: stats } = await admin
      .from("cards_with_listing_stats")
      .select("id, listing_count, lowest_price")
      .in("id", cardIds);

    for (const s of stats ?? []) {
      statsMap[s.id] = { listing_count: s.listing_count, lowest_price: s.lowest_price };
    }
  }

  const enriched = (items ?? []).map((item) => ({
    ...item,
    listing_count: statsMap[item.card_id]?.listing_count ?? 0,
    lowest_price:  statsMap[item.card_id]?.lowest_price  ?? null,
  }));

  return NextResponse.json({ data: enriched });
}

// ─── POST /api/wishlist ───────────────────────────────────────────────────────
// Add a card to the current user's wishlist.

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = cardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "cardId inválido." }, { status: 422 });
  }

  const { cardId } = parsed.data;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("wishlist")
    .insert({ user_id: user.id, card_id: cardId })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "La carta ya está en tu wishlist." }, { status: 409 });
    }
    return NextResponse.json({ error: "Error al agregar a wishlist." }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

// ─── DELETE /api/wishlist ─────────────────────────────────────────────────────
// Remove a card from the current user's wishlist.
// Body: { cardId } OR query param ?cardId=<uuid>

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  // Accept cardId from body or query param
  const url     = new URL(req.url);
  let cardId    = url.searchParams.get("cardId");

  if (!cardId) {
    try {
      const body = await req.json();
      cardId = body?.cardId ?? null;
    } catch { /* body may be empty */ }
  }

  if (!cardId) return NextResponse.json({ error: "cardId requerido." }, { status: 422 });

  const admin = createAdminClient();

  const { error } = await admin
    .from("wishlist")
    .delete()
    .eq("user_id", user.id)
    .eq("card_id", cardId);

  if (error) {
    return NextResponse.json({ error: "Error al eliminar de wishlist." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
