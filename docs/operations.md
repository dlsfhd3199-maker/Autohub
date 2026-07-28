# AEO Content Hub 로컬 운영 가이드

## 요구 환경과 실행

- Node.js 24.x, pnpm 11.9.0
- Docker Desktop Linux Engine와 Windows 사용 시 WSL 2
- 저장소에 고정된 Supabase CLI 2.109.1

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
pnpm db:start
pnpm db:reset
pnpm dev
```

`.env.local`에는 로컬 `supabase status -o env`의 API URL과 publishable key를 설정한다. service role과 secret key는 일반 애플리케이션에 설정하지 않는다. E2E는 service role을 fixture 프로세스 메모리로만 전달하며 Next.js 서버에는 전달하지 않는다.

## 환경변수

| 이름 | 용도 | 브라우저 노출 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL | 예 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 공개 클라이언트 키 | 예 |
| `NEXT_PUBLIC_APP_URL` | 인증 콜백 기준 URL | 예 |
| `DATABASE_URL` | 관리용 마이그레이션 연결 초안 | 아니오 |
| `TEST_DATABASE_URL` | 격리 통합 테스트 DB 초안 | 아니오 |

## DB와 테스트

```powershell
pnpm db:reset
pnpm db:test
pnpm db:lint
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm test:e2e
pnpm test:a11y
pnpm security:scan
pnpm security:audit
pnpm security:audit:all  # 개발 도구의 알려진 미패치 경고까지 확인
pnpm db:stop
```

테스트는 `example.com`과 Virtual 가상 조직만 사용한다. E2E 계정은 `tests/e2e/global-setup.ts`가 로컬 Auth에 매 실행 생성·갱신한다.

## 역할과 격리

| 역할 | 브랜드 관리 | 배정 | 콘텐츠 | 버전 |
| --- | --- | --- | --- | --- |
| 대행사 관리자 | 소속 조직 생성·수정·보관 | 가능 | 활성 브랜드 편집 | 읽기·생성·복원 |
| AE | 배정 브랜드 읽기 | 불가 | 배정 활성 브랜드 편집 | 읽기·생성·복원 |
| 광고주 | 배정 브랜드 읽기 | 불가 | 읽기 전용 | 읽기 전용 |
| 비로그인 | 불가 | 불가 | 불가 | 불가 |

Next.js 세션과 서버 권한 함수가 1차 경계이고 PostgreSQL RLS가 최종 경계다. 복합 FK가 교차 브랜드 연결을 차단한다. 보관 브랜드는 직접 ID 접근을 포함해 콘텐츠 읽기·편집에서 제외된다.

## 자동 저장과 버전

변경 후 5초에 working draft를 저장한다. 마지막 `revision`과 일치할 때만 갱신하며 불일치는 409로 반환한다. UI에서 서버 최신본 불러오기, 내 편집본 유지, JSON 복사를 선택한다. 저장 오류에도 브라우저 편집 상태는 유지된다.

명시적 버전 생성은 working draft를 불변 스냅샷으로 확정하고 새 draft를 만든다. 승인·확정 스냅샷은 트리거가 UPDATE·DELETE를 차단하며 이전 버전 복원도 새 draft를 생성한다.

## 문제 해결

- Docker 실패: Linux Engine과 `docker info` Server 출력을 확인한다.
- WSL 오류: `wsl --status`, `wsl --version`, `wsl -l -v`를 확인한다.
- E2E 로그인 실패: 기존 3000 포트 서버를 종료하고 로컬 Supabase를 재시작한다.
- OneDrive 링크 오류: README의 copy 방식 pnpm 설치 옵션을 사용한다.
- `db:reset`은 운영 DB가 아닌 로컬에서만 사용한다.

## 백업·복구 초안과 운영 전 결정

운영 전 Supabase PITR 또는 정기 `pg_dump` 주기, 보존 기간, 암호화 저장소, RPO/RTO와 복구 책임자를 정한다. 격리 DB 복원 후 조직·브랜드 FK, RLS, 최신 draft 연결과 감사 로그를 검증한다. 로컬 Docker 볼륨은 운영 백업이 아니다.

원격 Supabase/Vercel 리전, 운영 도메인·HTTPS/HSTS, Auth 초대·MFA·세션 정책, 감사 로그 보존, 오류 모니터링, 테스트 자사몰은 아직 미결정이다.
