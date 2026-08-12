"use client";
import { useActionState, useState, type InputHTMLAttributes } from "react";
import { submitRegistration, type RegistrationState } from "@/modules/registration/actions";
const initial: RegistrationState = { ok: false, message: "" };

export function RegistrationForm() {
  const [role, setRole] = useState<"advertiser" | "ae">("advertiser");
  const [state, action, pending] = useActionState(submitRegistration, initial);
  const [show, setShow] = useState(false);
  const error = (name: string) => state.fieldErrors?.[name]?.[0];
  return <div className="registration-card">
    <div className="role-tabs" role="tablist" aria-label="가입 신청 역할"><button type="button" role="tab" aria-selected={role === "advertiser"} onClick={() => setRole("advertiser")}>광고주</button><button type="button" role="tab" aria-selected={role === "ae"} onClick={() => setRole("ae")}>마케터</button></div>
    <form action={action} className="registration-form"><input type="hidden" name="role" value={role} />
      {role === "advertiser" ? <><Field name="organizationName" label="회사명" error={error("organizationName")} /><Field name="brandName" label="브랜드명" error={error("brandName")} /><Field name="storefrontUrl" label="자사몰 URL" type="url" placeholder="https://virtual.example.com" error={error("storefrontUrl")} /></> : <><Field name="organizationName" label="소속 센터 또는 대행사" error={error("organizationName")} /><Field name="joinCode" label="가입 코드" autoComplete="off" error={error("joinCode")} /></>}
      <Field name="applicantName" label="이름" error={error("applicantName")} /><Field name="jobTitle" label="직급" error={error("jobTitle")} /><Field name="phone" label="전화번호" inputMode="tel" error={error("phone")} />{role === "ae" ? <Field name="joinedOn" label="입사일(선택)" type="date" required={false} /> : null}
      <Field name="email" label="이메일" type="email" placeholder="user-a@example.com" autoComplete="email" error={error("email")} /><p className="field-help">중복 여부를 노출하지 않는 안전한 응답으로 가입 신청을 처리합니다.</p>
      <label className="field"><span>비밀번호</span><span className="password-field"><input name="password" type={show ? "text" : "password"} autoComplete="new-password" minLength={12} required /><button type="button" onClick={() => setShow((value) => !value)} aria-label={show ? "입력 내용 숨기기" : "입력 내용 표시"}>{show ? "숨기기" : "표시"}</button></span>{error("password") ? <small className="field-error">{error("password")}</small> : null}</label>
      <Field name="passwordConfirm" label="비밀번호 확인" type={show ? "text" : "password"} autoComplete="new-password" error={error("passwordConfirm")} />
      <label className="consent"><input name="privacyConsent" type="checkbox" required /> 가입 심사를 위한 개인정보 수집에 동의합니다.</label>
      {state.message ? <p role="alert" className="form-error">{state.message}</p> : null}<button className="primary-button" disabled={pending}>{pending ? "신청 중…" : `${role === "advertiser" ? "광고주" : "마케터"} 가입 신청`}</button>
    </form>
  </div>;
}

function Field({ name, label, error, required = true, ...props }: { name: string; label: string; error?: string; required?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  return <label className="field"><span>{label}</span><input name={name} required={required} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} {...props} />{error ? <small id={`${name}-error`} className="field-error">{error}</small> : null}</label>;
}
