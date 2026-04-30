import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS } from "@/lib/priceValidation";
import type { AdminSettings } from "@/types/database";

// ─── GET /api/settings ────────────────────────────────────────────────────────
// Returns public platform settings. Safe for client consumption.

export async function GET() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("admin_settings")
      .select("key, value");

    if (error || !data) {
      return NextResponse.json(DEFAULT_SETTINGS);
    }

    // Fold rows into a typed settings object, falling back to defaults
    const settings: AdminSettings = { ...DEFAULT_SETTINGS };

    for (const row of data) {
      const val = parseFloat(String(row.value));
      if (!isNaN(val) && row.key in DEFAULT_SETTINGS) {
        (settings as Record<string, number>)[row.key] = val;
      }
    }

    return NextResponse.json(settings);
  } catch {
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}
