import { randomBytes } from "node:crypto";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const cli = path.join(process.cwd(), "node_modules", "@playwright", "test", "cli.js");
const publishingKey = process.env.E2E_PUBLISHING_KEY ?? `ahp_${randomBytes(32).toString("base64url")}`;
const marketerJoinCode = process.env.E2E_JOIN_CODE ?? randomBytes(24).toString("base64url");
const supabaseCli = path.join(process.cwd(), "node_modules", "supabase", "dist", "supabase.js");
const isolatedRoot = path.join(process.cwd(), "supabase", ".temp", "playwright-isolated");
rmSync(isolatedRoot, { recursive: true, force: true });
mkdirSync(path.join(isolatedRoot, "supabase"), { recursive: true });
cpSync(path.join(process.cwd(), "supabase", "migrations"), path.join(isolatedRoot, "supabase", "migrations"), { recursive: true });
writeFileSync(path.join(isolatedRoot, "supabase", "config.toml"), `project_id = "aeo-content-hub-e2e-isolated"
[api]
enabled = true
port = 55321
schemas = ["public", "graphql_public"]
extra_search_path = ["public", "extensions"]
[db]
port = 55322
major_version = 17
[studio]
enabled = true
port = 55323
[inbucket]
enabled = true
port = 55324
[analytics]
enabled = true
port = 55327
[auth]
enabled = true
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = ["http://127.0.0.1:3000"]
`);
execFileSync(process.execPath, [supabaseCli, "start", "--workdir", isolatedRoot], { stdio: "inherit" });
execFileSync(process.execPath, [supabaseCli, "db", "reset", "--workdir", isolatedRoot], { stdio: "inherit" });
const status = execFileSync(process.execPath, [supabaseCli, "status", "--workdir", isolatedRoot, "-o", "env"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const local = Object.fromEntries(status.split(/\r?\n/).flatMap((line) => {
  const separator = line.indexOf("=");
  return separator > 0 ? [[line.slice(0, separator), line.slice(separator + 1).trim().replace(/^[\"']|[\"']$/g, "")]] : [];
}));
if (!local.API_URL || !local.PUBLISHABLE_KEY) throw new Error("Local Supabase must be running before Playwright tests");
if (local.API_URL !== "http://127.0.0.1:55321") throw new Error("E2E database is restricted to the isolated loopback Supabase project");
for (let attempt = 0; attempt < 60; attempt += 1) {
  try {
    const response = await fetch(`${local.API_URL}/auth/v1/health`, { cache: "no-store", signal: AbortSignal.timeout(2_000) });
    if (response.ok) break;
  } catch { /* wait for GoTrue to recover after the database reset */ }
  if (attempt === 59) throw new Error("Local Supabase Auth did not become healthy after reset");
  await new Promise((resolve) => setTimeout(resolve, 500));
}
const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: local.PUBLISHABLE_KEY,
  E2E_SUPABASE_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY,
  E2E_ISOLATED_SUPABASE: "true",
  NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
  E2E_PUBLISHING_KEY: publishingKey,
  E2E_JOIN_CODE: marketerJoinCode,
  CONTENT_HUB_API_URL: "http://127.0.0.1:3000",
  CONTENT_HUB_PUBLISHING_KEY: publishingKey,
  CONTENT_HUB_BRAND_KEY: "virtual-lumi",
  TEST_STORE_BASE_URL: "http://127.0.0.1:3100",
};
const child = spawn(process.execPath, [cli, ...process.argv.slice(2)], { stdio: "inherit", env, shell: false });

function stopServers() {
  spawnSync(process.execPath, [supabaseCli, "stop", "--workdir", isolatedRoot, "--no-backup"], { stdio: "ignore" });
  rmSync(isolatedRoot, { recursive: true, force: true });
}

child.once("error", () => { stopServers(); process.exit(1); });
child.once("exit", (code, signal) => {
  stopServers();
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
