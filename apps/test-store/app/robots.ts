import type { MetadataRoute } from "next";
import { storeBaseUrl } from "../lib/content-hub";
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: "*", allow: "/blog", disallow: ["/api/"] }, sitemap: `${storeBaseUrl()}/sitemap.xml` }; }
