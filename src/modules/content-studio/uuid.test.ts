import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createUuidV4 } from "@/modules/content-studio/uuid";

describe("createUuidV4", () => {
  it("uses randomUUID when the browser provides it", () => {
    const randomUUID = vi.fn(() => "10000000-0000-4000-8000-000000000001" as `${string}-${string}-${string}-${string}-${string}`);
    const getRandomValues = vi.fn();
    expect(createUuidV4({ randomUUID, getRandomValues })).toBe("10000000-0000-4000-8000-000000000001");
    expect(randomUUID).toHaveBeenCalledOnce();
    expect(getRandomValues).not.toHaveBeenCalled();
  });

  it("generates valid, unique RFC 4122 v4 UUIDs without randomUUID", () => {
    let sequence = 0;
    const source = {
      getRandomValues<T extends ArrayBufferView | null>(array: T): T {
        const bytes = array as Uint8Array;
        crypto.getRandomValues(bytes);
        bytes[0] ^= sequence++ & 0xff;
        return array;
      },
    };
    const ids = Array.from({ length: 2_000 }, () => createUuidV4(source));
    expect(ids.every((id) => z.string().uuid().safeParse(id).success)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id[14] === "4" && ["8", "9", "a", "b"].includes(id[19]))).toBe(true);
  });

  it("fails closed without a cryptographically secure random source", () => {
    expect(() => createUuidV4({} as Crypto)).toThrow("cryptographically secure random source");
  });
});
