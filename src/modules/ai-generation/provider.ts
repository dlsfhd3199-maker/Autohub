import type { GenerationProvider } from "./contracts";
import { FakeGenerationProvider } from "./fake-provider";

export function createGenerationProvider(): GenerationProvider {
  // Checkpoint 6C remains explicitly paused. Product actions are deterministic and cannot issue an external request.
  return new FakeGenerationProvider();
}
