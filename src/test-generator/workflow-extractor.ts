/**
 * workflow-extractor.ts
 *
 * Deterministically extracts a WorkflowSpec from parsed SubagentData[].
 * No LLM involved — pure structural analysis of the .agent AST.
 */

import type {
  SubagentData,
  VariableData,
  LogicStatement,
  ConfigData,
} from '../ast-utils';
import type {
  WorkflowSpec,
  SubagentSpec,
  VariableSpec,
  ActionFieldSpec,
  ScoreRule,
  ConditionalSet,
  TransitionRule,
} from './types';
import { ToolGenerator } from '../generator/tool-generator';

const toolGen = new ToolGenerator();

// ─── Public entry point ───────────────────────────────────────────────────────

export function extractWorkflowSpec(
  config: ConfigData,
  variables: VariableData[],
  subagents: SubagentData[],
): WorkflowSpec {
  const agentSlug = toSnake(config.agentName || config.developerName || 'agent');
  const fixtureModule = agentSlug;
  const fixtureClass = 'AgentBot';

  const varSpecs: VariableSpec[] = variables.map(v => ({
    name: v.name,
    type: inferType(v.type, v.defaultValue),
    defaultValue: parseDefault(v.type, v.defaultValue),
  }));

  const subagentSpecs: SubagentSpec[] = subagents.map(sa => extractSubagentSpec(sa));

  // Collect all unique action names and their output fields across all subagents
  const seenActions = new Set<string>();
  const actionNames: string[] = [];
  const actionOutputFields: Record<string, ActionFieldSpec[]> = {};
  for (const sa of subagents) {
    for (const action of sa.actions) {
      const snake = toSnake(action.name);
      if (!seenActions.has(snake)) {
        seenActions.add(snake);
        actionNames.push(snake);
        actionOutputFields[snake] = (action.outputs ?? []).map((o: any): ActionFieldSpec => ({
          name: o.name,
          type: inferFieldType(o.type ?? ''),
        }));
      }
    }
  }

  // Extract score rules from before_reasoning (e.g. case_type == "billing" → escalation_score += 30)
  const scoreRules: ScoreRule[] = [];
  for (const sa of subagents) {
    extractScoreRules(sa.beforeReasoning, scoreRules);
  }

  return {
    agentSlug,
    fixtureClass,
    fixtureModule,
    subagents: subagentSpecs,
    variables: varSpecs,
    actionNames,
    actionOutputFields,
    scoreRules,
  };
}

// ─── Subagent spec extraction ─────────────────────────────────────────────────

function extractSubagentSpec(sa: SubagentData): SubagentSpec {
  const beforeSets: ConditionalSet[] = [];
  const transitions: TransitionRule[] = [];

  // Scan before_reasoning for conditional sets
  for (const stmt of sa.beforeReasoning) {
    extractConditionalSets(stmt, beforeSets);
  }

  // Scan after_reasoning for transitions
  for (const stmt of sa.afterReasoning) {
    extractTransitions(stmt, transitions);
  }

  // Also scan before_reasoning for unconditional transitions (rare)
  for (const stmt of sa.beforeReasoning) {
    extractTransitions(stmt, transitions);
  }

  // Collect unique action names called in after_reasoning run statements
  const afterActions: string[] = [];
  const seenAct = new Set<string>();
  for (const stmt of sa.afterReasoning) {
    collectRunActions(stmt, afterActions, seenAct);
  }

  return {
    name: sa.name,
    isStart: sa.kind === 'start_agent',
    beforeSets,
    transitions,
    afterActions,
  };
}

function extractConditionalSets(stmt: LogicStatement, acc: ConditionalSet[]): void {
  if (stmt.kind === 'if') {
    for (const body of stmt.body) {
      if (body.kind === 'set') {
        acc.push({
          condition: stmt.condition,
          variable: body.variable.replace('@variables.', ''),
          setValue: body.value,
        });
      }
      // Recurse into nested ifs
      extractConditionalSets(body, acc);
    }
  }
}

function extractTransitions(stmt: LogicStatement, acc: TransitionRule[]): void {
  if (stmt.kind === 'transition') {
    const target = stmt.target.replace('@subagent.', '').replace('@topic.', '');
    if (target && !target.startsWith('#')) {
      acc.push({ condition: null, target });
    }
  } else if (stmt.kind === 'if') {
    for (const body of stmt.body) {
      if (body.kind === 'transition') {
        const target = body.target.replace('@subagent.', '').replace('@topic.', '');
        if (target && !target.startsWith('#')) {
          acc.push({ condition: stmt.condition, target });
        }
      }
      extractTransitions(body, acc);
    }
  }
}

function collectRunActions(stmt: LogicStatement, acc: string[], seen: Set<string>): void {
  if (stmt.kind === 'run') {
    const name = toSnake(stmt.action.replace('@actions.', ''));
    if (!seen.has(name)) { seen.add(name); acc.push(name); }
  } else if (stmt.kind === 'if') {
    for (const b of stmt.body) collectRunActions(b, acc, seen);
  }
}

// ─── Score rule extraction ────────────────────────────────────────────────────

/**
 * Extracts rules like:
 *   if @variables.case_type == "billing":
 *       set @variables.escalation_score = @variables.escalation_score + 30
 */
function extractScoreRules(stmts: LogicStatement[], acc: ScoreRule[]): void {
  for (const stmt of stmts) {
    if (stmt.kind !== 'if') continue;

    // Parse condition: @variables.X == "Y"
    const condMatch = stmt.condition.match(/@variables\.(\w+)\s*==\s*"([^"]+)"/);
    if (!condMatch) continue;
    const [, condVar, condVal] = condMatch;

    for (const body of stmt.body) {
      if (body.kind !== 'set') continue;
      const varName = body.variable.replace('@variables.', '');
      // Parse RHS: @variables.X + N
      const addMatch = body.value.match(/@variables\.\w+\s*\+\s*(\d+)/);
      if (addMatch) {
        acc.push({
          variable: condVar,
          value: condVal,
          addTo: varName,
          amount: parseInt(addMatch[1], 10),
        });
      }
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inferFieldType(typeStr: string): ActionFieldSpec['type'] {
  const t = typeStr.toLowerCase().trim();
  if (t === 'boolean') return 'boolean';
  if (t === 'number' || t === 'integer' || t === 'float') return 'number';
  if (t === 'string') return 'string';
  if (t === 'object' || t === 'dict' || t === 'array') return 'object';
  return 'unknown';
}

function toSnake(name: string): string {
  return name
    .replace(/([A-Z])/g, '_$1').toLowerCase()
    .replace(/^_/, '').replace(/_+/g, '_');
}

function inferType(typeStr: string, defaultVal: string): 'string' | 'boolean' | 'number' {
  if (typeStr === 'boolean' || defaultVal === 'True' || defaultVal === 'False') return 'boolean';
  if (typeStr === 'number') return 'number';
  return 'string';
}

function parseDefault(typeStr: string, defaultVal: string): string | boolean | number {
  if (typeStr === 'boolean' || defaultVal === 'True' || defaultVal === 'False') {
    return defaultVal === 'True';
  }
  if (typeStr === 'number') return parseFloat(defaultVal) || 0;
  // Strip surrounding quotes
  return defaultVal.replace(/^["']|["']$/g, '');
}
