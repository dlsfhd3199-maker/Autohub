# 체크포인트 2: 데이터·인증·권한 구조

## 인증 경계

- Supabase Auth와 `@supabase/ssr` 쿠키 세션을 사용한다.
- `/workspace` 요청은 Next.js proxy와 서버 페이지에서 각각 세션을 검증한다.
- 보호 작업은 `requireAuthenticatedUser`를 통과해야 한다.
- 브랜드 작업은 `requireBrandPermission`으로 서버 권한을 확인한 뒤 실행한다.
- 일반 요청에는 publishable key와 사용자 JWT만 사용한다.

## 데이터 경계

- 조직은 대행사와 광고주로 구분한다.
- 대행사 관리자 권한은 조직 소속으로 판정한다.
- AE와 광고주 담당자의 브랜드 접근은 `brand_assignments`로 제한한다.
- 브랜드 종속 엔터티는 `brand_id`를 필수로 저장한다.
- 콘텐츠 버전은 `(brand_id, content_id)` 복합 외래키로 다른 브랜드 콘텐츠에 연결될 수 없다.

## 방어 계층

1. Next.js 서버에서 인증과 브랜드 권한을 확인한다.
2. PostgreSQL RLS가 모든 조회와 변경에 브랜드 범위를 적용한다.
3. 승인된 콘텐츠 버전은 DB 트리거가 UPDATE와 DELETE를 거부한다.
4. 브랜드·배정·콘텐츠·버전 변경은 감사 로그로 남긴다.

## 로컬 검증

`supabase/tests/phase_1_rls.test.sql`은 가상 조직, 가상 담당자와 `example.com` 이메일·도메인만 사용한다. AE 미배정 브랜드 차단, 광고주 타 브랜드 차단, 승인 버전 불변성과 draft 수정 가능 여부를 검사한다.

DB 테스트 실행에는 Docker Desktop과 로컬 Supabase가 필요하다. 원격 Supabase 프로젝트는 사용하지 않는다.
