import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://singles.ar";

  return {
    rules: [
      {
        userAgent: "*",
        allow:     "/",
        disallow: [
          "/api/",
          "/admin/",
          "/profile",      // My Account (private)
          "/sell",
          "/chat/",
          "/buy-orders/new",
          "/payment/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
