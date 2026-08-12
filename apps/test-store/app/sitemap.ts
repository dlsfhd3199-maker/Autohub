import type { MetadataRoute } from "next";
import { getPublishedList, storeBaseUrl } from "../lib/content-hub";
import { virtualProducts } from "../lib/catalog";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = storeBaseUrl();
  const staticPages=["","/about","/products","/faq"].map((path)=>({url:`${base}${path}`,lastModified:new Date()}));
  const products=virtualProducts.map((item)=>({url:`${base}/products/${item.slug}`,lastModified:new Date()}));
  try { const data = await getPublishedList(); return [...staticPages,...products,{ url: `${base}/blog`, lastModified: new Date() }, ...data.items.map((item) => ({ url: `${base}/blog/${item.slug}`, lastModified: new Date(item.updatedAt) }))]; }
  catch { return [...staticPages,...products,{ url: `${base}/blog`, lastModified: new Date() }]; }
}
