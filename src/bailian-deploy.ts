/**
 * Build and deploy AgentScript agents to Alibaba Cloud Bailian high-code platform.
 */

import { execSync, spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

export interface BuildBailianOptions {
  coreCode: string;
  outputDir: string;
  appName: string;
  description?: string;
  welcomeMessage?: string;
  version?: string;
  enableMcp?: boolean;
  implsPath?: string;
}

export interface DeployBailianOptions {
  whlPath: string;
  appName: string;
  appId?: string;
  desc?: string;
  telemetry?: boolean;
}

function toPackageName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "") || "bailian_agent"
  );
}

/**
 * Generate a complete Bailian high-code project in the output directory.
 */
export function generateBailianProject(options: BuildBailianOptions): void {
  const { coreCode, outputDir, appName, description, welcomeMessage, version, enableMcp, implsPath } = options;
  const pkgName = toPackageName(appName);
  const pkgVersion = version || `0.1.0+${Date.now()}`;

  // Clean output directory first to avoid stale files from previous builds
  if (existsSync(outputDir)) {
    rmSync(outputDir, { recursive: true, force: true });
  }

  // Create directory structure
  const deployStarterDir = join(outputDir, "deploy_starter");
  mkdirSync(deployStarterDir, { recursive: true });

  // Write core agent code
  writeFileSync(join(deployStarterDir, "agent_core.py"), coreCode, "utf-8");

  // Copy user impls if provided
  if (implsPath) {
    const implsCode = readFileSync(implsPath, "utf-8");
    writeFileSync(join(deployStarterDir, "impls.py"), implsCode, "utf-8");
  }

  // Write __init__.py
  writeFileSync(join(deployStarterDir, "__init__.py"), "", "utf-8");

  // Write main.py (Bailian entry point)
  const mainPy = generateMainPy(appName, welcomeMessage, description, !!implsPath);
  writeFileSync(join(deployStarterDir, "main.py"), mainPy, "utf-8");

  // Write requirements.txt
  const requirementsTxt = generateRequirementsTxt(enableMcp);
  writeFileSync(join(outputDir, "requirements.txt"), requirementsTxt, "utf-8");

  // Write pyproject.toml
  const pyprojectToml = generatePyProjectToml(pkgName, pkgVersion, enableMcp);
  writeFileSync(join(outputDir, "pyproject.toml"), pyprojectToml, "utf-8");
}

function generateMainPy(appName: string, welcomeMessage?: string, description?: string, hasImpls?: boolean): string {
  const agentName = appName || "Agent";
  const welcome = welcomeMessage || "Hello! How can I help you?";

  const implsImport = hasImpls
    ? `from deploy_starter.impls import *\n`
    : "";

  const botInit = hasImpls
    ? `AgentBot(impls={k.removesuffix("_impl"): v for k, v in globals().items() if k.endswith("_impl") and callable(v)})`
    : `AgentBot()`;

  return `"""Bailian high-code application entry point for ${agentName}."""
import os
import time
import threading

from agentscope.message import Msg
from agentscope_runtime.engine import AgentApp

from deploy_starter.agent_core import AgentBot
${implsImport}
class SessionManager:
    """Manages per-session AgentBot instances for conversation isolation."""

    def __init__(self, ttl: int = 1800) -> None:
        self._sessions: dict[str, tuple] = {}  # session_id -> (bot, last_access_time)
        self._lock = threading.Lock()
        self._ttl = ttl  # seconds before idle session is evicted

    def get_or_create(self, session_id: str | None) -> tuple:
        """Return the AgentBot for the given session, creating one if new."""
        sid = session_id or "_default_"
        now = time.time()
        with self._lock:
            self._evict_expired(now)
            if sid in self._sessions:
                bot, _ = self._sessions[sid]
                self._sessions[sid] = (bot, now)
                return bot, False  # not new
            bot = ${botInit}
            self._sessions[sid] = (bot, now)
            return bot, True  # new session

    def reset(self, session_id: str | None) -> None:
        """Reset the AgentBot for the given session."""
        sid = session_id or "_default_"
        with self._lock:
            if sid in self._sessions:
                del self._sessions[sid]

    def _evict_expired(self, now: float) -> None:
        """Remove sessions idle longer than _ttl seconds."""
        expired = [
            sid for sid, (_, ts) in self._sessions.items()
            if now - ts > self._ttl
        ]
        for sid in expired:
            del self._sessions[sid]

_sessions = SessionManager()

app = AgentApp(
    app_name=${JSON.stringify(agentName)},
    app_description=${JSON.stringify(description || "")},
)


@app.query("agentscope")
async def process(self, request, msgs, **kwargs):
    """Handle conversation requests from Bailian platform."""
    session_id = getattr(request, "session_id", None) or kwargs.get("session_id")
    bot, is_new = _sessions.get_or_create(session_id)

    if not msgs:
        # No messages — reset existing session and send welcome
        if not is_new:
            bot.reset()
        yield Msg("assistant", ${JSON.stringify(welcome)}, "assistant"), True
        return

    # Use the last user message
    user_msg = msgs[-1] if isinstance(msgs, list) else msgs
    text = user_msg.content if isinstance(user_msg.content, str) else str(user_msg.content)
    response = await bot.chat(text)

    yield Msg("assistant", response, "assistant"), True


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "8080")))
`;
}

function generateRequirementsTxt(enableMcp?: boolean): string {
  const deps = [
    "agentscope-runtime>=1.0.0",
    "agentscope>=1.0.0",
    "pydantic>=2.0",
  ];
  if (enableMcp) {
    deps.push("fastmcp>=2.0");
  }
  return deps.join("\n") + "\n";
}

function generatePyProjectToml(pkgName: string, version: string, enableMcp?: boolean): string {
  const deps = [
    "    \"agentscope-runtime>=1.0.0\"",
    "    \"agentscope>=1.0.0\"",
    "    \"pydantic>=2.0\"",
  ];
  if (enableMcp) {
    deps.push("    \"fastmcp>=2.0\"");
  }
  return `[build-system]
requires = ["setuptools>=65", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "${pkgName}"
version = "${version}"
description = "Alibaba Bailian High-Code Application"
requires-python = ">=3.10"

dependencies = [
${deps.join(",\n")},
]

[tool.setuptools]
packages = ["deploy_starter"]
`;
}

/**
 * Build a Python wheel from the project directory.
 * @returns Absolute path to the built .whl file.
 */
export async function buildWheel(projectDir: string): Promise<string> {
  // Clean previous build artifacts to avoid picking stale wheels
  const distDir = join(projectDir, "dist");
  if (existsSync(distDir)) {
    rmSync(distDir, { recursive: true, force: true });
  }
  const eggInfoDir = join(projectDir, "*.egg-info");
  try {
    execSync(`rm -rf ${eggInfoDir}`, { cwd: projectDir, stdio: "ignore" });
  } catch {
    // ignore
  }

  // Ensure build tool is available
  try {
    execSync("python -m pip install --quiet build", { stdio: "ignore" });
  } catch {
    // ignore — may already be installed
  }

  // Build wheel
  execSync("python -m build --wheel", {
    cwd: projectDir,
    stdio: "inherit",
  });

  // Find the built wheel
  if (!existsSync(distDir)) {
    throw new Error("Wheel build failed: dist/ directory not found");
  }
  const files = readdirSync(distDir);
  const whl = files.find((f) => f.endsWith(".whl"));
  if (!whl) {
    throw new Error("Wheel build failed: no .whl file found in dist/");
  }
  return join(distDir, whl);
}

/**
 * Deploy a wheel to Alibaba Cloud Bailian using runtime-fc-deploy.
 */
export async function deployToBailian(
  options: DeployBailianOptions,
): Promise<void> {
  const {
    whlPath,
    appName,
    appId,
    desc,
    telemetry = false,
  } = options;

  // Check prerequisites
  const ak = process.env.ALIBABA_CLOUD_ACCESS_KEY_ID;
  const sk = process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET;
  if (!ak || !sk) {
    throw new Error(
      "Environment variables ALIBABA_CLOUD_ACCESS_KEY_ID and " +
        "ALIBABA_CLOUD_ACCESS_KEY_SECRET must be set.",
    );
  }

  // Check runtime-fc-deploy availability
  try {
    execSync("runtime-fc-deploy --help", { stdio: "ignore" });
  } catch {
    throw new Error(
      "runtime-fc-deploy not found. Install it with:\n" +
        '  pip install "agentscope-runtime[deployment]"',
    );
  }

  const args: string[] = [];
  if (appId) {
    args.push("--update", appId);
  } else {
    args.push("--deploy-name", appName);
  }
  args.push("--whl-path", whlPath);
  if (desc) {
    args.push("--desc", desc);
  }
  if (telemetry) {
    args.push("--telemetry", "enable");
  }

  return new Promise((resolve, reject) => {
    const proc = spawn("runtime-fc-deploy", args, {
      stdio: "inherit",
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`runtime-fc-deploy exited with code ${code}`));
      }
    });

    proc.on("error", (err) => {
      reject(err);
    });
  });
}
