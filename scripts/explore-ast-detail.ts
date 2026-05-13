/**
 * Explore __children structure for topic and reasoning blocks
 */

import { parse } from '../src/parser-bridge.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const source = readFileSync(resolve('examples/weather.agent'), 'utf-8');
const doc = parse(source);
const ast = doc.ast as any;

// topic __children
if (ast.topic) {
  const topic = ast.topic;
  console.log('--- topic.__children ---');
  console.log('topic type:', topic.constructor?.name);
  console.log('topic __kind:', topic.__kind);
  console.log('children count:', topic.__children?.length);

  for (const child of topic.__children ?? []) {
    console.log(`\nchild type:`, child.constructor?.name);
    console.log(`child.name:`, child.name?.value ?? child.name);

    const val = child.value;
    console.log(`  value type:`, val?.constructor?.name);
    console.log(`  value.__kind:`, val?.__kind);
    const valKeys = Object.keys(val ?? {}).filter(k => !k.startsWith('__') && k !== '_mapIndex');
    console.log(`  value keys:`, valKeys);

    if (val.system) {
      const sys = val.system;
      const sysKeys = Object.keys(sys).filter(k => !k.startsWith('__'));
      console.log(`  system keys:`, sysKeys);
      if (sys.instructions) console.log(`  system instructions:`, sys.instructions.value);
    }

    if (val.actions) {
      console.log(`\n  actions block:`);
      console.log(`  actions type:`, val.actions.constructor?.name);
      console.log(`  actions __kind:`, val.actions.__kind);
      console.log(`  actions children:`, val.actions.__children?.length);

      for (const actChild of val.actions.__children ?? []) {
        console.log(`    action child type:`, actChild.constructor?.name);
        console.log(`    action child.name:`, actChild.name?.value ?? actChild.name);
        const actVal = actChild.value;
        console.log(`    action value type:`, actVal?.constructor?.name);
        const actValKeys = Object.keys(actVal ?? {}).filter(k => !k.startsWith('__') && k !== '_mapIndex');
        console.log(`    action value keys:`, actValKeys);

        // Explore action fields
        for (const ak of actValKeys) {
          const av = actVal[ak];
          if (av && typeof av === 'object') {
            if (av.value !== undefined) {
              console.log(`      ${ak}:`, av.constructor?.name, av.value);
            } else if (av.__children) {
              console.log(`      ${ak}:`, av.constructor?.name, `children=${av.__children.length}`);
            } else {
              console.log(`      ${ak}:`, av.constructor?.name);
            }
          } else {
            console.log(`      ${ak}:`, av);
          }
        }

        // Explore inputs
        if (actVal.inputs) {
          const inp = actVal.inputs;
          console.log(`    inputs type:`, inp.constructor?.name);
          console.log(`    inputs __kind:`, inp.__kind);
          console.log(`    inputs children:`, inp.__children?.length);
          for (const inpChild of inp.__children ?? []) {
            console.log(`      input name:`, inpChild.name?.value ?? inpChild.name);
            const inpVal = inpChild.value;
            const inpValKeys = Object.keys(inpVal ?? {}).filter(k => !k.startsWith('__') && k !== '_mapIndex');
            console.log(`      input keys:`, inpValKeys);
            for (const ik of inpValKeys) {
              const iv = inpVal[ik];
              console.log(`        ${ik}:`, iv?.constructor?.name, iv?.value ?? iv);
            }
          }
        }

        // Explore outputs
        if (actVal.outputs) {
          console.log(`    outputs children:`, actVal.outputs.__children?.length);
          for (const outChild of actVal.outputs.__children ?? []) {
            console.log(`      output name:`, outChild.name?.value ?? outChild.name);
            const outVal = outChild.value;
            const outKeys = Object.keys(outVal ?? {}).filter(k => !k.startsWith('__') && k !== '_mapIndex');
            for (const ok of outKeys) {
              const ov = outVal[ok];
              console.log(`        ${ok}:`, ov?.constructor?.name, ov?.value ?? ov);
            }
          }
        }

        // Explore target
        if (actVal.target) {
          console.log(`    target:`, actVal.target.value ?? actVal.target);
          console.log(`    target type:`, actVal.target?.constructor?.name);
        }

        break; // Only first action to keep output manageable
      }
    }

    // Check before_reasoning
    if (val.before_reasoning) {
      const br = val.before_reasoning;
      console.log(`\n  before_reasoning:`);
      console.log(`  type:`, br.constructor?.name);
      console.log(`  children:`, br.__children?.length);
      for (const stmt of br.__children ?? []) {
        console.log(`    stmt type:`, stmt.constructor?.name);
        const stmtKeys = Object.keys(stmt).filter(k => !k.startsWith('__'));
        console.log(`    stmt keys:`, stmtKeys);
        for (const sk of stmtKeys) {
          const sv = stmt[sk];
          if (sv && typeof sv === 'object') {
            console.log(`      ${sk}:`, sv.constructor?.name, sv.value ?? JSON.stringify(sv).slice(0, 100));
            if (sv.__children) {
              console.log(`      ${sk} children:`, sv.__children.length);
            }
          } else {
            console.log(`      ${sk}:`, sv);
          }
        }
      }
    }

    // Check after_reasoning
    if (val.after_reasoning) {
      const ar = val.after_reasoning;
      console.log(`\n  after_reasoning:`);
      console.log(`  type:`, ar.constructor?.name);
      console.log(`  children:`, ar.__children?.length);
      for (const stmt of ar.__children ?? []) {
        console.log(`    stmt type:`, stmt.constructor?.name);
        const stmtKeys = Object.keys(stmt).filter(k => !k.startsWith('__'));
        console.log(`    stmt keys:`, stmtKeys);
      }
    }

    // Check reasoning block
    if (val.reasoning) {
      const r = val.reasoning;
      console.log(`\n  reasoning:`);
      console.log(`  type:`, r.constructor?.name);
      const rKeys = Object.keys(r).filter(k => !k.startsWith('__') && k !== '_mapIndex');
      console.log(`  keys:`, rKeys);
      if (r.instructions) console.log(`  instructions:`, r.instructions.value);
      if (r.actions) {
        console.log(`  reasoning.actions type:`, r.actions.constructor?.name);
        console.log(`  reasoning.actions children:`, r.actions.__children?.length);
        for (const rActChild of r.actions.__children ?? []) {
          console.log(`    reasoning action name:`, rActChild.name?.value ?? rActChild.name);
          const rActVal = rActChild.value;
          const rActKeys = Object.keys(rActVal ?? {}).filter(k => !k.startsWith('__') && k !== '_mapIndex');
          console.log(`    reasoning action keys:`, rActKeys);
          // Check for @utils.transition, @utils.setVariables etc
          if (rActVal.reference) {
            console.log(`    reference:`, rActVal.reference.value ?? rActVal.reference);
          }
          if (rActVal.description) {
            console.log(`    description:`, rActVal.description.value ?? rActVal.description);
          }
          // Check with bindings and set bindings
          for (const rk of rActKeys) {
            const rv = rActVal[rk];
            if (rv && typeof rv === 'object' && rv.__children) {
              console.log(`    ${rk}: children=${rv.__children.length}`);
              for (const rc of rv.__children) {
                console.log(`      ${rk} child:`, rc.constructor?.name, rc.name?.value ?? rc.name);
              }
            }
          }
        }
      }
    }

    break; // Only first topic
  }
}