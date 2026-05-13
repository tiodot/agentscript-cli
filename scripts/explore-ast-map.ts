/**
 * Explore _mapIndex and __children structures
 */

import { parse } from '../src/parser-bridge.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const source = readFileSync(resolve('examples/weather.agent'), 'utf-8');
const doc = parse(source);
const ast = doc.ast as any;

console.log('=== MAP INDEX EXPLORATION ===');

// Explore start_agent._mapIndex
if (ast.start_agent) {
  const sa = ast.start_agent;
  console.log('\n--- start_agent._mapIndex ---');
  const mi = sa._mapIndex;
  console.log('_mapIndex type:', mi?.constructor?.name);
  console.log('_mapIndex keys:', Object.keys(mi ?? {}));
  console.log('_mapIndex size:', mi?.size ?? Object.keys(mi ?? {}).length);

  // Try iterating _mapIndex
  if (mi instanceof Map) {
    for (const [key, val] of mi.entries()) {
      console.log(`  entry "${key}":`);
      console.log(`    value type:`, val.constructor?.name);
      const valKeys = Object.keys(val).filter(k => !k.startsWith('__'));
      console.log(`    value keys:`, valKeys);
      // Dig into the actual agent block
      console.log(`    value.__kind:`, val.__kind);
      // Access description, system, actions, reasoning etc
      for (const vk of valKeys) {
        const vv = val[vk];
        if (vv && typeof vv === 'object') {
          console.log(`      ${vk}:`, vv.constructor?.name, vv.value ?? vv);
        } else {
          console.log(`      ${vk}:`, vv);
        }
      }
    }
  } else if (mi && typeof mi === 'object') {
    for (const key of Object.keys(mi)) {
      console.log(`  entry "${key}":`, mi[key]?.constructor?.name);
    }
  }

  // Also explore __children (MapEntryChild)
  console.log('\n--- start_agent.__children ---');
  for (const child of sa.__children) {
    console.log('child type:', child.constructor?.name);
    console.log('child.name:', child.name?.value ?? child.name);
    const childValue = child.value;
    console.log('child.value type:', childValue?.constructor?.name);
    const childValueKeys = Object.keys(childValue ?? {}).filter(k => !k.startsWith('__'));
    console.log('child.value keys:', childValueKeys);
    console.log('child.value.__kind:', childValue?.__kind);

    // Deep dive into the actual agent block
    for (const vk of childValueKeys) {
      const vv = childValue[vk];
      console.log(`    ${vk}:`, vv?.constructor?.name ?? vv);
    }
  }
}

// Explore topic._mapIndex
if (ast.topic) {
  const topic = ast.topic;
  console.log('\n--- topic._mapIndex ---');
  const mi = topic._mapIndex;
  console.log('_mapIndex type:', mi?.constructor?.name);
  if (mi instanceof Map) {
    console.log('_mapIndex size:', mi.size);
    for (const [key, val] of mi.entries()) {
      console.log(`\n  topic "${key}":`);
      console.log(`    value type:`, val.constructor?.name);
      console.log(`    value.__kind:`, val.__kind);
      const valKeys = Object.keys(val).filter(k => !k.startsWith('__') && k !== '_mapIndex');
      console.log(`    value keys:`, valKeys);

      // Check for system block
      if (val.system) {
        const sys = val.system;
        const sysKeys = Object.keys(sys).filter(k => !k.startsWith('__'));
        console.log(`    system keys:`, sysKeys);
        if (sys.instructions) console.log(`    instructions:`, sys.instructions.value);
      }

      // Check for actions block
      if (val.actions) {
        const actions = val.actions;
        console.log(`    actions type:`, actions.constructor?.name);
        console.log(`    actions.__kind:`, actions.__kind);
        const actKeys = Object.keys(actions).filter(k => !k.startsWith('__') && k !== '_mapIndex');
        console.log(`    actions keys:`, actKeys);
        if (actions._mapIndex) {
          const actMap = actions._mapIndex;
          if (actMap instanceof Map) {
            console.log(`    actions._mapIndex size:`, actMap.size);
            for (const [actName, actVal] of actMap.entries()) {
              console.log(`\n      action "${actName}":`);
              console.log(`        type:`, actVal.constructor?.name);
              const aKeys = Object.keys(actVal).filter(k => !k.startsWith('__') && k !== '_mapIndex');
              console.log(`        keys:`, aKeys);
              for (const ak of aKeys) {
                const av = actVal[ak];
                if (av && typeof av === 'object') {
                  console.log(`          ${ak}:`, av.constructor?.name, av.value ?? ak);
                } else {
                  console.log(`          ${ak}:`, av);
                }
              }
              // Explore inputs
              if (actVal.inputs) {
                const inp = actVal.inputs;
                console.log(`        inputs type:`, inp.constructor?.name);
                console.log(`        inputs keys:`, Object.keys(inp).filter(k => !k.startsWith('__')));
                if (inp._mapIndex) {
                  if (inp._mapIndex instanceof Map) {
                    console.log(`        inputs._mapIndex size:`, inp._mapIndex.size);
                    for (const [ik, iv] of inp._mapIndex.entries()) {
                      console.log(`          input "${ik}":`, iv.constructor?.name);
                      const ivKeys = Object.keys(iv).filter(k => !k.startsWith('__') && k !== '_mapIndex');
                      console.log(`          input keys:`, ivKeys);
                      for (const ivk of ivKeys) {
                        const ivv = iv[ivk];
                        if (ivv && typeof ivv === 'object') {
                          console.log(`            ${ivk}:`, ivv.constructor?.name, ivv.value ?? ivv);
                        } else {
                          console.log(`            ${ivk}:`, ivv);
                        }
                      }
                    }
                  }
                }
              }
              // Explore target
              if (actVal.target) {
                console.log(`        target:`, actVal.target.value ?? actVal.target);
                console.log(`        target type:`, actVal.target?.constructor?.name);
              }
            }
          }
        }
      }

      // Check for before_reasoning
      if (val.before_reasoning) {
        const br = val.before_reasoning;
        console.log(`    before_reasoning type:`, br.constructor?.name);
        const brKeys = Object.keys(br).filter(k => !k.startsWith('__'));
        console.log(`    before_reasoning keys:`, brKeys);
        if (br.__children) {
          for (const stmt of br.__children.slice(0, 5)) {
            console.log(`      stmt type:`, stmt.constructor?.name);
            const stmtKeys = Object.keys(stmt).filter(k => !k.startsWith('__'));
            console.log(`      stmt keys:`, stmtKeys);
            for (const sk of stmtKeys) {
              const sv = stmt[sk];
              console.log(`        ${sk}:`, sv?.constructor?.name ?? sv);
              if (sv && typeof sv === 'object' && sv.value) {
                console.log(`          value:`, sv.value);
              }
              if (sv && Array.isArray(sv)) {
                console.log(`          array len:`, sv.length);
                for (const item of sv) {
                  console.log(`            item:`, item?.constructor?.name ?? item);
                }
              }
            }
          }
        }
      }

      // Check for reasoning block
      if (val.reasoning) {
        const reasoning = val.reasoning;
        console.log(`    reasoning type:`, reasoning.constructor?.name);
        const rKeys = Object.keys(reasoning).filter(k => !k.startsWith('__') && k !== '_mapIndex');
        console.log(`    reasoning keys:`, rKeys);
        if (reasoning.instructions) console.log(`    reasoning instructions:`, reasoning.instructions.value);
        if (reasoning.actions) {
          console.log(`    reasoning actions type:`, reasoning.actions.constructor?.name);
        }
      }
    }
  }
}

// Explore variables._mapIndex
if (ast.variables) {
  const vars = ast.variables;
  console.log('\n--- variables._mapIndex ---');
  const mi = vars._mapIndex;
  console.log('_mapIndex type:', mi?.constructor?.name);
  if (mi instanceof Map) {
    console.log('_mapIndex size:', mi.size);
    for (const [key, val] of mi.entries()) {
      console.log(`\n  var "${key}":`);
      console.log(`    type:`, val.constructor?.name);
      const vKeys = Object.keys(val).filter(k => !k.startsWith('__') && k !== '_mapIndex');
      console.log(`    keys:`, vKeys);
      for (const vk of vKeys) {
        const vv = val[vk];
        if (vv && typeof vv === 'object') {
          console.log(`      ${vk}:`, vv.constructor?.name, vv.value ?? vv);
        } else {
          console.log(`      ${vk}:`, vv);
        }
      }
    }
  }
}