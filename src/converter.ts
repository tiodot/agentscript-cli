import { parse } from './parser-bridge';
import { CodeGenerator } from './generator/index';
import {
  extractConfig,
  extractSystem,
  extractVariables,
  extractSubagents,
} from './ast-utils';

export interface ConvertOptions {
  mock?: boolean;
}

export function convert(source: string, options: ConvertOptions = {}): string {
  const doc = parse(source);

  if (doc.hasErrors) {
    const errorMessages = doc.errors.map((d: any) => d.message).join('\n');
    throw new Error(`AgentScript parse errors:\n${errorMessages}`);
  }

  const config = extractConfig(doc.ast);
  const system = extractSystem(doc.ast);
  const variables = extractVariables(doc.ast);
  const subagents = extractSubagents(doc.ast);

  const generator = new CodeGenerator();
  return generator.generate(config, system, variables, subagents, {
    mock: options.mock ?? false,
  });
}
