import { randomUUID } from "node:crypto";
import Link from "next/link";
import { ContentHubError } from "../lib/content-hub";

const messages = {
  not_configured: "로컬 발행 연결 설정이 완료되지 않았습니다.", unauthorized: "테스트 발행 인증 정보를 확인해 주세요.",
  forbidden: "테스트 발행 연결이 비활성화되어 있습니다.", not_found: "요청한 테스트 발행 콘텐츠를 찾을 수 없습니다.",
  timeout: "Content Hub 응답 시간이 5초를 초과했습니다.", unavailable: "로컬 Content Hub에 연결할 수 없습니다.", invalid_response: "Content Hub 응답 형식을 확인해 주세요.",
} as const;

export function ContentHubFailure({ error }: { error: unknown }) {
  const requestId = randomUUID();
  const code = error instanceof ContentHubError ? error.code : "unavailable";
  return <main><div className="error-state" role="alert"><span>연결 확인 필요</span><h1>콘텐츠를 불러오지 못했습니다</h1><p>로컬 발행 연결 상태를 확인해 주세요. {messages[code]}</p><p><small>요청 ID: {requestId}</small></p><Link className="retry-link" href="/blog">다시 시도</Link></div></main>;
}
