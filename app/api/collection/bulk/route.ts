import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyCardFilters }  from "@/lib/cardFilters";

const bulkSchema = z.union([
  z.object({ card_ids: z.array(z.string().uuid()).min(1).max(500) }),
  z.object({
    game:   z.enum(["magic", "pokemon", "onepiece", "dbz"]),
    set:    z.string().optional(),
    rarity: z.array(z.string()).optional(),
    color:  z.array(z.string()).optional(),
    q:      z.string().optional(),
  }),
]);

// ─── POST /api/collection/bulk ─────────────────────────────────────────────────
// Bulk-add cards to the current user's collection, either by explicit
// card_ids or by filter criteria (e.g. "mark this whole set as owned").
//
// Uses ignoreDuplicates on the upsert — deliberately different from the
// single-add POST /api/collection route, which overwrites quantity. Bulk-add
// must never reset a quantity the user already set individually on a card
// within the matched set/filter.

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 422 }
    );
  }

  const admin = createAdminClient();

  let cardIds: string[];

  if ("card_ids" in parsed.data) {
    cardIds = parsed.data.card_ids;
  } else {
    const { game, set, rarity, color, q } = parsed.data;
    let query = admin.from("cards").select("id").limit(1000);
    query = applyCardFilters(query, { game, set, rarity, color, q });

    const { data: cards, error: fetchErr } = await query;
    if (fetchErr) {
      return NextResponse.json({ error: "Error al buscar cartas para agregar." }, { status: 500 });
    }
    cardIds = (cards ?? []).map((c) => c.id);
  }

  if (cardIds.length === 0) {
    return NextResponse.json({ data: { added: 0, already_owned: 0 } });
  }

  const { data: inserted, error } = await admin
    .from("collection_items")
    .upsert(
      cardIds.map((id) => ({ user_id: user.id, card_id: id, quantity: 1 })),
      { onConflict: "user_id,card_id", ignoreDuplicates: true }
    )
    .select("card_id");

  if (error) {
    return NextResponse.json({ error: "Error al agregar cartas a tu colección." }, { status: 500 });
  }

  const added = inserted?.length ?? 0;

  return NextResponse.json({
    data: { added, already_owned: cardIds.length - added },
  });
}
