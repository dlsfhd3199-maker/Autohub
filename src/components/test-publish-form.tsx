"use client";

import { useActionState } from "react";
import { testPublishContent, type PublishingActionState } from "@/modules/publishing/actions";

const initial: PublishingActionState = { ok: false, message: "" };
export function TestPublishForm({ contentId, slug, versions, publishedVersionId }: { contentId: string; slug: string; versions: Array<{ id: string; version_no: number; change_summary: string }>; publishedVersionId: string | null }) {
  const [state, action, pending] = useActionState(testPublishContent, initial);
  return <section className="test-publish-card" aria-labelledby="test-publish-title"><div><h2 id="test-publish-title">테스트 발행</h2><p>명시적으로 확정한 불변 버전만 로컬 테스트 자사몰에 노출합니다. 실제 승인이나 운영 발행이 아닙니다.</p></div>
    {versions.length ? <form action={action}><input type="hidden" name="contentId" value={contentId} /><label>발행할 버전<select name="versionId" required defaultValue={publishedVersionId ?? versions[0].id}>{versions.map((version) => <option key={version.id} value={version.id}>v{version.version_no} · {version.change_summary || "변경 요약 없음"}{version.id === publishedVersionId ? " · 현재 테스트 발행" : ""}</option>)}</select></label><button className="primary-button" disabled={pending}>{pending ? "테스트 발행 중…" : "선택 버전 테스트 발행"}</button></form> : <div className="readonly-note"><span>먼저 현재 초안을 명시적 버전으로 생성해 주세요. working draft는 발행할 수 없습니다.</span></div>}
    {state.message && <p role="status" className={state.ok ? "success-message" : "form-error"}>{state.message}</p>}{(state.ok || publishedVersionId) && <a className="secondary-button store-preview-link" href={`http://127.0.0.1:3100/blog/${slug}`} target="_blank" rel="noreferrer">테스트 자사몰에서 확인 →</a>}
  </section>;
}
