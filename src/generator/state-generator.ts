import { PythonWriter } from './python-writer';
import type { VariableData } from '../ast-utils';

export class StateGenerator {
  mapType(agentScriptType: string): string {
    // Handle generic types like list[string], list[object]
    const listMatch = agentScriptType.match(/^list\[(.+)\]$/);
    if (listMatch) {
      const inner = this.mapType(listMatch[1]);
      return `list[${inner}]`;
    }
    switch (agentScriptType) {
      case 'string': return 'str';
      case 'number': return 'float';      // IEEE 754 double per spec
      case 'integer': return 'int';
      case 'long': return 'int';
      case 'boolean': return 'bool';
      case 'object': return 'dict';
      case 'currency': return 'float';
      case 'date': return 'str';          // YYYY-MM-DD string
      case 'datetime': return 'str';
      case 'time': return 'str';
      case 'timestamp': return 'str';
      case 'id': return 'str';            // Salesforce record ID
      default: return 'Any';
    }
  }

  mapDefaultValue(agentScriptType: string, defaultValue: string): string {
    // If the extracted default is a JS object string, use type-based default instead
    if (defaultValue && defaultValue !== 'None' && !defaultValue.startsWith('[object')) return defaultValue;
    switch (agentScriptType) {
      case 'string': return '""';
      case 'number': return '0.0';
      case 'integer': return '0';
      case 'long': return '0';
      case 'boolean': return 'False';
      case 'object': return '{}';
      case 'list[object]': return '[]';
      default: return 'None';
    }
  }

  generate(variables: VariableData[]): string {
    const w = new PythonWriter();
    w.addImportFrom('typing', 'Any');

    w.writeLine('class StateManager:');
    w.writeLine('    """Shared state mirroring AgentScript variables."""');
    w.writeBlankLine();

    w.writeLine('    def __init__(self):');
    if (variables.length === 0) {
      w.writeLine('        pass');
    } else {
      for (const v of variables) {
        const pyType = this.mapType(v.type);
        const pyDefault = this.mapDefaultValue(v.type, v.defaultValue);
        const comment = v.linked ? '  # linked (read-only)' : v.description ? `  # ${v.description}` : '';
        w.writeLine(`        self.${v.name}: ${pyType} = ${pyDefault}${comment}`);
      }
    }

    w.writeBlankLine();
    w.writeLine('    def set(self, name: str, value: Any) -> None:');
    w.writeLine('        setattr(self, name, value)');
    w.writeBlankLine();
    w.writeLine('    def get(self, name: str) -> Any:');
    w.writeLine('        return getattr(self, name, None)');

    return w.toString();
  }

  /** Return code-only section with separate writer for import collection. */
  generateSection(variables: VariableData[]): { code: string; writer: PythonWriter } {
    const w = new PythonWriter();
    w.addImportFrom('typing', 'Any');

    w.writeLine('class StateManager:');
    w.writeLine('    """Shared state mirroring AgentScript variables."""');
    w.writeBlankLine();

    w.writeLine('    def __init__(self):');
    if (variables.length === 0) {
      w.writeLine('        pass');
    } else {
      for (const v of variables) {
        const pyType = this.mapType(v.type);
        const pyDefault = this.mapDefaultValue(v.type, v.defaultValue);
        const comment = v.linked ? '  # linked (read-only)' : v.description ? `  # ${v.description}` : '';
        w.writeLine(`        self.${v.name}: ${pyType} = ${pyDefault}${comment}`);
      }
    }

    w.writeBlankLine();
    w.writeLine('    def set(self, name: str, value: Any) -> None:');
    w.writeLine('        setattr(self, name, value)');
    w.writeBlankLine();
    w.writeLine('    def get(self, name: str) -> Any:');
    w.writeLine('        return getattr(self, name, None)');

    return { code: w.toCodeOnly(), writer: w };
  }
}
