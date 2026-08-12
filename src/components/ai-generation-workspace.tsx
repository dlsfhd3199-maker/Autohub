"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createUuidV4 } from "@/modules/content-studio/uuid";
import { cancelGeneration, generateDraft, generatePlan, type GenerationActionState } from "@/modules/ai-generation/actions";

const initial: GenerationActionState = { ok: false, message: "" };
type Source = { id: string; title: string; official_url: string };
type Product = { name: string; summary: string };

export function AiGenerationWorkspace({ brandId, sources, products }: { brandId: string; sources: Source[]; products: Product[] }) {
  const [planState, planAction, planPending] = useActionState(generatePlan, initial);
  const [draftState, draftAction, draftPending] = useActionState(generateDraft, initial);
  const [cancelState, cancelAction, cancelPending] = useActionState(cancelGeneration, initial);
  const [idempotencyKey] = useState(() => createUuidV4());
  const evidenceName = new Map(sources.map((source) => [source.id, source.title]));
  const currentStep = draftState.contentId ? 3 : planState.plan ? 2 : 1;

  return <div className="generation-flow">
    <nav className="workflow-steps" aria-label="콘텐츠 생성 단계">{["생성 조건", "기획안 검토", "스튜디오 검수"].map((label, index) => <span key={label} className={currentStep >= index + 1 ? "is-active" : ""}><b>{index + 1}</b>{label}</span>)}</nav>
    <aside className="demo-generation-notice"><strong>Deterministic fake provider 데모</strong><p>실제 OpenAI API를 호출하지 않은 테스트 데이터이며 실제 AI 품질 평가에 사용할 수 없습니다. 비용은 $0.00입니다.</p></aside>
    <section className="panel settings-panel"><div className="panel-title"><div><h2>1. 콘텐츠 생성 조건</h2><span>등록한 가상 상품과 공식 근거를 사용해 데모 기획안을 생성합니다.</span></div></div>
      <form action={planAction} className="settings-form"><input type="hidden" name="brandId" value={brandId} /><input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <div className="form-grid"><label className="field span-2"><span>작성 주제</span><input name="topic" required minLength={5} maxLength={300} placeholder="예: 가상 탐색 장치 선택 전 확인할 기준" /></label><label className="field"><span>핵심 키워드</span><input name="primaryKeyword" required maxLength={120} placeholder="가상 탐색 장치" /></label><label className="field"><span>보조 키워드</span><input name="secondaryKeywords" placeholder="공식 근거, 선택 기준 (쉼표로 구분)" /></label><label className="field span-2"><span>가상 상품</span><select name="productIndex" required={products.length > 0} defaultValue=""><option value="">{products.length ? "상품을 선택해 주세요" : "등록된 가상 상품 없음"}</option>{products.map((product, index) => <option value={index} key={`${product.name}-${index}`}>{product.name} · {product.summary}</option>)}</select></label></div>
        <fieldset className="evidence-picker"><legend>사용할 공식 근거</legend>{sources.length ? sources.map((source) => <label key={source.id}><input type="checkbox" name="evidenceIds" value={source.id} defaultChecked /><span><strong>{source.title}</strong><small>{source.official_url}</small></span></label>) : <p>근거 없이도 데모 생성은 가능하지만 전체 내용이 검수 필요로 표시됩니다.</p>}</fieldset>
        <div className="generation-stage-guide"><span><b>1</b>기획안 생성</span><i>→</i><span><b>2</b>사람 검토</span><i>→</i><span><b>3</b>구조화 초안</span></div>
        {planState.message && <p className={planState.ok ? "success-message" : "form-error"} role="status">{planState.message}</p>}
        <button className="primary-button" type="submit" disabled={planPending || Boolean(planState.plan)}>{planPending ? "데모 기획안 생성 중…" : "데모 기획안 생성"}</button>
      </form>
    </section>
    {planState.plan && planState.jobId ? <section className="panel settings-panel plan-review-panel"><div className="panel-title"><div><h2>2. 기획안 검토</h2><span>재생성 대신 이전 단계에서 조건을 수정해 새 작업을 만듭니다.</span></div><span className="status-badge status-review_requested"><span />검토 대기</span></div><div className="plan-overview"><div><small>검색 의도</small><p>{planState.plan.searchIntent}</p></div><div><small>예상 독자</small><p>{planState.plan.expectedAudience}</p></div><div className="span-2"><small>핵심 답변 방향</small><p>{planState.plan.coreAnswer}</p></div></div><div className="plan-section"><h3>콘텐츠 제목 후보</h3><ol>{planState.plan.titleCandidates.map((title) => <li key={title}>{title}</li>)}</ol></div><div className="plan-section"><h3>섹션 구성과 근거</h3><div className="plan-section-grid">{planState.plan.sections.map((section, index) => <article key={`${section.heading}-${index}`}><span>SECTION {index + 1}</span><h4>{section.heading}</h4><p>{section.purpose}</p><small>사용 블록 · {section.suggestedBlocks.join(" · ") || "본문"}</small><ul>{section.evidenceSourceIds.length ? section.evidenceSourceIds.map((id) => <li key={id}>{evidenceName.get(id) ?? "등록 근거"}</li>) : <li>직접 연결된 근거 없음 · 검수 필요</li>}</ul></article>)}</div></div>{planState.plan.faqCandidates.length > 0 && <div className="plan-section"><h3>FAQ 후보</h3><ul>{planState.plan.faqCandidates.map((question) => <li key={question}>{question}</li>)}</ul></div>}{planState.plan.reviewNotes.length > 0 && <div className="plan-section"><h3>검수 필요 예상 항목</h3>{planState.plan.reviewNotes.map((note) => <p className="review-notice" key={note}>{note}</p>)}</div>}
      <div className="plan-actions"><form action={cancelAction}><input type="hidden" name="brandId" value={brandId} /><input type="hidden" name="jobId" value={planState.jobId} /><button className="secondary-button" disabled={cancelPending || Boolean(draftState.contentId)}>{cancelPending ? "취소 중…" : "이전 단계로 돌아가기"}</button></form><form action={draftAction}><input type="hidden" name="brandId" value={brandId} /><input type="hidden" name="jobId" value={planState.jobId} /><button className="primary-button" type="submit" disabled={draftPending || Boolean(draftState.contentId) || cancelState.ok}>{draftPending ? "데모 초안 생성 중…" : "기획안 확인 후 데모 초안 생성"}</button></form></div>{cancelState.message && <p className={cancelState.ok ? "success-message" : "form-error"} role="status">{cancelState.message}</p>}{cancelState.ok && <Link className="secondary-button" href={`/workspace/brands/${brandId}/generate`}>조건을 수정해 새 작업 시작</Link>}{draftState.message && <p className={draftState.ok ? "success-message" : "form-error"} role="status">{draftState.message}</p>}{draftState.contentId && <div className="next-step-card"><div><strong>데모 초안이 준비됐습니다</strong><p>스튜디오에서 근거와 검수 필요 블록을 확인하고 사람의 수정 후 명시적 버전을 생성하세요.</p></div><Link className="primary-button" href={`/workspace/content/${draftState.contentId}/studio`}>콘텐츠 스튜디오에서 검수 →</Link></div>}</section> : null}
  </div>;
}
