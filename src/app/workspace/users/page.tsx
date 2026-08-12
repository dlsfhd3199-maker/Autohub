import { ApplicationReviewForm } from "@/components/application-review-form";
import { formatKoreanDate } from "@/modules/content/display";
import { getUserManagementData } from "@/modules/users/queries";

const statusLabel: Record<string, string> = { pending: "승인 대기", approved: "승인 완료", rejected: "가입 거절" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const [data, filters] = await Promise.all([getUserManagementData(), searchParams]);
  const applications = data.applications.filter((item) => !filters.status || item.status === filters.status);
  return <main className="workspace-content">
    <section className="page-heading"><div><p className="eyebrow">MARKETER APPROVALS</p><h1>마케터 가입 승인</h1><p>가입 코드로 확인된 조직의 마케터 신청만 검토합니다. 공개 가입으로 관리자나 광고주 역할을 요청할 수 없습니다.</p></div></section>
    <form className="filter-grid"><label>상태<select name="status" defaultValue={filters.status ?? ""}><option value="">전체</option><option value="pending">승인 대기</option><option value="approved">승인 완료</option><option value="rejected">가입 거절</option></select></label><button className="secondary-button">필터 적용</button></form>
    <section className="application-list">{applications.length ? applications.map((application) => <article className="panel application-card" key={application.id}>
      <header><div><span className={`status-badge status-${application.status === "approved" ? "active" : application.status === "rejected" ? "archived" : "warning"}`}><span />{statusLabel[application.status] ?? application.status}</span><h2>{application.applicant_name}</h2><p>마케터 · {application.organization_name}</p></div><small>{formatKoreanDate(application.created_at)}</small></header>
      <dl><div><dt>이메일</dt><dd>{application.email_normalized}</dd></div></dl>
      {application.status === "pending" ? <ApplicationReviewForm applicationId={application.id} brands={data.brands} /> : <p className="readonly-note">처리 완료된 신청입니다.</p>}
    </article>) : <div className="state-card"><h2>조건에 맞는 마케터 가입 신청이 없습니다</h2></div>}</section>
  </main>;
}
