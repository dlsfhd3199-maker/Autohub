import { execFileSync } from "node:child_process";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

function localSupabaseEnv(): Record<string, string> {
  try {
    const command = path.join(process.cwd(), "node_modules", "supabase", "dist", "supabase.js");
    const output = execFileSync(process.execPath, [command, "status", "-o", "env"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    const values: Record<string, string> = {};
    for (const line of output.split(/\r?\n/)) {
      const separator = line.indexOf("=");
      if (separator > 0) values[line.slice(0, separator)] = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    }
    if (!values.API_URL || !values.PUBLISHABLE_KEY || !values.SERVICE_ROLE_KEY) return {};
    return {
      NEXT_PUBLIC_SUPABASE_URL: values.API_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: values.PUBLISHABLE_KEY,
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
      E2E_SUPABASE_SERVICE_ROLE_KEY: values.SERVICE_ROLE_KEY,
    };
  } catch { return {}; }
}

const testEnv = { ...process.env, ...localSupabaseEnv() };
Object.assign(process.env, testEnv);
const webEnv = { ...Object.fromEntries(Object.entries(testEnv).filter(([key, value]) => key !== "E2E_SUPABASE_SERVICE_ROLE_KEY" && typeof value === "string")), E2E_FAKE_OPENAI: "true" } as Record<string, string>;

export default defineConfig({
  testDir: "./tests/e2e", fullyParallel: false, workers: 1, forbidOnly: Boolean(process.env.CI), retries: process.env.CI ? 2 : 0,
  reporter: "html", globalSetup: "./tests/e2e/global-setup.ts",
  use: { baseURL: "http://127.0.0.1:3000", trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "pnpm dev", url: "http://127.0.0.1:3000", reuseExistingServer: !process.env.CI, env: webEnv },
});
