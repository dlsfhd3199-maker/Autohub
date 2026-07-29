import { createHash, randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const rawKey = `ahp_${randomBytes(32).toString("base64url")}`;
const keyHash = createHash("sha256").update(rawKey).digest("hex");
const sql = `update public.publishing_connections set bearer_key_hash='${keyHash}', status='active', disabled_at=null where brand_id=(select id from public.brands where slug='virtual-lumi' limit 1);`;
const databaseUpdate = spawnSync(
  "docker",
  ["exec", "supabase_db_aeo-content-hub-local", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", sql],
  { cwd: root, encoding: "utf8", shell: false },
);

if (databaseUpdate.status !== 0) {
  process.stderr.write("로컬 테스트 발행 연결을 준비하지 못했습니다. Supabase 상태를 확인해 주세요.\n");
  process.exit(1);
}

const children = [
  spawn(process.execPath, [path.join(root, "scripts", "start-content-hub.mjs"), "--hostname", "127.0.0.1", "--port", "3000"], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
    shell: false,
  }),
  spawn(process.execPath, [path.join(root, "scripts", "start-test-store.mjs"), "--hostname", "127.0.0.1", "--port", "3100"], {
    cwd: root,
    env: {
      ...process.env,
      CONTENT_HUB_URL: "http://127.0.0.1:3000",
      CONTENT_HUB_PUBLISHING_KEY: rawKey,
      TEST_STORE_URL: "http://127.0.0.1:3100",
    },
    stdio: "inherit",
    shell: false,
  }),
];

console.log("로컬 인수 환경을 시작했습니다: http://127.0.0.1:3000/login, http://127.0.0.1:3100/blog");
console.log("발행 키는 메모리에만 유지되며 출력하거나 파일에 저장하지 않습니다.");

const stop = () => {
  for (const child of children) child.kill("SIGTERM");
};
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, stop);
for (const child of children) {
  child.once("error", stop);
  child.once("exit", (code) => {
    if (code && code !== 0) {
      stop();
      process.exitCode = code;
    }
  });
}

await new Promise(() => {});
