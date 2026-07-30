import { z } from "zod";

const faqSchema = z.object({ question: z.string(), answer: z.string() }).strict();
const sourceSchema = z.object({ label: z.string(), url: z.url() }).strict();
const ctaSchema = z.object({ text: z.string(), label: z.string(), url: z.url() }).strict();
const jsonLdSchema = z.record(z.string(), z.unknown());

export const publishDocumentSchema = z.object({
  title: z.string().min(1).max(160), slug: z.string().min(1).max(160), description: z.string().max(500), bodyHtml: z.string().max(1_000_000),
  faq: z.array(faqSchema).max(20), sources: z.array(sourceSchema).max(30), cta: ctaSchema.nullable(), relatedProducts: z.array(z.record(z.string(), z.unknown())).max(20),
  publishedAt: z.string().datetime({ offset: true }), modifiedAt: z.string().datetime({ offset: true }), canonical: z.url(),
  articleJsonLd: jsonLdSchema, breadcrumbJsonLd: jsonLdSchema, faqJsonLd: jsonLdSchema.nullable(),
  contentId: z.string().uuid(), versionId: z.string().uuid(), contentHash: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export type PublishDocument = z.infer<typeof publishDocumentSchema>;

export class PublishDocumentError extends Error {
  constructor(public readonly code: "DRAFT_NOT_PUBLISHABLE" | "WORKING_DRAFT_NOT_PUBLISHABLE" | "UNSAFE_URL" | "INVALID_DOCUMENT") { super(code); }
}
