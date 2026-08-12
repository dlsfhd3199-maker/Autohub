import type { MetadataRoute } from "next";
import { storeBaseUrl } from "../lib/content-hub";
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: "*", allow: ["/","/about","/products","/faq","/blog"], disallow: ["/api/","/login","/account","/cart","/checkout","/orders"] }, sitemap: `${storeBaseUrl()}/sitemap.xml` }; }
