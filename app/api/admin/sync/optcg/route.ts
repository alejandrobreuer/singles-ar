import { NextResponse }         from "next/server";
import { requireAdmin }         from "@/lib/admin/auth";
import { fetchAndSyncOPTCG }    from "@/lib/sync/optcg";

// ─── POST /api/admin/sync/optcg ───────────────────────────────────────────────

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const result = await fetchAndSyncOPTCG();

    return NextResponse.json({
      ok:      true,
      message: `One Piece sync complete: ${result.inserted.toLocaleString()} cards upserted in ${result.duration.toFixed(1)}s.`,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    console.error("[sync/optcg] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
