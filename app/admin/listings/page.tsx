import * as React from "react";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminListingsClient } from "@/components/admin/AdminListingsClient";

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: { seller_id?: string; q?: string; page?: string };
}) {
  const sellerId = searchParams.seller_id?.trim() ?? "";
  const q        = searchParams.q?.trim() ?? "";
  const page     = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const limit    = 50;
  const from     = (page - 1) * limit;

  const admin = createAdminClient();

  // Fetch seller username when filtering by seller
  let sellerUsername: string | null = null;
  if (sellerId) {
    const { data: p } = await admin
      .from("profiles")
      .select("username")
      .eq("id", sellerId)
      .single();
    sellerUsername = p?.username ?? null;
  }

  let query = admin
    .from("listings")
    .select(
      `id, listing_type, price, condition, quantity, status, currency,
       notes, created_at, updated_at,
       cards ( id, name, set_name, set_code, rarity, game, image_url ),
       profiles!seller_id ( id, username )`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (sellerId) query = query.eq("seller_id", sellerId);
  if (q)        query = query.ilike("cards.name", `%${q}%`);

  const { data: rawListings, count } = await query;
  const listings = (rawListings ?? []) as unknown as React.ComponentProps<typeof AdminListingsClient>["listings"];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        {sellerId && (
          <Link
            href="/admin/users"
            className="text-sm text-text-muted font-sans hover:text-primary transition-colors"
          >
            ← Usuarios
          </Link>
        )}
        <h1 className="text-2xl font-serif font-semibold text-text-primary">
          {sellerUsername ? `Listings de @${sellerUsername}` : "Listings"}
        </h1>
      </div>
      <p className="text-sm text-text-muted font-sans mb-6">{count ?? 0} publicaciones</p>

      <AdminListingsClient
        listings={listings}
        total={count ?? 0}
        page={page}
        limit={limit}
        q={q}
        sellerId={sellerId}
      />
    </div>
  );
}
