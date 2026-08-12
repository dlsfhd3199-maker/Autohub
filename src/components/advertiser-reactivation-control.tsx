"use client";

import { useActionState, useState } from "react";
import { reactivateAdvertiserAccount, type ReactivationState } from "@/modules/advertiser-accounts/actions";
import { createUuidV4 } from "@/modules/content-studio/uuid";

const initialState: ReactivationState = { ok: false, message: "" };

export function AdvertiserReactivationControl({ brandId, userId }: { brandId: string; userId: string }) {
  const [open, setOpen] = useState(false);
  const [recoveryId] = useState(() => createUuidV4());
  const [state, action, pending] = useActionState(reactivateAdvertiserAccount, initialState);
  const [copied, setCopied] = useState("");
  const copy = async (kind: "email" | "password", value: string) => { await navigator.clipboard.writeText(value); setCopied(kind); };
  return <div className="advertiser-account-controls">
    <button className="secondary-button" type="button" onClick={() => setOpen(true)}>계정 재활성화</button>
    {open ? <div className="confirm-modal-backdrop" role="presentation"><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="reactivation-title">
      <h2 id="reactivation-title">광고주 계정 재활성화</h2>
      <p>계정을 다시 활성화하고 새로운 임시 비밀번호를 발급합니다. 기존 비밀번호로는 로그인할 수 없으며, 광고주는 최초 로그인 후 비밀번호를 변경해야 합니다.</p>
      <form action={action}>
        <input type="hidden" name="brandId" value={brandId}/><input type="hidden" name="userId" value={userId}/><input type="hidden" name="recoveryId" value={recoveryId}/>
        <div className="form-actions"><button type="button" className="secondary-button" disabled={pending} onClick={() => setOpen(false)}>취소</button><button className="primary-button" disabled={pending}>{pending ? "재활성화 중…" : "재활성화 및 임시 비밀번호 발급"}</button></div>
      </form>
      {state.ok && state.email && state.temporaryPassword ? <div className="one-time-credentials" role="status"><strong>새 임시 로그인 정보</strong><p>이번 화면에서 한 번만 확인할 수 있습니다. 광고주는 최초 로그인 후 비밀번호를 변경해야 합니다.</p><div><span><small>이메일</small><code>{state.email}</code><button type="button" onClick={() => copy("email", state.email!)}>이메일 복사</button></span><span><small>임시 비밀번호</small><code>{state.temporaryPassword}</code><button type="button" onClick={() => copy("password", state.temporaryPassword!)}>임시 비밀번호 복사</button></span></div>{copied ? <small>{copied === "email" ? "이메일" : "임시 비밀번호"} 복사 완료</small> : null}</div> : state.message ? <p className={state.ok ? "form-success" : "form-error"} role={state.ok ? "status" : "alert"}>{state.message}</p> : null}
    </section></div> : null}
  </div>;
}
