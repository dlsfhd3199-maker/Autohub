"use client";

import { useActionState, useState } from "react";
import {
  disableAdvertiserAccount,
  reissueAdvertiserPassword,
  type ProvisionState,
} from "@/modules/advertiser-accounts/actions";

const initialState: ProvisionState = { ok: false, message: "" };

export function AdvertiserAccountControls({
  brandId,
  userId,
}: {
  brandId: string;
  userId: string;
}) {
  const [state, reissueAction, pending] = useActionState(reissueAdvertiserPassword, initialState);
  const [copied, setCopied] = useState(false);
  return <div className="advertiser-account-controls">
    <form action={reissueAction}>
      <input type="hidden" name="brandId" value={brandId} />
      <input type="hidden" name="userId" value={userId} />
      <button className="secondary-button" disabled={pending}>{pending ? "발급 중…" : "임시 비밀번호 재발급"}</button>
    </form>
    <form action={disableAdvertiserAccount}>
      <input type="hidden" name="brandId" value={brandId} />
      <input type="hidden" name="userId" value={userId} />
      <button className="danger-button">계정 비활성화</button>
    </form>
    {state.ok && state.temporaryPassword ? <div className="one-time-inline" role="status">
      <p>새 임시 로그인 정보는 지금 한 번만 확인할 수 있습니다.</p>
      <code>{state.temporaryPassword}</code>
      <button type="button" onClick={async () => {
        await navigator.clipboard.writeText(state.temporaryPassword!);
        setCopied(true);
      }}>{copied ? "복사 완료" : "임시 비밀번호 복사"}</button>
    </div> : state.message ? <p className="form-error" role="alert">{state.message}</p> : null}
  </div>;
}
