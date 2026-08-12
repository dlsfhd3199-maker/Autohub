import { execFileSync } from "node:child_process";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

function localSupabaseEnv(): Record<string, string> {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && process.env.E2E_SUPABASE_SERVICE_ROLE_KEY) {
    return {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
      E2E_SUPABASE_SERVICE_ROLE_KEY: process.env.E2E_SUPABASE_SERVICE_ROLE_KEY,
    };
  }
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

const testPublishingKey = process.env.E2E_PUBLISHING_KEY;
if (!testPublishingKey) throw new Error("Use the test:e2e or test:a11y script so one ephemeral publishing key is shared by every Playwright process");
const testEnv = { ...process.env, ...localSupabaseEnv(), E2E_PUBLISHING_KEY: testPublishingKey };
Object.assign(process.env, testEnv);
const webEnv = { ...Object.fromEntries(Object.entries(testEnv).filter(([key, value]) => !["E2E_SUPABASE_SERVICE_ROLE_KEY", "E2E_PUBLISHING_KEY", "CONTENT_HUB_PUBLISHING_KEY"].includes(key) && typeof value === "string")), E2E_FAKE_OPENAI: "true" } as Record<string, string>;
const storeEnv = { ...Object.fromEntries(Object.entries(process.env).filter(([, value]) => typeof value === "string")), CONTENT_HUB_API_URL: "http://127.0.0.1:3000", CONTENT_HUB_PUBLISHING_KEY: testPublishingKey, CONTENT_HUB_BRAND_KEY: "virtual-lumi", TEST_STORE_BASE_URL: "http://127.0.0.1:3100" } as Record<string, string>;

export default defineConfig({
  testDir: "./tests/e2e", fullyParallel: false, workers: 1, forbidOnly: Boolean(process.env.CI), retries: process.env.CI ? 2 : 0,
  reporter: "html", globalSetup: "./tests/e2e/global-setup.ts", globalTeardown: "./tests/e2e/global-teardown.ts",
  use: { baseURL: "http://127.0.0.1:3000", trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    { command: "node scripts/start-content-hub.mjs --hostname 127.0.0.1 --port 3000", url: "http://127.0.0.1:3000", reuseExistingServer: true, env: webEnv },
    { command: "node scripts/start-test-store.mjs --hostname 127.0.0.1 --port 3100", url: "http://127.0.0.1:3100/api/health", reuseExistingServer: true, env: storeEnv },
  ],
});
