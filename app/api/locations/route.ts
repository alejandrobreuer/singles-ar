import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LocationTree } from "@/types/database";

export const dynamic = "force-dynamic";

// ─── GET /api/locations ────────────────────────────────────────────────────────
// Public — returns the full provinces/zones/areas/stores tree for LocationPicker.

export async function GET() {
  const admin = createAdminClient();

  const [provinces, zones, areas, stores] = await Promise.all([
    admin.from("provinces").select("id, name, code, is_favorite, display_order").order("display_order", { ascending: true }),
    admin.from("zones").select("id, province_id, name").order("name", { ascending: true }),
    admin.from("areas").select("id, zone_id, province_id, name").order("name", { ascending: true }),
    admin.from("stores").select("id, province_id, zone_id, name, address, is_verified").order("name", { ascending: true }),
  ]);

  if (provinces.error || zones.error || areas.error || stores.error) {
    return NextResponse.json({ error: "Error al cargar ubicaciones." }, { status: 500 });
  }

  const data: LocationTree = {
    provinces: provinces.data ?? [],
    zones:     zones.data ?? [],
    areas:     areas.data ?? [],
    stores:    stores.data ?? [],
  };

  return NextResponse.json({ data });
}
