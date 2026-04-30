import * as React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminCardsClient } from "@/components/admin/AdminCardsClient";

export default async function AdminCardsPage({
  searchParams,
}: {
  searchParams: { q?: string; game?: string; page?: string };
}) {
  const q    = searchParams.q?.trim()  ?? "";
  const game = searchParams.game ?? "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const limit = 50;
  const from  = (page - 1) * limit;

  const admin = createAdminClient();
  let query = admin
    .from("cards")
    .select(
      "id, name, set_name, set_code, card_number, rarity, image_url, image_override_url, game, lang, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (q)    query = query.ilike("name", `%${q}%`);
  if (game) query = query.eq("game", game);

  const { data: cards, count } = await query;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-serif font-semibold text-text-primary mb-1">Cartas</h1>
      <p className="text-sm text-text-muted font-sans mb-6">
        {count ?? 0} cartas en la base de datos
      </p>
      <AdminCardsClient
        cards={cards ?? []}
        total={count ?? 0}
        page={page}
        limit={limit}
        q={q}
        game={game}
      />
    </div>
  );
}
