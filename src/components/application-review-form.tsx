"use client";

import { useActionState } from "react";
import { reviewApplication, type UserActionState } from "@/modules/users/actions";

const initial: UserActionState = { ok: false, message: "" };

export function ApplicationReviewForm({ applicationId, brands }: { applicationId: string; brands: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(reviewApplication, initial);
  return <form action={action} className="application-review-form">
    <input type="hidden" name="applicationId" value={applicationId} />
    <label className="field"><span>담당 브랜드</span><select name="brandId" required><option value="">배정할 브랜드 선택</option>{brands.map((brand) => <option value={brand.id} key={brand.id}>{brand.name}</option>)}</select></label>
    <label className="field"><span>안전한 처리 사유</span><input name="reason" maxLength={500} placeholder="개인정보를 포함하지 마세요" /></label>
    <div className="form-actions"><button className="primary-button" name="decision" value="approved" disabled={pending}>{pending ? "처리 중…" : "승인"}</button><button className="danger-button" name="decision" value="rejected" disabled={pending}>거절</button></div>
    {state.message ? <p className={state.ok ? "success-message" : "form-error"} role="status">{state.message}</p> : null}
  </form>;
}
