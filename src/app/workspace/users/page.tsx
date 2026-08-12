import { ApplicationReviewForm } from "@/components/application-review-form";
import { getUserManagementData } from "@/modules/users/queries";
import { formatKoreanDate } from "@/modules/content/display";

const statusLabel: Record<string, string> = { pending: "승인 대기", approved: "승인 완료", rejected: "가입 거절" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ role?: string; status?: string }> }) {
  const [data, filters] = await Promise.all([getUserManagementData(), searchParams]);
  const list = data.applications.filter((item) => (!filters.role || item.requested_role === filters.role) && (!filters.status || item.status === filters.status));
  return <main className="workspace-content">
    <section className="page-heading"><div><p className="eyebrow">USER APPROVALS</p><h1>사용자·가입 승인</h1><p>가입 역할, 조직 소속, 브랜드 배정을 서버 RPC에서 원자적으로 처리합니다.</p></div></section>
    <form className="filter-grid">
      <label>신청 역할<select name="role" defaultValue={filters.role ?? ""}><option value="">전체</option><option value="ae">마케터</option><option value="advertiser">광고주</option></select></label>
      <label>상태<select name="status" defaultValue={filters.status ?? ""}><option value="">전체</option><option value="pending">승인 대기</option><option value="approved">승인 완료</option><option value="rejected">가입 거절</option></select></label>
      <button className="secondary-button">필터 적용</button>
    </form>
    <section className="application-list">
      {list.length ? list.map((application) => <article className="panel application-card" key={application.id}>
        <header><div><span className={`status-badge status-${application.status === "approved" ? "active" : application.status === "rejected" ? "archived" : "warning"}`}><span />{statusLabel[application.status] ?? application.status}</span><h2>{application.applicant_name}</h2><p>{application.requested_role === "ae" ? "마케터" : "광고주"} · {application.organization_name}</p></div><small>{formatKoreanDate(application.created_at)}</small></header>
        <dl><div><dt>직급</dt><dd>{application.job_title}</dd></div><div><dt>이메일</dt><dd>{application.email_normalized}</dd></div><div><dt>전화번호</dt><dd>{application.phone}</dd></div>{application.brand_name ? <div><dt>브랜드</dt><dd>{application.brand_name}</dd></div> : null}{application.storefront_url ? <div><dt>자사몰</dt><dd>{application.storefront_url}</dd></div> : null}</dl>
        {application.status === "pending" ? <ApplicationReviewForm applicationId={application.id} requestedRole={application.requested_role} brands={data.brands} /> : <p className="readonly-note">처리 완료된 신청입니다.</p>}
      </article>) : <div className="state-card"><h2>조건에 맞는 가입 신청이 없습니다</h2></div>}
    </section>
  </main>;
}
