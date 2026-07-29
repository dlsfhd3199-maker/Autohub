import { z } from "zod";
import { contentDocumentSchema } from "@/modules/content-studio/document";

export const brandKeySchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,62}$/);
export const publishedSlugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,159}$/);
export const publishedBrandSchema = z.object({ key: brandKeySchema, name: z.string().min(1).max(160), domain: z.string().max(253) }).strict();
export const publishedContentSchema = z.object({
  id: z.string().uuid(), slug: publishedSlugSchema, title: z.string().min(1).max(160), primaryKeyword: z.string().max(120).nullable().optional(),
  status: z.literal("test_published"), publishedAt: z.string().datetime({ offset: true }), updatedAt: z.string().datetime({ offset: true }),
  versionId: z.string().uuid(), versionNo: z.number().int().positive(), document: contentDocumentSchema,
}).strict();
export const publishedListSchema = z.object({ brand: publishedBrandSchema, items: z.array(publishedContentSchema).max(100) }).strict();
export const publishedDetailSchema = z.object({ brand: publishedBrandSchema, item: publishedContentSchema.nullable() }).strict();
export type PublishedList = z.infer<typeof publishedListSchema>;
export type PublishedDetail = z.infer<typeof publishedDetailSchema>;

export const publishingErrorSchema = z.object({ error: z.object({ code: z.enum(["UNAUTHORIZED", "CONNECTION_DISABLED", "NOT_FOUND", "INVALID_REQUEST", "INTERNAL_ERROR"]), message: z.string() }).strict() }).strict();
