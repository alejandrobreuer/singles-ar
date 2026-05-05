import * as React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { DeliveryStoresManager } from "@/components/admin/DeliveryStoresManager";

export default async function AdminStoresPage() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("delivery_store_options")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-serif font-semibold text-text-primary mb-1">Lugar de entrega</h1>
      <p className="text-sm text-text-muted font-sans mb-6">
        Puntos de entrega disponibles para que los vendedores indiquen dónde entregan sus cartas.
      </p>
      {error ? (
        <p className="text-sm text-error font-sans">
          Error al cargar los datos. Verificá que la migración SQL fue ejecutada.
        </p>
      ) : (
        <DeliveryStoresManager initialStores={data ?? []} />
      )}
    </div>
  );
}
