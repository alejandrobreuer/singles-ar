import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin }    from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const patchSchema = z.object({
  price_tolerance_percent:     z.number().int().min(1).max(50).optional(),
  platform_commission_percent: z.number().min(0.1).max(20).optional(),
  buy_order_default_days:      z.union([z.literal(15), z.literal(30), z.literal(60)]).optional(),
  max_cancels_before_flag:     z.number().int().min(1).max(10).optional(),
  usd_to_ars_rate:             z.number().positive().optional(),
  mp_fee_percent:              z.number().min(0).max(20).optional(),
});

// ─── GET /api/admin/settings ──────────────────────────────────────────────────

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const admin = createAdminClient();
  const { data, error: dbErr } = await admin.from("admin_settings").select("key, value");
  if (dbErr) return NextResponse.json({ error: "DB error." }, { status: 500 });

  const settings: Record<string, number> = {};
  for (const row of data ?? []) {
    settings[row.key] = parseFloat(String(row.value));
  }
  return NextResponse.json({ data: settings });
}

// ─── PATCH /api/admin/settings ────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body inválido." }, { status: 400 }); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 422 }
    );
  }

  const admin = createAdminClient();
  const updates = Object.entries(parsed.data).filter(([, v]) => v !== undefined);

  await Promise.all(
    updates.map(([key, value]) =>
      admin
        .from("admin_settings")
        .upsert({ key, value: String(value), updated_at: new Date().toISOString() })
    )
  );

  return NextResponse.json({ ok: true });
}
