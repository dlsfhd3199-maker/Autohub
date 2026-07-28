import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((file) => !file.endsWith("pnpm-lock.yaml") && file !== "scripts/scan-secrets.mjs");

const findings = [];
const valuePatterns = [
  ["Supabase secret key", /sb_secret_[A-Za-z0-9_-]{16,}/g],
  ["JWT-like token", /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/g],
  ["credentialed database URL", /postgres(?:ql)?:\/\/[^\s:@]+:[^\s@]+@/gi],
  ["assigned service role key", /(?:SUPABASE_SERVICE_ROLE_KEY|E2E_SUPABASE_SERVICE_ROLE_KEY)\s*=\s*[^\s#]+/g],
];

for (const file of files) {
  let text;
  try { text = readFileSync(file, "utf8"); } catch { continue; }
  for (const [label, pattern] of valuePatterns) {
    if (pattern.test(text)) findings.push(`${file}: ${label}`);
    pattern.lastIndex = 0;
  }
  for (const match of text.matchAll(/[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/gi)) {
    if (!match[1].toLowerCase().endsWith("example.com")) findings.push(`${file}: non-example email domain`);
  }
}

if (findings.length) {
  process.stderr.write(`Potential secrets or real personal data found:\n${[...new Set(findings)].join("\n")}\n`);
  process.exit(1);
}
process.stdout.write(`Secret and personal-data scan passed for ${files.length} repository files.\n`);
