"use client";

import { useActionState } from "react";
import { disablePublishingConnection, rotatePublishingConnection, type PublishingActionState } from "@/modules/publishing/actions";

const initial: PublishingActionState = { ok: false, message: "" };

export function PublishingConnectionPanel({ brandId, status }: { brandId: string; status: "active" | "disabled" | null }) {
  const [createState, createAction, createPending] = useActionState(rotatePublishingConnection, initial);
  const [disableState, disableAction, disablePending] = useActionState(disablePublishingConnection, initial);
  return <section className="panel settings-panel publishing-connection-panel" aria-labelledby="publishing-connection-title">
    <div className="panel-title"><div><h2 id="publishing-connection-title">테스트 자사몰 연결</h2><span>실제 운영 발행이 아닌 로컬 PoC 전용 서버 연결입니다.</span></div><span className={`status-badge ${status === "active" ? "status-active" : "status-archived"}`}><span />{status === "active" ? "연결 활성" : status === "disabled" ? "연결 중지" : "연결 전"}</span></div>
    <div className="publishing-callout"><strong>Bearer 키는 생성 직후 한 번만 표시됩니다.</strong><p>원문 키는 DB에 저장하지 않으며 테스트 자사몰 서버 환경에만 입력합니다. 키를 다시 만들면 이전 키는 즉시 무효화됩니다.</p></div>
    <div className="connection-actions"><form action={createAction}><input type="hidden" name="brandId" value={brandId} /><button className="primary-button" disabled={createPending}>{createPending ? "키 생성 중…" : status ? "연결 키 교체" : "연결 키 생성"}</button></form>{status === "active" && <form action={disableAction}><input type="hidden" name="brandId" value={brandId} /><button className="danger-button" disabled={disablePending}>{disablePending ? "중지 중…" : "연결 비활성화"}</button></form>}</div>
    {createState.message && <p role="status" className={createState.ok ? "success-message" : "form-error"}>{createState.message}</p>}
    {createState.rawKey && <div className="one-time-key" role="status"><span>한 번만 표시되는 테스트 발행 키</span><code>{createState.rawKey}</code><button type="button" onClick={() => navigator.clipboard.writeText(createState.rawKey ?? "")}>키 복사</button></div>}
    {disableState.message && <p role="status" className={disableState.ok ? "success-message" : "form-error"}>{disableState.message}</p>}
  </section>;
}
