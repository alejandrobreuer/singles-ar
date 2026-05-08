import { NextRequest, NextResponse } from "next/server";
import { requireAdmin }              from "@/lib/admin/auth";
import { fetchAndSyncTCGdex }        from "@/lib/sync/tcgdex";

// ─── POST /api/admin/sync/pokemon ─────────────────────────────────────────────
//
// Optional JSON body: { "sets": ["base1", "base2"] } to sync only specific sets.
// Omit body (or sets) to sync all sets.

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  let setIds: string[] | undefined;
  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    if (Array.isArray(body.sets)) setIds = body.sets as string[];
  } catch { /* body is optional */ }

  try {
    const result = await fetchAndSyncTCGdex({ setIds });

    return NextResponse.json({
      ok:      true,
      message: `Pokémon sync complete: ${result.inserted.toLocaleString()} cards upserted in ${result.duration.toFixed(1)}s.`,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    console.error("[sync/pokemon] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
