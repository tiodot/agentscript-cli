/**
 * workflow-enumerator.ts
 *
 * Deterministically enumerates concrete WorkflowPath instances from a WorkflowSpec.
 *
 * Strategy:
 *  1. Always generate a "verification failure" path (primary success field = false).
 *  2. For each unique score-rule category (e.g. case_type values), generate paths at
 *     key score thresholds: below escalation (<60), at boundary (60–79), high (≥80).
 *  3. Generate a "resolution failure → score bump" path for low-score cases.
 *  4. Generate a "manual escalation" path (user triggers escalation below auto-threshold).
 *  5. Generate a "reset / new customer" path.
 *  6. Generate an "incomplete input" path.
 *
 * All mock values use actual output field names from the .agent spec (e.g. "customer_found",
 * "order_found", "case_number") — no hardcoded domain assumptions.
 */

import type { WorkflowSpec, WorkflowPath, MockConfig, ActionFieldSpec } from './types';

// Escalation routing thresholds (must match agent logic)
const ESCALATION_THRESHOLD = 60;
const SENIOR_THRESHOLD = 80;

export function enumerateWorkflows(spec: WorkflowSpec): WorkflowPath[] {
  const paths: WorkflowPath[] = [];

  // Find the start subagent name
  const startAgent = spec.subagents.find(s => s.isStart)?.name ?? spec.subagents[0]?.name ?? 'start';

  // Find escalation-related transition targets
  const escalationAgent = findTransitionTarget(spec, 'escalation');
  const resolutionAgent = findTransitionTarget(spec, 'resolution');

  // Discover the "primary success" field across all action outputs (e.g. customer_found, order_found)
  const fields = new DiscoveredFields(spec);

  // Determine unique score-rule categories (e.g. case types)
  const categories = [...new Set(spec.scoreRules.map(r => r.value))];

  let idx = 1;
  const id = () => `wf${String(idx++).padStart(2, '0')}`;

  // ── 1. Primary lookup failure ────────────────────────────────────────────────
  paths.push({
    id: id(),
    title: 'Identity verification failure',
    agentChain: [startAgent],
    mocks: {
      ...fields.failureMocks(),
      __notes__: 'Primary lookup returns not-found; verified=false stays',
    },
    expectedState: {
      ...fields.verifiedFalseState(),
    },
    description: `Primary lookup returns not-found — verified stays false`,
  });

  // ── 2–N. Per-category score paths ────────────────────────────────────────────
  const caseCounter = { n: 2 };

  for (const category of categories) {
    const addAmount = getScoreAdd(spec.scoreRules, category);

    // Low score → resolution
    if (resolutionAgent) {
      const prevBase = 0;
      const calcScore = prevBase + addAmount;
      if (calcScore < ESCALATION_THRESHOLD) {
        const caseNum = `CASE-E2E-${String(caseCounter.n++).padStart(3, '0')}`;
        paths.push({
          id: id(),
          title: `${formatCategory(category)} — direct resolution (score=${calcScore})`,
          agentChain: escalationAgent
            ? [startAgent, 'case_creation', resolutionAgent]
            : [startAgent, resolutionAgent],
          mocks: {
            ...fields.successMocks(caseNum),
            __notes__: `category=${category}, score=${calcScore}<60 → resolution`,
          },
          expectedState: {
            ...fields.verifiedTrueState(caseNum),
          },
          description: `${category}, score=${calcScore} → ${resolutionAgent}`,
        });
      }
    }

    // Medium score → escalation → manager
    if (escalationAgent) {
      const targetScore = 65;
      if (targetScore >= ESCALATION_THRESHOLD && targetScore < SENIOR_THRESHOLD) {
        const caseNum = `CASE-E2E-${String(caseCounter.n++).padStart(3, '0')}`;
        paths.push({
          id: id(),
          title: `${formatCategory(category)} — direct escalation to manager (score=${targetScore})`,
          agentChain: [startAgent, 'case_creation', escalationAgent],
          mocks: {
            ...fields.successMocks(caseNum),
            ...fields.scoreOverrideMocks(targetScore, 'manager'),
            __notes__: `category=${category}, score=${targetScore}>=60 → manager`,
          },
          expectedState: {
            ...fields.verifiedTrueState(caseNum),
            ...fields.escalationState('manager', 'high'),
          },
          description: `${category}, score=${targetScore} ≥ 60 → ${escalationAgent} (manager)`,
        });
      }

      // High score → escalation → senior_manager
      const highScore = addAmount + SENIOR_THRESHOLD > 100 ? SENIOR_THRESHOLD : addAmount + SENIOR_THRESHOLD;
      const caseNumHigh = `CASE-E2E-${String(caseCounter.n++).padStart(3, '0')}`;
      paths.push({
        id: id(),
        title: `${formatCategory(category)} — direct escalation to senior_manager (score=${highScore})`,
        agentChain: [startAgent, 'case_creation', escalationAgent],
        mocks: {
          ...fields.successMocks(caseNumHigh),
          ...fields.scoreOverrideMocks(highScore, 'senior_manager'),
          __notes__: `category=${category}, score=${highScore}>=80 → senior_manager`,
        },
        expectedState: {
          ...fields.verifiedTrueState(caseNumHigh),
          ...fields.escalationState('senior_manager', 'urgent'),
        },
        description: `${category}, score=${highScore} ≥ 80 → ${escalationAgent} (senior_manager)`,
      });
    }

    // Resolution failure → auto-escalate
    if (resolutionAgent && escalationAgent) {
      const prevBase = 10;
      const baseScore = prevBase + addAmount;
      const afterFailScore = baseScore + 20;
      if (baseScore < ESCALATION_THRESHOLD && afterFailScore >= ESCALATION_THRESHOLD) {
        const caseNum = `CASE-E2E-${String(caseCounter.n++).padStart(3, '0')}`;
        paths.push({
          id: id(),
          title: `${formatCategory(category)} — resolution fails, auto-escalate (score ${baseScore}→${afterFailScore})`,
          agentChain: [startAgent, 'case_creation', resolutionAgent, escalationAgent],
          mocks: {
            ...fields.successMocks(caseNum),
            ...fields.scoreOverrideMocks(baseScore, 'standard'),
            ...fields.resolutionFailureMocks(),
            __notes__: `resolution failed triggers +20 in after_call`,
          },
          expectedState: {
            ...fields.verifiedTrueState(caseNum),
            ...fields.escalatedState(),
          },
          description: `${category}, score ${baseScore}→${afterFailScore} after failed resolution → ${escalationAgent}`,
        });
      }
    }
  }

  // ── Manual escalation path ───────────────────────────────────────────────────
  if (resolutionAgent && escalationAgent) {
    const caseNum = `CASE-E2E-${String(caseCounter.n++).padStart(3, '0')}`;
    paths.push({
      id: id(),
      title: 'Resolution fails, user manually requests escalation',
      agentChain: [startAgent, 'case_creation', resolutionAgent, escalationAgent],
      mocks: {
        ...fields.successMocks(caseNum),
        ...fields.resolutionFailureMocks(),
        __notes__: 'score stays below 60 after +20; user explicitly requests specialist',
      },
      expectedState: {
        ...fields.verifiedTrueState(caseNum),
      },
      description: 'score < 60 after failure; LLM escalates manually → l2_support or manager',
    });
  }

  // ── Reset / new customer ─────────────────────────────────────────────────────
  paths.push({
    id: id(),
    title: 'Reset state for a new customer after completed session',
    agentChain: [startAgent],
    mocks: {
      ...fields.successMocks('CASE-E2E-RESET'),
      __notes__: 'bot.reset() clears all state',
    },
    expectedState: fields.resetState(spec),
    description: 'bot.reset() clears all state; verify fresh start',
  });

  // ── Incomplete input ─────────────────────────────────────────────────────────
  paths.push({
    id: id(),
    title: 'Incomplete input — only identity provided, no issue type',
    agentChain: [startAgent],
    mocks: {
      ...fields.successMocks(''),
      __notes__: 'User provides identity but no issue — bot asks for clarification',
    },
    expectedState: fields.verifiedTrueState(''),
    description: 'User provides identity but no category — bot asks for clarification',
  });

  return paths;
}

// ─── DiscoveredFields: field-name discovery from spec ────────────────────────

/**
 * Discovers the names of key output fields from the spec's action outputs,
 * so all mock values and expected state entries use real field names.
 */
class DiscoveredFields {
  /** The boolean field that signals successful lookup (e.g. "customer_found", "order_found") */
  readonly foundField: string | null;
  /** The string field for the entity's name (e.g. "customer_name") */
  readonly nameField: string | null;
  /** The string field for the entity's ID (e.g. "customer_id") */
  readonly idField: string | null;
  /** The string field for a case/ticket number (e.g. "case_number") */
  readonly caseNumberField: string | null;
  /** The boolean field for resolution success (e.g. "resolution_successful") */
  readonly resolutionField: string | null;
  /** The field that maps to the escalation score variable name in state */
  readonly escalationScoreVar: string | null;
  /** The field for escalation tier in state */
  readonly escalationTierVar: string | null;
  /** The field for case priority in state */
  readonly casePriorityVar: string | null;
  /** The field for escalation required flag in state */
  readonly escalationRequiredVar: string | null;

  constructor(private spec: WorkflowSpec) {
    // Find fields by scanning all action output specs
    const allFields = Object.values(spec.actionOutputFields).flat();

    this.foundField = this.findField(allFields, ['customer_found', 'order_found', 'verified', 'found']);
    this.nameField = this.findField(allFields, ['customer_name', 'name']);
    this.idField = this.findField(allFields, ['customer_id', 'id']);
    this.caseNumberField = this.findField(allFields, ['case_number']);
    this.resolutionField = this.findField(allFields, ['resolution_successful', 'resolved', 'success']);

    // Variable names from spec (for expectedState)
    const varNames = spec.variables.map(v => v.name);
    this.escalationScoreVar = varNames.find(n => n.includes('escalation_score') || n.includes('score')) ?? null;
    this.escalationTierVar = varNames.find(n => n.includes('escalation_tier') || n.includes('tier')) ?? null;
    this.casePriorityVar = varNames.find(n => n.includes('case_priority') || n.includes('priority')) ?? null;
    this.escalationRequiredVar = varNames.find(n => n.includes('escalation_required')) ?? null;
  }

  private findField(fields: ActionFieldSpec[], candidates: string[]): string | null {
    for (const candidate of candidates) {
      const found = fields.find(f => f.name === candidate);
      if (found) return found.name;
    }
    return null;
  }

  /** Mocks for a failed primary lookup — sets all co-fields to empty */
  failureMocks(): MockConfig {
    const m: MockConfig = {};
    if (this.foundField) m[this.foundField] = false;
    // Explicitly set dependent name/id fields to empty so the mock doesn't
    // return default "Test User" / "TEST-ID-001" when the lookup failed
    if (this.nameField) m[this.nameField] = '';
    if (this.idField) m[this.idField] = '';
    return m;
  }

  /** Mocks for a successful lookup */
  successMocks(caseNum: string): MockConfig {
    const m: MockConfig = {};
    if (this.foundField) m[this.foundField] = true;
    if (this.nameField) m[this.nameField] = 'Test User';
    if (this.idField) m[this.idField] = 'TEST-ID-001';
    if (this.caseNumberField && caseNum) m[this.caseNumberField] = caseNum;
    return m;
  }

  /** Mocks for score-based routing: sets escalation_score and recommended_tier
   *  so that calculate_escalation_score mock returns controlled values.
   */
  scoreOverrideMocks(score: number, tier: string): MockConfig {
    const m: MockConfig = {};
    // Find the field names from the spec's action outputs
    const allFields = Object.values(this.spec.actionOutputFields).flat();
    const scoreField = allFields.find(f => f.name === 'escalation_score' || f.name === 'score');
    const tierField = allFields.find(f => f.name === 'recommended_tier' || f.name === 'tier');
    const immediateField = allFields.find(f => f.name === 'immediate_escalation');
    if (scoreField) m[scoreField.name] = score;
    if (tierField) m[tierField.name] = tier;
    if (immediateField) m[immediateField.name] = score >= 80;
    return m;
  }

  /** Mocks that signal resolution failure */
  resolutionFailureMocks(): MockConfig {
    const m: MockConfig = {};
    if (this.resolutionField) m[this.resolutionField] = false;
    return m;
  }

  /** Expected state for failed verification */
  verifiedFalseState(): Record<string, string | boolean | number | null> {
    const state: Record<string, string | boolean | number | null> = {
      customer_verified: false,
    };
    if (this.idField && this.spec.variables.some(v => v.name === this.idField)) {
      state[this.idField] = '';
    } else if (this.spec.variables.some(v => v.name === 'customer_id')) {
      state.customer_id = '';
    }
    if (this.escalationRequiredVar) state[this.escalationRequiredVar] = false;
    return state;
  }

  /** Expected state for successful verification (+ optional case_number) */
  verifiedTrueState(caseNum: string): Record<string, string | boolean | number | null> {
    const state: Record<string, string | boolean | number | null> = {
      customer_verified: true,
    };
    if (this.caseNumberField && caseNum && this.spec.variables.some(v => v.name === this.caseNumberField)) {
      state[this.caseNumberField!] = caseNum;
    }
    return state;
  }

  /** Expected escalation state (tier + priority + required) */
  escalationState(tier: string, priority: string): Record<string, string | boolean | number | null> {
    const state: Record<string, string | boolean | number | null> = {};
    if (this.escalationTierVar) state[this.escalationTierVar] = tier;
    if (this.casePriorityVar) state[this.casePriorityVar] = priority;
    if (this.escalationRequiredVar) state[this.escalationRequiredVar] = true;
    return state;
  }

  /** Expected state after a case is escalated (escalation_required=true) */
  escalatedState(): Record<string, string | boolean | number | null> {
    const state: Record<string, string | boolean | number | null> = {};
    if (this.escalationRequiredVar) state[this.escalationRequiredVar] = true;
    return state;
  }

  /** Expected state after bot.reset() */
  resetState(spec: WorkflowSpec): Record<string, string | boolean | number | null> {
    const state: Record<string, string | boolean | number | null> = {
      customer_verified: false,
    };
    if (this.escalationScoreVar && spec.variables.some(v => v.name === this.escalationScoreVar)) {
      state[this.escalationScoreVar!] = 0;
    }
    if (this.casePriorityVar && spec.variables.some(v => v.name === this.casePriorityVar)) {
      state[this.casePriorityVar!] = 'normal';
    }
    if (this.escalationRequiredVar) state[this.escalationRequiredVar] = false;
    return state;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findTransitionTarget(spec: WorkflowSpec, keyword: string): string | undefined {
  for (const sa of spec.subagents) {
    for (const t of sa.transitions) {
      if (t.target.toLowerCase().includes(keyword)) return t.target;
    }
  }
  return undefined;
}

function getScoreAdd(rules: { value: string; amount: number }[], categoryValue: string): number {
  const rule = rules.find((r: any) => r.value === categoryValue);
  return rule?.amount ?? 20;
}

function formatCategory(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
