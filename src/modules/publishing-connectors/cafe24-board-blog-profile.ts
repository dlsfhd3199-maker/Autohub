import { z } from "zod";
import type { PublishDocument } from "@/modules/publish-document/schema";

const forbiddenMarkup = /<\/?(?:script|style|iframe|object|embed|html|head|body|meta|link)\b|\son\w+\s*=|javascript:/i;
const templateMetadataSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  canonical: z.url(),
  publishedAt: z.string(),
  modifiedAt: z.string(),
  articleJsonLd: z.record(z.string(), z.unknown()),
  breadcrumbJsonLd: z.record(z.string(), z.unknown()),
  faqJsonLd: z.record(z.string(), z.unknown()).nullable(),
}).strict();

export type Cafe24BoardBlogPayload = {
  boardBodyHtml: string;
  templateMetadata: z.infer<typeof templateMetadataSchema>;
  contentHash: string;
};

export function toCafe24BoardBlogPayload(document: PublishDocument): Cafe24BoardBlogPayload {
  if (forbiddenMarkup.test(document.bodyHtml)) throw new Error("UNSAFE_CAFE24_BOARD_HTML");
  return {
    boardBodyHtml: document.bodyHtml,
    templateMetadata: templateMetadataSchema.parse({
      title: document.title,
      description: document.description,
      canonical: document.canonical,
      publishedAt: document.publishedAt,
      modifiedAt: document.modifiedAt,
      articleJsonLd: document.articleJsonLd,
      breadcrumbJsonLd: document.breadcrumbJsonLd,
      faqJsonLd: document.faqJsonLd,
    }),
    contentHash: document.contentHash,
  };
}
