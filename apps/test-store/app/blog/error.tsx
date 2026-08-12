"use client";
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) { return <main><div className="error-state" role="alert"><span>연결 확인 필요</span><h1>테스트 발행 콘텐츠를 불러오지 못했습니다</h1><p>Content Hub가 실행 중인지, 테스트 발행 연결이 활성 상태인지 확인해 주세요. 서버 전용 Bearer 키는 브라우저에 표시되지 않습니다.</p><button onClick={reset}>다시 시도</button></div></main>; }
