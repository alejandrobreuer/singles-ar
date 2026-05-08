import type { MetadataRoute } from "next";
import { createAdminClient }  from "@/lib/supabase/admin";

export const revalidate = 3600; // rebuild sitemap hourly

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://cardstash.ar";

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl,              priority: 1.0, changeFrequency: "hourly"  },
    { url: `${baseUrl}/sell`,    priority: 0.6, changeFrequency: "monthly" },
  ];

  // Card pages that have at least one active listing
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("cards_with_listing_stats")
      .select("id, updated_at")
      .gt("listing_count", 0)
      .order("latest_listing", { ascending: false })
      .limit(5000);

    const cardRoutes: MetadataRoute.Sitemap = (data ?? []).map((card) => ({
      url:             `${baseUrl}/cards/${card.id}`,
      lastModified:    card.updated_at ? new Date(card.updated_at) : new Date(),
      changeFrequency: "daily",
      priority:        0.8,
    }));

    return [...staticRoutes, ...cardRoutes];
  } catch {
    return staticRoutes;
  }
}
