import { afterEach, describe, expect, it, vi } from "vitest";
import { createGenerationProvider, generationProviderRegistry, listGenerationProviders } from "./provider";

describe("generation provider registry", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses fake as the default without external network capability", () => {
    expect(createGenerationProvider().id).toBe("fake");
    expect(generationProviderRegistry.fake.status()).toMatchObject({ enabled: true, networkAllowed: false, safeCode: "READY" });
  });

  it("keeps OpenAI disabled when either the key or explicit network gate is missing", () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("OPENAI_NETWORK_ENABLED", "false");
    expect(generationProviderRegistry.openai.status()).toMatchObject({ enabled: false, safeCode: "NOT_CONFIGURED" });
    vi.stubEnv("OPENAI_API_KEY", "test-only-placeholder");
    expect(generationProviderRegistry.openai.status()).toMatchObject({ enabled: false, safeCode: "NETWORK_DISABLED" });
  });

  it("publishes stable capability metadata without secrets", () => {
    expect(JSON.stringify(listGenerationProviders())).not.toContain("test-only-placeholder");
    expect(listGenerationProviders().map((item) => item.id)).toEqual(["fake", "openai"]);
  });
});
