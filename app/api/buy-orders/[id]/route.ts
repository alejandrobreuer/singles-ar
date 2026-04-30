import { NextRequest, NextResponse } from "next/server";
import { addDays } from "date-fns";
import { z } from "zod";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: { id: string } };

// ─── PATCH /api/buy-orders/[id] — cancel or renew ────────────────────────────

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel") }),
  z.object({
    action:        z.literal("renew"),
    duration_days: z.number().int().refine((d) => [15, 30, 60].includes(d)).default(30),
  }),
]);

export async function PATCH(req: NextRequest, { params }: Params) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  // Verify ownership + status
  const { data: order, error: fetchError } = await supabase
    .from("buy_orders")
    .select("id, buyer_id, status")
    .eq("id", params.id)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: "Orden no encontrada." }, { status: 404 });
  }
  if (order.buyer_id !== user.id) {
    return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
  }

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

  const input = parsed.data;

  // ── Cancel ────────────────────────────────────────────────────────────────
  if (input.action === "cancel") {
    if (!["active", "reserved"].includes(order.status)) {
      return NextResponse.json(
        { error: "Solo podés cancelar órdenes activas o reservadas." },
        { status: 422 }
      );
    }

    const admin = createAdminClient();

    // Update order
    const { error: cancelError } = await admin
      .from("buy_orders")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", params.id);

    if (cancelError) {
      return NextResponse.json({ error: "Error al cancelar." }, { status: 500 });
    }

    // ── Cancellation penalty — only if it was "reserved" ──────────────────
    if (order.status === "reserved") {
      // Fetch current cancel_count and setting
      const [profileResult, settingResult] = await Promise.all([
        admin.from("profiles").select("cancel_count, is_reliable_buyer").eq("id", user.id).single(),
        admin.from("admin_settings").select("value").eq("key", "max_cancels_before_flag").maybeSingle(),
      ]);

      if (profileResult.data) {
        const maxCancels = settingResult.data
          ? parseInt(String(settingResult.data.value), 10)
          : 3;

        const newCount = (profileResult.data.cancel_count ?? 0) + 1;
        const flagged  = newCount >= maxCancels;

        await admin
          .from("profiles")
          .update({
            cancel_count:      newCount,
            is_reliable_buyer: flagged ? false : profileResult.data.is_reliable_buyer,
          })
          .eq("id", user.id);
      }
    }

    return NextResponse.json({ ok: true });
  }

  // ── Renew ─────────────────────────────────────────────────────────────────
  if (input.action === "renew") {
    if (order.status !== "active" && order.status !== "expired") {
      return NextResponse.json(
        { error: "Solo podés renovar órdenes activas o vencidas." },
        { status: 422 }
      );
    }

    const new_expires = addDays(new Date(), input.duration_days).toISOString();

    const { data: updated, error: renewError } = await supabase
      .from("buy_orders")
      .update({
        status:     "active",
        expires_at: new_expires,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select()
      .single();

    if (renewError) {
      return NextResponse.json({ error: "Error al renovar." }, { status: 500 });
    }

    return NextResponse.json({ data: updated });
  }

  return NextResponse.json({ error: "Acción desconocida." }, { status: 400 });
}
