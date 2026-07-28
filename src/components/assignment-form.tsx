"use client";

import { useActionState } from "react";
import { Icon } from "@/components/icons";
import { assignPerson, unassignPerson } from "@/modules/people/actions";
import type { ActionState } from "@/modules/brands/actions";

const initial: ActionState = { ok: false, message: "" };
export function AssignmentForm({ organizationId, brandId, people }: { organizationId: string; brandId: string; people: { userId: string; name: string; role: "ae" | "advertiser" }[] }) {
  const [state, action, pending] = useActionState(assignPerson, initial);
  return <form action={action} className="assignment-form"><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="brandId" value={brandId} />
    <label>미배정 구성원<select name="selection" required disabled={pending || people.length === 0}><option value="">담당자 선택</option>{people.map((person) => <option key={`${person.userId}-${person.role}`} value={`${person.userId}:${person.role}`}>{person.name} · {person.role === "ae" ? "AE" : "광고주"}</option>)}</select></label>
    <button className="primary-button" disabled={pending || people.length === 0}><Icon name="plus" />{pending ? "배정 중…" : "브랜드에 배정"}</button>{people.length === 0 && <p className="field-help">배정 가능한 구성원이 모두 배정되었습니다.</p>}{state.message && <p className={state.ok ? "form-success" : "form-error"} role={state.ok ? "status" : "alert"}>{state.message}</p>}
  </form>;
}

export function UnassignButton({ organizationId, brandId, userId, role, personName }: { organizationId: string; brandId: string; userId: string; role: "ae" | "advertiser"; personName: string }) {
  const [state, action, pending] = useActionState(unassignPerson, initial);
  return <form action={action} className="unassign-form"><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="brandId" value={brandId} /><input type="hidden" name="userId" value={userId} /><input type="hidden" name="role" value={role} /><button className="table-button danger-text" aria-label={`${personName} 배정 해제`} disabled={pending}>{pending ? "해제 중…" : "배정 해제"}</button>{state.message && <span className={state.ok ? "inline-success" : "field-error"} role="status">{state.message}</span>}</form>;
}
