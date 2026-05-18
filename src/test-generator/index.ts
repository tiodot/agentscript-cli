/**
 * index.ts — public API for the test generator pipeline.
 *
 * Usage:
 *   const output = await generateE2ETests({ agentSource, validEmail, apiKey });
 *   writeFileSync(outputPath, output);
 */

import type { ConfigData, VariableData, SubagentData } from '../ast-utils';
import { extractWorkflowSpec } from './workflow-extractor';
import { enumerateWorkflows } from './workflow-enumerator';
import { enrichPaths } from './llm-enricher';
import { renderPytestFile } from './pytest-writer';

export interface GenTestsOptions {
  config: ConfigData;
  variables: VariableData[];
  subagents: SubagentData[];
  /** A valid registered email used in test inputs (default: test@example.com) */
  validEmail?: string;
  /** DashScope API key for LLM enrichment (falls back to deterministic if unset) */
  apiKey?: string;
}

export async function generateE2ETests(opts: GenTestsOptions): Promise<string> {
  const validEmail = opts.validEmail ?? 'test@example.com';
  const apiKey = opts.apiKey ?? process.env['DASHSCOPE_API_KEY'];

  // Step 1: Deterministic extraction
  const spec = extractWorkflowSpec(opts.config, opts.variables, opts.subagents);

  // Step 2: Deterministic enumeration
  const paths = enumerateWorkflows(spec);

  // Step 3: LLM enrichment (natural inputs + assertion comments)
  const enriched = await enrichPaths(paths, spec, apiKey, validEmail);

  // Step 4: Render pytest file
  return renderPytestFile(enriched, spec, validEmail);
}

export { extractWorkflowSpec } from './workflow-extractor';
export { enumerateWorkflows } from './workflow-enumerator';
export { enrichPaths } from './llm-enricher';
export { renderPytestFile } from './pytest-writer';
export * from './types';
