"use client";

import { useActionState } from "react";
import { archiveBrand, createBrand, updateBrand, type ActionState } from "@/modules/brands/actions";
import type { BrandSummary } from "@/modules/brands/queries";

const initial: ActionState = { ok: false, message: "" };
function Feedback({ state }: { state: ActionState }) { return state.message ? <p className={state.ok ? "form-success" : "form-error"}>{state.message}</p> : null; }

export function BrandCreateForm({ organizationId, advertisers }: { organizationId: string; advertisers: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createBrand, initial);
  return <form action={action} className="management-form">
    <input type="hidden" name="organizationId" value={organizationId} />
    <label>브랜드명<input name="name" placeholder="Virtual Lumi" required minLength={2} /></label>
    <label>브랜드 키<input name="brandKey" placeholder="virtual-lumi" required pattern="[a-z0-9][a-z0-9-]+" /></label>
    <label>가상 도메인<input name="domain" placeholder="virtual-lumi.example.com" required /></label>
    <label>기본 발행 경로<input name="publishingPath" defaultValue="/blog" required /></label>
    <label>광고주 조직<select name="advertiserOrganizationId" required><option value="">선택</option>{advertisers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <button disabled={pending || advertisers.length === 0}>{pending ? "저장 중…" : "브랜드 생성"}</button>
    {advertisers.length === 0 && <p className="helper">기존에 연결된 가상 광고주 조직이 필요합니다. 신규 초대는 후속 범위입니다.</p>}
    <Feedback state={state} />
  </form>;
}

export function BrandEditForm({ brand, organizationId }: { brand: BrandSummary; organizationId: string }) {
  const [updateState, updateAction, updating] = useActionState(updateBrand, initial);
  const [archiveState, archiveAction, archiving] = useActionState(archiveBrand, initial);
  return <div className="edit-stack"><form action={updateAction} className="inline-edit-form">
    <input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="brandId" value={brand.id} />
    <label>브랜드명<input name="name" defaultValue={brand.name} required /></label>
    <label>가상 도메인<input name="domain" defaultValue={brand.domain} required /></label>
    <label>발행 경로<input name="publishingPath" defaultValue={brand.publishing_path} required /></label>
    <button disabled={updating}>수정 저장</button><Feedback state={updateState} />
  </form><form action={archiveAction}><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="brandId" value={brand.id} /><button className="danger-button" disabled={archiving}>브랜드 보관</button><Feedback state={archiveState} /></form></div>;
}
