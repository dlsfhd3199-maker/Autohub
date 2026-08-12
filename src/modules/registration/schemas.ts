import { createHash } from "node:crypto";
import { z } from "zod";

export const normalizeEmail = (value: string) => value.trim().toLowerCase();
const email = z.string().trim().max(320).email("올바른 이메일 주소를 입력해 주세요.").transform(normalizeEmail);
const password = z.string().min(12, "비밀번호는 12자 이상이어야 합니다.").max(200).regex(/[A-Z]/, "영문 대문자를 포함해 주세요.").regex(/[a-z]/, "영문 소문자를 포함해 주세요.").regex(/[0-9]/, "숫자를 포함해 주세요.");
const common = z.object({
  applicantName: z.string().trim().min(2, "이름은 2자 이상 입력해 주세요.").max(100),
  jobTitle: z.string().trim().min(1, "직급을 입력해 주세요.").max(100),
  phone: z.string().trim().regex(/^\+?[0-9 -]{8,30}$/, "전화번호 형식을 확인해 주세요."),
  email,
  password,
  passwordConfirm: z.string().max(200),
  privacyConsent: z.literal("on", { message: "개인정보 수집에 동의해 주세요." }),
}).superRefine((value, context) => {
  if (value.password !== value.passwordConfirm) context.addIssue({ code: "custom", path: ["passwordConfirm"], message: "비밀번호가 일치하지 않습니다." });
});

export const advertiserApplicationSchema = z.intersection(common, z.object({
  role: z.literal("advertiser"), organizationName: z.string().trim().min(2, "회사명은 2자 이상 입력해 주세요.").max(160, "회사명은 160자 이하로 입력해 주세요."), brandName: z.string().trim().min(2, "브랜드명은 2자 이상 입력해 주세요.").max(160, "브랜드명은 160자 이하로 입력해 주세요."),
  storefrontUrl: z.string().url("올바른 자사몰 URL을 입력해 주세요.").max(2048).refine((value) => ["http:", "https:"].includes(new URL(value).protocol), "HTTP 또는 HTTPS URL만 사용할 수 있습니다."),
}));
export const marketerApplicationSchema = z.intersection(common, z.object({ role: z.literal("ae"), organizationName: z.string().trim().min(2, "소속 센터 또는 대행사를 2자 이상 입력해 주세요.").max(160, "소속 정보는 160자 이하로 입력해 주세요."), joinCode: z.string().trim().min(12, "가입 코드를 확인해 주세요.").max(200, "가입 코드를 확인해 주세요."), joinedOn: z.union([z.literal(""), z.string().date("올바른 입사일을 입력해 주세요.")]).optional() }));
export const hashJoinCode = (value: string) => createHash("sha256").update(value.normalize("NFKC")).digest("hex");
