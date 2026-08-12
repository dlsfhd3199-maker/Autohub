"use client";

import { useActionState, useState } from "react";
import { changeInitialPassword, type PasswordState } from "@/modules/auth/password-actions";

const initial: PasswordState = { ok: false, message: "" };

export function InitialPasswordForm() {
  const [state, action, pending] = useActionState(changeInitialPassword, initial);
  const [visible, setVisible] = useState({ password: false, confirmation: false });
  return <form action={action} className="password-change-form">
    <div className="field">
      <label htmlFor="initial-password">새 비밀번호</label>
      <span className="password-input-wrap">
        <input id="initial-password" name="password" type={visible.password ? "text" : "password"} minLength={12} autoComplete="new-password" required />
        <button type="button" className="password-toggle" aria-label={visible.password ? "새 비밀번호 숨기기" : "새 비밀번호 표시"} onClick={() => setVisible((value) => ({ ...value, password: !value.password }))}>{visible.password ? "숨기기" : "표시"}</button>
      </span>
    </div>
    <div className="field">
      <label htmlFor="initial-password-confirmation">새 비밀번호 확인</label>
      <span className="password-input-wrap">
        <input id="initial-password-confirmation" name="passwordConfirm" type={visible.confirmation ? "text" : "password"} autoComplete="new-password" required />
        <button type="button" className="password-toggle" aria-label={visible.confirmation ? "새 비밀번호 확인 숨기기" : "새 비밀번호 확인 표시"} onClick={() => setVisible((value) => ({ ...value, confirmation: !value.confirmation }))}>{visible.confirmation ? "숨기기" : "표시"}</button>
      </span>
    </div>
    <small>영문 대·소문자와 숫자를 포함해 12자 이상 입력해 주세요.</small>
    {state.message ? <p className="form-error" role="alert">{state.message}</p> : null}
    <button className="primary-button" disabled={pending}>{pending ? "변경 중…" : "비밀번호 변경"}</button>
  </form>;
}
