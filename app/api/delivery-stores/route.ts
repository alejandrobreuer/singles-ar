import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── GET /api/delivery-stores ─────────────────────────────────────────────────
// Public — returns active stores ordered by sort_order.

export async function GET() {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("delivery_store_options")
    .select("id, name, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Error al cargar tiendas." }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
