import * as React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminSettingsForm } from "@/components/admin/AdminSettingsForm";
import type { AdminSettings } from "@/types/database";

export default async function AdminSettingsPage() {
  const admin = createAdminClient();
  const { data, error } = await admin.from("admin_settings").select("key, value");

  if (error) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-400">Error al cargar configuración.</p>
      </div>
    );
  }

  const settings: Partial<AdminSettings> = {};
  for (const row of data ?? []) {
    (settings as Record<string, number>)[row.key] = parseFloat(String(row.value));
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-serif font-semibold text-text-primary mb-1">Configuración</h1>
      <p className="text-sm text-text-muted font-sans mb-6">
        Parámetros globales de la plataforma.
      </p>
      <AdminSettingsForm settings={settings as AdminSettings} />
    </div>
  );
}
