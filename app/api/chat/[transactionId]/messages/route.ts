import { NextRequest, NextResponse } from "next/server";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: { transactionId: string } };

// ─── Auth + participant guard ─────────────────────────────────────────────────

async function getAuthorizedParticipant(transactionId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, transaction: null, error: "No autenticado.", status: 401 };

  const admin = createAdminClient();
  const { data: tx, error } = await admin
    .from("transactions")
    .select("id, buyer_id, seller_id, status")
    .eq("id", transactionId)
    .single();

  if (error || !tx) return { user, transaction: null, error: "Transacción no encontrada.", status: 404 };

  const isParticipant = tx.buyer_id === user.id || tx.seller_id === user.id;
  if (!isParticipant) return { user, transaction: null, error: "Sin acceso.", status: 403 };

  return { user, transaction: tx, error: null, status: 200 };
}

// ─── GET /api/chat/[transactionId]/messages ───────────────────────────────────
// Returns paginated message history, oldest first.
// Query params: page (default 1), limit (default 50)

export async function GET(req: NextRequest, { params }: Params) {
  const { user, transaction, error, status } = await getAuthorizedParticipant(params.transactionId);
  if (error || !user || !transaction) {
    return NextResponse.json({ error }, { status });
  }

  const url    = new URL(req.url);
  const page   = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit  = Math.min(100, parseInt(url.searchParams.get("limit") ?? "50"));
  const offset = (page - 1) * limit;

  const admin = createAdminClient();
  const { data: messages, error: fetchError, count } = await admin
    .from("chat_messages")
    .select(`
      id,
      transaction_id,
      sender_id,
      body,
      image_url,
      message_type,
      created_at,
      sender:profiles!sender_id (
        id, username, avatar_url
      )
    `, { count: "exact" })
    .eq("transaction_id", params.transactionId)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (fetchError) {
    return NextResponse.json({ error: "Error al obtener los mensajes." }, { status: 500 });
  }

  return NextResponse.json({
    data:     messages ?? [],
    page,
    limit,
    total:    count ?? 0,
    hasMore:  (count ?? 0) > offset + limit,
  });
}

// ─── POST /api/chat/[transactionId]/messages ──────────────────────────────────
// Send a message (text, image, or both).
// Body: { body?: string, image_url?: string }

export async function POST(req: NextRequest, { params }: Params) {
  const { user, transaction, error, status } = await getAuthorizedParticipant(params.transactionId);
  if (error || !user || !transaction) {
    return NextResponse.json({ error }, { status });
  }

  if (["cancelled", "completed"].includes(transaction.status)) {
    return NextResponse.json(
      { error: "No se puede enviar mensajes en una transacción cerrada." },
      { status: 422 }
    );
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const { body: text, image_url } = body as { body?: string; image_url?: string };

  const trimmed = text?.trim() ?? "";
  if (!trimmed && !image_url) {
    return NextResponse.json({ error: "El mensaje está vacío." }, { status: 422 });
  }

  const messageType: string = image_url && !trimmed ? "image" : "text";

  const admin = createAdminClient();

  // Insert message
  const { data: message, error: insertError } = await admin
    .from("chat_messages")
    .insert({
      transaction_id: params.transactionId,
      sender_id:      user.id,
      body:           trimmed || null,
      image_url:      image_url ?? null,
      message_type:   messageType,
    })
    .select(`
      id,
      transaction_id,
      sender_id,
      body,
      image_url,
      message_type,
      created_at,
      sender:profiles!sender_id (
        id, username, avatar_url
      )
    `)
    .single();

  if (insertError || !message) {
    console.error("[POST chat/messages]", insertError);
    return NextResponse.json({ error: "Error al enviar el mensaje." }, { status: 500 });
  }

  // Touch transaction updated_at so the chat list can sort by recency
  await admin
    .from("transactions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", params.transactionId);

  return NextResponse.json({ data: message }, { status: 201 });
}
