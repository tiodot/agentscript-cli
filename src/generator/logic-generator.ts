import { PythonWriter } from './python-writer';
import type { LogicStatement } from '../ast-utils';
import { ToolGenerator } from './tool-generator';

export class LogicGenerator {
  private toolGen = new ToolGenerator();

  convertRef(ref: string, stateRef: string = 'state'): string {
    if (ref.startsWith('@variables.')) {
      return `${stateRef}.get("${ref.replace('@variables.', '')}")`;
    }
    if (ref.startsWith('@outputs.')) {
      return `result["${ref.replace('@outputs.', '')}"]`;
    }
    if (ref.startsWith('@actions.')) {
      return this.toolGen.toSnakeCase(ref.replace('@actions.', ''));
    }
    return ref;
  }

  convertCondition(condition: string, stateRef: string = 'state'): string {
    let result = condition;
    result = result.replace(/@variables\.(\w+)/g, (_, name) => `${stateRef}.get("${name}")`);
    result = result.replace(/@outputs\.(\w+)/g, (_, name) => `result["${name}"]`);
    return result;
  }

  /**
   * @param useResolveImpl When true, `run` statements call `await self._resolve_impl("name", ...)`
   *                       instead of `await name_impl(...)`. Used in Wrapper classes.
   */
  generateStatements(stmts: LogicStatement[], indent: number = 0, stateRef: string = 'state', useResolveImpl: boolean = false): string {
    const lines: string[] = [];
    for (let i = 0; i < stmts.length; i++) {
      const stmt = stmts[i];
      // Heuristic: if consecutive 'if' statements compare the same variable
      // with DIFFERENT conditions (e.g., score >= 80, score >= 60, score >= 40),
      // generate 'elif' for the 2nd+ statements (cascade pattern).
      // But if the conditions are identical, they are independent checks — keep 'if'.
      let useElif = false;
      if (stmt.kind === 'if' && i > 0) {
        const prev = stmts[i - 1];
        if (prev.kind === 'if') {
          const varName = this.extractComparedVariable(stmt.condition);
          const prevVarName = this.extractComparedVariable(prev.condition);
          if (varName && varName === prevVarName && stmt.condition !== prev.condition) {
            useElif = true;
          }
        }
      }
      lines.push(this.generateStatement(stmt, indent, stateRef, useElif, useResolveImpl));
    }
    return lines.join('\n');
  }

  generateStatement(stmt: LogicStatement, baseIndent: number = 0, stateRef: string = 'state', useElif: boolean = false, useResolveImpl: boolean = false): string {
    switch (stmt.kind) {
      case 'if': return this.genIf(stmt, baseIndent, stateRef, useElif, useResolveImpl);
      case 'run': return this.genRun(stmt, baseIndent, stateRef, useResolveImpl);
      case 'set': return this.genSet(stmt, baseIndent, stateRef);
      case 'transition': return this.genTransition(stmt, baseIndent, stateRef);
    }
  }

  /** Extract the variable being compared in a condition like "@variables.X >= 80" or "state.get("X") >= 80" */
  private extractComparedVariable(condition: string): string | null {
    // Match @variables.X pattern (pre-conversion)
    const atMatch = condition.match(/@variables\.(\w+)/);
    if (atMatch) return atMatch[1];
    // Match state.get("X") or self.state.get("X") pattern (post-conversion)
    const stateMatch = condition.match(/(?:self\.)?state\.get\("(\w+)"\)/);
    return stateMatch ? stateMatch[1] : null;
  }

  private genIf(stmt: LogicStatement & { kind: 'if' }, indent: number, stateRef: string, useElif: boolean = false, useResolveImpl: boolean = false): string {
    const lines: string[] = [];
    const condition = this.convertCondition(stmt.condition, stateRef);
    const keyword = useElif ? 'elif' : 'if';
    lines.push(`${'    '.repeat(indent)}${keyword} ${condition}:`);
    for (const bodyStmt of stmt.body) {
      const bodyCode = this.generateStatement(bodyStmt, indent + 1, stateRef, false, useResolveImpl);
      lines.push(bodyCode);
    }
    if (stmt.elseBody?.length) {
      lines.push(`${'    '.repeat(indent)}else:`);
      for (const elseStmt of stmt.elseBody) {
        lines.push(this.generateStatement(elseStmt, indent + 1, stateRef, false, useResolveImpl));
      }
    }
    return lines.join('\n');
  }

  private genRun(stmt: LogicStatement & { kind: 'run' }, indent: number, stateRef: string, useResolveImpl: boolean = false): string {
    const lines: string[] = [];
    const actionName = this.toolGen.toSnakeCase(stmt.action.replace('@actions.', ''));
    const withArgs = stmt.withBindings.map(b => `${b.param}=${this.convertCondition(b.value, stateRef)}`).join(', ');
    if (useResolveImpl) {
      // Keyword-argument dict for _resolve_impl
      const kwStr = stmt.withBindings.map(b => `"${b.param}": ${this.convertCondition(b.value, stateRef)}`).join(', ');
      lines.push(`${'    '.repeat(indent)}result = await self._resolve_impl("${actionName}", ${kwStr ? `**{${kwStr}}` : ''})`);
    } else {
      // Call the _impl function which returns dict (not the ToolResponse wrapper)
      lines.push(`${'    '.repeat(indent)}result = await ${actionName}_impl(${withArgs})`);
    }
    for (const binding of stmt.setBindings) {
      const varName = binding.variable.replace('@variables.', '');
      lines.push(`${'    '.repeat(indent)}${stateRef}.set("${varName}", ${this.convertCondition(binding.value, stateRef)})`);
    }
    return lines.join('\n');
  }

  private genSet(stmt: LogicStatement & { kind: 'set' }, indent: number, stateRef: string): string {
    const varName = stmt.variable.replace('@variables.', '');
    const value = this.convertCondition(stmt.value, stateRef);
    return `${'    '.repeat(indent)}${stateRef}.set("${varName}", ${value})`;
  }

  private genTransition(stmt: LogicStatement & { kind: 'transition' }, indent: number, stateRef: string): string {
    const target = stmt.target.replace('@topic.', '').replace('@subagent.', '');
    return `${'    '.repeat(indent)}self.next_agent = "${target}"`;
  }
}
