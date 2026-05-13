import { describe, it, expect } from 'vitest';
import { LogicGenerator } from '../../src/generator/logic-generator';
import type { LogicStatement } from '../../src/ast-utils';

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
    expect(code).toContain('result = await verify_customer_identity_impl(email=state.get("customer_email"))');
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
    expect(code).toContain('self.next_agent = "case_creation"');
  });

  it('converts @references to Python expressions', () => {
    const gen = new LogicGenerator();
    expect(gen.convertRef('@variables.customer_email')).toBe('state.get("customer_email")');
    expect(gen.convertRef('@variables.customer_email', 'self.state')).toBe('self.state.get("customer_email")');
    expect(gen.convertRef('@outputs.case_number')).toBe('result["case_number"]');
    expect(gen.convertRef('"literal"')).toBe('"literal"');
  });

  it('generates elif for cascading conditions on same variable', () => {
    const stmts: LogicStatement[] = [
      { kind: 'if', condition: '@variables.escalation_score >= 80', body: [{ kind: 'set', variable: '@variables.escalation_tier', value: '"senior_manager"' }] },
      { kind: 'if', condition: '@variables.escalation_score >= 60', body: [{ kind: 'set', variable: '@variables.escalation_tier', value: '"manager"' }] },
      { kind: 'if', condition: '@variables.escalation_score >= 40', body: [{ kind: 'set', variable: '@variables.escalation_tier', value: '"l2_support"' }] },
    ];
    const gen = new LogicGenerator();
    const code = gen.generateStatements(stmts, 0, 'self.state');
    expect(code).toContain('if self.state.get("escalation_score") >= 80:');
    expect(code).toContain('elif self.state.get("escalation_score") >= 60:');
    expect(code).toContain('elif self.state.get("escalation_score") >= 40:');
  });

  it('keeps if for identical conditions (independent checks)', () => {
    const stmts: LogicStatement[] = [
      { kind: 'if', condition: '@variables.customer_verified', body: [{ kind: 'set', variable: '@variables.escalation_score', value: '@outputs.previous_cases' }] },
      { kind: 'if', condition: '@variables.customer_verified', body: [{ kind: 'transition', target: '@topic.case_creation' }] },
    ];
    const gen = new LogicGenerator();
    const code = gen.generateStatements(stmts, 0, 'self.state');
    // Both should be 'if', not 'elif' — they're independent operations on same check
    expect(code).toContain('if self.state.get("customer_verified"):');
    expect(code).not.toContain('elif self.state.get("customer_verified"):');
  });
});
