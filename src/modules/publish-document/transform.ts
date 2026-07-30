import { createHash } from "node:crypto";
import { contentDocumentSchema, type ContentBlock, type ContentDocument } from "@/modules/content-studio/document";
import { PublishDocumentError, publishDocumentSchema, type PublishDocument } from "./schema";

const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
function safeUrl(value: string) { const parsed = new URL(value); if (!['https:', 'http:'].includes(parsed.protocol)) throw new PublishDocumentError("UNSAFE_URL"); return parsed.toString(); }
const text = (tag: string, value: string) => `<${tag}>${escapeHtml(value)}</${tag}>`;

function renderBlock(block: ContentBlock): string {
  switch (block.type) {
    case "title": return "";
    case "answer": return `<aside class="answer-card">${text("p", block.text)}</aside>`;
    case "summary": return `<section class="summary-card">${text("h2", "한눈에 보기")}${text("p", block.text)}</section>`;
    case "section": return `<section>${text("h2", block.heading)}${text("p", block.body)}</section>`;
    case "subheading": return text("h2", block.text);
    case "paragraph": return text("p", block.text);
    case "bulletList": return `<ul>${block.items.map((item) => text("li", item)).join("")}</ul>`;
    case "numberedList": return `<ol>${block.items.map((item) => text("li", item)).join("")}</ol>`;
    case "checklist": return `<ul class="checklist">${block.items.map((item) => `<li>${escapeHtml(item.checked ? "완료: " : "확인: ")}${escapeHtml(item.text)}</li>`).join("")}</ul>`;
    case "table": return `<div class="table-scroll"><table><thead><tr>${block.headers.map((item) => text("th", item)).join("")}</tr></thead><tbody>${block.rows.map((row) => `<tr>${row.map((item) => text("td", item)).join("")}</tr>`).join("")}</tbody></table></div>`;
    case "faq": return `<section class="faq-list">${text("h2", "자주 묻는 질문")}${block.items.map((item) => `<details><summary>${escapeHtml(item.question)}</summary>${text("p", item.answer)}</details>`).join("")}</section>`;
    case "cta": return `<aside class="cta-card">${text("p", block.text)}<a href="${escapeHtml(safeUrl(block.url))}" rel="noreferrer">${escapeHtml(block.label)}</a></aside>`;
    case "sources": return `<section class="source-list">${text("h2", "공식 근거 및 출처")}<ol>${block.items.map((item) => `<li><a href="${escapeHtml(safeUrl(item.url))}" rel="noreferrer">${escapeHtml(item.label)}</a></li>`).join("")}</ol></section>`;
    case "image": return block.url ? `<figure><img src="${escapeHtml(safeUrl(block.url))}" alt="${escapeHtml(block.alt)}" loading="lazy" />${block.caption ? text("figcaption", block.caption) : ""}</figure>` : "";
  }
}

function stable(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`; if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`; return JSON.stringify(value); }

export type PublishDocumentInput = { contentId: string; versionId: string; versionNo: number; isWorkingDraft: boolean; isExplicitVersion: boolean; title: string; slug: string; document: ContentDocument; publishedAt: string; modifiedAt: string; canonicalBaseUrl: string; brandName: string; relatedProducts?: Array<Record<string, unknown>> };
export function toPublishDocument(input: PublishDocumentInput): PublishDocument {
  if (input.isWorkingDraft) throw new PublishDocumentError("WORKING_DRAFT_NOT_PUBLISHABLE");
  if (input.versionNo < 1 || !input.isExplicitVersion) throw new PublishDocumentError("DRAFT_NOT_PUBLISHABLE");
  const document = contentDocumentSchema.parse(input.document);
  const canonical = new URL(`/blog/${input.slug}`, safeUrl(input.canonicalBaseUrl)).toString();
  const faq = document.blocks.flatMap((block) => block.type === "faq" ? block.items : []);
  const sources = document.blocks.flatMap((block) => block.type === "sources" ? block.items.map((item) => ({ ...item, url: safeUrl(item.url) })) : []);
  const ctaBlock = document.blocks.find((block) => block.type === "cta");
  const cta = ctaBlock?.type === "cta" ? { text: ctaBlock.text, label: ctaBlock.label, url: safeUrl(ctaBlock.url) } : null;
  const bodyHtml = document.blocks.map(renderBlock).join("");
  if (/<\/?(?:script|style|iframe|object|embed)\b|\son\w+\s*=|javascript:/i.test(bodyHtml)) throw new PublishDocumentError("INVALID_DOCUMENT");
  const articleJsonLd = { "@context": "https://schema.org", "@type": "Article", headline: input.title, description: document.metadata.description, datePublished: input.publishedAt, dateModified: input.modifiedAt, mainEntityOfPage: canonical, author: { "@type": "Organization", name: input.brandName }, publisher: { "@type": "Organization", name: input.brandName } };
  const breadcrumbJsonLd = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "홈", item: new URL("/", canonical).toString() }, { "@type": "ListItem", position: 2, name: "콘텐츠", item: new URL("/blog", canonical).toString() }, { "@type": "ListItem", position: 3, name: input.title, item: canonical }] };
  const faqJsonLd = faq.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) } : null;
  const hashPayload = { contentId: input.contentId, versionId: input.versionId, title: input.title, slug: input.slug, document, publishedAt: input.publishedAt, modifiedAt: input.modifiedAt };
  return publishDocumentSchema.parse({ title: input.title, slug: input.slug, description: document.metadata.description, bodyHtml, faq, sources, cta, relatedProducts: input.relatedProducts ?? [], publishedAt: input.publishedAt, modifiedAt: input.modifiedAt, canonical, articleJsonLd, breadcrumbJsonLd, faqJsonLd, contentId: input.contentId, versionId: input.versionId, contentHash: createHash("sha256").update(stable(hashPayload)).digest("hex") });
}
