import { z } from "zod";

const uuid = z.string().uuid("올바른 식별자가 아닙니다.");
export const brandInputSchema = z.object({
  organizationId: uuid,
  advertiserOrganizationId: uuid,
  name: z.string().trim().min(2, "브랜드명은 2자 이상 입력해 주세요.").max(120, "브랜드명은 120자 이하로 입력해 주세요."),
  brandKey: z.string().trim().min(2, "브랜드 키는 2자 이상 입력해 주세요.").max(63, "브랜드 키는 63자 이하로 입력해 주세요.").regex(/^[a-z0-9][a-z0-9-]{1,62}$/, "영문 소문자, 숫자, 하이픈만 사용할 수 있습니다."),
  domain: z.string().trim().toLowerCase().min(3, "연결 도메인을 입력해 주세요.").regex(/^(?=.{3,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/, "프로토콜과 경로를 제외한 도메인만 입력해 주세요."),
  publishingPath: z.string().trim().regex(/^\/[a-z0-9/_-]*$/, "발행 경로는 /로 시작하며 영문 소문자, 숫자, -, _만 사용할 수 있습니다.").default("/blog"),
});
export const brandUpdateSchema = brandInputSchema.omit({ advertiserOrganizationId: true, brandKey: true }).extend({ brandId: uuid });
export const brandArchiveSchema = z.object({ organizationId: uuid, brandId: uuid });
