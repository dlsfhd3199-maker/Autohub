import type { MetadataRoute } from "next";
import { getPublishedList, storeBaseUrl } from "../lib/content-hub";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = storeBaseUrl();
  try { const data = await getPublishedList(); return [{ url: `${base}/blog`, lastModified: new Date() }, ...data.items.map((item) => ({ url: `${base}/blog/${item.slug}`, lastModified: new Date(item.updatedAt) }))]; }
  catch { return [{ url: `${base}/blog`, lastModified: new Date() }]; }
}
