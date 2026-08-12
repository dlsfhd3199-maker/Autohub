"use client";
import Link from "next/link";
import { useState } from "react";
import { signIn } from "@/modules/auth/actions";

export function LoginForm({ error, resetRequested }: { error?: string; resetRequested: boolean }) {
  const [show, setShow] = useState(false);
  return <>
    {error ? <p className="form-error" role="alert">이메일 또는 비밀번호를 확인해 주세요.</p> : null}
    {resetRequested ? <p className="success-message" role="status">계정이 존재하면 비밀번호 재설정 안내가 전송됩니다.</p> : null}
    <form action={signIn}>
      <label htmlFor="email">이메일</label><input id="email" name="email" type="email" autoComplete="email" placeholder="user-a@example.com" required />
      <label htmlFor="password">비밀번호</label><span className="password-field"><input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" minLength={8} required /><button type="button" onClick={() => setShow((value) => !value)} aria-label={show ? "입력 내용 숨기기" : "입력 내용 표시"}>{show ? "숨기기" : "표시"}</button></span>
      <label className="remember-field"><input name="remember" type="checkbox" defaultChecked /> 로그인 상태 유지</label><button className="primary-button" type="submit">로그인</button>
    </form>
    <div className="auth-links"><Link href="/forgot-password">비밀번호 찾기</Link><Link href="/register">마케터 가입 신청</Link></div>
  </>;
}
