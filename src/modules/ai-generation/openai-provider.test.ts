import { describe, expect, it, vi } from "vitest";
import type OpenAI from "openai";
import { OpenAiGenerationError, OpenAiGenerationProvider } from "./openai-provider";

const context = {
  topic: "가상 탐색 안내",
  primaryKeyword: "가상 키워드",
  secondaryKeywords: ["가상 보조어"],
  selectedProduct: null,
  knowledge: { brandIntroduction: "Virtual Lumi의 가상 소개" },
  evidence: [{ id: "70000000-0000-4000-8000-000000000001", title: "가상 공식 자료", officialUrl: "https://example.com/source", evidenceText: "가상 공식 근거 텍스트입니다." }],
};

const validPlan = {
  title: "가상 안내",
  titleCandidates: ["가상 안내"],
  searchIntent: "가상 정보를 확인하려는 의도",
  coreAnswer: "등록된 가상 공식 근거를 확인하세요.",
  expectedAudience: "가상 독자",
  sections: [{ heading: "핵심 정보", purpose: "근거 설명", evidenceSourceIds: [context.evidence[0].id], suggestedBlocks: ["section" as const] }],
  faqCandidates: ["가상 질문은 무엇인가요?"], reviewNotes: [],
};

function clientWith(parse: ReturnType<typeof vi.fn>) {
  return { responses: { parse } } as unknown as OpenAI;
}

describe("OpenAI generation provider", () => {
  it("uses the fixed model, structured output and records actual usage", async () => {
    const parse = vi.fn().mockResolvedValue({ output_parsed: validPlan, output: [], usage: { input_tokens: 900, output_tokens: 300 } });
    const provider = new OpenAiGenerationProvider(clientWith(parse));
    const result = await provider.generatePlan(context);
    expect(result.value).toEqual(validPlan);
    expect(result).toMatchObject({ inputTokens: 900, outputTokens: 300 });
    expect(parse).toHaveBeenCalledWith(expect.objectContaining({ model: "gpt-5.6-terra", store: false, max_output_tokens: 3000, text: { format: expect.anything() } }));
  });

  it("retries HTTP 429 once and never delegates retries to the SDK", async () => {
    const rateLimit = Object.assign(new Error("rate limited"), { status: 429 });
    const parse = vi.fn().mockRejectedValueOnce(rateLimit).mockResolvedValueOnce({ output_parsed: validPlan, output: [], usage: { input_tokens: 900, output_tokens: 300 } });
    const provider = new OpenAiGenerationProvider(clientWith(parse));
    await expect(provider.generatePlan(context)).resolves.toMatchObject({ value: validPlan });
    expect(parse).toHaveBeenCalledTimes(2);
  });

  it("does not retry authentication or structured-output failures", async () => {
    const authError = Object.assign(new Error("unauthorized"), { status: 401 });
    const parse = vi.fn().mockRejectedValue(authError);
    const provider = new OpenAiGenerationProvider(clientWith(parse));
    await expect(provider.generatePlan(context)).rejects.toMatchObject({ code: "AUTHENTICATION_FAILED" } satisfies Partial<OpenAiGenerationError>);
    expect(parse).toHaveBeenCalledTimes(1);
  });
});
