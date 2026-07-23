import * as React from "react";
import { redirect } from "next/navigation";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CollectionClient }  from "@/components/collection/CollectionClient";
import type { CollectionItemWithCard, CollectionProgressRow, Game } from "@/types/database";

const DEFAULT_GAME: Game = "onepiece";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CollectionPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/collection");

  const admin = createAdminClient();

  const [itemsResult, progressResult] = await Promise.all([
    admin
      .from("collection_items")
      .select(`
        id, card_id, quantity, created_at, updated_at,
        cards!inner ( id, name, image_url, set_name, set_code, rarity, game )
      `)
      .eq("user_id", user.id)
      .eq("cards.game", DEFAULT_GAME)
      .order("created_at", { ascending: false }),

    admin.rpc("get_collection_progress", { p_user_id: user.id, p_game: DEFAULT_GAME }),
  ]);

  const initialItems    = (itemsResult.data    ?? []) as unknown as CollectionItemWithCard[];
  const initialProgress = (progressResult.data ?? []) as unknown as CollectionProgressRow[];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <CollectionClient
          initialGame={DEFAULT_GAME}
          initialItems={initialItems}
          initialProgress={initialProgress}
        />
      </div>
    </div>
  );
}
