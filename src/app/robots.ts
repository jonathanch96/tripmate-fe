import type { MetadataRoute } from "next"

import { SITE_URL } from "@/lib/seo"

// /trip/ and /trips hold per-user trip data behind auth; there is nothing there for a crawler to
// usefully index, so keep them out of search entirely.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/trip/", "/trips", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
