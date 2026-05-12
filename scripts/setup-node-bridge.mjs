/**
 * Setup script: clone the official Salesforce AgentScript compiler source
 * into agentscript-src/ if it isn't already present, then initialize it.
 *
 * Run automatically via `npm run postinstall` or manually:
 *   node scripts/setup-node-bridge.mjs
 */

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const AGENTSCRIPT_SRC = resolve(PROJECT_ROOT, "agentscript-src");
const REPO_URL = "https://github.com/salesforce/agentscript.git";

if (existsSync(AGENTSCRIPT_SRC)) {
  console.log(`[setup-node-bridge] AgentScript source already exists at ${AGENTSCRIPT_SRC}`);
  process.exit(0);
}

console.log(`[setup-node-bridge] Cloning ${REPO_URL} ...`);
execSync(`git clone ${REPO_URL} "${AGENTSCRIPT_SRC}"`, {
  cwd: PROJECT_ROOT,
  stdio: "inherit",
});

console.log("[setup-node-bridge] Clone complete. Initializing ...");
execSync("pnpm install", { cwd: AGENTSCRIPT_SRC, stdio: "inherit" });
execSync("pnpm build", { cwd: AGENTSCRIPT_SRC, stdio: "inherit" });

console.log("[setup-node-bridge] Initialization complete.");
