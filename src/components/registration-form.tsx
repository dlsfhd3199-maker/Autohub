"use client";

import { useActionState, useState, type InputHTMLAttributes } from "react";
import { submitRegistration, type RegistrationState } from "@/modules/registration/actions";

const initial: RegistrationState = { ok: false, message: "" };

export function RegistrationForm() {
  const [role, setRole] = useState<"advertiser" | "ae">("advertiser");
  const [state, action, pending] = useActionState(submitRegistration, initial);
  const [visible, setVisible] = useState({ joinCode: false, password: false, passwordConfirm: false });
  const error = (name: string) => state.fieldErrors?.[name]?.[0];
  const toggle = (name: keyof typeof visible) => setVisible((value) => ({ ...value, [name]: !value[name] }));

  return <div className="registration-card">
    <div className="role-tabs" role="tablist" aria-label="가입 신청 역할">
      <button type="button" role="tab" aria-selected={role === "advertiser"} onClick={() => setRole("advertiser")}>광고주</button>
      <button type="button" role="tab" aria-selected={role === "ae"} onClick={() => setRole("ae")}>마케터</button>
    </div>
    <form action={action} className="registration-form" noValidate>
      <input type="hidden" name="role" value={role} />
      {role === "advertiser" ? <>
        <Field className="field-wide" name="organizationName" label="회사명" error={error("organizationName")} />
        <Field className="field-wide" name="brandName" label="브랜드명" error={error("brandName")} />
        <Field className="field-wide" name="storefrontUrl" label="자사몰 URL" type="url" placeholder="https://virtual.example.com" error={error("storefrontUrl")} />
      </> : <>
        <Field className="field-wide" name="organizationName" label="소속 센터 또는 대행사" error={error("organizationName")} />
        <PasswordField className="field-wide" name="joinCode" label="가입 코드" visible={visible.joinCode} onToggle={() => toggle("joinCode")} error={error("joinCode")} autoComplete="off" help="관리자가 전달한 가입 코드를 입력해 주세요. 코드는 오류 메시지나 로그에 표시되지 않습니다." />
      </>}
      <Field name="applicantName" label="이름" error={error("applicantName")} />
      <Field name="jobTitle" label="직급" error={error("jobTitle")} />
      <Field name="phone" label="전화번호" inputMode="tel" autoComplete="tel" error={error("phone")} />
      {role === "ae" ? <Field name="joinedOn" label="입사일(선택)" type="date" required={false} error={error("joinedOn")} /> : null}
      <Field className="field-wide" name="email" label="이메일" type="email" placeholder="user-a@example.com" autoComplete="email" error={error("email")} help="이메일 존재 여부를 노출하지 않는 안전한 방식으로 가입 신청을 처리합니다." />
      <PasswordField name="password" label="비밀번호" visible={visible.password} onToggle={() => toggle("password")} minLength={12} autoComplete="new-password" error={error("password")} help="12자 이상으로 입력해 주세요." />
      <PasswordField name="passwordConfirm" label="비밀번호 확인" visible={visible.passwordConfirm} onToggle={() => toggle("passwordConfirm")} autoComplete="new-password" error={error("passwordConfirm")} />
      <label className="consent"><input name="privacyConsent" type="checkbox" required /><span><strong>개인정보 수집 동의</strong><small>가입 심사와 계정 승인을 위해 입력한 정보를 수집하는 데 동의합니다.</small></span></label>
      {state.message ? <p role="alert" className="form-error">{state.message}</p> : null}
      <button className="primary-button registration-submit" disabled={pending}>{pending ? "신청 중…" : `${role === "advertiser" ? "광고주" : "마케터"} 가입 신청`}</button>
    </form>
  </div>;
}

type FieldProps = { name: string; label: string; error?: string; help?: string; required?: boolean; className?: string } & InputHTMLAttributes<HTMLInputElement>;

function Field({ name, label, error, help, required = true, className = "", ...props }: FieldProps) {
  const describedBy = [help ? `${name}-help` : "", error ? `${name}-error` : ""].filter(Boolean).join(" ") || undefined;
  return <div className={`field ${className}`}><label className="field-label" htmlFor={name}>{label}</label><input id={name} name={name} required={required} aria-invalid={Boolean(error)} aria-describedby={describedBy} {...props} />{help ? <small id={`${name}-help`} className="field-help">{help}</small> : null}{error ? <small id={`${name}-error`} className="field-error" role="alert">{error}</small> : null}</div>;
}

function PasswordField({ name, label, visible, onToggle, error, help, className = "", ...props }: FieldProps & { visible: boolean; onToggle: () => void }) {
  const describedBy = [help ? `${name}-help` : "", error ? `${name}-error` : ""].filter(Boolean).join(" ") || undefined;
  return <div className={`field ${className}`}><label className="field-label" htmlFor={name}>{label}</label><span className="password-input-wrap"><input id={name} name={name} type={visible ? "text" : "password"} required aria-invalid={Boolean(error)} aria-describedby={describedBy} {...props} /><button type="button" className="password-toggle" onClick={onToggle} aria-label={visible ? `${label} 숨기기` : `${label} 표시`} aria-pressed={visible}>{visible ? "숨기기" : "표시"}</button></span>{help ? <small id={`${name}-help`} className="field-help">{help}</small> : null}{error ? <small id={`${name}-error`} className="field-error" role="alert">{error}</small> : null}</div>;
}
