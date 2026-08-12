import { spawn } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const cli = path.join(root, "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [cli, "dev", root, "--webpack", ...process.argv.slice(2)], { stdio: "inherit", env: process.env, shell: false });
child.once("error", () => process.exit(1));
child.once("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
