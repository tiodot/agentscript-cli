/**
 * Deep AST exploration — focus on agents, actions, reasoning, before/after_reasoning
 */

import { parse } from '../src/parser-bridge.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const source = readFileSync(resolve('examples/weather.agent'), 'utf-8');
const doc = parse(source);
const ast = doc.ast as any;

console.log('=== WEATHER.AGENT DEEP EXPLORATION ===');
console.log('Top-level keys:', Object.keys(ast));

// Explore start_agent
if (ast.start_agent) {
  console.log('\n--- start_agent ---');
  const sa = ast.start_agent;
  console.log('type:', sa.constructor?.name);
  console.log('keys:', Object.keys(sa).filter(k => !k.startsWith('__')));
  console.log('all keys:', Object.keys(sa));

  // The start_agent is a NamedBlock or similar
  console.log('__kind:', sa.__kind);
  console.log('__symbol:', sa.__symbol);

  // Access name
  if (sa.name) {
    console.log('name:', sa.name.value ?? sa.name);
    console.log('name type:', sa.name.constructor?.name);
  }

  // Access description
  if (sa.description) {
    console.log('description:', sa.description.value ?? sa.description);
  }

  // Explore nested blocks
  const nestedKeys = Object.keys(sa).filter(k => !k.startsWith('__') && k !== 'name');
  for (const key of nestedKeys) {
    const block = sa[key];
    console.log(`\n  start_agent.${key}:`);
    console.log(`    type:`, block?.constructor?.name);
    console.log(`    keys:`, Object.keys(block ?? {}).filter(k => !k.startsWith('__')));

    // For reasoning block
    if (key === 'reasoning') {
      if (block.instructions) {
        console.log(`    instructions:`, block.instructions.value ?? block.instructions);
      }
      if (block.actions) {
        console.log(`    actions keys:`, Object.keys(block.actions).filter(k => !k.startsWith('__')));
        const actions = block.actions;
        if (actions.__children) {
          for (const actionChild of actions.__children) {
            console.log(`      action child type:`, actionChild.constructor?.name);
            console.log(`      action child keys:`, Object.keys(actionChild).filter(k => !k.startsWith('__')));
          }
        }
      }
    }
  }

  // Check __children for start_agent
  if (sa.__children) {
    console.log('\n  __children count:', sa.__children.length);
    for (const child of sa.__children) {
      console.log('    child type:', child.constructor?.name);
      console.log('    child keys:', Object.keys(child).filter(k => !k.startsWith('__')));
    }
  }
}

// Explore topic (NamedCollectionBlock)
if (ast.topic) {
  console.log('\n--- topic ---');
  const topic = ast.topic;
  console.log('type:', topic.constructor?.name);
  console.log('keys:', Object.keys(topic).filter(k => !k.startsWith('__')));
  console.log('__kind:', topic.__kind);

  // NamedCollectionBlock/NamedMap should have named entries
  // Try accessing by name
  const topicNames = Object.keys(topic).filter(k => !k.startsWith('__') && k !== '_mapIndex');
  console.log('topic entry names:', topicNames);

  for (const name of topicNames) {
    const entry = topic[name];
    if (entry && typeof entry === 'object' && !entry.constructor?.name?.includes('Field')) {
      console.log(`\n  topic.${name}:`);
      console.log(`    type:`, entry.constructor?.name);
      console.log(`    keys:`, Object.keys(entry).filter(k => !k.startsWith('__')));

      // Explore actions in this topic
      if (entry.actions) {
        const actions = entry.actions;
        console.log(`    actions type:`, actions.constructor?.name);
        console.log(`    actions keys:`, Object.keys(actions).filter(k => !k.startsWith('__')));

        if (actions.__children) {
          for (const actChild of actions.__children.slice(0, 2)) {
            console.log(`      action type:`, actChild.constructor?.name);
            const actKeys = Object.keys(actChild).filter(k => !k.startsWith('__'));
            console.log(`      action keys:`, actKeys);

            // For an ActionBlock, explore inputs, outputs, target
            for (const actKey of actKeys) {
              const val = actChild[actKey];
              if (val && typeof val === 'object') {
                console.log(`        ${actKey}:`, val.constructor?.name, Object.keys(val).filter(k => !k.startsWith('__')).slice(0, 10));
              } else {
                console.log(`        ${actKey}:`, val);
              }
            }
          }
        }
      }

      // Explore before_reasoning
      if (entry.before_reasoning) {
        const br = entry.before_reasoning;
        console.log(`    before_reasoning type:`, br.constructor?.name);
        console.log(`    before_reasoning keys:`, Object.keys(br).filter(k => !k.startsWith('__')));
        if (br.__children) {
          for (const stmt of br.__children.slice(0, 3)) {
            console.log(`      stmt type:`, stmt.constructor?.name);
            console.log(`      stmt keys:`, Object.keys(stmt).filter(k => !k.startsWith('__')));
          }
        }
      }

      // Explore after_reasoning
      if (entry.after_reasoning) {
        const ar = entry.after_reasoning;
        console.log(`    after_reasoning type:`, ar.constructor?.name);
        console.log(`    after_reasoning keys:`, Object.keys(ar).filter(k => !k.startsWith('__')));
        if (ar.__children) {
          for (const stmt of ar.__children.slice(0, 3)) {
            console.log(`      stmt type:`, stmt.constructor?.name);
            console.log(`      stmt keys:`, Object.keys(stmt).filter(k => !k.startsWith('__')));
          }
        }
      }
    }
  }
}

// Explore variables more carefully
if (ast.variables) {
  console.log('\n--- variables (deep) ---');
  const vars = ast.variables;
  console.log('type:', vars.constructor?.name);
  console.log('__kind:', vars.__kind);

  // NamedMap has named entries accessible by key
  const varNames = Object.keys(vars).filter(k => !k.startsWith('__') && k !== '_mapIndex');
  console.log('variable entry names:', varNames.slice(0, 5));

  for (const name of varNames.slice(0, 3)) {
    const varEntry = vars[name];
    if (varEntry && typeof varEntry === 'object') {
      console.log(`\n  var.${name}:`);
      console.log(`    type:`, varEntry.constructor?.name);
      const vKeys = Object.keys(varEntry).filter(k => !k.startsWith('__'));
      console.log(`    keys:`, vKeys);
      for (const vk of vKeys) {
        const vVal = varEntry[vk];
        if (vVal && typeof vVal === 'object' && vVal.constructor?.name !== 'String') {
          console.log(`      ${vk}:`, vVal.constructor?.name, vVal.value ?? vVal);
        } else {
          console.log(`      ${vk}:`, vVal);
        }
      }
    }
  }
}