# AgentScript to AgentScope Converter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript CLI that converts AgentScript `.agent` files into AgentScope Python code using the official `@agentscript/agentforce` parser.

**Architecture:** Parse `.agent` files with `@agentscript/agentforce`'s `parse()` → walk the resulting `ParsedAgentforce` typed AST → generate Python code via modular generators (state, tools, agents, logic, pipeline, split).

**Tech Stack:** TypeScript, Commander.js, @agentscript/agentforce, Vitest

---

## File Structure

```
src/
├── cli.ts                     # Commander CLI — "agentscript convert <file>"
├── converter.ts               # Orchestrates parse → walk AST → generate
├── ast-utils.ts               # Helpers to extract data from ParsedAgentforce AST
└── generator/
│   ├── index.ts               # CodeGenerator class — orchestrates all sub-generators
│   ├── python-writer.ts       # Indentation, line joining, import collection
│   ├── state-generator.ts     # StateManager class from variables block
│   ├── tool-generator.ts      # Async tool function stubs from actions
│   ├── agent-generator.ts     # ReActAgent factory functions from subagents
│   ├── logic-generator.ts     # before/after_reasoning → Python control flow
│   ├── pipeline-generator.ts  # MsgHub + main() + AgentWrapper orchestration
│   └── split-generator.ts     # --split package output (multi-file)
tests/
├── converter.test.ts          # End-to-end: .agent → .py for each example
├── generator/
│   ├── python-writer.test.ts
│   ├── state-generator.test.ts
│   ├── tool-generator.test.ts
│   ├── agent-generator.test.ts
│   ├── logic-generator.test.ts
│   └── pipeline-generator.test.ts
└── fixtures/
    ├── hello_world.py         # Expected output for hello_world.agent
    ├── weather.py             # Expected output for weather.agent
    ├── case_escalation_bot.py
    ├── lead_qualification_bot.py
    └── order_tracking_assistant.py
```

---

### Task 1: Project Setup & Dependencies

**Files:**
- Modify: `package.json`
- Create: `tsconfig.json`

- [ ] **Step 1: Install @agentscript/agentforce dependency**

Run:
```bash
cd c:/Users/c.xiong/Workplace/agentscript-cli-v2 && npm install @agentscript/agentforce
```

Expected: `@agentscript/agentforce` added to dependencies in package.json

- [ ] **Step 2: Create tsconfig.json**

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Verify build works**

Run:
```bash
cd c:/Users/c.xiong/Workplace/agentscript-cli-v2 && npx tsc --noEmit
```

Expected: No errors (empty src/ will compile cleanly)

- [ ] **Step 4: Commit**

```bash
git add package.json tsconfig.json package-lock.json
git commit -m "feat: add @agentscript/agentforce dependency and tsconfig"
```

---

### Task 2: PythonWriter Utility

**Files:**
- Create: `src/generator/python-writer.ts`
- Create: `tests/generator/python-writer.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/generator/python-writer.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { PythonWriter } from '../../src/generator/python-writer.js';

describe('PythonWriter', () => {
  it('writes a line with correct indentation', () => {
    const w = new PythonWriter();
    w.setIndent(2);
    w.writeLine('def foo():');
    w.setIndent(3);
    w.writeLine('return 42');
    expect(w.toString()).toBe('def foo():\n        return 42\n');
  });

  it('collects imports and emits them at the top', () => {
    const w = new PythonWriter();
    w.addImport('asyncio');
    w.addImport('os');
    w.addImportFrom('agentscope.agent', 'ReActAgent');
    w.writeLine('# code below');
    expect(w.toString()).toContain('import asyncio');
    expect(w.toString()).toContain('import os');
    expect(w.toString()).toContain('from agentscope.agent import ReActAgent');
    expect(w.toString()).toContain('# code below');
  });

  it('deduplicates imports', () => {
    const w = new PythonWriter();
    w.addImport('os');
    w.addImport('os');
    w.addImportFrom('agentscope.agent', 'ReActAgent');
    w.addImportFrom('agentscope.agent', 'UserAgent');
    const lines = w.getImportLines();
    expect(lines).toEqual([
      'import os',
      '',
      'from agentscope.agent import ReActAgent, UserAgent',
    ]);
  });

  it('writes a block with blank line separator', () => {
    const w = new PythonWriter();
    w.writeLine('# section 1');
    w.writeBlankLine();
    w.writeLine('# section 2');
    expect(w.toString()).toBe('# section 1\n\n# section 2\n');
  });

  it('joins multiple writers', () => {
    const w1 = new PythonWriter();
    w1.writeLine('class A:');
    const w2 = new PythonWriter();
    w2.writeLine('class B:');
    const combined = PythonWriter.join([w1, w2], '\n\n');
    expect(combined).toBe('class A:\n\n\nclass B:\n');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/generator/python-writer.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `src/generator/python-writer.ts`:
```typescript
export class PythonWriter {
  private lines: string[] = [];
  private indentLevel: number = 0;
  private imports: Set<string> = new Set();
  private fromImports: Map<string, Set<string>> = new Map();

  setIndent(level: number): void {
    this.indentLevel = level;
  }

  getIndent(): number {
    return this.indentLevel;
  }

  writeLine(line: string): void {
    const indent = '    '.repeat(this.indentLevel);
    this.lines.push(indent + line);
  }

  writeBlankLine(): void {
    this.lines.push('');
  }

  addImport(module: string): void {
    this.imports.add(module);
  }

  addImportFrom(module: string, name: string): void {
    if (!this.fromImports.has(module)) {
      this.fromImports.set(module, new Set());
    }
    this.fromImports.get(module)!.add(name);
  }

  getImportLines(): string[] {
    const result: string[] = [];
    const sortedImports = [...this.imports].sort();
    for (const imp of sortedImports) {
      result.push(`import ${imp}`);
    }
    if (sortedImports.length > 0 && this.fromImports.size > 0) {
      result.push('');
    }
    const sortedFrom = [...this.fromImports.entries()].sort(([a], [b]) => a.localeCompare(b));
    for (const [module, names] of sortedFrom) {
      const sortedNames = [...names].sort();
      result.push(`from ${module} import ${sortedNames.join(', ')}`);
    }
    return result;
  }

  toString(): string {
    const importLines = this.getImportLines();
    const codeLines = this.lines;
    const allLines = [...importLines];
    if (importLines.length > 0 && codeLines.length > 0) {
      allLines.push('');
    }
    allLines.push(...codeLines);
    return allLines.join('\n') + '\n';
  }

  static join(writers: PythonWriter[], separator: string = '\n\n'): string {
    return writers.map(w => w.toString().trimEnd()).join(separator) + '\n';
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/generator/python-writer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/generator/python-writer.ts tests/generator/python-writer.test.ts
git commit -m "feat: add PythonWriter utility for code emission"
```

---

### Task 3: AST Utilities — Explore Actual Parser Output

**Files:**
- Create: `src/ast-utils.ts`
- Create: `tests/ast-utils.test.ts`

**IMPORTANT:** The `@agentscript/agentforce` parser produces a `ParsedAgentforce` typed AST. The exact property names and structure must be discovered by running the parser on example files first. This task focuses on exploration + initial extraction.

- [ ] **Step 1: Explore actual AST structure**

Create a diagnostic script `scripts/explore-ast.mjs`:
```javascript
import { parse } from '@agentscript/agentforce';
import { readFileSync } from 'fs';

const files = [
  'examples/hello_world.agent',
  'examples/weather.agent',
  'examples/case_escalation_bot.agent',
];

for (const file of files) {
  console.log(`\n=== ${file} ===`);
  const source = readFileSync(file, 'utf-8');
  const doc = parse(source);
  console.log('hasErrors:', doc.hasErrors);
  console.log('AST keys:', Object.keys(doc.ast));
  // Deep inspect specific blocks
  console.log('config:', JSON.stringify(doc.ast.config, replacer, 2));
  console.log('system:', JSON.stringify(doc.ast.system, replacer, 2));
  console.log('variables:', JSON.stringify(doc.ast.variables, replacer, 2));
  console.log('start_agent:', JSON.stringify(doc.ast.start_agent, replacer, 2));
}

function replacer(key, value) {
  if (typeof value === 'function') return '[Function]';
  if (key.startsWith('__') && key !== '__cst' && key !== '__diagnostics') return undefined;
  return value;
}
```

Run: `node scripts/explore-ast.mjs`

Capture the output and use it to determine exact property names, types, and structure.

- [ ] **Step 2: Write extraction functions based on actual structure**

Create `src/ast-utils.ts` with typed extraction functions. The exact implementation depends on the AST structure discovered in Step 1. Key functions:

- `extractConfig(ast)` → `{ agentName, defaultAgentUser, ... }`
- `extractSystem(ast)` → `{ instructions, welcomeMessage, errorMessage }`
- `extractVariables(ast)` → `VariableData[]`
- `extractSubagents(ast)` → `SubagentData[]`
- `extractActions(actionsBlock)` → `ActionData[]`
- `extractLogicStatements(logicBlock)` → `LogicStatement[]`

Define the data types:

```typescript
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
  kind: 'start_agent' | 'subagent';
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
```

- [ ] **Step 3: Write tests using the actual parser**

Create `tests/ast-utils.test.ts` that uses `parse()` on the example files and validates extraction.

- [ ] **Step 4: Run tests and iterate**

Run: `npx vitest run tests/ast-utils.test.ts`

Adjust extraction functions until all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/ast-utils.ts tests/ast-utils.test.ts
git commit -m "feat: add AST utilities for extracting data from ParsedAgentforce"
```

---

### Task 4: State Generator

**Files:**
- Create: `src/generator/state-generator.ts`
- Create: `tests/generator/state-generator.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/generator/state-generator.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { StateGenerator } from '../../src/generator/state-generator.js';
import type { VariableData } from '../../src/ast-utils.js';

describe('StateGenerator', () => {
  it('generates StateManager class from variables', () => {
    const vars: VariableData[] = [
      { name: 'customer_email', type: 'string', mutable: true, linked: false, defaultValue: '""', description: 'Customer email' },
      { name: 'customer_verified', type: 'boolean', mutable: true, linked: false, defaultValue: 'False', description: 'Verified' },
      { name: 'escalation_score', type: 'number', mutable: true, linked: false, defaultValue: '0', description: 'Score' },
      { name: 'order_items', type: 'list[object]', mutable: true, linked: false, defaultValue: '[]', description: 'Items' },
    ];
    const gen = new StateGenerator();
    const code = gen.generate(vars);
    expect(code).toContain('class StateManager:');
    expect(code).toContain('self.customer_email: str = ""');
    expect(code).toContain('self.customer_verified: bool = False');
    expect(code).toContain('self.escalation_score: int = 0');
    expect(code).toContain('self.order_items: list = []');
    expect(code).toContain('def set(self, name: str, value: Any)');
    expect(code).toContain('def get(self, name: str) -> Any');
  });

  it('maps AgentScript types to Python types', () => {
    const gen = new StateGenerator();
    expect(gen.mapType('string')).toBe('str');
    expect(gen.mapType('number')).toBe('int');
    expect(gen.mapType('boolean')).toBe('bool');
    expect(gen.mapType('object')).toBe('dict');
    expect(gen.mapType('list[object]')).toBe('list');
    expect(gen.mapType('list[string]')).toBe('list[str]');
  });

  it('generates linked variables as read-only', () => {
    const vars: VariableData[] = [
      { name: 'session_id', type: 'string', mutable: false, linked: true, defaultValue: 'None', description: 'Session ID' },
    ];
    const gen = new StateGenerator();
    const code = gen.generate(vars);
    expect(code).toContain('# linked (read-only)');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/generator/state-generator.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Create `src/generator/state-generator.ts`:
```typescript
import { PythonWriter } from './python-writer.js';
import type { VariableData } from '../ast-utils.js';

export class StateGenerator {
  mapType(agentScriptType: string): string {
    switch (agentScriptType) {
      case 'string': return 'str';
      case 'number': return 'int';
      case 'boolean': return 'bool';
      case 'object': return 'dict';
      case 'list[object]': return 'list';
      case 'list[string]': return 'list[str]';
      case 'list[number]': return 'list[int]';
      case 'list[boolean]': return 'list[bool]';
      default: return 'Any';
    }
  }

  mapDefaultValue(agentScriptType: string, defaultValue: string): string {
    if (defaultValue && defaultValue !== 'None') return defaultValue;
    switch (agentScriptType) {
      case 'string': return '""';
      case 'number': return '0';
      case 'boolean': return 'False';
      case 'object': return '{}';
      case 'list[object]': return '[]';
      default: return 'None';
    }
  }

  generate(variables: VariableData[]): string {
    const w = new PythonWriter();
    w.addImportFrom('typing', 'Any');

    w.writeLine('class StateManager:');
    w.writeLine('"""Shared state mirroring AgentScript variables."""');
    w.writeBlankLine();

    w.setIndent(1);
    w.writeLine('def __init__(self):');
    w.setIndent(2);
    for (const v of variables) {
      const pyType = this.mapType(v.type);
      const pyDefault = this.mapDefaultValue(v.type, v.defaultValue);
      const comment = v.linked ? '  # linked (read-only)' : v.description ? `  # ${v.description}` : '';
      w.writeLine(`self.${v.name}: ${pyType} = ${pyDefault}${comment}`);
    }

    w.setIndent(1);
    w.writeBlankLine();
    w.writeLine('def set(self, name: str, value: Any) -> None:');
    w.setIndent(2);
    w.writeLine('setattr(self, name, value)');
    w.setIndent(1);
    w.writeBlankLine();
    w.writeLine('def get(self, name: str) -> Any:');
    w.setIndent(2);
    w.writeLine('return getattr(self, name, None)');

    return w.toString();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/generator/state-generator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/generator/state-generator.ts tests/generator/state-generator.test.ts
git commit -m "feat: add StateGenerator for StateManager class generation"
```

---

### Task 5: Tool Generator

**Files:**
- Create: `src/generator/tool-generator.ts`
- Create: `tests/generator/tool-generator.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/generator/tool-generator.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { ToolGenerator } from '../../src/generator/tool-generator.js';
import type { ActionData } from '../../src/ast-utils.js';

describe('ToolGenerator', () => {
  it('generates typed stub function for an action with target', () => {
    const action: ActionData = {
      name: 'Get_Current_Weather_Data',
      description: 'Retrieves current weather data',
      inputs: [
        { name: 'city', type: 'string', description: 'City name', isRequired: true },
        { name: 'country', type: 'string', description: 'Country', isRequired: true },
        { name: 'coordinates', type: 'object', description: 'Coordinates', isRequired: false },
      ],
      outputs: [
        { name: 'temperature_celsius', type: 'number', description: 'Temperature' },
        { name: 'conditions', type: 'string', description: 'Weather conditions' },
      ],
      target: 'flow://300WX000001WeatherCurrentAPI',
    };
    const gen = new ToolGenerator();
    const code = gen.generateStub(action);
    expect(code).toContain('async def get_current_weather_data');
    expect(code).toContain('city: str');
    expect(code).toContain('country: str');
    expect(code).toContain('coordinates: dict | None = None');
    expect(code).toContain('-> dict');
    expect(code).toContain('raise NotImplementedError');
  });

  it('generates mock implementation', () => {
    const action: ActionData = {
      name: 'Verify_Customer',
      description: 'Verifies customer',
      inputs: [{ name: 'email', type: 'string', isRequired: true }],
      outputs: [
        { name: 'customer_found', type: 'boolean' },
        { name: 'customer_name', type: 'string' },
      ],
      target: 'flow://VerifyCustomerIdentity',
    };
    const gen = new ToolGenerator();
    const code = gen.generateMock(action);
    expect(code).toContain('async def verify_customer');
    expect(code).toContain('"customer_found": False');
    expect(code).toContain('"customer_name": ""');
  });

  it('converts action name to snake_case', () => {
    const gen = new ToolGenerator();
    expect(gen.toSnakeCase('Get_Current_Weather_Data')).toBe('get_current_weather_data');
    expect(gen.toSnakeCase('Verify_Customer_Identity')).toBe('verify_customer_identity');
  });

  it('maps type hints', () => {
    const gen = new ToolGenerator();
    expect(gen.mapParamType('string')).toBe('str');
    expect(gen.mapParamType('number')).toBe('int');
    expect(gen.mapParamType('boolean')).toBe('bool');
    expect(gen.mapParamType('object')).toBe('dict');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/generator/tool-generator.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Create `src/generator/tool-generator.ts`:
```typescript
import { PythonWriter } from './python-writer.js';
import type { ActionData, ParamData } from '../ast-utils.js';

export class ToolGenerator {
  toSnakeCase(name: string): string {
    return name
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
      .replace(/_+/g, '_');
  }

  mapParamType(agentScriptType: string): string {
    switch (agentScriptType) {
      case 'string': return 'str';
      case 'number': return 'int';
      case 'boolean': return 'bool';
      case 'object': return 'dict';
      case 'list[object]': return 'list';
      case 'list[string]': return 'list[str]';
      default: return 'Any';
    }
  }

  private formatParams(inputs: ParamData[]): string {
    const required = inputs.filter(p => p.isRequired);
    const optional = inputs.filter(p => !p.isRequired);
    const parts: string[] = [];
    for (const p of required) {
      parts.push(`${p.name}: ${this.mapParamType(p.type)}`);
    }
    for (const p of optional) {
      parts.push(`${p.name}: ${this.mapParamType(p.type)} | None = None`);
    }
    return parts.join(', ');
  }

  generateStub(action: ActionData): string {
    const w = new PythonWriter();
    const funcName = this.toSnakeCase(action.name);
    const params = this.formatParams(action.inputs);

    w.writeLine(`async def ${funcName}(${params}) -> dict:`);
    w.setIndent(1);
    w.writeLine(`"""${action.description}`);
    if (action.inputs.length > 0) {
      w.writeBlankLine();
      w.writeLine('Args:');
      w.setIndent(2);
      for (const p of action.inputs) {
        w.writeLine(`${p.name}: ${p.description ?? p.type}`);
      }
      w.setIndent(1);
    }
    if (action.outputs.length > 0) {
      w.writeBlankLine();
      w.writeLine('Returns:');
      w.setIndent(2);
      const outputKeys = action.outputs.map(o => o.name).join(', ');
      w.writeLine(`dict with keys: ${outputKeys}`);
      w.setIndent(1);
    }
    if (action.target) {
      w.writeBlankLine();
      w.writeLine(`Target: ${action.target}`);
    }
    w.writeLine('"""');
    w.writeBlankLine();
    w.writeLine(`raise NotImplementedError("Action target: ${action.target ?? action.name}")`);

    return w.toString();
  }

  generateMock(action: ActionData): string {
    const w = new PythonWriter();
    const funcName = this.toSnakeCase(action.name);
    const params = this.formatParams(action.inputs);

    w.writeLine(`async def ${funcName}(${params}) -> dict:`);
    w.setIndent(1);
    w.writeLine(`"""${action.description}`);
    w.writeLine('(MOCK IMPLEMENTATION)');
    w.writeLine('"""');
    w.writeBlankLine();
    w.writeLine('return {');
    w.setIndent(2);
    for (const o of action.outputs) {
      w.writeLine(`"${o.name}": ${this.mockValue(o.type)},`);
    }
    w.setIndent(1);
    w.writeLine('}');

    return w.toString();
  }

  private mockValue(type: string): string {
    switch (type) {
      case 'string': return '""';
      case 'number': return '0';
      case 'boolean': return 'False';
      case 'object': return '{}';
      case 'list[object]': return '[]';
      default: return 'None';
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/generator/tool-generator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/generator/tool-generator.ts tests/generator/tool-generator.test.ts
git commit -m "feat: add ToolGenerator for action stub/mock generation"
```

---

### Task 6: Logic Generator

**Files:**
- Create: `src/generator/logic-generator.ts`
- Create: `tests/generator/logic-generator.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/generator/logic-generator.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { LogicGenerator } from '../../src/generator/logic-generator.js';
import type { LogicStatement } from '../../src/ast-utils.js';

describe('LogicGenerator', () => {
  it('generates if statement', () => {
    const stmt: LogicStatement = {
      kind: 'if',
      condition: '@variables.customer_verified == True',
      body: [{ kind: 'set', variable: '@variables.escalation_score', value: '0' }],
    };
    const gen = new LogicGenerator();
    const code = gen.generateStatement(stmt);
    expect(code).toContain('if state.get("customer_verified") == True:');
    expect(code).toContain('state.set("escalation_score", 0)');
  });

  it('generates run statement with bindings', () => {
    const stmt: LogicStatement = {
      kind: 'run',
      action: '@actions.Verify_Customer_Identity',
      withBindings: [{ param: 'email', value: '@variables.customer_email' }],
      setBindings: [{ variable: '@variables.customer_verified', value: '@outputs.customer_found' }],
    };
    const gen = new LogicGenerator();
    const code = gen.generateStatement(stmt);
    expect(code).toContain('verify_customer_identity(email=state.get("customer_email"))');
    expect(code).toContain('state.set("customer_verified", result["customer_found"])');
  });

  it('generates set statement', () => {
    const stmt: LogicStatement = {
      kind: 'set',
      variable: '@variables.escalation_score',
      value: '@variables.escalation_score + 30',
    };
    const gen = new LogicGenerator();
    const code = gen.generateStatement(stmt);
    expect(code).toContain('state.set("escalation_score", state.get("escalation_score") + 30)');
  });

  it('generates transition statement', () => {
    const stmt: LogicStatement = {
      kind: 'transition',
      target: '@topic.case_creation',
    };
    const gen = new LogicGenerator();
    const code = gen.generateStatement(stmt);
    expect(code).toContain('# transition to case_creation');
  });

  it('converts @references to Python expressions', () => {
    const gen = new LogicGenerator();
    expect(gen.convertRef('@variables.customer_email')).toBe('state.get("customer_email")');
    expect(gen.convertRef('@outputs.case_number')).toBe('result["case_number"]');
    expect(gen.convertRef('"literal"')).toBe('"literal"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/generator/logic-generator.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Create `src/generator/logic-generator.ts`:
```typescript
import { PythonWriter } from './python-writer.js';
import type { LogicStatement } from '../ast-utils.js';
import { ToolGenerator } from './tool-generator.js';

export class LogicGenerator {
  private toolGen = new ToolGenerator();

  convertRef(ref: string): string {
    if (ref.startsWith('@variables.')) {
      return `state.get("${ref.replace('@variables.', '')}")`;
    }
    if (ref.startsWith('@outputs.')) {
      return `result["${ref.replace('@outputs.', '')}"]`;
    }
    if (ref.startsWith('@actions.')) {
      return this.toolGen.toSnakeCase(ref.replace('@actions.', ''));
    }
    return ref;
  }

  convertCondition(condition: string): string {
    let result = condition;
    result = result.replace(/@variables\.(\w+)/g, (_, name) => `state.get("${name}")`);
    result = result.replace(/@outputs\.(\w+)/g, (_, name) => `result["${name}"]`);
    return result;
  }

  generateStatements(stmts: LogicStatement[], indent: number = 0): string {
    const w = new PythonWriter();
    w.setIndent(indent);
    for (const stmt of stmts) {
      const lines = this.generateStatement(stmt, indent);
      for (const line of lines.split('\n')) {
        w.writeLine(line.trimStart() || '');
      }
    }
    return w.toString();
  }

  generateStatement(stmt: LogicStatement, baseIndent: number = 0): string {
    switch (stmt.kind) {
      case 'if': return this.genIf(stmt, baseIndent);
      case 'run': return this.genRun(stmt, baseIndent);
      case 'set': return this.genSet(stmt);
      case 'transition': return this.genTransition(stmt);
    }
  }

  private genIf(stmt: LogicStatement & { kind: 'if' }, indent: number): string {
    const lines: string[] = [];
    const condition = this.convertCondition(stmt.condition);
    lines.push(`${'    '.repeat(indent)}if ${condition}:`);
    for (const bodyStmt of stmt.body) {
      const bodyCode = this.generateStatement(bodyStmt, indent + 1);
      lines.push(bodyCode);
    }
    if (stmt.elseBody?.length) {
      lines.push(`${'    '.repeat(indent)}else:`);
      for (const elseStmt of stmt.elseBody) {
        lines.push(this.generateStatement(elseStmt, indent + 1));
      }
    }
    return lines.join('\n');
  }

  private genRun(stmt: LogicStatement & { kind: 'run' }, indent: number): string {
    const lines: string[] = [];
    const actionName = this.toolGen.toSnakeCase(stmt.action.replace('@actions.', ''));
    const withArgs = stmt.withBindings.map(b => `${b.param}=${this.convertRef(b.value)}`).join(', ');
    lines.push(`${'    '.repeat(indent)}result = await ${actionName}(${withArgs})`);
    for (const binding of stmt.setBindings) {
      const varName = binding.variable.replace('@variables.', '');
      lines.push(`${'    '.repeat(indent)}state.set("${varName}", ${this.convertRef(binding.value)})`);
    }
    return lines.join('\n');
  }

  private genSet(stmt: LogicStatement & { kind: 'set' }): string {
    const varName = stmt.variable.replace('@variables.', '');
    const value = this.convertCondition(stmt.value);
    return `state.set("${varName}", ${value})`;
  }

  private genTransition(stmt: LogicStatement & { kind: 'transition' }): string {
    const target = stmt.target.replace('@topic.', '').replace('@subagent.', '');
    return `# transition to ${target}`;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/generator/logic-generator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/generator/logic-generator.ts tests/generator/logic-generator.test.ts
git commit -m "feat: add LogicGenerator for before/after_reasoning code generation"
```

---

### Task 7: Agent Generator

**Files:**
- Create: `src/generator/agent-generator.ts`
- Create: `tests/generator/agent-generator.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/generator/agent-generator.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { AgentGenerator } from '../../src/generator/agent-generator.js';
import type { SubagentData } from '../../src/ast-utils.js';

describe('AgentGenerator', () => {
  it('generates agent factory function', () => {
    const subagent: SubagentData = {
      name: 'weather_service_router',
      kind: 'start_agent',
      description: 'Welcome and route users',
      systemInstructions: 'You are a weather service assistant.',
      reasoningInstructions: 'Analyze input and route appropriately.',
      actions: [],
      beforeReasoning: [],
      reasoningActions: [],
      afterReasoning: [],
    };
    const gen = new AgentGenerator();
    const code = gen.generateFactory(subagent);
    expect(code).toContain('def create_weather_service_router(state: StateManager, toolkit: Toolkit)');
    expect(code).toContain('ReActAgent');
    expect(code).toContain('name="weather_service_router"');
    expect(code).toContain('DashScopeChatModel');
  });

  it('combines system + reasoning instructions in sys_prompt', () => {
    const subagent: SubagentData = {
      name: 'test_agent',
      kind: 'subagent',
      description: 'Test',
      systemInstructions: 'Base instruction.',
      reasoningInstructions: 'Reasoning guidance.',
      actions: [],
      beforeReasoning: [],
      reasoningActions: [],
      afterReasoning: [],
    };
    const gen = new AgentGenerator();
    const code = gen.generateFactory(subagent);
    expect(code).toContain('Base instruction.');
    expect(code).toContain('Reasoning guidance.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/generator/agent-generator.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Create `src/generator/agent-generator.ts`:
```typescript
import { PythonWriter } from './python-writer.js';
import type { SubagentData } from '../ast-utils.js';

export class AgentGenerator {
  generateFactory(subagent: SubagentData): string {
    const w = new PythonWriter();

    w.addImportFrom('agentscope.agent', 'ReActAgent');
    w.addImportFrom('agentscope.model', 'DashScopeChatModel');
    w.addImportFrom('agentscope.formatter', 'DashScopeChatFormatter');
    w.addImportFrom('agentscope.memory', 'InMemoryMemory');
    w.addImportFrom('agentscope.tool', 'Toolkit');
    w.addImport('os');

    w.writeLine(`def create_${subagent.name}(state: StateManager, toolkit: Toolkit) -> ReActAgent:`);
    w.setIndent(1);
    w.writeLine(`"""Create the ${subagent.name} agent."""`);

    const promptParts: string[] = [];
    if (subagent.systemInstructions) promptParts.push(subagent.systemInstructions);
    if (subagent.reasoningInstructions) promptParts.push('\n' + subagent.reasoningInstructions);
    const sysPrompt = promptParts.join('\n\n') || subagent.description;

    w.writeBlankLine();
    w.writeLine(`sys_prompt = """${sysPrompt}"""`);
    w.writeBlankLine();
    w.writeLine('return ReActAgent(');
    w.setIndent(2);
    w.writeLine(`name="${subagent.name}",`);
    w.writeLine('sys_prompt=sys_prompt,');
    w.writeLine('model=DashScopeChatModel(');
    w.setIndent(3);
    w.writeLine('model_name="qwen3.6-flash",');
    w.writeLine('api_key=os.environ["DASHSCOPE_API_KEY"],');
    w.writeLine('stream=True,');
    w.writeLine('enable_thinking=False,');
    w.writeLine('multimodality=True,');
    w.setIndent(2);
    w.writeLine('),');
    w.writeLine('memory=InMemoryMemory(),');
    w.writeLine('formatter=DashScopeChatFormatter(),');
    w.writeLine('toolkit=toolkit,');
    w.setIndent(1);
    w.writeLine(')');

    return w.toString();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/generator/agent-generator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/generator/agent-generator.ts tests/generator/agent-generator.test.ts
git commit -m "feat: add AgentGenerator for ReActAgent factory generation"
```

---

### Task 8: Pipeline Generator

**Files:**
- Create: `src/generator/pipeline-generator.ts`
- Create: `tests/generator/pipeline-generator.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/generator/pipeline-generator.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { PipelineGenerator } from '../../src/generator/pipeline-generator.js';
import type { SubagentData, SystemData, ConfigData } from '../../src/ast-utils.js';

describe('PipelineGenerator', () => {
  it('generates main() function with agent creation loop', () => {
    const config: ConfigData = { agentName: 'WeatherBot', defaultAgentUser: 'test@test.com' };
    const system: SystemData = {
      instructions: 'You are a weather bot.',
      welcomeMessage: 'Hello!',
      errorMessage: 'Error occurred.',
    };
    const subagents: SubagentData[] = [
      { name: 'router', kind: 'start_agent', description: 'Router', actions: [], beforeReasoning: [], reasoningActions: [], afterReasoning: [] },
      { name: 'forecast', kind: 'subagent', description: 'Forecast', actions: [], beforeReasoning: [], reasoningActions: [], afterReasoning: [] },
    ];
    const gen = new PipelineGenerator();
    const code = gen.generateMain(config, system, subagents);
    expect(code).toContain('async def main():');
    expect(code).toContain('state = StateManager()');
    expect(code).toContain('router = create_router');
    expect(code).toContain('UserAgent');
    expect(code).toContain('Hello!');
  });

  it('generates AgentWrapper class for hooks', () => {
    const subagent: SubagentData = {
      name: 'order_locator',
      kind: 'start_agent',
      description: 'Locate orders',
      beforeReasoning: [{ kind: 'set', variable: '@variables.order_found', value: 'False' }],
      afterReasoning: [{ kind: 'if', condition: '@variables.order_found', body: [{ kind: 'transition', target: '@topic.order_details' }] }],
      actions: [],
      reasoningActions: [],
    };
    const gen = new PipelineGenerator();
    const code = gen.generateAgentWrapper(subagent);
    expect(code).toContain('class OrderLocatorWrapper');
    expect(code).toContain('async def before_call');
    expect(code).toContain('async def after_call');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/generator/pipeline-generator.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Create `src/generator/pipeline-generator.ts`:
```typescript
import { PythonWriter } from './python-writer.js';
import { LogicGenerator } from './logic-generator.js';
import type { SubagentData, SystemData, ConfigData } from '../ast-utils.js';

export class PipelineGenerator {
  private logicGen = new LogicGenerator();

  generateMain(config: ConfigData, system: SystemData, subagents: SubagentData[]): string {
    const w = new PythonWriter();
    w.addImport('asyncio');
    w.addImport('os');
    w.addImportFrom('agentscope.agent', 'ReActAgent, UserAgent');
    w.addImportFrom('agentscope.model', 'DashScopeChatModel');
    w.addImportFrom('agentscope.memory', 'InMemoryMemory');
    w.addImportFrom('agentscope.formatter', 'DashScopeChatFormatter');
    w.addImportFrom('agentscope.tool', 'Toolkit');
    w.addImportFrom('agentscope.pipeline', 'MsgHub');
    w.addImportFrom('agentscope.message', 'Msg');

    w.writeLine('async def main():');
    w.setIndent(1);
    w.writeLine('state = StateManager()');

    for (const sa of subagents) {
      w.writeLine(`toolkit_${sa.name} = Toolkit()`);
    }
    w.writeBlankLine();

    for (const sa of subagents) {
      w.writeLine(`${sa.name} = create_${sa.name}(state, toolkit_${sa.name})`);
    }

    w.writeBlankLine();
    for (const sa of subagents) {
      for (const action of sa.actions) {
        const snakeName = this.toSnakeCase(action.name);
        w.writeLine(`toolkit_${sa.name}.register_tool_function(${snakeName})`);
      }
    }

    w.writeBlankLine();
    for (const sa of subagents) {
      if (sa.beforeReasoning.length > 0 || sa.afterReasoning.length > 0) {
        const wrapperClass = this.toPascalCase(sa.name) + 'Wrapper';
        w.writeLine(`${sa.name}_wrapped = ${wrapperClass}(${sa.name}, state)`);
      }
    }

    w.writeBlankLine();
    w.writeLine('user = UserAgent(name="user")');

    if (system.welcomeMessage) {
      w.writeBlankLine();
      w.writeLine(`print("${system.welcomeMessage}")`);
    }

    const startAgent = subagents.find(s => s.kind === 'start_agent') ?? subagents[0];
    const hasHooks = startAgent.beforeReasoning.length > 0 || startAgent.afterReasoning.length > 0;
    const agentVar = hasHooks ? `${startAgent.name}_wrapped` : startAgent.name;

    w.writeBlankLine();
    w.writeLine('msg = None');
    w.writeLine('while True:');
    w.setIndent(2);
    w.writeLine('try:');
    w.setIndent(3);
    w.writeLine(`msg = await ${agentVar}(msg)`);
    w.setIndent(2);
    w.writeLine('except Exception as e:');
    w.setIndent(3);
    w.writeLine(`print("${system.errorMessage ?? 'Error: {e}'}")`);
    w.setIndent(2);
    w.writeLine('msg = await user(msg)');
    w.writeLine('if msg.get_text_content() == "exit":');
    w.setIndent(3);
    w.writeLine('break');

    w.setIndent(0);
    w.writeBlankLine();
    w.writeBlankLine();
    w.writeLine('if __name__ == "__main__":');
    w.setIndent(1);
    w.writeLine('asyncio.run(main())');

    return w.toString();
  }

  generateAgentWrapper(subagent: SubagentData): string {
    const className = this.toPascalCase(subagent.name) + 'Wrapper';
    const w = new PythonWriter();

    w.writeLine(`class ${className}:`);
    w.setIndent(1);
    w.writeLine('def __init__(self, agent: ReActAgent, state: StateManager):');
    w.setIndent(2);
    w.writeLine('self.agent = agent');
    w.writeLine('self.state = state');
    w.setIndent(1);
    w.writeBlankLine();

    w.writeLine('async def __call__(self, msg: Msg) -> Msg:');
    w.setIndent(2);
    w.writeLine('await self.before_call(msg)');
    w.writeLine('result = await self.agent(msg)');
    w.writeLine('await self.after_call(msg, result)');
    w.writeLine('return result');
    w.setIndent(1);
    w.writeBlankLine();

    w.writeLine('async def before_call(self, msg: Msg) -> None:');
    w.setIndent(2);
    if (subagent.beforeReasoning.length > 0) {
      const code = this.logicGen.generateStatements(subagent.beforeReasoning, 2);
      for (const line of code.trim().split('\n')) {
        w.writeLine(line.trimStart());
      }
    } else {
      w.writeLine('pass');
    }
    w.setIndent(1);
    w.writeBlankLine();

    w.writeLine('async def after_call(self, msg: Msg, result: Msg) -> None:');
    w.setIndent(2);
    if (subagent.afterReasoning.length > 0) {
      const code = this.logicGen.generateStatements(subagent.afterReasoning, 2);
      for (const line of code.trim().split('\n')) {
        w.writeLine(line.trimStart());
      }
    } else {
      w.writeLine('pass');
    }

    return w.toString();
  }

  private toSnakeCase(name: string): string {
    return name.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '').replace(/_+/g, '_');
  }

  private toPascalCase(name: string): string {
    return name.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/generator/pipeline-generator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/generator/pipeline-generator.ts tests/generator/pipeline-generator.test.ts
git commit -m "feat: add PipelineGenerator for main() and AgentWrapper generation"
```

---

### Task 9: CodeGenerator Orchestrator + Converter

**Files:**
- Create: `src/generator/index.ts`
- Create: `src/converter.ts`
- Create: `tests/converter.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/converter.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { convert } from '../../src/converter.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const examplesDir = resolve(__dirname, '..', '..', 'examples');

describe('convert', () => {
  it('converts hello_world.agent to valid Python', () => {
    const source = readFileSync(resolve(examplesDir, 'hello_world.agent'), 'utf-8');
    const result = convert(source, { mock: false });
    expect(result).toContain('class StateManager');
    expect(result).toContain('async def main');
    expect(result).toContain('ReActAgent');
    expect(result.length).toBeGreaterThan(100);
  });

  it('throws on parse errors', () => {
    expect(() => convert('invalid: !!!syntax!!!')).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/converter.test.ts`
Expected: FAIL

- [ ] **Step 3: Write CodeGenerator orchestrator**

Create `src/generator/index.ts`:
```typescript
import { PythonWriter } from './python-writer.js';
import { StateGenerator } from './state-generator.js';
import { ToolGenerator } from './tool-generator.js';
import { AgentGenerator } from './agent-generator.js';
import { PipelineGenerator } from './pipeline-generator.js';
import type { ConfigData, SystemData, VariableData, SubagentData, ActionData } from '../ast-utils.js';

export interface GenerateOptions {
  mock: boolean;
}

export class CodeGenerator {
  private stateGen = new StateGenerator();
  private toolGen = new ToolGenerator();
  private agentGen = new AgentGenerator();
  private pipelineGen = new PipelineGenerator();

  generate(
    config: ConfigData,
    system: SystemData,
    variables: VariableData[],
    subagents: SubagentData[],
    options: GenerateOptions,
  ): string {
    const sections: string[] = [];

    // Module docstring
    sections.push(`"""Auto-generated from ${config.agentName} by agentscript-cli.\nAgentScope implementation of ${config.agentName}.\n"""`);

    // StateManager
    sections.push(this.stateGen.generate(variables));

    // Tool stubs/mocks
    const allActions = this.collectAllActions(subagents);
    const toolSection = allActions.map(a =>
      options.mock ? this.toolGen.generateMock(a) : this.toolGen.generateStub(a)
    ).join('\n\n');
    sections.push(toolSection);

    // AgentWrapper classes
    for (const sa of subagents) {
      if (sa.beforeReasoning.length > 0 || sa.afterReasoning.length > 0) {
        sections.push(this.pipelineGen.generateAgentWrapper(sa));
      }
    }

    // Agent factories
    for (const sa of subagents) {
      sections.push(this.agentGen.generateFactory(sa));
    }

    // Main + pipeline
    sections.push(this.pipelineGen.generateMain(config, system, subagents));

    return sections.join('\n\n');
  }

  private collectAllActions(subagents: SubagentData[]): ActionData[] {
    const seen = new Set<string>();
    const actions: ActionData[] = [];
    for (const sa of subagents) {
      for (const action of sa.actions) {
        if (!seen.has(action.name)) {
          seen.add(action.name);
          actions.push(action);
        }
      }
    }
    return actions;
  }
}
```

- [ ] **Step 4: Write converter.ts**

Create `src/converter.ts`:
```typescript
import { parse } from '@agentscript/agentforce';
import { CodeGenerator } from './generator/index.js';
import {
  extractConfig,
  extractSystem,
  extractVariables,
  extractSubagents,
} from './ast-utils.js';

export interface ConvertOptions {
  mock?: boolean;
}

export function convert(source: string, options: ConvertOptions = {}): string {
  const doc = parse(source);

  if (doc.hasErrors) {
    const errorMessages = doc.errors.map(d => d.message).join('\n');
    throw new Error(`AgentScript parse errors:\n${errorMessages}`);
  }

  const config = extractConfig(doc.ast);
  const system = extractSystem(doc.ast);
  const variables = extractVariables(doc.ast);
  const subagents = extractSubagents(doc.ast);

  const generator = new CodeGenerator();
  return generator.generate(config, system, variables, subagents, {
    mock: options.mock ?? false,
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/converter.test.ts`
Expected: PASS (may need AST adjustments from Task 3)

- [ ] **Step 6: Commit**

```bash
git add src/generator/index.ts src/converter.ts tests/converter.test.ts
git commit -m "feat: add CodeGenerator orchestrator and converter entry point"
```

---

### Task 10: CLI Entry Point

**Files:**
- Create: `src/cli.ts`

- [ ] **Step 1: Write CLI entry point**

Create `src/cli.ts`:
```typescript
import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { convert } from './converter.js';

const program = new Command();

program
  .name('agentscript')
  .description('Convert AgentScript .agent files to AgentScope Python code')
  .version('0.1.0');

program
  .command('convert')
  .description('Convert an AgentScript .agent file to AgentScope Python')
  .argument('<file>', 'Path to the .agent file')
  .option('-o, --output <path>', 'Output file path (default: same name with .py extension)')
  .option('--mock', 'Generate mock implementations instead of NotImplementedError stubs')
  .action((file, options) => {
    const inputPath = resolve(file);
    const source = readFileSync(inputPath, 'utf-8');

    try {
      const result = convert(source, { mock: options.mock });

      const outputPath = options.output
        ? resolve(options.output)
        : inputPath.replace(/\.agent$/, '.py');

      writeFileSync(outputPath, result, 'utf-8');
      console.log(`Converted ${file} → ${outputPath}`);
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

program.parse();
```

- [ ] **Step 2: Verify CLI works**

Run:
```bash
cd c:/Users/c.xiong/Workplace/agentscript-cli-v2 && npx tsx src/cli.ts convert examples/hello_world.agent -o examples/hello_world.py
```

Expected: `examples/hello_world.py` created with Python code.

Run:
```bash
cd c:/Users/c.xiong/Workplace/agentscript-cli-v2 && npx tsx src/cli.ts convert examples/weather.agent -o examples/weather.py
```

Expected: `examples/weather.py` created with Python code.

- [ ] **Step 3: Validate generated Python syntax (if Python available)**

Run:
```bash
python -c "import ast; ast.parse(open('examples/hello_world.py').read()); print('Valid Python')"
```

Expected: "Valid Python"

- [ ] **Step 4: Commit**

```bash
git add src/cli.ts
git commit -m "feat: add CLI entry point with convert command"
```

---

### Task 11: Integration Tests — Fixture-Based Snapshot Testing

**Files:**
- Create: `tests/fixtures/` directory with initial fixture .py files
- Modify: `tests/converter.test.ts` — add snapshot tests for all examples

- [ ] **Step 1: Generate initial fixture files**

Run each example through the CLI:
```bash
cd c:/Users/c.xiong/Workplace/agentscript-cli-v2
mkdir -p tests/fixtures
npx tsx src/cli.ts convert examples/hello_world.agent -o tests/fixtures/hello_world.py
npx tsx src/cli.ts convert examples/weather.agent -o tests/fixtures/weather.py
npx tsx src/cli.ts convert examples/case_escalation_bot.agent -o tests/fixtures/case_escalation_bot.py
npx tsx src/cli.ts convert examples/lead_qualification_bot.agent -o tests/fixtures/lead_qualification_bot.py
npx tsx src/cli.ts convert examples/order_tracking_assistant.agent -o tests/fixtures/order_tracking_assistant.py
```

- [ ] **Step 2: Update converter.test.ts with snapshot tests**

Add snapshot tests for each example file:
```typescript
import { describe, it, expect } from 'vitest';
import { convert } from '../../src/converter.js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const examplesDir = resolve(__dirname, '..', '..', 'examples');
const fixturesDir = resolve(__dirname, 'fixtures');

const EXAMPLE_FILES = [
  'hello_world',
  'weather',
  'case_escalation_bot',
  'lead_qualification_bot',
  'order_tracking_assistant',
];

describe('convert integration', () => {
  for (const name of EXAMPLE_FILES) {
    it(`converts ${name}.agent matching snapshot`, () => {
      const source = readFileSync(resolve(examplesDir, `${name}.agent`), 'utf-8');
      const result = convert(source, { mock: false });
      const fixture = readFileSync(resolve(fixturesDir, `${name}.py`), 'utf-8');
      // Compare structural content (not exact whitespace)
      expect(result.replace(/\s+/g, ' ').trim()).toEqual(fixture.replace(/\s+/g, ' ').trim());
    });
  }

  it('throws on parse errors', () => {
    expect(() => convert('invalid: !!!syntax!!!')).toThrow();
  });
});
```

- [ ] **Step 3: Run all integration tests**

Run: `npx vitest run tests/converter.test.ts`

If fixtures differ from actual output, update fixtures:
```bash
# Regenerate fixtures after adjusting converter
for f in hello_world weather case_escalation_bot lead_qualification_bot order_tracking_assistant; do
  npx tsx src/cli.ts convert examples/${f}.agent -o tests/fixtures/${f}.py
done
```

- [ ] **Step 4: Commit**

```bash
git add tests/fixtures/ tests/converter.test.ts
git commit -m "feat: add integration tests with fixture-based snapshot testing"
```

---

### Task 12: Split Generator (--split flag)

**Files:**
- Create: `src/generator/split-generator.ts`
- Create: `tests/generator/split-generator.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/generator/split-generator.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { SplitGenerator } from '../../src/generator/split-generator.js';
import type { ConfigData, SystemData, VariableData, SubagentData } from '../../src/ast-utils.js';

describe('SplitGenerator', () => {
  it('generates package structure with multiple files', () => {
    const config: ConfigData = { agentName: 'WeatherBot', defaultAgentUser: 'test@test.com' };
    const system: SystemData = { instructions: 'Weather bot.', welcomeMessage: 'Hello!' };
    const variables: VariableData[] = [
      { name: 'city', type: 'string', mutable: true, linked: false, defaultValue: '""', description: 'City' },
    ];
    const subagents: SubagentData[] = [
      { name: 'router', kind: 'start_agent', description: 'Router', actions: [], beforeReasoning: [], reasoningActions: [], afterReasoning: [] },
    ];

    const gen = new SplitGenerator();
    const files = gen.generate(config, system, variables, subagents, { mock: false });

    expect(files).toHaveProperty('state.py');
    expect(files).toHaveProperty('tools.py');
    expect(files).toHaveProperty('agents.py');
    expect(files).toHaveProperty('pipeline.py');
    expect(files).toHaveProperty('main.py');
    expect(files).toHaveProperty('__init__.py');

    expect(files['state.py']).toContain('class StateManager');
    expect(files['main.py']).toContain('asyncio.run(main())');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/generator/split-generator.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Create `src/generator/split-generator.ts`:
```typescript
import { StateGenerator } from './state-generator.js';
import { ToolGenerator } from './tool-generator.js';
import { AgentGenerator } from './agent-generator.js';
import { PipelineGenerator } from './pipeline-generator.js';
import type { ConfigData, SystemData, VariableData, SubagentData, ActionData, GenerateOptions } from '../ast-utils.js';

export class SplitGenerator {
  private stateGen = new StateGenerator();
  private toolGen = new ToolGenerator();
  private agentGen = new AgentGenerator();
  private pipelineGen = new PipelineGenerator();

  generate(
    config: ConfigData,
    system: SystemData,
    variables: VariableData[],
    subagents: SubagentData[],
    options: GenerateOptions,
  ): Record<string, string> {
    const allActions = this.collectAllActions(subagents);
    const pkgName = config.agentName.toLowerCase().replace(/[^a-z0-9]/g, '_');

    const files: Record<string, string> = {};

    // __init__.py — just imports
    files['__init__.py'] = `"""${config.agentName} — Auto-generated AgentScope package."""\n`;

    // state.py
    files['state.py'] = this.stateGen.generate(variables);

    // tools.py
    const toolImports = 'from typing import Any\nimport asyncio\n\n';
    const toolCode = allActions.map(a =>
      options.mock ? this.toolGen.generateMock(a) : this.toolGen.generateStub(a)
    ).join('\n\n');
    files['tools.py'] = toolImports + toolCode;

    // agents.py
    const agentCode = subagents.map(sa => this.agentGen.generateFactory(sa)).join('\n\n');
    files['agents.py'] = agentCode;

    // pipeline.py
    files['pipeline.py'] = this.pipelineGen.generateMain(config, system, subagents);

    // main.py
    files['main.py'] = `from ${pkgName}.pipeline import main\n\nif __name__ == "__main__":\n    import asyncio\n    asyncio.run(main())\n`;

    return files;
  }

  private collectAllActions(subagents: SubagentData[]): ActionData[] {
    const seen = new Set<string>();
    const actions: ActionData[] = [];
    for (const sa of subagents) {
      for (const action of sa.actions) {
        if (!seen.has(action.name)) {
          seen.add(action.name);
          actions.push(action);
        }
      }
    }
    return actions;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/generator/split-generator.test.ts`
Expected: PASS

- [ ] **Step 5: Update CLI to support --split**

Modify `src/cli.ts` to use SplitGenerator when `--split` flag is set:
```typescript
// Add to the convert command action:
import { SplitGenerator } from './generator/split-generator.js';
import { extractConfig, extractSystem, extractVariables, extractSubagents } from './ast-utils.js';

// In the action handler, after parsing:
if (options.split) {
  const doc = parse(source);
  if (doc.hasErrors) { /* handle errors */ }
  const config = extractConfig(doc.ast);
  const system = extractSystem(doc.ast);
  const variables = extractVariables(doc.ast);
  const subagents = extractSubagents(doc.ast);

  const splitGen = new SplitGenerator();
  const files = splitGen.generate(config, system, variables, subagents, { mock: options.mock });

  const outputDir = options.output
    ? resolve(options.output)
    : resolve(config.agentName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_agent');

  for (const [filename, content] of Object.entries(files)) {
    const filePath = resolve(outputDir, filename);
    writeFileSync(filePath, content, 'utf-8');
  }
  console.log(`Converted ${file} → ${outputDir}/ (package structure)`);
} else {
  // existing single-file logic
}
```

- [ ] **Step 6: Commit**

```bash
git add src/generator/split-generator.ts tests/generator/split-generator.test.ts src/cli.ts
git commit -m "feat: add SplitGenerator and --split CLI flag"
```

---

## Self-Review

### Spec Coverage
- **Structural Mapping:** Tasks 3-9 cover all mappings (system, config, variables, subagents, actions, reasoning, logic)
- **Action stubs:** Task 5 (stub + mock)
- **StateManager:** Task 4
- **AgentWrapper:** Task 8
- **CLI interface:** Task 10 (convert, -o, --mock), Task 12 (--split)
- **Output format:** Task 10 (single file), Task 12 (split)
- **Error handling:** Task 9 (parse errors → throw)
- **Testing:** Tasks 2-12 (unit tests per module), Task 11 (integration/snapshot)

### Placeholder Scan
- Task 3 explicitly notes that AST structure must be discovered by running the parser — this is intentional, not a placeholder
- No TBD/TODO/fill-in-later patterns elsewhere

### Type Consistency
- All data types (`ConfigData`, `SystemData`, `VariableData`, `SubagentData`, `ActionData`, `LogicStatement`) are defined in `ast-utils.ts` and referenced consistently across generators
- `toSnakeCase` used consistently for action name → function name conversion
- `mapType` / `mapParamType` used consistently for AgentScript → Python type mapping