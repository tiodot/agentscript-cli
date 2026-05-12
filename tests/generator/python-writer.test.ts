import { describe, it, expect } from 'vitest';
import { PythonWriter } from '../../src/generator/python-writer.js';

describe('PythonWriter', () => {
  it('writes a line with correct indentation', () => {
    const w = new PythonWriter();
    w.writeLine('def foo():');
    w.setIndent(1);
    w.writeLine('return 42');
    expect(w.toString()).toBe('def foo():\n    return 42\n');
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
    const combined = PythonWriter.join([w1, w2]);
    expect(combined).toBe('class A:\n\nclass B:\n');
  });
});