import { z } from "zod";
import { createUuidV4 } from "@/modules/content-studio/uuid";

const id = z.string().uuid();
const text = (max: number) => z.string().trim().min(1).max(max);
const base = { id, type: z.string(), sourceIds: z.array(id).max(30).optional() };
const textBlock = <T extends string>(type: T, max = 10000) => z.object({ ...base, type: z.literal(type), text: text(max) }).strict();
const listItems = z.array(text(500)).min(1).max(30);

const blockSchema = z.discriminatedUnion("type", [
  textBlock("title", 160), textBlock("answer", 2000), textBlock("summary", 3000),
  z.object({ ...base, type: z.literal("section"), heading: text(200), body: text(12000) }).strict(),
  textBlock("subheading", 200), textBlock("paragraph", 12000),
  z.object({ ...base, type: z.literal("bulletList"), items: listItems }).strict(),
  z.object({ ...base, type: z.literal("numberedList"), items: listItems }).strict(),
  z.object({ ...base, type: z.literal("table"), headers: z.array(text(200)).min(1).max(10), rows: z.array(z.array(z.string().max(1000)).max(10)).max(50) }).strict().superRefine((value, context) => { value.rows.forEach((row, index) => { if (row.length !== value.headers.length) context.addIssue({ code: "custom", message: "표의 모든 행은 헤더 수와 일치해야 합니다.", path: ["rows", index] }); }); }),
  z.object({ ...base, type: z.literal("checklist"), items: z.array(z.object({ text: text(500), checked: z.boolean() }).strict()).min(1).max(30) }).strict(),
  z.object({ ...base, type: z.literal("faq"), items: z.array(z.object({ question: text(500), answer: text(4000) }).strict()).min(1).max(20) }).strict(),
  z.object({ ...base, type: z.literal("cta"), text: text(500), label: text(100), url: z.url() }).strict(),
  z.object({ ...base, type: z.literal("sources"), items: z.array(z.object({ label: text(300), url: z.url() }).strict()).min(1).max(30) }).strict(),
  z.object({ ...base, type: z.literal("image"), url: z.union([z.url(), z.literal("")]), alt: z.string().max(300), caption: z.string().max(500) }).strict(),
]);

export const contentDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  blocks: z.array(blockSchema).min(1).max(100),
  metadata: z.object({ primaryKeyword: z.string().trim().max(120), keywords: z.array(text(120)).max(20), description: z.string().max(500) }).strict(),
}).strict().superRefine((document, context) => {
  if (new TextEncoder().encode(JSON.stringify(document)).byteLength > 500_000) context.addIssue({ code: "custom", message: "문서 payload가 500KB를 초과합니다." });
  if (new Set(document.blocks.map((block) => block.id)).size !== document.blocks.length) context.addIssue({ code: "custom", message: "블록 ID는 고유해야 합니다.", path: ["blocks"] });
});

export type ContentDocument = z.infer<typeof contentDocumentSchema>;
export type ContentBlock = ContentDocument["blocks"][number];
export const AUTOSAVE_DELAY_MS = 5000;

export function newBlock(type: ContentBlock["type"]): ContentBlock {
  const id = createUuidV4();
  switch (type) {
    case "section": return { id, type, heading: "새 섹션", body: "내용을 입력하세요." };
    case "bulletList": case "numberedList": return { id, type, items: ["새 항목"] };
    case "table": return { id, type, headers: ["항목", "내용"], rows: [["", ""]] };
    case "checklist": return { id, type, items: [{ text: "확인 항목", checked: false }] };
    case "faq": return { id, type, items: [{ question: "질문", answer: "답변" }] };
    case "cta": return { id, type, text: "다음 행동을 안내하세요.", label: "자세히 보기", url: "https://example.com" };
    case "sources": return { id, type, items: [{ label: "가상 출처", url: "https://example.com/source" }] };
    case "image": return { id, type, url: "", alt: "이미지 자리표시자", caption: "" };
    default: return { id, type, text: type === "title" ? "가상 콘텐츠 제목" : "내용을 입력하세요." };
  }
}

export function initialDocument(): ContentDocument {
  return { schemaVersion: 1, blocks: [newBlock("answer"), newBlock("paragraph")], metadata: { primaryKeyword: "", keywords: [], description: "" } };
}

export function shouldAutosave(previous: unknown, current: unknown) { return JSON.stringify(previous) !== JSON.stringify(current); }
