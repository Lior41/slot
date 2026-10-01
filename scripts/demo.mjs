import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { connect } from "node:net";
import { config } from "dotenv";
if (!existsSync(".env"))
  await writeFile(
    ".env",
    "DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54330/postgres\nAPP_ORIGIN=http://localhost:3050\nDEMO_MODE=true\nDB_DRIVER=pglite\nDB_PATH=.local/embedded\n",
    { mode: 0o600 },
  );
config({ quiet: true });
const children = [];
function start(args) {
  const child = spawn("npm", args, { stdio: "inherit", env: process.env });
  children.push(child);
  return child;
}
function run(args) {
  return new Promise((resolve, reject) => {
    const c = start(args);
    c.on("error", reject);
    c.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("Command failed"))));
  });
}
function listening(port) {
  return new Promise((r) => {
    const s = connect({ host: "127.0.0.1", port });
    s.on("connect", () => {
      s.destroy();
      r(true);
    });
    s.on("error", () => r(false));
  });
}
function stop() {
  for (const c of children) c.kill("SIGTERM");
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
try {
  if (process.env.DEMO_MODE !== "true") throw new Error("Demo mode is required.");
  if (await listening(3050)) throw new Error("Port 3050 is already in use.");
  await run(["run", "db:migrate"]);
  await run(["run", "build"]);
  await run(["run", "start"]);
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
  stop();
}
