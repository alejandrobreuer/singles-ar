import * as React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminUsersClient } from "@/components/admin/AdminUsersClient";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const q    = searchParams.q?.trim()  ?? "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const limit = 25;
  const from  = (page - 1) * limit;

  const admin = createAdminClient();
  let query = admin
    .from("profiles")
    .select(
      "id, username, email, reputation_score, total_sales, total_purchases, " +
      "cancel_count, is_reliable_buyer, created_at, suspended_at, suspend_reason, " +
      "mercadopago_access_token, bulk_listing_disabled",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (q) query = query.or(`username.ilike.%${q}%,email.ilike.%${q}%`);

  const { data: rawUsers, count } = await query;

  // Fetch listing counts for this page's users
  const userIds = (rawUsers ?? []).map((u) => (u as unknown as { id: string }).id);
  let listingCountMap: Record<string, number> = {};
  if (userIds.length > 0) {
    const { data: lc } = await admin
      .from("listings")
      .select("seller_id")
      .in("seller_id", userIds);
    listingCountMap = (lc ?? []).reduce(
      (acc: Record<string, number>, l: { seller_id: string }) => {
        acc[l.seller_id] = (acc[l.seller_id] ?? 0) + 1;
        return acc;
      },
      {}
    );
  }

  const users = (rawUsers ?? []).map((u) => ({
    ...(u as unknown as React.ComponentProps<typeof AdminUsersClient>["users"][number]),
    listing_count: listingCountMap[(u as unknown as { id: string }).id] ?? 0,
  }));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-serif font-semibold text-text-primary mb-1">Usuarios</h1>
      <p className="text-sm text-text-muted font-sans mb-6">
        {count ?? 0} usuarios registrados
      </p>
      <AdminUsersClient
        users={users ?? []}
        total={count ?? 0}
        page={page}
        limit={limit}
        q={q}
      />
    </div>
  );
}
