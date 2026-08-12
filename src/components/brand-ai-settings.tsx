"use client";

import { useActionState, useState } from "react";
import { saveBrandKnowledge, saveEvidenceSource, toggleEvidenceSource, type KnowledgeActionState } from "@/modules/brand-knowledge/actions";

const initial: KnowledgeActionState = { ok: false, message: "" };
const ErrorText = ({ errors }: { errors?: string[] }) => errors?.length ? <p className="field-error" role="alert">{errors[0]}</p> : null;

export function BrandKnowledgeForm({ brandId, profile }: { brandId: string; profile: Record<string, unknown> | null }) {
  const [state, action, pending] = useActionState(saveBrandKnowledge, initial);
  const cta = (profile?.default_cta ?? {}) as { label?: string; url?: string };
  return <form action={action} className="settings-form"><input type="hidden" name="brandId" value={brandId} />
    <div className="form-grid">
      <label className="field span-2"><span>브랜드 소개</span><textarea name="introduction" defaultValue={String(profile?.introduction ?? "")} rows={5} required /><ErrorText errors={state.fieldErrors?.introduction} /></label>
      <label className="field"><span>타깃 독자</span><textarea name="targetAudience" defaultValue={String(profile?.target_audience ?? "")} rows={3} required /><ErrorText errors={state.fieldErrors?.targetAudience} /></label>
      <label className="field"><span>말투</span><textarea name="tone" defaultValue={String(profile?.tone ?? "")} rows={3} required /><ErrorText errors={state.fieldErrors?.tone} /></label>
      <label className="field"><span>금지 표현</span><textarea name="prohibitedExpressions" defaultValue={Array.isArray(profile?.prohibited_expressions) ? profile.prohibited_expressions.join("\n") : ""} rows={4} /><small>한 줄에 하나씩 입력합니다.</small></label>
      <label className="field"><span>기본 CTA 문구</span><input name="ctaLabel" defaultValue={cta.label ?? "가상 상품 자세히 보기"} required /><span>기본 CTA URL</span><input name="ctaUrl" type="url" defaultValue={cta.url ?? "https://example.com/virtual-product"} required /><ErrorText errors={state.fieldErrors?.ctaUrl} /></label>
      <ProductEditor initial={Array.isArray(profile?.product_info) ? profile.product_info as Product[] : []} errors={state.fieldErrors?.productInfo} />
    </div>
    {state.message && <p className={state.ok ? "success-message" : "form-error"} role="status">{state.message}</p>}
    <button className="primary-button" type="submit" disabled={pending}>{pending ? "저장 중…" : "AI 콘텐츠 설정 저장"}</button>
  </form>;
}

type Product = { name: string; summary: string; features: string[]; limitations: string[]; officialUrl: string };
const emptyProduct = (): Product => ({ name: "", summary: "", features: [], limitations: [], officialUrl: "https://example.com/virtual-product" });
function ProductEditor({ initial, errors }: { initial: Product[]; errors?: string[] }) {
  const [products, setProducts] = useState<Product[]>(initial);
  const update = (index: number, patch: Partial<Product>) => setProducts((value) => value.map((product, itemIndex) => itemIndex === index ? { ...product, ...patch } : product));
  return <fieldset className="product-editor span-2"><legend>가상 상품 정보</legend><input type="hidden" name="productInfo" value={JSON.stringify(products)} />{products.length ? <div className="product-list">{products.map((product, index) => <article key={index}><header><strong>가상 상품 {index + 1}</strong><button type="button" onClick={() => setProducts((value) => value.filter((_, itemIndex) => itemIndex !== index))}>상품 제거</button></header><div className="form-grid"><label className="field"><span>상품명</span><input value={product.name} onChange={(event) => update(index, { name: event.target.value })} required /></label><label className="field"><span>공식 URL</span><input type="url" value={product.officialUrl} onChange={(event) => update(index, { officialUrl: event.target.value })} required /></label><label className="field span-2"><span>상품 요약</span><textarea value={product.summary} onChange={(event) => update(index, { summary: event.target.value })} required /></label><label className="field"><span>주요 특징</span><textarea value={product.features.join("\n")} onChange={(event) => update(index, { features: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} placeholder="한 줄에 하나씩 입력" /></label><label className="field"><span>제한 사항</span><textarea value={product.limitations.join("\n")} onChange={(event) => update(index, { limitations: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} placeholder="한 줄에 하나씩 입력" /></label></div></article>)}</div> : <div className="empty-product"><strong>등록된 가상 상품이 없습니다</strong><p>콘텐츠 생성 단계에서 선택할 가상 상품을 추가해 주세요.</p></div>}<button className="secondary-button" type="button" onClick={() => setProducts((value) => [...value, emptyProduct()])}>+ 가상 상품 추가</button><small>PoC에서는 명백한 가상 상품과 example.com URL만 입력할 수 있습니다.</small><ErrorText errors={errors} /></fieldset>;
}

export function EvidenceForm({ brandId, source }: { brandId: string; source?: { id: string; title: string; official_url: string; evidence_text: string } }) {
  const [state, action, pending] = useActionState(saveEvidenceSource, initial);
  return <form action={action} className="evidence-form"><input type="hidden" name="brandId" value={brandId} />{source && <input type="hidden" name="id" value={source.id} />}
    <label className="field"><span>출처명</span><input name="title" defaultValue={source?.title ?? ""} required /><ErrorText errors={state.fieldErrors?.title} /></label>
    <label className="field"><span>공식 URL</span><input name="officialUrl" type="url" defaultValue={source?.official_url ?? "https://example.com/"} required /><ErrorText errors={state.fieldErrors?.officialUrl} /></label>
    <label className="field span-2"><span>관리자가 확인한 공식 근거 텍스트</span><textarea name="evidenceText" defaultValue={source?.evidence_text ?? ""} rows={5} required /><ErrorText errors={state.fieldErrors?.evidenceText} /></label>
    {state.message && <p className={state.ok ? "success-message" : "form-error"} role="status">{state.message}</p>}
    <button className={source ? "secondary-button" : "primary-button"} type="submit" disabled={pending}>{pending ? "저장 중…" : source ? "근거 수정" : "공식 근거 추가"}</button>
  </form>;
}

export function EvidenceToggle({ brandId, id, active }: { brandId: string; id: string; active: boolean }) {
  return <form action={toggleEvidenceSource}><input type="hidden" name="brandId" value={brandId} /><input type="hidden" name="id" value={id} /><input type="hidden" name="isActive" value={String(!active)} /><button className="link-button" type="submit">{active ? "비활성화" : "다시 활성화"}</button></form>;
}
