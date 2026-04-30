import { NextRequest, NextResponse } from "next/server";
import { fetchAndSyncScryfall } from "@/lib/sync/scryfall";

// ─── Admin guard ──────────────────────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return false;
  return authHeader === `Bearer ${serviceKey}`;
}

// ─── POST /api/admin/sync/scryfall ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await fetchAndSyncScryfall();

    return NextResponse.json({
      ok:      true,
      message: `Scryfall sync complete: ${result.inserted.toLocaleString()} cards upserted in ${result.duration.toFixed(1)}s.`,
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    console.error("[sync/scryfall] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
