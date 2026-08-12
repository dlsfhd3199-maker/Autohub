import { randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { resetAndPrepareAcceptanceFixture } from "./local-acceptance-fixture.mjs";

const root = process.cwd();
const rawKey = `ahp_${randomBytes(32).toString("base64url")}`;
console.log("[1/4] 로컬 Supabase 마이그레이션과 인수 fixture를 준비합니다.");
const fixture = await resetAndPrepareAcceptanceFixture(rawKey);

const children = [
  spawn(process.execPath, [path.join(root, "scripts", "start-content-hub.mjs"), "--hostname", "127.0.0.1", "--port", "3000"], { cwd: root, env: process.env, stdio: "inherit", shell: false }),
  spawn(process.execPath, [path.join(root, "scripts", "start-test-store.mjs"), "--hostname", "127.0.0.1", "--port", "3100"], {
    cwd: root,
    env: { ...process.env, CONTENT_HUB_API_URL: "http://127.0.0.1:3000", CONTENT_HUB_PUBLISHING_KEY: rawKey, CONTENT_HUB_BRAND_KEY: "virtual-lumi", TEST_STORE_BASE_URL: "http://127.0.0.1:3100" },
    stdio: "inherit", shell: false,
  }),
];

const stop = () => {
  for (const child of children) {
    if (process.platform === "win32" && child.pid) spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else child.kill("SIGTERM");
  }
};
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, stop);
for (const child of children) child.once("error", stop);

async function waitFor(url, predicate, stage, headers = {}) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url, { cache: "no-store", headers, signal: AbortSignal.timeout(5_000) });
      const body = await response.text();
      if (response.ok && predicate(body)) return;
    } catch { /* retry while local services start */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${stage} 검증에 실패했습니다.`);
}

try {
  console.log("[2/4] Content Hub와 테스트 자사몰 health를 확인합니다.");
  await waitFor("http://127.0.0.1:3000/login", () => true, "Content Hub health");
  await waitFor("http://127.0.0.1:3100/api/health", (body) => body.includes('"ok":true'), "테스트 자사몰 health");
  console.log("[3/4] 발행 API 목록을 스모크 테스트합니다.");
  await waitFor("http://127.0.0.1:3000/api/publishing/v1/brands/virtual-lumi/contents", (body) => body.includes(fixture.publishedTitle), "발행 API", { Authorization: `Bearer ${rawKey}` });
  console.log("[4/4] 자사몰 SSR HTML을 확인합니다.");
  await waitFor("http://127.0.0.1:3100/blog", (body) => body.includes(fixture.publishedTitle) && !body.includes("Switched to client rendering"), "자사몰 SSR");
  console.log("로컬 인수 환경 준비 완료: http://127.0.0.1:3000/login, http://127.0.0.1:3100/blog");
  console.log("발행 키는 메모리에만 유지되며 출력하거나 파일에 저장하지 않습니다.");
} catch (error) {
  stop();
  console.error(error instanceof Error ? error.message : "로컬 인수 환경 검증에 실패했습니다.");
  process.exit(1);
}

await new Promise(() => {});
