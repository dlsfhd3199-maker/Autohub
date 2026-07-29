import { z } from "zod";

const uuid = z.string().uuid("올바른 식별자가 아닙니다.");
const exampleUrl = z.url().refine((value) => {
  const host = new URL(value).hostname;
  return host === "example.com" || host.endsWith(".example.com");
}, "PoC에서는 example.com 가상 URL만 사용할 수 있습니다.");

export const productSchema = z.object({
  name: z.string().trim().min(1).max(120), summary: z.string().trim().min(1).max(1000),
  features: z.array(z.string().trim().min(1).max(300)).max(20), limitations: z.array(z.string().trim().min(1).max(300)).max(20), officialUrl: exampleUrl,
}).strict();

export const knowledgeInputSchema = z.object({
  brandId: uuid,
  introduction: z.string().trim().min(10, "브랜드 소개를 10자 이상 입력해 주세요.").max(5000),
  targetAudience: z.string().trim().min(2, "타깃을 입력해 주세요.").max(2000),
  tone: z.string().trim().min(2, "말투를 입력해 주세요.").max(1000),
  prohibitedExpressions: z.string().max(2000).transform((value) => value.split("\n").map((item) => item.trim()).filter(Boolean)).pipe(z.array(z.string().max(200)).max(30)),
  ctaLabel: z.string().trim().min(1).max(100), ctaUrl: exampleUrl,
  productInfo: z.string().max(20000).transform((value, context) => {
    try { return JSON.parse(value); } catch { context.addIssue({ code: "custom", message: "상품 정보가 올바른 JSON이 아닙니다." }); return z.NEVER; }
  }).pipe(z.array(productSchema).max(20)),
});

export const evidenceInputSchema = z.object({
  id: z.union([uuid, z.literal("")]).optional(), brandId: uuid,
  title: z.string().trim().min(1, "출처명을 입력해 주세요.").max(200), officialUrl: exampleUrl,
  evidenceText: z.string().trim().min(20, "근거 텍스트를 20자 이상 입력해 주세요.").max(20000),
});
export const evidenceToggleSchema = z.object({ id: uuid, brandId: uuid, isActive: z.enum(["true", "false"]).transform((value) => value === "true") });
