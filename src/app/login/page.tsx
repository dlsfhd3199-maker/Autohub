import { signIn } from "@/modules/auth/actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true">A</div>
        <p className="eyebrow">AEO CONTENT HUB</p>
        <h1 id="login-title">워크스페이스 로그인</h1>
        <p>등록된 대행사 또는 광고주 계정으로 로그인하세요.</p>
        {error ? <p className="form-error" role="alert">로그인 정보를 확인해 주세요.</p> : null}
        <form action={signIn}>
          <label htmlFor="email">이메일</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
          <label htmlFor="password">비밀번호</label>
          <input id="password" name="password" type="password" autoComplete="current-password" minLength={8} required />
          <button type="submit">로그인</button>
        </form>
      </section>
    </main>
  );
}
