import * as React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CollectionAddClient } from "@/components/collection/CollectionAddClient";
import type { Game } from "@/types/database";

const VALID_GAMES: Game[] = ["magic", "pokemon", "onepiece", "dbz"];

export default async function CollectionAddPage({
  searchParams,
}: {
  searchParams: { game?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/collection/add");

  const requestedGame = searchParams.game as Game | undefined;
  const initialGame: Game = requestedGame && VALID_GAMES.includes(requestedGame) ? requestedGame : "onepiece";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <CollectionAddClient initialGame={initialGame} />
      </div>
    </div>
  );
}
