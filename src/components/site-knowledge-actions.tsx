"use client";

import { useActionState } from "react";
import { registerLocalSiteSource, reviewKnowledgeFact, reviewProduct, startSiteCrawl, type SiteActionState } from "@/modules/site-crawl/actions";

const initial: SiteActionState = { ok: false, message: "" };
function Result({ state }: { state: SiteActionState }) { return state.message ? <p className={state.ok ? "success-message" : "form-error"} role="status">{state.message}</p> : null; }

export function SiteSourceForm({ brandId }: { brandId: string }) {
  const [state, action, pending] = useActionState(registerLocalSiteSource, initial);
  return <form action={action} className="site-action-form"><input type="hidden" name="brandId" value={brandId} /><input type="hidden" name="isPrimary" value="true" /><label className="field"><span>대표 자사몰 URL</span><input name="baseUrl" type="url" defaultValue="http://127.0.0.1:3100" required /><small>로컬 PoC에서는 정확히 허용된 테스트 자사몰만 등록됩니다.</small></label><button className="primary-button" disabled={pending}>{pending ? "등록 중…" : "테스트 자사몰 등록"}</button><Result state={state} /></form>;
}

export function CrawlButton({ brandId, sourceId }: { brandId: string; sourceId: string }) {
  const [state, action, pending] = useActionState(startSiteCrawl, initial);
  return <form action={action} className="inline-action"><input type="hidden" name="brandId" value={brandId} /><input type="hidden" name="sourceId" value={sourceId} /><button className="primary-button" disabled={pending}>{pending ? "수집 중…" : "사이트 수집 실행"}</button><Result state={state} /></form>;
}

function ReviewForm({ brandId, itemId, kind }: { brandId: string; itemId: string; kind: "fact" | "product" }) {
  const fn = kind === "fact" ? reviewKnowledgeFact : reviewProduct;
  const [state, action, pending] = useActionState(fn, initial);
  return <form action={action} className="review-actions"><input type="hidden" name="brandId" value={brandId} /><input type="hidden" name="itemId" value={itemId} /><label className="field"><span className="sr-only">검수 의견</span><input name="note" placeholder="검수 의견(선택)" maxLength={1000} /></label><button name="decision" value="approved" className="primary-button" disabled={pending}>승인</button><button name="decision" value="rejected" className="danger-button" disabled={pending}>반려</button><Result state={state} /></form>;
}
export function FactReviewForm(props: { brandId: string; itemId: string }) { return <ReviewForm {...props} kind="fact" />; }
export function ProductReviewForm(props: { brandId: string; itemId: string }) { return <ReviewForm {...props} kind="product" />; }
