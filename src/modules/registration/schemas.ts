import {createHash} from "node:crypto";import{z}from"zod";
export const normalizeEmail=(value:string)=>value.trim().toLowerCase();
const password=z.string().min(12,"비밀번호는 12자 이상이어야 합니다.").max(200).regex(/[A-Z]/,"영문 대문자를 포함해 주세요.").regex(/[a-z]/,"영문 소문자를 포함해 주세요.").regex(/[0-9]/,"숫자를 포함해 주세요.");
export const marketerApplicationSchema=z.object({applicantName:z.string().trim().min(2,"이름은 2자 이상 입력해 주세요.").max(100),email:z.string().trim().max(320).email("올바른 이메일 주소를 입력해 주세요.").transform(normalizeEmail),password,passwordConfirm:z.string().max(200),joinCode:z.string().trim().min(12,"가입 코드를 확인해 주세요.").max(200,"가입 코드를 확인해 주세요."),privacyConsent:z.literal("on",{message:"개인정보 수집에 동의해 주세요."})}).superRefine((v,c)=>{if(v.password!==v.passwordConfirm)c.addIssue({code:"custom",path:["passwordConfirm"],message:"비밀번호가 일치하지 않습니다."})});
export const hashJoinCode=(value:string)=>createHash("sha256").update(value.normalize("NFKC")).digest("hex");
