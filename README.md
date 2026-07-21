# AEO Content Hub

대행사와 광고주가 브랜드별 AEO/GEO 콘텐츠를 안전하게 운영하기 위한 멀티테넌트 콘텐츠 허브입니다.

현재 저장소는 Next.js App Router, TypeScript, Tailwind CSS와 pnpm 기반으로 초기화되어 있습니다. 기능 개발은 `codex/phase-1-foundation` 브랜치에서 진행합니다.

## 로컬 실행

Node.js 24와 pnpm 11을 준비한 뒤 실행합니다.

```bash
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

## 환경변수

`.env.example`에는 변수 이름과 설명만 있습니다. 실제 값은 `.env.local`에만 저장하고 Git에 커밋하지 않습니다.

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: 브라우저 공개용 publishable key
- `NEXT_PUBLIC_APP_URL`: 인증 리디렉션용 애플리케이션 주소
- `DATABASE_URL`: 마이그레이션용 PostgreSQL 연결
- `TEST_DATABASE_URL`: 격리된 통합 테스트 DB 연결

`SUPABASE_SERVICE_ROLE_KEY`는 일반 요청에 사용하지 않으며 현재 환경변수 목록에도 포함하지 않습니다.

## 검증 명령

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Playwright 브라우저가 없다면 최초 1회 `pnpm exec playwright install chromium`이 필요합니다.

## OneDrive 설치 참고

OneDrive 동기화 폴더에서 pnpm 링크 생성 오류가 발생하면 다음 복사 모드를 사용합니다.

```bash
pnpm install --package-import-method=copy --virtual-store-dir=.pnpm-virtual
```

외부 Supabase 또는 Vercel 프로젝트는 아직 연결하지 않습니다.

## 로컬 Supabase

체크포인트 2부터 PostgreSQL 스키마와 RLS 정책은 `supabase/migrations`에서 관리합니다. Docker Desktop이 실행 중인 환경에서 다음 명령을 사용합니다.

```bash
pnpm db:start
pnpm db:reset
pnpm db:test
pnpm db:lint
```

`db:reset`은 로컬 Supabase 데이터베이스만 초기화합니다. 원격 프로젝트에는 적용하지 않습니다.

현재 인증 환경변수는 Supabase 공식 publishable key 형식을 사용합니다. `SUPABASE_SERVICE_ROLE_KEY`와 secret key는 일반 애플리케이션 요청에 사용하지 않습니다.
