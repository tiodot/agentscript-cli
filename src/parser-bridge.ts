/**
 * Bridge module for @agentscript/agentforce.
 *
 * The npm-published package has broken internal imports (issue #35),
 * so we use the locally built version from agentscript-src instead.
 * We import from browser.js — a self-contained bundle that has no
 * external @agentscript/* imports, eliminating cascading resolution
 * issues in vitest/vite.
 */
// @ts-ignore — browser.js has no .d.ts but the parse function works correctly
export { parse } from '@agentscript-src/packages/agentforce/dist/browser.js';
export type { Document } from '@agentscript-src/packages/agentforce/dist/index.d.ts';