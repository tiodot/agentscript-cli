import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

const agentscriptSrc = resolve(__dirname, 'agentscript-src');

export default defineConfig({
  resolve: {
    alias: {
      // Only the @agentscript-src alias is needed — browser.js is self-contained
      // and has no external @agentscript/* imports.
      '@agentscript-src': agentscriptSrc,
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
  server: {
    fs: {
      allow: [agentscriptSrc],
    },
  },
});