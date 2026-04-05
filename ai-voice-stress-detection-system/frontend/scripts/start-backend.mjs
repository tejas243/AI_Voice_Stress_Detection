/**
 * Starts FastAPI with cwd = repo/backend (works on Windows/macOS/Linux).
 * Tries `python`, then Windows `py -3`, then `python3`.
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const backendDir = path.join(repoRoot, "backend");

function mainExists() {
  return fs.existsSync(path.join(backendDir, "main.py"));
}

function run(cmd, args, label) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (code) => {
      if (settled) return;
      settled = true;
      resolve(code ?? 0);
    };
    const child = spawn(cmd, args, {
      cwd: backendDir,
      stdio: "inherit",
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      shell: false,
    });
    child.on("error", (err) => {
      console.error(`[api] ${label} failed to start:`, err.message);
      finish(1);
    });
    child.on("exit", (code) => finish(code));
  });
}

async function tryPython(pythonCmd, extraArgs = []) {
  const args = [...extraArgs, "-m", "uvicorn", "main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"];
  return run(pythonCmd, args, pythonCmd);
}

if (!mainExists()) {
  console.error("[api] Cannot find backend/main.py — expected at:", path.join(backendDir, "main.py"));
  console.error("[api] Keep this folder layout: ai-voice-stress-detection-system/{frontend,backend}/");
  process.exit(1);
}

console.log("[api] Starting FastAPI from:", backendDir);

const attempts = [
  () => tryPython("python"),
  () => tryPython("py", ["-3"]),
  () => tryPython("python3"),
];

for (const start of attempts) {
  const code = await start();
  if (code === 0 || code === null) process.exit(0);
}

console.error("[api] Could not run uvicorn. Install Python 3 and dependencies:");
console.error("    cd backend");
console.error("    pip install -r requirements.txt");
process.exit(1);
