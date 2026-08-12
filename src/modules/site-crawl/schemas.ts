import { z } from "zod";

const uuid = z.string().uuid();

export const siteSourceInputSchema = z.object({
  brandId: uuid,
  baseUrl: z.string().url().refine((value) => value === "http://127.0.0.1:3100", "로컬 PoC에서는 허용된 테스트 자사몰 주소만 등록할 수 있습니다."),
  isPrimary: z.coerce.boolean().default(false),
}).strict();

export const crawlRequestSchema = z.object({ brandId: uuid, sourceId: uuid }).strict();

export const reviewInputSchema = z.object({
  brandId: uuid,
  itemId: uuid,
  decision: z.enum(["approved", "rejected"]),
  note: z.string().trim().max(1000).optional().default(""),
}).strict();
