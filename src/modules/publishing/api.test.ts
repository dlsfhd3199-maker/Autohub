import { describe, expect, it } from "vitest";
import { createPublishingKey } from "./keys";
import { parseBearerHeader } from "./api";

describe("publishing API authentication", () => {
  it("accepts only the server publishing key format", () => {
    const key = createPublishingKey();
    expect(parseBearerHeader(`Bearer ${key}`)).toBe(key);
    expect(parseBearerHeader(`Basic ${key}`)).toBeNull();
    expect(parseBearerHeader("Bearer short")).toBeNull();
  });
});
