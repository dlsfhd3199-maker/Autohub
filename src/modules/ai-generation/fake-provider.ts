import { createUuidV4 } from "@/modules/content-studio/uuid";
import type { GeneratedDraft, GenerationContext, GenerationPlan, GenerationProvider } from "./contracts";

export class FakeGenerationProvider implements GenerationProvider {
  async generatePlan(context: GenerationContext) {
    const evidenceIds = context.evidence.map((item) => item.id);
    const plan: GenerationPlan = { title: `${context.topic} 가상 안내`, searchIntent: `${context.primaryKeyword}에 대한 명확한 공식 정보 탐색`, coreAnswer: `${context.topic}은 등록된 가상 공식 근거를 기준으로 확인해야 합니다.`, sections: [{ heading: "핵심 정보", purpose: "공식 근거를 간결하게 설명", evidenceSourceIds: evidenceIds, suggestedBlocks: ["section","checklist"] }, { heading: "자주 묻는 질문", purpose: "독자의 후속 질문에 답변", evidenceSourceIds: evidenceIds, suggestedBlocks: ["faq","cta","sources"] }], reviewNotes: context.evidence.length ? [] : ["등록된 공식 근거가 없어 전체 내용을 검수해야 합니다."] };
    const usage = { inputTokens: 800, outputTokens: 400 };
    return { value: plan, ...usage, estimatedCostUsd: 0 };
  }
  async generateDraft(context: GenerationContext, plan: GenerationPlan) {
    const sourceIds = context.evidence.map((item) => item.id);
    const answerId = createUuidV4();
    const blocks: GeneratedDraft["document"]["blocks"] = [
      { id: createUuidV4(), type: "title", text: plan.title }, { id: answerId, type: "answer", text: plan.coreAnswer },
      { id: createUuidV4(), type: "summary", text: `${context.primaryKeyword}에 관한 가상 요약입니다. 등록된 공식 근거의 범위 안에서 작성되었습니다.` },
      { id: createUuidV4(), type: "section", heading: plan.sections[0].heading, body: context.evidence[0]?.evidenceText ?? "공식 근거가 부족하여 사람의 검수가 필요합니다." },
      { id: createUuidV4(), type: "subheading", text: "확인할 항목" }, { id: createUuidV4(), type: "paragraph", text: "가상 상품의 특징과 제한 사항은 공식 자료를 다시 확인해 주세요." },
      { id: createUuidV4(), type: "checklist", items: [{ text: "공식 근거와 표현이 일치하는지 확인", checked: false }, { text: "금지 표현이 포함되지 않았는지 확인", checked: false }] },
      { id: createUuidV4(), type: "faq", items: [{ question: `${context.primaryKeyword}에서 가장 먼저 확인할 점은 무엇인가요?`, answer: "등록된 공식 근거와 적용 범위를 먼저 확인해야 합니다." }] },
      { id: createUuidV4(), type: "cta", text: "가상 상품의 공식 정보를 확인해 보세요.", label: "가상 상품 자세히 보기", url: "https://example.com/virtual-product" },
    ];
    if (context.evidence.length) blocks.push({ id: createUuidV4(), type: "sources", items: context.evidence.map((item) => ({ label: item.title, url: item.officialUrl })) });
    const draft: GeneratedDraft = { document: { schemaVersion: 1, blocks, metadata: { primaryKeyword: context.primaryKeyword, keywords: context.secondaryKeywords, description: `${context.topic}에 대한 가상 AEO/GEO 콘텐츠` } }, reviewItems: context.evidence.length ? [] : [{ blockId: answerId, reason: "직접 연결된 공식 근거가 부족합니다.", severity: "review", evidenceSourceIds: sourceIds }] };
    const usage = { inputTokens: 1600, outputTokens: 1200 };
    return { value: draft, ...usage, estimatedCostUsd: 0 };
  }
}
