import { signOut } from "@/modules/auth/actions";
import { requireAuthenticatedUser } from "@/modules/auth/session";

export default async function WorkspacePage() {
  await requireAuthenticatedUser();

  return (
    <main className="protected-page">
      <p className="eyebrow">PROTECTED WORKSPACE</p>
      <h1>인증된 워크스페이스</h1>
      <p>조직과 브랜드 범위는 체크포인트 2의 RLS 정책으로 제한됩니다.</p>
      <form action={signOut}><button type="submit">로그아웃</button></form>
    </main>
  );
}
