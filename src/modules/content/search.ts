import { z } from "zod";

export const contentSearchSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  brandId: z.string().uuid().optional().catch(undefined),
  status: z.enum(["draft", "review_requested", "client_review", "approved", "scheduled", "published", "needs_update", "archived"]).optional().catch(undefined),
  ownerId: z.string().uuid().optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(50).catch(10),
});

export function parseContentSearch(input: Record<string, string | string[] | undefined>) {
  const scalar = Object.fromEntries(Object.entries(input).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
  return contentSearchSchema.parse(scalar);
}

export function paginationRange(page: number, pageSize: number) {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}
