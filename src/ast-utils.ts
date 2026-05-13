/**
 * AST Utilities — extraction functions for ParsedAgentforce typed AST.
 *
 * The @agentscript/agentforce parser produces a Document with an AST where:
 * - Top-level blocks (system, config, variables, start_agent, topic) are on doc.ast
 * - Collection blocks use __children with MapEntryChild{name, value} objects
 * - Named blocks have direct properties (description, system, reasoning, actions, etc.)
 * - ProcedureValueNode (before/after_reasoning) uses .statements: Statement[]
 * - StringLiteral values are in .value property
 * - Expressions use various types (MemberExpression for @references)
 */

// Document type from the parser - we use it as `any` since the local bridge
// doesn't export TS declarations in a way the compiler can resolve.
type Document = any;

// ─── Data Types ───────────────────────────────────────

export interface ConfigData {
  agentName: string;
  defaultAgentUser: string;
  developerName?: string;
  description?: string;
}

export interface SystemData {
  instructions?: string;
  welcomeMessage?: string;
  errorMessage?: string;
}

export interface VariableData {
  name: string;
  type: string;
  mutable: boolean;
  linked: boolean;
  defaultValue: string;
  description?: string;
}

export interface SubagentData {
  name: string;
  kind: 'start_agent' | 'topic' | 'subagent';
  description: string;
  systemInstructions?: string;
  actions: ActionData[];
  beforeReasoning: LogicStatement[];
  reasoningInstructions?: string;
  reasoningActions: ReasoningActionData[];
  afterReasoning: LogicStatement[];
}

export interface ActionData {
  name: string;
  description: string;
  inputs: ParamData[];
  outputs: ParamData[];
  target?: string;
}

export interface ParamData {
  name: string;
  type: string;
  description?: string;
  isRequired?: boolean;
}

export interface ReasoningActionData {
  name: string;
  description?: string;
  reference: string;
  withBindings: { param: string; value: string }[];
  setBindings: { variable: string; value: string }[];
}

export type LogicStatement =
  | { kind: 'if'; condition: string; body: LogicStatement[]; elseBody?: LogicStatement[] }
  | { kind: 'run'; action: string; withBindings: { param: string; value: string }[]; setBindings: { variable: string; value: string }[] }
  | { kind: 'set'; variable: string; value: string }
  | { kind: 'transition'; target: string };

// ─── Helper Functions ─────────────────────────────────

/** Extract string value from a StringLiteral, TemplateExpression, or raw string */
function strVal(node: any): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number' || typeof node === 'boolean') return String(node);

  // Simple StringLiteral with .value
  if (typeof node.value === 'string') return node.value;

  // TemplateExpression (multiline strings with |) — has .parts array
  const kind = node.__kind ?? node.constructor?.name;
  if (kind === 'TemplateExpression' || kind === 'Template') {
    return templatePartsToString(node.parts);
  }

  // ProcedureValue (reasoning instructions with ->) — has .statements
  if (kind === 'ProcedureValue' && node.statements) {
    return node.statements.map((s: any) => strVal(s)).join('\n');
  }

  return String(node);
}

/** Convert Template parts (TemplateText + TemplateInterpolation) to string */
function templatePartsToString(parts: any[]): string {
  if (!parts || !Array.isArray(parts)) return '';
  return parts.map((p: any) => {
    const kind = p.__kind ?? p.constructor?.name;
    if (kind === 'TemplateText') return p.value ?? p.text ?? '';
    if (kind === 'TemplateInterpolation') return exprToString(p.expression);
    if (kind === 'StringLiteral') return p.value ?? '';
    if (p.value !== undefined) return String(p.value);
    return '';
  }).join('');
}

/** Iterate over __children of a collection/named-map block */
function iterChildren(block: any): Array<{ name: string; value: any }> {
  if (!block?.__children) return [];
  return block.__children
    .filter((c: any) => c.constructor?.name === 'MapEntryChild' || (c.name !== undefined && c.value !== undefined))
    .map((c: any) => ({
      name: strVal(c.name),
      value: c.value,
    }));
}

/** Get a named entry from a collection block by key name */
function getChildByName(block: any, name: string): any | undefined {
  for (const child of iterChildren(block)) {
    if (child.name === name) return child.value;
  }
  return undefined;
}

/** Extract expression to string representation */
function exprToString(expr: any): string {
  if (expr == null) return '';
  if (typeof expr === 'string') return expr;
  if (typeof expr === 'number' || typeof expr === 'boolean') return String(expr);

  // Check kind-specific logic first (before the generic .value check)
  const kind = expr.__kind ?? expr.constructor?.name;

  // AtIdentifier: @variables, @actions, @outputs, @utils
  if (kind === 'AtIdentifier') {
    return `@${expr.name}`;
  }

  // MemberExpression: @variables.x or @actions.Y
  if (kind === 'MemberExpression' || kind === 'Identifier') {
    if (expr.object && expr.property) {
      return `${exprToString(expr.object)}.${exprToString(expr.property)}`;
    }
    if (expr.name) return expr.name;
  }

  // SubscriptExpression: active_alerts[0]
  if (kind === 'SubscriptExpression') {
    return `${exprToString(expr.object)}[${exprToString(expr.index)}]`;
  }

  // Template expression (with parts — TemplateExpression kind)
  if (kind === 'TemplateExpression' || kind === 'Template') {
    return templatePartsToString(expr.parts);
  }

  // Template expression (legacy — just .content)
  if (kind === 'Template' && expr.content) return expr.content;

  // BinaryExpression
  if (kind === 'BinaryExpression') {
    return `${exprToString(expr.left)} ${expr.operator} ${exprToString(expr.right)}`;
  }

  // ComparisonExpression
  if (kind === 'ComparisonExpression') {
    return `${exprToString(expr.left)} ${expr.operator} ${exprToString(expr.right)}`;
  }

  // BooleanLiteral
  if (kind === 'BooleanLiteral') return expr.value ? 'True' : 'False';

  // NumberLiteral
  if (kind === 'NumberLiteral') return String(expr.value);

  // StringLiteral — preserve quotes for Python
  if (kind === 'StringLiteral') return `"${expr.value}"`;

  // Template interpolation {!@actions.X}
  if (kind === 'TemplateInterpolation') {
    return exprToString(expr.expression);
  }

  // TemplateText
  if (kind === 'TemplateText') return expr.value ?? expr.text ?? '';

  // ExpressionSequence
  if (kind === 'ExpressionSequence' && expr.__children) {
    return expr.__children.map(exprToString).join('');
  }

  // Generic fallback: if the node has a .value property, use strVal
  if (expr.value !== undefined) return strVal(expr);

  // Fallback: try __emit or stringify
  return String(expr);
}

// ─── Extraction Functions ──────────────────────────────

export function extractConfig(ast: any): ConfigData {
  const cfg = ast.config ?? {};
  return {
    agentName: strVal(cfg.agent_name),
    defaultAgentUser: strVal(cfg.default_agent_user),
    developerName: strVal(cfg.developer_name),
    description: strVal(cfg.description),
  };
}

export function extractSystem(ast: any): SystemData {
  const sys = ast.system ?? {};
  const msgs = sys.messages ?? {};
  return {
    instructions: strVal(sys.instructions),
    welcomeMessage: strVal(msgs.welcome),
    errorMessage: strVal(msgs.error),
  };
}

export function extractVariables(ast: any): VariableData[] {
  const varsBlock = ast.variables;
  if (!varsBlock) return [];

  const entries = iterChildren(varsBlock);
  return entries.map(({ name, value }) => {
    const decl = value;
    const modifier = decl?.modifier?.value ?? decl?.modifier?.name ?? '';
    const mutable = modifier === 'mutable';
    const linked = modifier === 'linked';
    const type = exprToString(decl?.type ?? decl?.__type);
    const defaultValue = exprToString(decl?.defaultValue ?? decl?.__defaultValue);

    // Extract description from properties block
    let description: string | undefined;
    if (decl?.properties) {
      const desc = decl.properties.description;
      if (desc) description = strVal(desc);
    }

    return {
      name,
      type,
      mutable,
      linked,
      defaultValue,
      description,
    };
  });
}

export function extractSubagents(ast: any): SubagentData[] {
  const result: SubagentData[] = [];

  // Extract start_agent entries
  if (ast.start_agent) {
    for (const { name, value } of iterChildren(ast.start_agent)) {
      result.push(extractAgentEntry(name, value, 'start_agent'));
    }
  }

  // Extract topic entries
  if (ast.topic) {
    for (const { name, value } of iterChildren(ast.topic)) {
      result.push(extractAgentEntry(name, value, 'topic'));
    }
  }

  // Extract subagent entries
  if (ast.subagent) {
    for (const { name, value } of iterChildren(ast.subagent)) {
      result.push(extractAgentEntry(name, value, 'subagent'));
    }
  }

  return result;
}

function extractAgentEntry(name: string, block: any, kind: 'start_agent' | 'topic' | 'subagent'): SubagentData {
  const description = strVal(block?.description ?? block?.name);

  // System instructions
  let systemInstructions: string | undefined;
  if (block?.system?.instructions) {
    systemInstructions = strVal(block.system.instructions);
  }

  // Actions
  const actions: ActionData[] = [];
  if (block?.actions) {
    for (const { name: actName, value: actVal } of iterChildren(block.actions)) {
      actions.push(extractAction(actName, actVal));
    }
  }

  // Before reasoning (ProcedureValueNode)
  const beforeReasoning = extractLogicStatements(block?.before_reasoning?.statements ?? []);

  // Reasoning — instructions may be ProcedureValue (with .statements) or a simple string
  let reasoningInstructions: string | undefined;
  if (block?.reasoning?.instructions) {
    reasoningInstructions = strVal(block.reasoning.instructions);
  }
  const reasoningActions: ReasoningActionData[] = [];
  if (block?.reasoning?.actions) {
    for (const { name: raName, value: raVal } of iterChildren(block.reasoning.actions)) {
      reasoningActions.push(extractReasoningAction(raName, raVal));
    }
  }

  // After reasoning (ProcedureValueNode)
  const afterReasoning = extractLogicStatements(block?.after_reasoning?.statements ?? []);

  return {
    name,
    kind,
    description,
    systemInstructions,
    actions,
    beforeReasoning,
    reasoningInstructions,
    reasoningActions,
    afterReasoning,
  };
}

function extractAction(name: string, block: any): ActionData {
  const description = strVal(block?.description);
  const target = strVal(block?.target);

  // Inputs
  const inputs: ParamData[] = [];
  if (block?.inputs) {
    for (const { name: inpName, value: inpVal } of iterChildren(block.inputs)) {
      inputs.push(extractParam(inpName, inpVal));
    }
  }

  // Outputs
  const outputs: ParamData[] = [];
  if (block?.outputs) {
    for (const { name: outName, value: outVal } of iterChildren(block.outputs)) {
      outputs.push(extractParam(outName, outVal));
    }
  }

  return { name, description, inputs, outputs, target };
}

function extractParam(name: string, decl: any): ParamData {
  const type = exprToString(decl?.type ?? decl?.__type);
  const description = strVal(decl?.description ?? decl?.properties?.description);
  const isRequired = decl?.is_required?.value ?? decl?.properties?.is_required?.value ?? false;
  return { name, type, description, isRequired: Boolean(isRequired) };
}

function extractReasoningAction(name: string, block: any): ReasoningActionData {
  const description = strVal(block?.description);
  // The reference for @utils.transition, @utils.setVariables etc.
  const reference = exprToString(block?.reference ?? block?.__reference);

  // with bindings
  const withBindings: { param: string; value: string }[] = [];
  if (block?.with) {
    for (const { name: wName, value: wVal } of iterChildren(block.with)) {
      withBindings.push({ param: wName, value: exprToString(wVal) });
    }
  }
  // Also check __children for WithClause nodes
  if (block?.__children) {
    for (const child of block.__children) {
      if (child.__kind === 'WithClause' || child.constructor?.name === 'WithClause') {
        withBindings.push({ param: child.param ?? strVal(child.__param), value: exprToString(child.value) });
      }
    }
  }

  // set bindings
  const setBindings: { variable: string; value: string }[] = [];
  if (block?.set) {
    for (const { name: sName, value: sVal } of iterChildren(block.set)) {
      setBindings.push({ variable: sName, value: exprToString(sVal) });
    }
  }
  // Also check __children for SetClause nodes
  if (block?.__children) {
    for (const child of block.__children) {
      if (child.__kind === 'SetClause' || child.constructor?.name === 'SetClause') {
        setBindings.push({ variable: exprToString(child.target), value: exprToString(child.value) });
      }
    }
  }

  return { name, description, reference, withBindings, setBindings };
}

function extractLogicStatements(stmts: any[]): LogicStatement[] {
  if (!stmts || !Array.isArray(stmts)) return [];
  return stmts.map(stmt => {
    const kind = stmt.__kind ?? stmt.constructor?.name;
    switch (kind) {
      case 'IfStatement':
        return {
          kind: 'if' as const,
          condition: exprToString(stmt.condition),
          body: extractLogicStatements(stmt.body ?? []),
          elseBody: stmt.orelse?.length > 0 ? extractLogicStatements(stmt.orelse) : undefined,
        };
      case 'RunStatement':
        return {
          kind: 'run' as const,
          action: exprToString(stmt.target),
          withBindings: (stmt.body ?? [])
            .filter((b: any) => b.__kind === 'WithClause')
            .map((b: any) => ({ param: b.param ?? strVal(b.__param), value: exprToString(b.value) })),
          setBindings: (stmt.body ?? [])
            .filter((b: any) => b.__kind === 'SetClause')
            .map((b: any) => ({ variable: exprToString(b.target), value: exprToString(b.value) })),
        };
      case 'SetClause':
        return {
          kind: 'set' as const,
          variable: exprToString(stmt.target),
          value: exprToString(stmt.value),
        };
      case 'TransitionStatement':
        // Transition contains clauses like ToClause
        const toClause = (stmt.clauses ?? []).find((c: any) => c.__kind === 'ToClause');
        return {
          kind: 'transition' as const,
          target: toClause ? exprToString(toClause.target) : '',
        };
      default:
        // Unknown statement type — skip
        return { kind: 'transition' as const, target: `# unknown: ${kind}` };
    }
  });
}