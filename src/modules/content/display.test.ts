import { describe, expect, it } from "vitest";
import { contentStatusLabel } from "./display";

describe("content status display labels", () => {
  it("keeps internal values separate from Korean labels", () => {
    expect(contentStatusLabel.draft).toBe("초안");
    expect(contentStatusLabel.review_requested).toBe("내부 검수 요청");
    expect(contentStatusLabel.client_review).toBe("광고주 검토");
    expect(contentStatusLabel.approved).toBe("승인 완료");
    expect(contentStatusLabel.published).toBe("발행 완료");
    expect(contentStatusLabel.needs_update).toBe("수정 필요");
  });
});
