import { z } from "zod";

const block = z.object({ id: z.string().uuid(), type: z.string() }).passthrough();
const documentSchema = z.object({ schemaVersion: z.literal(1), blocks: z.array(block), metadata: z.object({ primaryKeyword: z.string(), keywords: z.array(z.string()), description: z.string() }) });
const itemSchema = z.object({ id: z.string().uuid(), slug: z.string(), title: z.string(), primaryKeyword: z.string().nullable().optional(), status: z.literal("test_published"), publishedAt: z.string().datetime({ offset: true }), updatedAt: z.string().datetime({ offset: true }), versionId: z.string().uuid(), versionNo: z.number().int(), document: documentSchema });
const brandSchema = z.object({ key: z.string(), name: z.string(), domain: z.string() });
const listSchema = z.object({ brand: brandSchema, items: z.array(itemSchema) });
const detailSchema = z.object({ brand: brandSchema, item: itemSchema.nullable() });

export type PublishedItem = z.infer<typeof itemSchema>;
export type ContentBlock = PublishedItem["document"]["blocks"][number] & Record<string, unknown>;

export class ContentHubError extends Error {
  constructor(public readonly status: number, public readonly code: "not_configured" | "connection_disabled" | "not_found" | "unavailable" | "invalid_response") { super(code); }
}

function config() {
  const apiUrl = process.env.CONTENT_HUB_API_URL;
  const publishingKey = process.env.CONTENT_HUB_PUBLISHING_KEY;
  const brandKey = process.env.CONTENT_HUB_BRAND_KEY;
  if (!apiUrl || !publishingKey || !brandKey) throw new ContentHubError(503, "not_configured");
  return { apiUrl: apiUrl.replace(/\/$/, ""), publishingKey, brandKey };
}

async function hubFetch(path: string) {
  const value = config();
  let response: Response;
  try {
    response = await fetch(`${value.apiUrl}/api/publishing/v1/brands/${encodeURIComponent(value.brandKey)}${path}`, {
      headers: { Authorization: `Bearer ${value.publishingKey}` },
      cache: "no-store",
    });
  } catch { throw new ContentHubError(503, "unavailable"); }
  if (response.status === 401) throw new ContentHubError(503, "connection_disabled");
  if (response.status === 404) throw new ContentHubError(404, "not_found");
  if (!response.ok) throw new ContentHubError(503, "unavailable");
  return response.json();
}

export async function getPublishedList() {
  const parsed = listSchema.safeParse(await hubFetch("/contents"));
  if (!parsed.success) throw new ContentHubError(503, "invalid_response");
  return parsed.data;
}
export async function getPublishedDetail(slug: string) {
  const parsed = detailSchema.safeParse(await hubFetch(`/contents/${encodeURIComponent(slug)}`));
  if (!parsed.success) throw new ContentHubError(503, "invalid_response");
  return parsed.data;
}
export function storeBaseUrl() { return (process.env.TEST_STORE_BASE_URL ?? "http://127.0.0.1:3100").replace(/\/$/, ""); }
