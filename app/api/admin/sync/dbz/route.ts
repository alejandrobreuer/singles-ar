import { NextResponse }      from "next/server";
import { requireAdmin }      from "@/lib/admin/auth";
import { fetchAndSyncDBZ }   from "@/lib/sync/apitcg";

// ─── POST /api/admin/sync/dbz ─────────────────────────────────────────────────

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const result = await fetchAndSyncDBZ();

    return NextResponse.json({
      ok:      true,
      message: `Dragon Ball sync complete: ${result.inserted.toLocaleString()} cards upserted in ${result.duration.toFixed(1)}s.`,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    console.error("[sync/dbz] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
