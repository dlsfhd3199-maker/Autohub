export const contentStatusLabel: Record<string, string> = {
  draft: "초안",
  review_requested: "내부 검수 요청",
  client_review: "광고주 검토",
  approved: "승인 완료",
  scheduled: "발행 예약",
  published: "발행 완료",
  needs_update: "수정 필요",
  archived: "보관",
};

export const formatKoreanDate = (value: string) => new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
