"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { archiveBrand, createBrand, updateBrand, type ActionState, type BrandField } from "@/modules/brands/actions";
import { normalizeBrandKey, normalizeDomain, normalizePublishingPath } from "@/modules/brands/normalization";
import type { BrandSummary } from "@/modules/brands/queries";

const initial: ActionState = { ok: false, message: "" };

function FieldError({ state, name }: { state: ActionState; name: BrandField }) {
  const message = state.fieldErrors?.[name]?.[0];
  return message ? <span className="field-error" id={`${name}-error`}>{message}</span> : null;
}

function Feedback({ state }: { state: ActionState }) {
  return state.message ? <p className={state.ok ? "form-success" : "form-error"} role={state.ok ? "status" : "alert"}>{state.message}</p> : null;
}

export function BrandCreateDialog({ organizationId, advertisers }: { organizationId: string; advertisers: { id: string; name: string }[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(createBrand, initial);
  const [name, setName] = useState("");
  const [brandKey, setBrandKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [advertiserOrganizationId, setAdvertiserOrganizationId] = useState("");

  useEffect(() => {
    if (!state.ok || !state.createdBrandId) return;
    const card = document.querySelector(`[data-brand-id="${state.createdBrandId}"]`);
    card?.classList.add("is-highlighted");
    card?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state]);

  const close = () => { dialog.current?.close(); trigger.current?.focus(); };
  const reset = () => { form.current?.reset(); setName(""); setBrandKey(""); setKeyTouched(false); setAdvertiserOrganizationId(""); };
  return <>
    <button ref={trigger} className="primary-button page-action" type="button" onClick={() => dialog.current?.showModal()}><Icon name="plus" />새 브랜드 추가</button>
    <dialog ref={dialog} className="brand-dialog" aria-labelledby="brand-dialog-title" onClose={() => trigger.current?.focus()}>
      <div className="dialog-heading"><div><p className="eyebrow">NEW BRAND</p><h2 id="brand-dialog-title">새 브랜드 추가</h2><p>연결 정보와 기본 발행 경로를 설정합니다.</p></div><button className="icon-button" type="button" aria-label="닫기" onClick={close}><Icon name="close" /></button></div>
      <form ref={form} action={action} className="management-form brand-create-form">
        <input type="hidden" name="organizationId" value={organizationId} />
        <label>브랜드명<input name="name" value={name} aria-invalid={Boolean(state.fieldErrors?.name)} aria-describedby="name-error" placeholder="Virtual Orbit" required minLength={2} onChange={(event) => { const value = event.target.value; setName(value); if (!keyTouched) setBrandKey(normalizeBrandKey(value)); }} /><FieldError state={state} name="name" /></label>
        <label>브랜드 키<input name="brandKey" value={brandKey} aria-invalid={Boolean(state.fieldErrors?.brandKey)} aria-describedby="brand-key-help brandKey-error" placeholder="virtual-orbit" required onChange={(event) => { setKeyTouched(true); setBrandKey(normalizeBrandKey(event.target.value)); }} /><span className="field-help" id="brand-key-help">영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.</span><FieldError state={state} name="brandKey" /></label>
        <label>연결 도메인<input name="domain" aria-invalid={Boolean(state.fieldErrors?.domain)} aria-describedby="domain-help domain-error" placeholder="orbit.example.com" required onBlur={(event) => { event.currentTarget.value = normalizeDomain(event.currentTarget.value); }} /><span className="field-help" id="domain-help">프로토콜과 경로는 자동으로 제거됩니다.</span><FieldError state={state} name="domain" /></label>
        <label>기본 발행 경로<input name="publishingPath" defaultValue="/blog" aria-invalid={Boolean(state.fieldErrors?.publishingPath)} aria-describedby="publishingPath-error" required onBlur={(event) => { event.currentTarget.value = normalizePublishingPath(event.currentTarget.value); }} /><FieldError state={state} name="publishingPath" /></label>
        <label>광고주 조직<select name="advertiserOrganizationId" value={advertiserOrganizationId} onChange={(event) => setAdvertiserOrganizationId(event.target.value)} aria-invalid={Boolean(state.fieldErrors?.advertiserOrganizationId)} aria-describedby="advertiserOrganizationId-error" required><option value="">광고주 조직 선택</option>{advertisers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><FieldError state={state} name="advertiserOrganizationId" /></label>
        {advertisers.length === 0 && <p className="helper">연결 가능한 광고주 조직이 필요합니다. 신규 초대는 후속 범위입니다.</p>}
        <Feedback state={state} />
        <div className="dialog-actions"><button className="secondary-button" type="button" disabled={pending} onClick={() => { reset(); close(); }}>취소</button><button className="ghost-button" type="button" disabled={pending} onClick={reset}>입력 초기화</button><button className="primary-button" disabled={pending || advertisers.length === 0}>{pending ? <><span className="spinner" />생성 중…</> : "브랜드 생성"}</button></div>
      </form>
    </dialog>
  </>;
}

export function BrandEditForm({ brand, organizationId }: { brand: BrandSummary; organizationId: string }) {
  const [updateState, updateAction, updating] = useActionState(updateBrand, initial);
  const [archiveState, archiveAction, archiving] = useActionState(archiveBrand, initial);
  return <div className="edit-stack"><form action={updateAction} className="inline-edit-form">
    <input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="brandId" value={brand.id} />
    <label>브랜드명<input name="name" defaultValue={brand.name} required /><FieldError state={updateState} name="name" /></label>
    <label>연결 도메인<input name="domain" defaultValue={brand.domain} required onBlur={(event) => { event.currentTarget.value = normalizeDomain(event.currentTarget.value); }} /><FieldError state={updateState} name="domain" /></label>
    <label>발행 경로<input name="publishingPath" defaultValue={brand.publishing_path} required onBlur={(event) => { event.currentTarget.value = normalizePublishingPath(event.currentTarget.value); }} /><FieldError state={updateState} name="publishingPath" /></label>
    <button className="primary-button" disabled={updating}>{updating ? "저장 중…" : "변경사항 저장"}</button><Feedback state={updateState} />
  </form><form action={archiveAction} className="archive-form"><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="brandId" value={brand.id} /><div><strong>브랜드 보관</strong><p>일반 목록과 편집 대상에서 제외됩니다.</p></div><button className="danger-button" disabled={archiving}>{archiving ? "보관 중…" : "브랜드 보관"}</button><Feedback state={archiveState} /></form></div>;
}
