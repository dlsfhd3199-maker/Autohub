import type { GenerationProvider } from "./contracts";
import { FakeGenerationProvider } from "./fake-provider";
import { OpenAiGenerationProvider } from "./openai-provider";

export type GenerationProviderRegistryEntry = {
  id: "fake" | "openai";
  label: string;
  description: string;
  create: () => GenerationProvider;
  status: () => ReturnType<GenerationProvider["validateConfiguration"]>;
};

export const generationProviderRegistry: Readonly<Record<"fake" | "openai", GenerationProviderRegistryEntry>> = {
  fake: { id: "fake", label: "Deterministic fake provider", description: "로컬 데모 전용이며 외부 AI를 호출하지 않습니다.", create: () => new FakeGenerationProvider(), status: () => new FakeGenerationProvider().validateConfiguration() },
  openai: { id: "openai", label: "OpenAI", description: "API 키와 명시적 네트워크 허용이 모두 필요합니다.", create: () => new OpenAiGenerationProvider(), status: () => {
    try { return new OpenAiGenerationProvider().validateConfiguration(); }
    catch { const configured = Boolean(process.env.OPENAI_API_KEY); return { provider: "openai", enabled: false, configured, networkAllowed: process.env.OPENAI_NETWORK_ENABLED === "true", safeCode: configured ? "NETWORK_DISABLED" : "NOT_CONFIGURED", capabilities: ["structured_plan", "structured_draft", "cost_estimation", "usage_tracking", "external_network"] }; }
  } },
};

export function listGenerationProviders() { return Object.values(generationProviderRegistry).map((entry) => ({ id: entry.id, label: entry.label, description: entry.description, status: entry.status() })); }

export function createGenerationProvider(): GenerationProvider {
  const requested = process.env.AI_GENERATION_PROVIDER ?? "fake";
  if (requested !== "fake" && requested !== "openai") throw new Error("UNSUPPORTED_GENERATION_PROVIDER");
  return generationProviderRegistry[requested].create();
}
