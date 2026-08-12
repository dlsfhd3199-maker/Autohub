import { rmSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const appDirectory = path.join(process.cwd(), "apps", "test-store");
rmSync(path.join(appDirectory, ".next"), { recursive: true, force: true });
const cli = path.join(appDirectory, "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [cli, "dev", appDirectory, "--webpack", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
  shell: false,
});
child.once("error", () => process.exit(1));
child.once("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
