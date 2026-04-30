import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateUsername } from "@/lib/auth/utils";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username") ?? "";

  // Validate format first
  const validationError = validateUsername(username);
  if (validationError) {
    return NextResponse.json({ available: false, error: validationError }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (error) {
    return NextResponse.json({ available: false, error: "Error al verificar disponibilidad." }, { status: 500 });
  }

  return NextResponse.json({ available: data === null });
}
