import { PythonWriter } from './python-writer';
import type { ActionData, ParamData } from '../ast-utils';

export class ToolGenerator {
  toSnakeCase(name: string): string {
    return name
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
      .replace(/_+/g, '_');
  }

  mapParamType(agentScriptType: string): string {
    const listMatch = agentScriptType.match(/^list\[(.+)\]$/);
    if (listMatch) {
      const inner = this.mapParamType(listMatch[1]);
      return `list[${inner}]`;
    }
    switch (agentScriptType) {
      case 'string': return 'str';
      case 'number': return 'int';
      case 'boolean': return 'bool';
      case 'object': return 'dict';
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

    w.addImport('json');
    w.addImportFrom('agentscope.tool', 'ToolResponse');
    w.addImportFrom('agentscope.message', 'TextBlock');

    // Internal function returning dict
    this.writeImplFunction(w, funcName, params, action, 'stub');

    w.writeBlankLine();

    // Public wrapper returning ToolResponse
    this.writeToolResponseWrapper(w, funcName, params, action);

    return w.toString();
  }

  generateMock(action: ActionData): string {
    const w = new PythonWriter();
    const funcName = this.toSnakeCase(action.name);
    const params = this.formatParams(action.inputs);

    w.addImport('json');
    w.addImportFrom('agentscope.tool', 'ToolResponse');
    w.addImportFrom('agentscope.message', 'TextBlock');

    // Internal function returning dict (mock)
    this.writeImplFunction(w, funcName, params, action, 'mock');

    w.writeBlankLine();

    // Public wrapper returning ToolResponse
    this.writeToolResponseWrapper(w, funcName, params, action);

    return w.toString();
  }

  private mockValue(type: string, name?: string): string {
    switch (type) {
      case 'string':
        // Return plausible example values based on parameter name
        if (name) {
          if (name.includes('email')) return '"user@example.com"';
          if (name.includes('name')) return '"Mock User"';
          if (name.includes('id')) return '"MOCK_ID_001"';
          if (name.includes('number') || name.includes('case_number')) return '"MOCK-001"';
          if (name.includes('type') || name.includes('tier') || name.includes('status')) return '"mock_type"';
          if (name.includes('description') || name.includes('reason') || name.includes('details')) return '"Mock description"';
          if (name.includes('steps') || name.includes('summary') || name.includes('resolution')) return '"Mock steps"';
          if (name.includes('sla')) return '"2 hours"';
          if (name.includes('method')) return '"email"';
        }
        return '"mock_value"';
      case 'number': return '0';
      case 'boolean': return 'True';
      case 'object': return '{}';
      case 'list[object]': return '[]';
      default: return 'None';
    }
  }

  /** Write the _impl function that returns dict (business logic, called by after_call) */
  private writeImplFunction(w: PythonWriter, funcName: string, params: string, action: ActionData, mode: 'stub' | 'mock'): void {
    const implName = `${funcName}_impl`;
    w.writeLine(`async def ${implName}(${params}) -> dict:`);
    w.setIndent(1);
    w.writeLine(`"""${action.description}`);
    if (mode === 'mock') {
      w.writeLine('(MOCK IMPLEMENTATION)');
    }
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
    if (action.target && mode === 'stub') {
      w.writeBlankLine();
      w.writeLine(`Target: ${action.target}`);
    }
    w.writeLine('"""');
    w.writeBlankLine();

    if (mode === 'stub') {
      w.writeLine(`raise NotImplementedError("Action target: ${action.target ?? action.name}")`);
    } else {
      w.writeLine('return {');
      w.setIndent(2);
      for (const o of action.outputs) {
        w.writeLine(`"${o.name}": ${this.mockValue(o.type, o.name)},`);
      }
      w.setIndent(1);
      w.writeLine('}');
    }
    w.setIndent(0);
  }

  /** Write the public ToolResponse wrapper (registered with Toolkit) */
  private writeToolResponseWrapper(w: PythonWriter, funcName: string, params: string, action: ActionData): void {
    const implName = `${funcName}_impl`;
    w.writeLine(`async def ${funcName}(${params}) -> ToolResponse:`);
    w.setIndent(1);
    w.writeLine(`"""${action.description}"""`);
    w.writeBlankLine();
    w.writeLine(`result = await ${implName}(${action.inputs.map(p => `${p.name}=${p.name}`).join(', ')})`);
    w.writeLine('return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])');
    w.setIndent(0);
  }

  /**
   * Generate a standalone Python scaffold file with one `_impl` stub per action.
   * The stubs have full typed signatures and docstrings but just `pass` bodies,
   * ready for the user to implement and pass back via --actions.
   */
  generateActionsScaffold(actions: ActionData[]): string {
    const lines: string[] = [
      '"""Action implementations — fill in each function and pass this file via --actions."""',
      'from typing import Any',
      '',
    ];

    for (const action of actions) {
      const funcName = this.toSnakeCase(action.name);
      const params = this.formatParams(action.inputs);
      const implName = `${funcName}_impl`;

      lines.push(`async def ${implName}(${params}) -> dict:`);
      lines.push(`    """${action.description}`);
      if (action.inputs.length > 0) {
        lines.push('');
        lines.push('    Args:');
        for (const p of action.inputs) {
          lines.push(`        ${p.name}: ${p.description ?? p.type}`);
        }
      }
      if (action.outputs.length > 0) {
        lines.push('');
        lines.push('    Returns:');
        const keys = action.outputs.map(o => `${o.name}: ${o.type}`).join(', ');
        lines.push(`        dict with keys — ${keys}`);
      }
      if (action.target) {
        lines.push('');
        lines.push(`    Target: ${action.target}`);
      }
      lines.push('    """');
      lines.push('    pass');
      lines.push('');
    }

    return lines.join('\n');
  }

  generateStubSection(action: ActionData): { code: string; writer: PythonWriter } {
    const w = new PythonWriter();
    const funcName = this.toSnakeCase(action.name);
    const params = this.formatParams(action.inputs);

    w.addImport('json');
    w.addImportFrom('agentscope.tool', 'ToolResponse');
    w.addImportFrom('agentscope.message', 'TextBlock');

    this.writeImplFunction(w, funcName, params, action, 'stub');
    w.writeBlankLine();
    this.writeToolResponseWrapper(w, funcName, params, action);

    return { code: w.toCodeOnly(), writer: w };
  }

  generateMockSection(action: ActionData): { code: string; writer: PythonWriter } {
    const w = new PythonWriter();
    const funcName = this.toSnakeCase(action.name);
    const params = this.formatParams(action.inputs);

    w.addImport('json');
    w.addImportFrom('agentscope.tool', 'ToolResponse');
    w.addImportFrom('agentscope.message', 'TextBlock');

    this.writeImplFunction(w, funcName, params, action, 'mock');
    w.writeBlankLine();
    this.writeToolResponseWrapper(w, funcName, params, action);

    return { code: w.toCodeOnly(), writer: w };
  }
}
