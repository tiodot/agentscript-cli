/**
 * Diagnostic script to explore the actual AST structure from @agentscript/agentforce.
 * Run: npx tsx scripts/explore-ast.ts
 */

import { parse } from '../src/parser-bridge.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const files = [
  'examples/hello_world.agent',
  'examples/weather.agent',
  'examples/case_escalation_bot.agent',
];

function replacer(key: string, value: any): any {
  if (typeof value === 'function') return '[Function]';
  if (key === '__cst') return '[CST omitted]';
  if (key === 'parent') return '[parent ref omitted]';
  if (key === '_children') return '[children omitted]';
  if (key.startsWith('__') && key !== '__diagnostics') return undefined;
  // Skip deeply nested CST structures
  if (value && typeof value === 'object' && value.type === 'CSTNode') return '[CSTNode]';
  return value;
}

for (const file of files) {
  console.log(`\n=== ${file} ===`);
  const source = readFileSync(resolve(file), 'utf-8');
  const doc = parse(source);
  console.log('hasErrors:', doc.hasErrors);
  console.log('errors:', doc.errors?.map(e => e.message));
  console.log('AST keys:', Object.keys(doc.ast));

  // Explore top-level blocks
  const ast = doc.ast as any;

  if (ast.system) {
    console.log('\n--- system ---');
    console.log('system keys:', Object.keys(ast.system));
    if (ast.system.instructions) {
      const instr = ast.system.instructions;
      console.log('instructions type:', instr.constructor?.name);
      console.log('instructions keys:', Object.keys(instr));
      console.log('instructions value:', instr.value ?? instr.body ?? instr);
    }
    if (ast.system.messages) {
      console.log('messages keys:', Object.keys(ast.system.messages));
      const msgs = ast.system.messages as any;
      if (msgs.welcome) console.log('welcome:', msgs.welcome.value ?? msgs.welcome);
      if (msgs.error) console.log('error:', msgs.error.value ?? msgs.error);
    }
  }

  if (ast.config) {
    console.log('\n--- config ---');
    console.log('config keys:', Object.keys(ast.config));
    const cfg = ast.config as any;
    console.log('agent_name:', cfg.agent_name?.value ?? cfg.agent_name);
    console.log('default_agent_user:', cfg.default_agent_user?.value ?? cfg.default_agent_user);
  }

  if (ast.variables) {
    console.log('\n--- variables ---');
    console.log('variables keys:', Object.keys(ast.variables));
    const vars = ast.variables as any;
    // Try to iterate over variable items
    if (vars.__children) {
      for (const child of vars.__children) {
        if (child && child.constructor?.name === 'VariableDeclarationNode') {
          console.log('  variable:', child.name?.value ?? child.name,
            'type:', child.type?.value ?? child.type,
            'mutable:', child.mutable,
            'defaultValue:', child.defaultValue?.value ?? child.defaultValue);
        }
      }
    }
  }

  // Explore agents (start_agent, topic, subagent)
  const agentKeys = Object.keys(ast).filter(k =>
    k.startsWith('start_agent') || k.startsWith('topic') || k.startsWith('subagent') || k === '__children'
  );
  console.log('\n--- agent blocks ---');
  console.log('Agent-related keys:', agentKeys);

  if (ast.__children) {
    for (const child of ast.__children) {
      console.log('  child type:', child.constructor?.name, 'child keys:', Object.keys(child));
      if (child.constructor?.name === 'NamedBlock' || child.constructor?.name === 'StartAgentBlock') {
        console.log('    name:', child.name?.value ?? child.name);
        // Check for nested blocks like actions, reasoning, before_reasoning, after_reasoning
        const childKeys = Object.keys(child);
        console.log('    nested blocks:', childKeys.filter(k => !k.startsWith('__') && k !== 'name'));
        for (const nestedKey of childKeys) {
          if (!nestedKey.startsWith('__') && nestedKey !== 'name') {
            const nested = child[nestedKey];
            if (nested && typeof nested === 'object') {
              console.log(`    ${nestedKey} keys:`, Object.keys(nested));
              console.log(`    ${nestedKey} constructor:`, nested.constructor?.name);
            }
          }
        }
      }
    }
  }
}