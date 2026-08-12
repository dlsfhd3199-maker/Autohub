import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";
import { publishedDetailSchema, publishedListSchema } from "./contracts";
import { hashPublishingKey, isPublishingKey } from "./keys";
import { toPublishDocument } from "@/modules/publish-document/transform";

const virtualRelatedProducts = [
  { id: "virtual-product-a", name: "Virtual Focus Kit", description: "콘텐츠 흐름을 확인하기 위한 가상 상품입니다.", category: "Virtual Collection", url: "https://example.com/products/virtual-focus-kit" },
  { id: "virtual-product-b", name: "Virtual Insight Set", description: "실제 판매와 무관한 자사몰 연동 검수용 상품입니다.", category: "Virtual Collection", url: "https://example.com/products/virtual-insight-set" },
];

export function parseBearerHeader(header: string | null) {
  if (!header?.startsWith("Bearer ")) return null;
  const key = header.slice(7);
  return isPublishingKey(key) ? key : null;
}

function anonymousClient() {
  const env = getPublicEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

export class PublishingConnectionDisabledError extends Error {}

async function verifyConnection(client: ReturnType<typeof anonymousClient>, brandKey: string, bearerKey: string) {
  const { data, error } = await client.rpc("get_test_publishing_connection_status", { target_brand_key: brandKey, supplied_bearer_hash: hashPublishingKey(bearerKey) });
  if (error) throw new Error("Publishing query failed");
  if (data === "disabled") throw new PublishingConnectionDisabledError("Test publishing connection disabled");
  return data === "active";
}

export async function fetchPublishedList(brandKey: string, bearerKey: string) {
  const client = anonymousClient();
  if (!(await verifyConnection(client, brandKey, bearerKey))) return null;
  const { data, error } = await client.rpc("get_test_published_content_list", { target_brand_key: brandKey, supplied_bearer_hash: hashPublishingKey(bearerKey) });
  if (error) throw new Error("Publishing query failed");
  if (!data) return null;
  const raw = data as { brand: { name: string; domain: string }; items: Array<Record<string, unknown>> };
  raw.items = raw.items.map((item) => ({ ...item, publishDocument: toPublishDocument({ contentId: String(item.id), versionId: String(item.versionId), versionNo: Number(item.versionNo), isWorkingDraft: false, isExplicitVersion: true, title: String(item.title), slug: String(item.slug), document: item.document as never, publishedAt: String(item.publishedAt), modifiedAt: String(item.updatedAt), canonicalBaseUrl: raw.brand.domain.startsWith("http") ? raw.brand.domain : `https://${raw.brand.domain}`, brandName: raw.brand.name, relatedProducts: virtualRelatedProducts }) }));
  return publishedListSchema.parse(raw);
}

export async function fetchPublishedDetail(brandKey: string, slug: string, bearerKey: string) {
  const client = anonymousClient();
  if (!(await verifyConnection(client, brandKey, bearerKey))) return null;
  const { data, error } = await client.rpc("get_test_published_content_detail", { target_brand_key: brandKey, target_slug: slug, supplied_bearer_hash: hashPublishingKey(bearerKey) });
  if (error) throw new Error("Publishing query failed");
  if (!data) return null;
  const raw = data as { brand: { name: string; domain: string }; item: Record<string, unknown> | null };
  if (raw.item) raw.item = { ...raw.item, publishDocument: toPublishDocument({ contentId: String(raw.item.id), versionId: String(raw.item.versionId), versionNo: Number(raw.item.versionNo), isWorkingDraft: false, isExplicitVersion: true, title: String(raw.item.title), slug: String(raw.item.slug), document: raw.item.document as never, publishedAt: String(raw.item.publishedAt), modifiedAt: String(raw.item.updatedAt), canonicalBaseUrl: raw.brand.domain.startsWith("http") ? raw.brand.domain : `https://${raw.brand.domain}`, brandName: raw.brand.name, relatedProducts: virtualRelatedProducts }) };
  return publishedDetailSchema.parse(raw);
}
