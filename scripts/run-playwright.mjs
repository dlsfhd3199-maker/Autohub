import { randomBytes } from "node:crypto";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import path from "node:path";

const cli = path.join(process.cwd(), "node_modules", "@playwright", "test", "cli.js");
const publishingKey = process.env.E2E_PUBLISHING_KEY ?? `ahp_${randomBytes(32).toString("base64url")}`;
const supabaseCli = path.join(process.cwd(), "node_modules", "supabase", "dist", "supabase.js");
const status = execFileSync(process.execPath, [supabaseCli, "status", "-o", "env"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const local = Object.fromEntries(status.split(/\r?\n/).flatMap((line) => {
  const separator = line.indexOf("=");
  return separator > 0 ? [[line.slice(0, separator), line.slice(separator + 1).trim().replace(/^[\"']|[\"']$/g, "")]] : [];
}));
if (!local.API_URL || !local.PUBLISHABLE_KEY) throw new Error("Local Supabase must be running before Playwright tests");
const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: local.PUBLISHABLE_KEY,
  NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
  E2E_PUBLISHING_KEY: publishingKey,
  CONTENT_HUB_API_URL: "http://127.0.0.1:3000",
  CONTENT_HUB_PUBLISHING_KEY: publishingKey,
  CONTENT_HUB_BRAND_KEY: "virtual-lumi",
  TEST_STORE_BASE_URL: "http://127.0.0.1:3100",
};
const hub = spawn(process.execPath, [path.join(process.cwd(), "scripts", "start-content-hub.mjs"), "--hostname", "127.0.0.1", "--port", "3000"], { stdio: "inherit", env: { ...env, CONTENT_HUB_PUBLISHING_KEY: "", E2E_FAKE_OPENAI: "true" }, shell: false });
const store = spawn(process.execPath, [path.join(process.cwd(), "scripts", "start-test-store.mjs"), "--hostname", "127.0.0.1", "--port", "3100"], {
  stdio: "inherit",
  env,
  shell: false,
});
for (let attempt = 0; attempt < 60; attempt += 1) {
  try {
    const [hubResponse, storeResponse] = await Promise.all([fetch("http://127.0.0.1:3000/login", { cache: "no-store" }), fetch("http://127.0.0.1:3100/api/health", { cache: "no-store" })]);
    if (hubResponse.ok && storeResponse.ok) break;
  } catch { /* wait for the local server */ }
  if (attempt === 59) throw new Error("The local test storefront did not become ready");
  await new Promise((resolve) => setTimeout(resolve, 500));
}

const child = spawn(process.execPath, [cli, ...process.argv.slice(2)], { stdio: "inherit", env, shell: false });

function stopServers() {
  for (const server of [hub, store]) {
    if (process.platform === "win32" && server.pid) spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    else server.kill("SIGTERM");
  }
}

child.once("error", () => { stopServers(); process.exit(1); });
child.once("exit", (code, signal) => {
  stopServers();
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
