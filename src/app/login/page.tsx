import { Icon } from "@/components/icons";
import { signIn } from "@/modules/auth/actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="auth-page"><section className="auth-brand-panel" aria-label="AEO Content Hub 소개"><div className="brand-lockup auth-lockup"><span className="brand-mark">A</span><span><strong>AEO Content Hub</strong><small>대행사 콘텐츠 운영 플랫폼</small></span></div><div><p className="eyebrow">AGENCY CONTENT OPERATIONS</p><h2>브랜드와 콘텐츠 운영을<br />하나의 워크스페이스에서</h2><p>역할별 접근 제어와 구조화된 콘텐츠 버전 관리를 안전하게 제공합니다.</p></div><ul><li><Icon name="brand" />브랜드별 데이터 격리</li><li><Icon name="people" />역할과 담당자 관리</li><li><Icon name="history" />자동 저장과 버전 이력</li></ul></section><section className="auth-form-panel"><div className="auth-card" aria-labelledby="login-title"><p className="eyebrow">WELCOME BACK</p><h1 id="login-title">워크스페이스 로그인</h1><p>등록된 대행사 또는 광고주 계정으로 로그인하세요.</p>{error ? <p className="form-error" role="alert">이메일 또는 비밀번호를 확인해 주세요.</p> : null}<form action={signIn}><label htmlFor="email">이메일</label><input id="email" name="email" type="email" autoComplete="email" placeholder="name@example.com" required /><label htmlFor="password">비밀번호</label><input id="password" name="password" type="password" autoComplete="current-password" minLength={8} required /><button className="primary-button" type="submit">로그인</button></form><p className="auth-help">계정 초대와 비밀번호 재설정은 운영 환경 연결 후 제공됩니다.</p></div></section></main>;
}
