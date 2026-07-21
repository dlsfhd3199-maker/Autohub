import { describe, expect, it } from "vitest";

import { parsePublicEnv, parseServerEnv } from "./env";

const publicValues = {
  NEXT_PUBLIC_SUPABASE_URL: "https://fictional-project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_value",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
};

describe("environment validation", () => {
  it("accepts documented public variables", () => {
    expect(parsePublicEnv(publicValues)).toEqual(publicValues);
  });

  it("rejects privileged-looking values in the public key slot", () => {
    expect(() =>
      parsePublicEnv({
        ...publicValues,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "service-role-secret",
      }),
    ).toThrow();
  });

  it("requires a PostgreSQL server connection", () => {
    expect(() => parseServerEnv(publicValues)).toThrow();
  });
});
