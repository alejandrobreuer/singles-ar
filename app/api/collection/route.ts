import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_GAMES = ["magic", "pokemon", "onepiece", "dbz"];

const addSchema = z.object({
  card_id:  z.string().uuid(),
  quantity: z.number().int().min(1).max(999).optional(),
});

// ─── GET /api/collection?game=X ────────────────────────────────────────────────
// Returns the current user's owned cards for a game, joined with card details.

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const game = req.nextUrl.searchParams.get("game") ?? "";
  if (!VALID_GAMES.includes(game)) {
    return NextResponse.json({ error: "Juego inválido." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("collection_items")
    .select(`
      id, card_id, quantity, created_at, updated_at,
      cards!inner ( id, name, image_url, set_name, set_code, rarity, game )
    `)
    .eq("user_id", user.id)
    .eq("cards.game", game)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Error al obtener la colección." }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

// ─── POST /api/collection ──────────────────────────────────────────────────────
// Add (or update) a single card in the current user's collection.
// Upsert semantics — re-adding an already-owned card is idempotent and
// OVERWRITES quantity to the given value (default 1), it does not increment.
// This is deliberately different from /api/collection/bulk, which uses
// ignoreDuplicates so a bulk "mark set as owned" never resets a quantity a
// user already set individually.

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 422 }
    );
  }

  const { card_id, quantity } = parsed.data;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("collection_items")
    .upsert(
      { user_id: user.id, card_id, quantity: quantity ?? 1 },
      { onConflict: "user_id,card_id" }
    )
    .select("id, card_id, quantity")
    .single();

  if (error) {
    return NextResponse.json({ error: "Error al agregar a tu colección." }, { status: 500 });
  }

  return NextResponse.json({ data });
}
