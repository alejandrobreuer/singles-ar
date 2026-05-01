import { NextResponse }           from "next/server";
import { requireAdmin }           from "@/lib/admin/auth";
import { fetchAndSyncScryfall }   from "@/lib/sync/scryfall";

// ─── POST /api/admin/sync/scryfall ────────────────────────────────────────────

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const result = await fetchAndSyncScryfall();

    return NextResponse.json({
      ok:      true,
      message: `MTG sync complete: ${result.inserted.toLocaleString()} cards upserted in ${result.duration.toFixed(1)}s.`,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    console.error("[sync/scryfall] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
