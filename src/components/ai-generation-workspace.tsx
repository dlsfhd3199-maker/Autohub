"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createUuidV4 } from "@/modules/content-studio/uuid";
import { generateDraft, generatePlan, type GenerationActionState } from "@/modules/ai-generation/actions";

const initial: GenerationActionState = { ok: false, message: "" };
export function AiGenerationWorkspace({ brandId, sources }: { brandId: string; sources: Array<{ id: string; title: string; official_url: string }> }) {
  const [planState, planAction, planPending] = useActionState(generatePlan, initial);
  const [draftState, draftAction, draftPending] = useActionState(generateDraft, initial);
  const [idempotencyKey] = useState(() => createUuidV4());
  return <div className="generation-flow">
    <section className="panel settings-panel"><div className="panel-title"><div><h2>1. 콘텐츠 생성 정보</h2><span>API 키 없이 fake provider로 파이프라인을 검증합니다.</span></div></div>
      <form action={planAction} className="settings-form"><input type="hidden" name="brandId" value={brandId} /><input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <div className="form-grid"><label className="field span-2"><span>작성 주제</span><input name="topic" required minLength={5} maxLength={300} /></label><label className="field"><span>핵심 키워드</span><input name="primaryKeyword" required maxLength={120} /></label><label className="field"><span>보조 키워드</span><input name="secondaryKeywords" placeholder="쉼표로 구분" /></label></div>
        <fieldset className="evidence-picker"><legend>사용할 공식 근거</legend>{sources.length ? sources.map((source) => <label key={source.id}><input type="checkbox" name="evidenceIds" value={source.id} defaultChecked /><span><strong>{source.title}</strong><small>{source.official_url}</small></span></label>) : <p>근거 없이도 생성할 수 있지만 전체 내용이 검수 필요로 표시됩니다.</p>}</fieldset>
        {planState.message && <p className={planState.ok ? "success-message" : "form-error"} role="status">{planState.message}</p>}
        <button className="primary-button" type="submit" disabled={planPending || Boolean(planState.plan)}>{planPending ? "기획안 생성 중…" : "AI 기획안 생성"}</button>
      </form>
    </section>
    {planState.plan && planState.jobId ? <section className="panel settings-panel"><div className="panel-title"><div><h2>2. 기획안 확인</h2><span>확인 후 구조화 콘텐츠 초안을 생성합니다.</span></div></div><div className="plan-preview"><h3>{planState.plan.title}</h3><p><strong>검색 의도</strong> {planState.plan.searchIntent}</p><p><strong>핵심 답변</strong> {planState.plan.coreAnswer}</p><ol>{planState.plan.sections.map((section) => <li key={section.heading}><strong>{section.heading}</strong><span>{section.purpose}</span><small>{section.suggestedBlocks.join(" · ")}</small></li>)}</ol>{planState.plan.reviewNotes.map((note) => <p className="review-notice" key={note}>{note}</p>)}</div>
      <form action={draftAction}><input type="hidden" name="brandId" value={brandId} /><input type="hidden" name="jobId" value={planState.jobId} /><button className="primary-button" type="submit" disabled={draftPending || Boolean(draftState.contentId)}>{draftPending ? "초안 생성 중…" : "구조화 콘텐츠 초안 생성"}</button></form>{draftState.message && <p className={draftState.ok ? "success-message" : "form-error"} role="status">{draftState.message}</p>}{draftState.contentId && <Link className="secondary-button" href={`/workspace/content/${draftState.contentId}/studio`}>콘텐츠 스튜디오에서 검수</Link>}</section> : null}
  </div>;
}
