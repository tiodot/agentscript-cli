import { PythonWriter } from './python-writer';
import type { LogicStatement } from '../ast-utils';
import { ToolGenerator } from './tool-generator';

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
    const lines: string[] = [];
    for (const stmt of stmts) {
      lines.push(this.generateStatement(stmt, indent));
    }
    return lines.join('\n');
  }

  generateStatement(stmt: LogicStatement, baseIndent: number = 0): string {
    switch (stmt.kind) {
      case 'if': return this.genIf(stmt, baseIndent);
      case 'run': return this.genRun(stmt, baseIndent);
      case 'set': return this.genSet(stmt, baseIndent);
      case 'transition': return this.genTransition(stmt, baseIndent);
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
    const withArgs = stmt.withBindings.map(b => `${b.param}=${this.convertCondition(b.value)}`).join(', ');
    lines.push(`${'    '.repeat(indent)}result = await ${actionName}(${withArgs})`);
    for (const binding of stmt.setBindings) {
      const varName = binding.variable.replace('@variables.', '');
      lines.push(`${'    '.repeat(indent)}state.set("${varName}", ${this.convertCondition(binding.value)})`);
    }
    return lines.join('\n');
  }

  private genSet(stmt: LogicStatement & { kind: 'set' }, indent: number): string {
    const varName = stmt.variable.replace('@variables.', '');
    const value = this.convertCondition(stmt.value);
    return `${'    '.repeat(indent)}state.set("${varName}", ${value})`;
  }

  private genTransition(stmt: LogicStatement & { kind: 'transition' }, indent: number): string {
    const target = stmt.target.replace('@topic.', '').replace('@subagent.', '');
    return `${'    '.repeat(indent)}pass  # transition to ${target}`;
  }
}
