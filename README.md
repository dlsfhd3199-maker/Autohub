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

## 체크포인트 3: 브랜드 운영

`/workspace/brands`, `/workspace/people`, `/workspace/content`는 로그인 세션과 PostgreSQL RLS를 기본 경계로 사용합니다. 상세 조회와 변경은 서버의 `requireBrandPermission` 또는 `requireOrganizationAdmin`을 추가로 통과해야 합니다. 클라이언트가 제출한 조직·브랜드 ID는 현재 세션의 멤버십 및 DB 정책으로 다시 검증합니다.

브랜드 삭제는 제공하지 않습니다. 관리자가 보관하면 `archived_at`이 기록되고 일반 브랜드·콘텐츠 목록에서 제외됩니다. 신규 이메일 초대와 조직 멤버십 제거 기능은 아직 제공하지 않으므로 마지막 관리자 제거도 애플리케이션 요청으로 수행할 수 없습니다.

로컬 E2E 테스트는 실행 중인 Supabase CLI에서 테스트용 키를 메모리로 읽어 명백한 가상 계정과 픽스처를 준비합니다. 이 관리 키는 Next.js 서버 환경, `.env` 파일, 일반 사용자 요청 또는 Git에 전달하지 않습니다.

```bash
pnpm db:start
pnpm db:reset
pnpm db:test
pnpm test:e2e
pnpm db:stop
```

현재 모델에서는 새 브랜드를 기존에 대행사와 연결된 광고주 조직에만 생성할 수 있습니다. 최초 광고주 조직 연결 및 이메일 초대는 후속 초대 모듈에서 명시적인 대행사-광고주 관계와 함께 구현합니다.

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
