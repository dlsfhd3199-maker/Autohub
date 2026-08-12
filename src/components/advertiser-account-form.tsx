"use client";
import { useActionState, useState } from "react";
import { createUuidV4 } from "@/modules/content-studio/uuid";
import { createAdvertiserAccount, type ProvisionState } from "@/modules/advertiser-accounts/actions";
const initial: ProvisionState = { ok: false, message: "" };
export function AdvertiserAccountForm({ brandId, brandName }: { brandId: string; brandName: string }) {
  const [key] = useState(() => createUuidV4()); const [state, action, pending] = useActionState(createAdvertiserAccount, initial); const [copied, setCopied] = useState("");
  const copy = async (label: string, value: string) => { await navigator.clipboard.writeText(value); setCopied(label); };
  return <section className="panel advertiser-provision"><div className="section-heading"><div><p className="eyebrow">ADVERTISER ACCOUNT</p><h2>광고주 계정 추가</h2><p>선택 브랜드: <strong>{brandName}</strong></p></div></div>
    <form action={action} className="management-form"><input type="hidden" name="idempotencyKey" value={key}/><input type="hidden" name="brandId" value={brandId}/><label>광고주 담당자명<input name="displayName" required minLength={2}/></label><label>이메일<input name="email" type="email" required placeholder="advertiser-a@example.com"/></label><label>직책(선택)<input name="jobTitle" maxLength={100}/></label><button className="primary-button" disabled={pending}>{pending ? "생성 중…" : "광고주 계정 생성"}</button></form>
    {state.ok && state.email && state.temporaryPassword ? <div className="one-time-credentials" role="status"><strong>임시 로그인 정보</strong><p>임시 로그인 정보는 이번 화면에서 한 번만 확인할 수 있습니다. 광고주는 최초 로그인 후 비밀번호를 변경해야 합니다.</p><div><span><small>이메일</small><code>{state.email}</code><button onClick={() => copy("email", state.email!)}>이메일 복사</button></span><span><small>임시 비밀번호</small><code>{state.temporaryPassword}</code><button onClick={() => copy("password", state.temporaryPassword!)}>비밀번호 복사</button></span></div>{copied ? <small>{copied === "email" ? "이메일" : "임시 비밀번호"} 복사 완료</small> : null}</div> : state.message ? <p className={state.ok ? "form-success" : "form-error"} role={state.ok ? "status" : "alert"}>{state.message}</p> : null}
  </section>;
}
