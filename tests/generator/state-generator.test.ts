import { describe, it, expect } from 'vitest';
import { StateGenerator } from '../../src/generator/state-generator';
import type { VariableData } from '../../src/ast-utils';

describe('StateGenerator', () => {
  it('generates StateManager class from variables', () => {
    const vars: VariableData[] = [
      { name: 'customer_email', type: 'string', mutable: true, linked: false, defaultValue: '""', description: 'Customer email' },
      { name: 'customer_verified', type: 'boolean', mutable: true, linked: false, defaultValue: 'False', description: 'Verified' },
      { name: 'escalation_score', type: 'number', mutable: true, linked: false, defaultValue: '0.0', description: 'Score' },
      { name: 'order_items', type: 'list[object]', mutable: true, linked: false, defaultValue: '[]', description: 'Items' },
    ];
    const gen = new StateGenerator();
    const code = gen.generate(vars);
    expect(code).toContain('class StateManager:');
    expect(code).toContain('self.customer_email: str = ""');
    expect(code).toContain('self.customer_verified: bool = False');
    expect(code).toContain('self.escalation_score: float = 0.0');
    expect(code).toContain('self.order_items: list[dict] = []');
    expect(code).toContain('def set(self, name: str, value: Any)');
    expect(code).toContain('def get(self, name: str) -> Any');
  });

  it('maps AgentScript types to Python types', () => {
    const gen = new StateGenerator();
    expect(gen.mapType('string')).toBe('str');
    expect(gen.mapType('number')).toBe('float');
    expect(gen.mapType('boolean')).toBe('bool');
    expect(gen.mapType('object')).toBe('dict');
    expect(gen.mapType('list[object]')).toBe('list[dict]');
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
