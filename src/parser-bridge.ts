/**
 * Bridge module for @agentscript/agentforce.
 *
 * The npm-published package has broken internal imports (issue #35),
 * so we use the locally built version from agentscript-src instead.
 * This module re-exports everything needed, keeping the path detail
 * isolated to a single file.
 */

// The locally built agentforce package resolves its internal
// @agentscript/* deps via the pnpm workspace in agentscript-src/
export { parse } from '../agentscript-src/packages/agentforce/dist/index.js';
export type { Document } from '../agentscript-src/packages/agentforce/dist/index.d.ts';