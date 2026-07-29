import type { GenerationProvider } from "./contracts";
import { FakeGenerationProvider } from "./fake-provider";
import { OpenAiGenerationProvider } from "./openai-provider";

export function createGenerationProvider(): GenerationProvider {
  if (process.env.NODE_ENV !== "production" && process.env.E2E_FAKE_OPENAI === "true") return new FakeGenerationProvider();
  return new OpenAiGenerationProvider();
}
