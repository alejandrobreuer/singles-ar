import * as React from "react";
import { redirect } from "next/navigation";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProfileClient }     from "@/components/profile/ProfileClient";
import type {
  Profile, ListingWithCard, BuyOrder, WishlistWithCard, Game,
} from "@/types/database";

// ─── Types for the combined history row ───────────────────────────────────────

export interface TransactionHistoryRow {
  id:              string;
  buyer_id:        string;
  seller_id:       string;
  price:           number;
  status:          string;
  listing_id:      string | null;
  buy_order_id:    string | null;
  created_at:      string;
  card: { id: string; name: string; image_url: string | null; game: Game };
  counterpart: { id: string; username: string; avatar_url: string | null };
}

export interface WishlistRowWithStats extends WishlistWithCard {
  listing_count: number;
  lowest_price:  number | null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MyProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile");

  const admin = createAdminClient();

  // ── Fetch all tab data in parallel ────────────────────────────────────────
  const [
    profileResult,
    listingsResult,
    buyOrdersResult,
    wishlistResult,
    transactionsResult,
  ] = await Promise.all([

    // Full profile (includes private fields for settings tab)
    admin
      .from("profiles")
      .select(`
        id, username, avatar_url, reputation_score, total_sales, total_purchases,
        is_reliable_buyer, cancel_count, created_at,
        mercadopago_user_id, mercadopago_connected_at,
        username_last_changed_at
      `)
      .eq("id", user.id)
      .single(),

    // All listings by this user, with card info
    admin
      .from("listings")
      .select(`
        id, listing_type, price, condition, quantity, status, currency,
        notes, trade_for, created_at, updated_at,
        cards ( id, name, set_name, image_url, game )
      `)
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),

    // All buy orders by this user, with card info
    admin
      .from("buy_orders")
      .select(`
        id, card_id, price, currency, condition, quantity, status,
        expires_at, notes, created_at, updated_at,
        cards ( id, name, set_name, image_url, game )
      `)
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),

    // Wishlist with card info
    admin
      .from("wishlist")
      .select(`
        id, card_id, created_at,
        cards ( id, name, image_url, set_name, game )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),

    // Transaction history (buyer + seller)
    admin
      .from("transactions")
      .select(`
        id, buyer_id, seller_id, price, status, listing_id, buy_order_id, created_at,
        card:cards!card_id ( id, name, image_url, game ),
        buyer:profiles!buyer_id ( id, username, avatar_url ),
        seller:profiles!seller_id ( id, username, avatar_url )
      `)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const profile     = profileResult.data   as unknown as Profile;
  const listings    = (listingsResult.data    ?? []) as unknown as ListingWithCard[];
  const buyOrders   = (buyOrdersResult.data   ?? []) as unknown as (BuyOrder & { cards: { id: string; name: string; image_url: string | null; game: Game } })[];
  const wishlistRaw = (wishlistResult.data    ?? []) as unknown as WishlistWithCard[];
  const txRaw       = (transactionsResult.data ?? []) as unknown as TransactionHistoryRow[];

  // For reserved buy orders, look up the pending transaction to get the chat URL
  const reservedIds = buyOrders.filter((o) => o.status === "reserved").map((o) => o.id);
  let reservedOrderTransactions: Record<string, string> = {};
  if (reservedIds.length > 0) {
    const { data: pendingTxs } = await admin
      .from("transactions")
      .select("id, buy_order_id")
      .in("buy_order_id", reservedIds)
      .eq("status", "pending_buyer_confirmation");
    reservedOrderTransactions = Object.fromEntries(
      (pendingTxs ?? [])
        .filter((t) => t.buy_order_id != null)
        .map((t) => [t.buy_order_id as string, t.id]),
    );
  }

  // ── Enrich wishlist with listing stats ────────────────────────────────────
  let wishlist: WishlistRowWithStats[] = wishlistRaw.map((w) => ({
    ...w,
    listing_count: 0,
    lowest_price:  null,
  }));

  const cardIds = wishlistRaw.map((w) => w.card_id);
  if (cardIds.length > 0) {
    const { data: stats } = await admin
      .from("cards_with_listing_stats")
      .select("id, listing_count, lowest_price")
      .in("id", cardIds);

    const statsMap = new Map((stats ?? []).map((s) => [s.id, s]));
    wishlist = wishlistRaw.map((w) => ({
      ...w,
      listing_count: statsMap.get(w.card_id)?.listing_count ?? 0,
      lowest_price:  statsMap.get(w.card_id)?.lowest_price  ?? null,
    }));
  }

  // ── Shape transactions for the history tab ────────────────────────────────
  const transactions: TransactionHistoryRow[] = txRaw.map((tx) => {
    const isBuyer      = tx.buyer_id === user.id;
    const rawBuyer     = (tx as unknown as { buyer: { id: string; username: string; avatar_url: string | null } }).buyer;
    const rawSeller    = (tx as unknown as { seller: { id: string; username: string; avatar_url: string | null } }).seller;
    return {
      ...tx,
      counterpart: isBuyer ? rawSeller : rawBuyer,
    };
  });

  if (!profile) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <ProfileClient
          profile={profile}
          currentUserId={user.id}
          listings={listings}
          buyOrders={buyOrders}
          wishlist={wishlist}
          transactions={transactions}
          reservedOrderTransactions={reservedOrderTransactions}
        />
      </div>
    </div>
  );
}
