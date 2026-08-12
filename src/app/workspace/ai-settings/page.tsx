import Link from "next/link";
import { Icon } from "@/components/icons";
import { listGenerationProviders } from "@/modules/ai-generation/provider";
import { readOpenAiEnvironment } from "@/modules/ai-generation/config";
import { getWorkspaceContext } from "@/modules/auth/workspace";
import { listAccessibleBrands } from "@/modules/brands/queries";
import { createClient } from "@/lib/supabase/server";

export default async function AiSettingsPage() {
  const context = await getWorkspaceContext();
  if (context.role !== "agency_admin") return <main className="workspace-content"><section className="state-card"><Icon name="warning" /><h1>시스템 AI 공급자 설정 권한이 없습니다</h1><p>마케터는 배정 브랜드에서 콘텐츠 생성을 실행할 수 있지만 API 연결·모델·비용 정책은 볼 수 없습니다.</p><Link className="secondary-button" href="/workspace/brands">담당 브랜드 보기</Link></section></main>;
  const [brands, environment] = await Promise.all([listAccessibleBrands(), Promise.resolve(readOpenAiEnvironment())]);
  const supabase = await createClient();
  const { data: jobs } = await supabase.from("generation_jobs").select("actual_cost_usd,created_at");
  const totalCost = (jobs ?? []).reduce((sum, job) => sum + Number(job.actual_cost_usd ?? 0), 0);
  const openAi = listGenerationProviders().find((provider) => provider.id === "openai");
  return <main className="workspace-content">
    <section className="page-heading"><div><p className="eyebrow">SYSTEM AI PROVIDERS</p><h1>AI 공급자 설정</h1><p>키 원문 없이 서버 환경의 안전한 연결 상태와 사용 한도만 표시합니다. 이 화면에서는 설정을 변경할 수 없습니다.</p></div></section>
    <section className="metrics-grid"><article className="metric-card"><span>OpenAI 연결</span><strong>{openAi?.status.configured ? "환경 구성됨" : "키 미설정"}</strong></article><article className="metric-card"><span>네트워크 호출</span><strong>{environment.networkEnabled ? "명시적 허용" : "비활성"}</strong></article><article className="metric-card"><span>누적 생성 작업</span><strong>{jobs?.length ?? 0}건</strong></article><article className="metric-card"><span>누적 기록 비용</span><strong>${totalCost.toFixed(2)}</strong></article></section>
    <div className="connector-grid">{listGenerationProviders().map((provider) => <article className="connector-card panel" key={provider.id}><header><Icon name="ai" /><div><h2>{provider.label}</h2><span className={`status-badge ${provider.status.enabled ? "status-active" : "status-archived"}`}>{provider.status.enabled ? "사용 가능" : "비활성"}</span></div></header><p>{provider.description}</p><dl><div><dt>구성</dt><dd>{provider.status.configured ? "구성됨" : "구성 안 됨"}</dd></div><div><dt>외부 네트워크</dt><dd>{provider.status.networkAllowed ? "명시적 허용" : "차단"}</dd></div><div><dt>상태 코드</dt><dd>{provider.status.safeCode}</dd></div></dl></article>)}</div>
    <section className="panel section-panel"><h2>허용 모델과 비용 정책</h2><dl className="detail-list"><div><dt>허용 모델</dt><dd>{environment.OPENAI_MODEL}</dd></div><div><dt>안전 상태</dt><dd>{openAi?.status.safeCode ?? "NOT_CONFIGURED"}</dd></div><div><dt>일일 생성 한도</dt><dd>{environment.OPENAI_DAILY_JOB_LIMIT}건</dd></div><div><dt>건당 입력 토큰</dt><dd>{environment.OPENAI_MAX_INPUT_TOKENS_PER_JOB.toLocaleString()}</dd></div><div><dt>건당 출력 토큰</dt><dd>{environment.OPENAI_MAX_OUTPUT_TOKENS_PER_JOB.toLocaleString()}</dd></div><div><dt>건당 비용 상한</dt><dd>${environment.OPENAI_MAX_COST_PER_JOB_USD.toFixed(2)}</dd></div><div><dt>동시 실행</dt><dd>{environment.OPENAI_MAX_CONCURRENT_JOBS}건</dd></div><div><dt>마지막 연결 확인</dt><dd>실제 네트워크 검증 대기</dd></div></dl></section>
    <section className="panel section-panel"><h2>브랜드 AI 콘텐츠 설정</h2><p>브랜드 소개·말투·금지 표현·가상 상품·공식 근거는 브랜드 단위로 관리합니다.</p><div className="inline-links">{brands.map((brand) => <Link className="secondary-button" href={`/workspace/brands/${brand.id}/ai-settings`} key={brand.id}>{brand.name}</Link>)}</div></section>
  </main>;
}
