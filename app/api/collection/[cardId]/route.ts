import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const patchSchema = z.object({
  quantity: z.number().int().min(1).max(999),
});

// ─── PATCH /api/collection/[cardId] ────────────────────────────────────────────
// Update the quantity owned for a card already in the collection.

export async function PATCH(
  req: NextRequest,
  { params }: { params: { cardId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Cantidad inválida." },
      { status: 422 }
    );
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("collection_items")
    .update({ quantity: parsed.data.quantity })
    .eq("user_id", user.id)
    .eq("card_id", params.cardId)
    .select("id, card_id, quantity")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "La carta no está en tu colección." }, { status: 404 });
  }

  return NextResponse.json({ data });
}

// ─── DELETE /api/collection/[cardId] ───────────────────────────────────────────
// Remove a card from the current user's collection.

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { cardId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const admin = createAdminClient();

  const { error } = await admin
    .from("collection_items")
    .delete()
    .eq("user_id", user.id)
    .eq("card_id", params.cardId);

  if (error) {
    return NextResponse.json({ error: "Error al eliminar de tu colección." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
