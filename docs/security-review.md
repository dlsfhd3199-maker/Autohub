# 체크포인트 5 보안·성능 검토

## 결론과 수정 사항

인증 세션, 서버 권한 검사, RLS의 3중 경계를 유지한다. 일반 요청은 publishable key만 사용하고 service role은 로컬 E2E fixture에만 격리한다.

- Draft Route에 UUID, JSON Content-Type, 동일 출처, 실제 바이트 크기, 인증 검증 추가
- 로그인·워크스페이스·API에 `no-store` 적용
- CSP, nosniff, referrer, permissions, frame 차단 헤더 적용
- 보관 브랜드 콘텐츠의 RLS 읽기·편집 차단
- 트리거 함수의 PUBLIC 실행 권한 회수
- Windows Playwright의 `shell: true` 제거
- 전역 키보드 포커스, 360px 레이아웃, reduced-motion 보완
- 자동 비밀정보·비-example 이메일 검사와 의존성 감사 추가

## 잔여 위험

- 중간: Next.js hydration 때문에 production CSP에 `script-src 'unsafe-inline'`이 필요하다. `unsafe-eval`은 개발 환경에만 허용한다. nonce 기반 CSP는 배포 프록시 결정 후 검토한다.
- 중간: 이메일 초대, MFA, 세션 수명·강제 로그아웃은 원격 Auth 결정 후 설정한다.
- 낮음: 비교는 문장 단위가 아닌 블록 단위다.
- 낮음: 500KB/100블록 제한은 있지만 장기 버전 보존 정책은 미정이다.
- 낮음: 전체 개발 의존성 감사에는 ESLint가 사용하는 `minimatch@3`의 `brace-expansion@1.1.16` DoS 경고가 남는다. 호환되는 1.x 패치가 없어 전역 강제 치환 시 ESLint가 깨지는 것을 확인했다. 운영 의존성 감사는 별도 명령으로 0건을 요구하고, 개발 도구 경고는 upstream 패치가 나오면 갱신한다.

## 성능 재현 기준

Vitest에서 40개 문단과 약 440KB JSON을 생성해 Zod 검증이 개발 장비에서 250ms 이내인지 확인한다. E2E는 연속 편집 후 5초 자동 저장, 저장 중 변경, 새로고침 복원, 두 탭 revision 충돌을 검증한다. 목록은 페이지 최대 50개, 검색어 100자로 제한한다.

운영 부하, 네트워크 지연, 장기 이력 수에 대한 부하 테스트는 배포 환경 결정 후 필요하다.
