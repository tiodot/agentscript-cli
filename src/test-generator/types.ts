/**
 * Shared types for the e2e test generator pipeline.
 *
 * Data flow:
 *   SubagentData[] (ast-utils)
 *     → WorkflowSpec   (workflow-extractor)
 *     → WorkflowPath[] (workflow-enumerator)
 *     → EnrichedPath[] (llm-enricher — adds naturalInput + assertionHints)
 *     → string         (pytest-writer — final .py output)
 */

// ─── Extracted spec ───────────────────────────────────────────────────────────

/** All deterministic information extracted from a single .agent file. */
export interface WorkflowSpec {
  agentSlug: string;           // e.g. "case_escalation_bot"
  fixtureClass: string;        // e.g. "AgentBot"
  fixtureModule: string;       // e.g. "case_escalation_bot"

  subagents: SubagentSpec[];
  variables: VariableSpec[];

  /** All unique action names (snake_case), used to build make_impls factory */
  actionNames: string[];

  /**
   * Output field specs for each action (snake_case action name → field specs).
   * Used to generate correct mock return dicts instead of {"ok": True} stubs.
   */
  actionOutputFields: Record<string, ActionFieldSpec[]>;

  /** Scored variables: name → list of {caseTypeValue, addAmount} */
  scoreRules: ScoreRule[];
}

export interface SubagentSpec {
  name: string;
  isStart: boolean;
  /** Conditions in before_reasoning that set variables (deterministic) */
  beforeSets: ConditionalSet[];
  /** Conditions that trigger a transition to another subagent */
  transitions: TransitionRule[];
  /** Actions called in after_reasoning (action names, snake_case) */
  afterActions: string[];
}

export interface VariableSpec {
  name: string;
  type: 'string' | 'boolean' | 'number';
  defaultValue: string | boolean | number;
}

/** An output field of an action, including its type for mock generation */
export interface ActionFieldSpec {
  name: string;
  type: 'string' | 'boolean' | 'number' | 'object' | 'unknown';
}

/** A score addition rule: if case_type == X, escalation_score += N */
export interface ScoreRule {
  variable: string;   // e.g. "case_type"
  value: string;      // e.g. "product_problem"
  addTo: string;      // e.g. "escalation_score"
  amount: number;
}

/** A set-variable action that fires conditionally in before/after_reasoning */
export interface ConditionalSet {
  condition: string;  // raw condition string e.g. "@variables.escalation_score >= 80"
  variable: string;
  setValue: string;
}

/** A routing rule: when condition is met, transition to targetSubagent */
export interface TransitionRule {
  condition: string | null;  // null = unconditional
  target: string;
}

// ─── Enumerated paths ─────────────────────────────────────────────────────────

/** One concrete end-to-end workflow path through the agent. */
export interface WorkflowPath {
  id: string;            // e.g. "wf01"
  title: string;         // e.g. "Identity verification failure"

  /** Ordered list of subagent names visited */
  agentChain: string[];

  /**
   * Mock overrides: maps action output field names → override values.
   * The enumerator sets fields like "customer_found", "case_number", etc.
   * using the actual field names declared in the .agent file's action outputs.
   * Special key: "__notes__" for LLM context hints (not used in code generation).
   */
  mocks: MockConfig;

  /** Expected final variable values */
  expectedState: Record<string, string | boolean | number | null>;

  /** Brief description of what makes this path unique */
  description: string;
}

/**
 * Open dictionary of action output field overrides.
 * Keys are the actual output field names from the .agent file (e.g. "customer_found",
 * "order_found", "case_number"), not domain-specific param names.
 * Special key "__notes__" is for LLM hints only and is ignored during code generation.
 */
export type MockConfig = Record<string, string | boolean | number | undefined>;

// ─── LLM-enriched paths ───────────────────────────────────────────────────────

/** A WorkflowPath enriched by LLM with natural language input + assertion hints. */
export interface EnrichedPath extends WorkflowPath {
  /** Natural language user message to send to the bot */
  naturalInput: string;
  /** Additional turn messages (for multi-turn tests) */
  additionalTurns?: string[];
  /** Human-readable assertion descriptions (used as test comments) */
  assertionComments: string[];
}
