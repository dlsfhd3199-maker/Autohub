export const nextRevision = (revision: number) => revision + 1;
export const nextVersionNumber = (versions: readonly number[]) => Math.max(0, ...versions) + 1;
export function canAutosaveVersion(input: { isWorkingDraft: boolean; status: string }) { return input.isWorkingDraft && input.status !== "approved"; }
