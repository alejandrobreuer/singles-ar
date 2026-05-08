import * as React from "react";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Star, ShieldAlert, Award } from "lucide-react";
import { createAdminClient }  from "@/lib/supabase/admin";
import { Avatar }             from "@/components/ui/avatar";
import { Badge }              from "@/components/ui/badge";
import { Topbar }             from "@/components/layout/Topbar";
import type { ListingWithCard, ReviewWithReviewer, Game } from "@/types/database";

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: { username: string } }) {
  return {
    title: `${params.username} — Card Stash`,
    description: `Perfil de ${params.username} en Card Stash. Comprá cartas TCG de vendedores verificados.`,
  };
}

// ─── Stars display (server-safe) ──────────────────────────────────────────────

function Stars({ score }: { score: number }) {
  const filled = Math.round(score / 20); // 0-100 → 0-5
  const value  = (score / 20).toFixed(1);
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={14}
            className={i < filled ? "text-accent fill-accent" : "text-border fill-transparent"}
          />
        ))}
      </div>
      <span className="text-sm font-sans font-medium text-text-primary">{value}</span>
    </div>
  );
}

// ─── Game badge variant ───────────────────────────────────────────────────────

const GAME_VARIANT: Record<Game, React.ComponentProps<typeof Badge>["variant"]> = {
  magic:    "magic",
  pokemon:  "poke",
  onepiece: "op",
};

// ─── Tab switcher (client-only tabs, no URL param needed) ─────────────────────
// Uses a simple "hidden unless selected" pattern driven by client state.
// Declared "use client" at the component level only.

import { PublicProfileTabs } from "@/components/profile/PublicProfileTabs";
import type { HistoryItem } from "@/components/profile/PublicProfileTabs";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PublicProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const admin = createAdminClient();

  // ── Fetch profile by username ─────────────────────────────────────────────
  const { data: profile } = await admin
    .from("profiles")
    .select("id, username, avatar_url, reputation_score, total_sales, is_reliable_buyer, created_at")
    .ilike("username", params.username)
    .single();

  if (!profile) notFound();

  // ── Parallel: active listings + received reviews + completed history ─────────
  const [listingsResult, reviewsResult, historyResult] = await Promise.all([
    admin
      .from("listings")
      .select(`
        id, listing_type, price, condition, quantity, status, created_at,
        cards ( id, name, set_name, image_url, game )
      `)
      .eq("seller_id", profile.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(50),

    admin
      .from("reviews")
      .select(`
        id, transaction_id, rating, comment, created_at,
        reviewer:profiles!reviewer_id ( id, username, avatar_url )
      `)
      .eq("reviewee_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(50),

    admin
      .from("transactions")
      .select(`
        id, price, completed_at,
        card:cards!card_id ( id, name, set_name, image_url, game )
      `)
      .eq("seller_id", profile.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(50),
  ]);

  const listings = (listingsResult.data ?? []) as unknown as ListingWithCard[];
  const reviews  = (reviewsResult.data  ?? []) as unknown as ReviewWithReviewer[];
  const history  = (historyResult.data  ?? []) as unknown as HistoryItem[];

  const isTopSeller     = profile.reputation_score >= 90 && profile.total_sales >= 20;
  const isUnreliable    = profile.is_reliable_buyer === false;
  const memberSince     = format(new Date(profile.created_at), "MMMM yyyy", { locale: es });
  const avgRating       = (profile.reputation_score / 20).toFixed(1);

  return (
    <div className="min-h-screen bg-background">
      <Topbar />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Profile header ──────────────────────────────────────────────── */}
        <div className="surface-raised p-6 mb-6">
          <div className="flex items-start gap-5">
            <Avatar
              src={profile.avatar_url}
              name={profile.username}
              size="lg"
            />

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-serif font-semibold text-text-primary">
                  {profile.username}
                </h1>
                {isTopSeller && (
                  <Badge variant="gold" size="sm">
                    <Award size={10} className="mr-0.5" />
                    Top vendedor
                  </Badge>
                )}
                {isUnreliable && (
                  <Badge variant="red" size="sm">
                    <ShieldAlert size={10} className="mr-0.5" />
                    Comprador poco confiable
                  </Badge>
                )}
              </div>

              <p className="text-xs text-text-muted font-sans mb-3">
                Miembro desde {memberSince}
              </p>

              <Stars score={profile.reputation_score} />

              <div className="flex flex-wrap gap-4 mt-3 text-sm font-sans">
                <div>
                  <span className="text-text-muted">Ventas</span>{" "}
                  <span className="font-semibold text-text-primary">{profile.total_sales}</span>
                </div>
                <div>
                  <span className="text-text-muted">Reseñas</span>{" "}
                  <span className="font-semibold text-text-primary">{reviews.length}</span>
                </div>
                {reviews.length > 0 && (
                  <div>
                    <span className="text-text-muted">Promedio</span>{" "}
                    <span className="font-semibold text-text-primary">{avgRating}/5</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <PublicProfileTabs
          listings={listings}
          reviews={reviews}
          history={history}
          gameVariant={GAME_VARIANT}
        />
      </div>
    </div>
  );
}
