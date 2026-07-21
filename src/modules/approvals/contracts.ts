export type ApprovalDecision = "approved" | "rejected" | "needs_revision";

export type ApprovalRecord = {
  versionId: string;
  actorId: string;
  decision: ApprovalDecision;
  comment?: string;
  decidedAt: string;
};

// Checkpoint 2 defines only the boundary. Approval commands and UI are excluded.
export interface ApprovalRepository {
  findByVersion(versionId: string): Promise<readonly ApprovalRecord[]>;
}
