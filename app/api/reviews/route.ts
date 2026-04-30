import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Schema ───────────────────────────────────────────────────────────────────

const reviewSchema = z.object({
  transactionId: z.string().uuid(),
  rating:        z.number().int().min(1).max(5),
  comment:       z.string().max(500).nullable().optional(),
});

// ─── POST /api/reviews ────────────────────────────────────────────────────────
// Validates: user is a participant, transaction is completed, hasn't reviewed yet.
// Inserts review and recalculates reviewee's reputation_score.

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 422 }
    );
  }

  const { transactionId, rating, comment } = parsed.data;
  const admin = createAdminClient();

  // ── Fetch transaction ────────────────────────────────────────────────────────
  const { data: tx } = await admin
    .from("transactions")
    .select("id, buyer_id, seller_id, status")
    .eq("id", transactionId)
    .single();

  if (!tx) {
    return NextResponse.json({ error: "Transacción no encontrada." }, { status: 404 });
  }

  // Must be a participant
  if (tx.buyer_id !== user.id && tx.seller_id !== user.id) {
    return NextResponse.json({ error: "Sin acceso." }, { status: 403 });
  }

  // Must be completed
  if (tx.status !== "completed") {
    return NextResponse.json(
      { error: "Solo se pueden reseñar transacciones completadas." },
      { status: 422 }
    );
  }

  // Determine who the reviewer is reviewing
  // buyer reviews seller; seller reviews buyer
  const revieweeId = user.id === tx.buyer_id ? tx.seller_id : tx.buyer_id;

  // ── Insert review (unique constraint handles duplicate) ──────────────────────
  const { data: review, error: insertError } = await admin
    .from("reviews")
    .insert({
      transaction_id: transactionId,
      reviewer_id:    user.id,
      reviewee_id:    revieweeId,
      rating,
      comment:        comment?.trim() || null,
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") { // unique_violation
      return NextResponse.json(
        { error: "Ya enviaste una reseña para esta transacción." },
        { status: 409 }
      );
    }
    console.error("[POST /api/reviews]", insertError);
    return NextResponse.json({ error: "Error al guardar la reseña." }, { status: 500 });
  }

  // ── Recalculate reviewee's reputation_score ──────────────────────────────────
  await admin.rpc("recalculate_reputation", { target_id: revieweeId });

  return NextResponse.json({ data: { id: review.id } }, { status: 201 });
}

// ─── GET /api/reviews?userId=<uuid>&transactionId=<uuid> ─────────────────────

export async function GET(req: NextRequest) {
  const url           = new URL(req.url);
  const userId        = url.searchParams.get("userId");
  const transactionId = url.searchParams.get("transactionId");

  const admin = createAdminClient();

  if (transactionId) {
    // Check if current user has already reviewed
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ reviewed: false });

    const { data } = await admin
      .from("reviews")
      .select("id")
      .eq("transaction_id", transactionId)
      .eq("reviewer_id", user.id)
      .maybeSingle();

    return NextResponse.json({ reviewed: !!data });
  }

  if (userId) {
    const { data } = await admin
      .from("reviews")
      .select(`
        id, rating, comment, created_at,
        reviewer:profiles!reviewer_id ( id, username, avatar_url )
      `)
      .eq("reviewee_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({ data: data ?? [] });
  }

  return NextResponse.json({ error: "Parámetro requerido." }, { status: 400 });
}
