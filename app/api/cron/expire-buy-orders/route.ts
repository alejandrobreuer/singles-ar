import { NextRequest, NextResponse } from "next/server";
import { subDays } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Auth guard ───────────────────────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return req.headers.get("authorization") === `Bearer ${cronSecret}`;
}

// ─── GET /api/cron/expire-buy-orders ─────────────────────────────────────────
//
// Vercel Cron config (vercel.json):
// {
//   "crons": [{ "path": "/api/cron/expire-buy-orders", "schedule": "0 3 * * *" }]
// }
// Set CRON_SECRET in Vercel environment variables.
// Vercel sends Authorization: Bearer <CRON_SECRET> automatically.

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = new Date().toISOString();  // timestamp label for logs
  const supabase = createAdminClient();
  const now      = new Date().toISOString();
  const results  = { expired: 0, expiringSoon: 0, cancelResets: 0, errors: [] as string[] };

  // ── 1. Expire overdue active orders ──────────────────────────────────────
  const { data: expiredOrders, error: expireError } = await supabase
    .from("buy_orders")
    .update({ status: "expired", updated_at: now })
    .eq("status", "active")
    .lt("expires_at", now)
    .select("id, buyer_id");

  if (expireError) {
    results.errors.push(`Expire error: ${expireError.message}`);
  } else {
    results.expired = expiredOrders?.length ?? 0;
    console.log(`[cron/expire] Expired ${results.expired} buy orders.`);
  }

  // ── 2. Collect buyer IDs for orders expiring in ≤ 3 days ─────────────────
  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: expiringSoon, error: soonError } = await supabase
    .from("buy_orders")
    .select("id, buyer_id, expires_at")
    .eq("status", "active")
    .lte("expires_at", threeDaysFromNow)
    .gt("expires_at", now);

  if (soonError) {
    results.errors.push(`Expiring-soon error: ${soonError.message}`);
  } else {
    results.expiringSoon = expiringSoon?.length ?? 0;
    const buyerIds = [...new Set((expiringSoon ?? []).map((o) => o.buyer_id))];
    // TODO: trigger push/email notifications for buyerIds
    console.log(
      `[cron/expire] ${results.expiringSoon} orders expiring soon. Buyer IDs:`,
      buyerIds
    );
  }

  // ── 3. Reset cancel_count for buyers whose 30-day window has passed ───────
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

  const { data: resetProfiles, error: resetError } = await supabase
    .from("profiles")
    .update({
      cancel_count:          0,
      cancel_count_reset_at: now,
    })
    .or(
      `cancel_count_reset_at.is.null,cancel_count_reset_at.lt.${thirtyDaysAgo}`
    )
    .gt("cancel_count", 0)
    .select("id");

  if (resetError) {
    results.errors.push(`Cancel reset error: ${resetError.message}`);
  } else {
    results.cancelResets = resetProfiles?.length ?? 0;
    console.log(`[cron/expire] Reset cancel_count for ${results.cancelResets} buyers.`);
  }

  return NextResponse.json({
    ok:        results.errors.length === 0,
    timestamp: admin,
    ...results,
  });
}
