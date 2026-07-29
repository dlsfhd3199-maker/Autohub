import Link from "next/link";

const steps = ["브랜드 설정", "근거 관리", "콘텐츠 생성", "기획안 검토", "스튜디오 검수", "버전 생성", "테스트 발행", "자사몰 확인"] as const;
export function PocWorkflow({ active, brandId, contentId }: { active: number; brandId: string; contentId?: string }) {
  return <nav className="poc-workflow" aria-label="콘텐츠 생성 및 테스트 발행 흐름">{steps.map((step, index) => {
    const href = index <= 1 ? `/workspace/brands/${brandId}/ai-settings` : index <= 3 ? `/workspace/brands/${brandId}/generate` : contentId ? `/workspace/content/${contentId}/studio` : null;
    const body = <><b>{index + 1}</b><span>{step}</span></>;
    return href ? <Link key={step} href={href} className={index === active ? "is-current" : index < active ? "is-complete" : ""} aria-current={index === active ? "step" : undefined}>{body}</Link> : <span key={step} className={index === active ? "is-current" : ""}>{body}</span>;
  })}</nav>;
}
