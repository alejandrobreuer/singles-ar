import * as React from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { LocationsManager } from "@/components/admin/LocationsManager";
import type { LocationTree } from "@/types/database";

export default async function AdminLocationsPage() {
  const admin = createAdminClient();

  const [provinces, zones, areas, stores] = await Promise.all([
    admin.from("provinces").select("*").order("display_order", { ascending: true }),
    admin.from("zones").select("*").order("name", { ascending: true }),
    admin.from("areas").select("*").order("name", { ascending: true }),
    admin.from("stores").select("*").order("name", { ascending: true }),
  ]);

  const error = provinces.error || zones.error || areas.error || stores.error;

  const tree: LocationTree = {
    provinces: provinces.data ?? [],
    zones:     zones.data ?? [],
    areas:     areas.data ?? [],
    stores:    stores.data ?? [],
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-serif font-semibold text-text-primary mb-1">Ubicaciones</h1>
      <p className="text-sm text-text-muted font-sans mb-6">
        Provincias, zonas, barrios/localidades y tiendas usadas en el selector de lugar de entrega.
      </p>
      {error ? (
        <p className="text-sm text-error font-sans">
          Error al cargar los datos. Verificá que la migración SQL fue ejecutada.
        </p>
      ) : (
        <LocationsManager initialTree={tree} />
      )}
    </div>
  );
}
