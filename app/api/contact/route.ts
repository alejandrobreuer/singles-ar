import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  name:    z.string().min(2).max(120),
  email:   z.string().email().max(200),
  subject: z.string().min(1).max(200),
  message: z.string().min(10).max(5000),
});

export async function POST(req: Request) {
  try {
    const body   = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
        { status: 422 }
      );
    }

    const admin = createAdminClient();
    const { error } = await admin.from("contact_messages").insert({
      name:    parsed.data.name,
      email:   parsed.data.email,
      subject: parsed.data.subject,
      message: parsed.data.message,
    });

    if (error) {
      console.error("[contact] insert error:", error.message);
      return NextResponse.json({ error: "No se pudo enviar el mensaje." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
