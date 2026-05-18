/**
 * llm-enricher.ts
 *
 * Calls Qwen (via DashScope OpenAI-compatible API) to enrich each WorkflowPath with:
 *   - naturalInput: a realistic user message to send to the bot
 *   - additionalTurns: follow-up messages for multi-turn tests
 *   - assertionComments: human-readable descriptions of what the test verifies
 *
 * Model: qwen-plus (best coding quality on Bailian, fast, cost-effective)
 * API:   DashScope OpenAI-compatible endpoint
 */

import type { WorkflowPath, EnrichedPath, WorkflowSpec } from './types';

const DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const MODEL = 'qwen-plus';

interface LlmEnrichment {
  naturalInput: string;
  additionalTurns?: string[];
  assertionComments: string[];
}

// ─── Public entry point ───────────────────────────────────────────────────────

/**
 * Enrich all paths with LLM-generated natural language inputs.
 * Falls back to deterministic defaults if DASHSCOPE_API_KEY is not set or call fails.
 */
export async function enrichPaths(
  paths: WorkflowPath[],
  spec: WorkflowSpec,
  apiKey: string | undefined,
  validEmail: string,
): Promise<EnrichedPath[]> {
  if (!apiKey) {
    console.warn('[gen-tests] DASHSCOPE_API_KEY not set — using fallback inputs.');
    return paths.map(p => applyFallback(p, validEmail));
  }

  // Batch all paths into a single LLM call to minimise latency and cost
  const prompt = buildPrompt(paths, spec, validEmail);

  let enrichments: LlmEnrichment[];
  try {
    enrichments = await callLlm(prompt, apiKey, paths.length);
  } catch (err) {
    console.warn(`[gen-tests] LLM call failed (${err}), using fallback inputs.`);
    return paths.map(p => applyFallback(p, validEmail));
  }

  return paths.map((path, i) => {
    const e = enrichments[i] ?? fallbackEnrichment(path, validEmail);
    return { ...path, ...e };
  });
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(paths: WorkflowPath[], spec: WorkflowSpec, validEmail: string): string {
  const pathSummaries = paths.map((p, i) =>
    `[${i}] id=${p.id} title="${p.title}"
  agentChain: ${p.agentChain.join(' → ')}
  mocks: ${JSON.stringify(p.mocks)}
  expectedState: ${JSON.stringify(p.expectedState)}
  description: ${p.description}`
  ).join('\n\n');

  return `You are a QA engineer writing e2e test inputs for an AI customer service bot.
The bot handles customer support cases: create cases, escalate issues, resolve problems.
The valid registered email for testing is: ${validEmail}

For each workflow path below, generate a JSON object with these fields:
- "naturalInput": a realistic customer message to start the conversation (1-3 sentences, first person, include name and email naturally). For verification failure tests, use a DIFFERENT email (not ${validEmail}).
- "additionalTurns": array of follow-up messages if the path has multiple turns (e.g. user requesting escalation after failed resolution). Omit or use empty array for single-turn paths.
- "assertionComments": array of 2-4 short strings describing what the test verifies (used as Python comments).

Return ONLY a JSON array of ${paths.length} objects, one per path, in the same order. No markdown, no explanation.

Paths:
${pathSummaries}`;
}

// ─── LLM call ─────────────────────────────────────────────────────────────────

async function callLlm(prompt: string, apiKey: string, expectedCount: number): Promise<LlmEnrichment[]> {
  const response = await fetch(`${DASHSCOPE_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json() as any;
  const content: string = data.choices?.[0]?.message?.content ?? '[]';

  // Strip optional markdown fences
  const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  let parsed: any[];
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`LLM returned non-JSON: ${cleaned.slice(0, 300)}`);
  }

  if (!Array.isArray(parsed) || parsed.length !== expectedCount) {
    throw new Error(`Expected array of ${expectedCount}, got ${parsed?.length ?? 'non-array'}`);
  }

  return parsed.map(item => ({
    naturalInput: String(item.naturalInput ?? ''),
    additionalTurns: Array.isArray(item.additionalTurns) ? item.additionalTurns.map(String) : undefined,
    assertionComments: Array.isArray(item.assertionComments) ? item.assertionComments.map(String) : [],
  }));
}

// ─── Fallbacks ────────────────────────────────────────────────────────────────

function applyFallback(path: WorkflowPath, validEmail: string): EnrichedPath {
  return { ...path, ...fallbackEnrichment(path, validEmail) };
}

function fallbackEnrichment(path: WorkflowPath, validEmail: string): LlmEnrichment {
  // Discover the "found" flag and name from mocks using common field name patterns
  const foundVal = path.mocks['customer_found'] ?? path.mocks['order_found'] ?? path.mocks['verified'];
  const isFailure = foundVal === false;
  const email = isFailure ? 'unknown@notregistered.com' : validEmail;
  const name = (path.mocks['customer_name'] ?? path.mocks['name'] ?? 'Test User') as string;

  return {
    naturalInput: `Hi, I'm ${name}. My email is ${email}. ${path.description}.`,
    additionalTurns: path.agentChain.length > 2 ? ['The solution did not work. Please escalate this to a specialist.'] : undefined,
    assertionComments: [
      `Verifies workflow: ${path.title}`,
      `Agent chain: ${path.agentChain.join(' → ')}`,
      ...Object.entries(path.expectedState)
        .filter(([k]) => k !== '__notes__')
        .map(([k, v]) => `Expected ${k} = ${JSON.stringify(v)}`),
    ],
  };
}
