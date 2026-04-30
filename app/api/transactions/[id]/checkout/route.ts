import { NextRequest, NextResponse } from "next/server";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── POST /api/transactions/[id]/checkout ─────────────────────────────────────
// Creates a MercadoPago payment preference and redirects to init_point.
// TODO: full MP integration (payment splitting, fees) — stub for now.

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const admin = createAdminClient();
  const { data: tx } = await admin
    .from("transactions")
    .select("id, buyer_id, seller_id, price, status, card_id")
    .eq("id", params.id)
    .single();

  if (!tx || tx.buyer_id !== user.id) {
    return NextResponse.json({ error: "Sin acceso." }, { status: 403 });
  }

  if (tx.status !== "in_chat") {
    return NextResponse.json(
      { error: "Esta transacción no está lista para pago." },
      { status: 422 }
    );
  }

  // TODO: create MercadoPago preference using seller's MP access token
  // For now return a placeholder — replace with real MP SDK call.
  return NextResponse.json(
    {
      error: "El pago en línea estará disponible próximamente. Coordiná con el vendedor por este chat.",
    },
    { status: 501 }
  );
}
