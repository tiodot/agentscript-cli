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

    w.writeLine(`async def ${funcName}(${params}) -> dict:`);
    w.setIndent(1);
    w.writeLine(`"""${action.description}`);
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
    if (action.target) {
      w.writeBlankLine();
      w.writeLine(`Target: ${action.target}`);
    }
    w.writeLine('"""');
    w.writeBlankLine();
    w.writeLine(`raise NotImplementedError("Action target: ${action.target ?? action.name}")`);

    return w.toString();
  }

  generateMock(action: ActionData): string {
    const w = new PythonWriter();
    const funcName = this.toSnakeCase(action.name);
    const params = this.formatParams(action.inputs);

    w.writeLine(`async def ${funcName}(${params}) -> dict:`);
    w.setIndent(1);
    w.writeLine(`"""${action.description}`);
    w.writeLine('(MOCK IMPLEMENTATION)');
    w.writeLine('"""');
    w.writeBlankLine();
    w.writeLine('return {');
    w.setIndent(2);
    for (const o of action.outputs) {
      w.writeLine(`"${o.name}": ${this.mockValue(o.type)},`);
    }
    w.setIndent(1);
    w.writeLine('}');

    return w.toString();
  }

  private mockValue(type: string): string {
    switch (type) {
      case 'string': return '""';
      case 'number': return '0';
      case 'boolean': return 'False';
      case 'object': return '{}';
      case 'list[object]': return '[]';
      default: return 'None';
    }
  }
}
