# 체크포인트 7 로컬 테스트 발행 PoC

## 구성

- Content Hub: `http://127.0.0.1:3000`
- 독립 테스트 자사몰: `http://127.0.0.1:3100/blog`
- 자사몰은 브라우저가 아닌 Next.js 서버에서 Content Hub 발행 API를 호출한다.
- Bearer 원문은 생성 직후 관리자에게 한 번만 표시되며 DB에는 SHA-256 해시만 저장된다.
- 일반 요청에 service role을 사용하지 않는다. 익명 발행 API는 브랜드 키와 Bearer 해시를 함께 검증하는 제한된 PostgreSQL 함수만 실행한다.

## 로컬 실행

1. `pnpm db:start`
2. `pnpm db:reset`
3. `pnpm dev`
4. 관리자 계정으로 브랜드 상세에서 테스트 발행 연결 키를 생성한다.
5. 원문 키를 로컬 `.env.local`의 `CONTENT_HUB_PUBLISHING_KEY`에 입력한다.
6. 같은 파일에 `CONTENT_HUB_BRAND_KEY=virtual-lumi`를 설정한다.
7. 별도 터미널에서 `pnpm dev:store`를 실행한다.

키는 Git, 문서, seed, 브라우저 번들에 저장하지 않는다. 자동 E2E는 실행할 때마다 메모리에서 임시 키를 생성하므로 고정 키나 비밀번호에 의존하지 않는다.

## 발행 규칙

- 대행사 관리자만 테스트 발행할 수 있다.
- working draft는 발행할 수 없다.
- 명시적 버전 생성으로 확정된 불변 버전만 `published_version_id`가 가리킬 수 있다.
- 새 버전 테스트 발행은 포인터를 바꾸며 이전 버전을 수정하지 않는다.
- 발행 API는 포인터가 가리키는 버전만 반환하고 현재 working draft는 반환하지 않는다.
- 연결 비활성화 또는 잘못된 브랜드/키 조합은 콘텐츠 존재 여부를 노출하지 않는 인증 오류로 처리한다.

## 자사몰 출력

`/blog`, `/blog/[slug]`, SSR HTML, canonical, sitemap, robots, Article·BreadcrumbList JSON-LD를 제공한다. FAQPage JSON-LD는 실제 FAQ 블록이 화면에 렌더링될 때만 생성한다. API 조회는 캐시하지 않아 수동 새로고침으로 즉시 새 포인터를 반영하며, 발행 API 자체는 ETag와 Last-Modified를 제공한다.

이 화면과 데이터는 모두 로컬 PoC 전용이며 실제 승인, 운영 발행, 고객사 연결을 의미하지 않는다.
