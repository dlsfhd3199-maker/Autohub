"use client";

import { useActionState } from "react";
import { assignPerson, unassignPerson } from "@/modules/people/actions";
import type { ActionState } from "@/modules/brands/actions";

const initial: ActionState = { ok: false, message: "" };
export function AssignmentForm({ organizationId, brandId, people }: { organizationId: string; brandId: string; people: { userId: string; name: string; role: "ae" | "advertiser" }[] }) {
  const [state, action, pending] = useActionState(assignPerson, initial);
  return <form action={action} className="management-form compact-form"><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="brandId" value={brandId} />
    <label>담당자<select name="selection" required><option value="">선택</option>{people.map((person) => <option key={`${person.userId}-${person.role}`} value={`${person.userId}:${person.role}`}>{person.name} · {person.role === "ae" ? "AE" : "광고주"}</option>)}</select></label>
    <button disabled={pending}>배정</button>{state.message && <p className={state.ok ? "form-success" : "form-error"}>{state.message}</p>}
  </form>;
}

export function UnassignButton({ organizationId, brandId, userId, role }: { organizationId: string; brandId: string; userId: string; role: "ae" | "advertiser" }) {
  const [state, action, pending] = useActionState(unassignPerson, initial);
  return <form action={action}><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="brandId" value={brandId} /><input type="hidden" name="userId" value={userId} /><input type="hidden" name="role" value={role} /><button className="table-button" disabled={pending}>해제</button>{!state.ok && state.message && <span className="sr-only">{state.message}</span>}</form>;
}
