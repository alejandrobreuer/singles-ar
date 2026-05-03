import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/auth";

export async function GET() {
  const user = await getAdminUser();
  return NextResponse.json({ isAdmin: user !== null });
}
