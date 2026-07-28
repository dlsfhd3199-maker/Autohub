# 체크포인트 3 아키텍처

## 요청 경계

1. 서버 컴포넌트와 서버 액션이 Supabase Auth 세션을 확인한다.
2. 목록 조회는 사용자 토큰으로 실행되어 PostgreSQL RLS가 브랜드 범위를 제한한다.
3. 상세·변경 요청은 `requireBrandPermission` 또는 `requireOrganizationAdmin`으로 명시적 권한을 확인한다.
4. SQL RLS와 배정 검증 트리거가 우회 요청 및 교차 조직 연결을 다시 차단한다.

일반 애플리케이션 코드에는 service-role 클라이언트가 없다. Playwright의 로컬 픽스처 준비만 별도 프로세스에서 CLI가 제공하는 로컬 관리 키를 사용한다.

## 모듈 경계

- `modules/brands`: 입력 검증, 브랜드 조회, 생성·수정·보관
- `modules/people`: 조직 구성원 조회, 브랜드 배정·해제
- `modules/content`: 검색 조건 정규화, 필터, 서버 페이지네이션
- `modules/authorization`: 세션 기반 조직·브랜드 권한 확인

## 후속 초대 인터페이스

후속 단계에서는 초대 레코드가 `agency_organization_id`, 대상 이메일, 요청 역할, 만료 시각과 상태를 보유해야 한다. 수락 시 서버가 초대 토큰과 로그인 사용자를 검증한 뒤 조직 멤버십을 생성한다. 최초 광고주 연결을 안전하게 지원하려면 대행사와 광고주 조직 간 명시적 관계 테이블도 함께 도입한다.
