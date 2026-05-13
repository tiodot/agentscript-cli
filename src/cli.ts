import { Command } from 'commander';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { convert } from './converter';
import { parse } from './parser-bridge';
import { extractConfig, extractSystem, extractVariables, extractSubagents } from './ast-utils';
import { SplitGenerator } from './generator/split-generator';

const program = new Command();

program
  .name('agentscript')
  .description('Convert AgentScript .agent files to AgentScope Python code')
  .version('0.1.0');

program
  .command('convert')
  .description('Convert an AgentScript .agent file to AgentScope Python')
  .argument('<file>', 'Path to the .agent file')
  .option('-o, --output <path>', 'Output file path (default: same name with .py extension)')
  .option('--mock', 'Generate mock implementations instead of NotImplementedError stubs')
  .option('--split', 'Generate a Python package with separate files instead of a single file')
  .action((file, options) => {
    const inputPath = resolve(file);
    const source = readFileSync(inputPath, 'utf-8');

    try {
      if (options.split) {
        const doc = parse(source);
        if (doc.hasErrors) {
          const errorMessages = doc.errors.map((d: any) => d.message).join('\n');
          console.error(`AgentScript parse errors:\n${errorMessages}`);
          process.exit(1);
        }
        const config = extractConfig(doc.ast);
        const system = extractSystem(doc.ast);
        const variables = extractVariables(doc.ast);
        const subagents = extractSubagents(doc.ast);

        const splitGen = new SplitGenerator();
        const files = splitGen.generate(config, system, variables, subagents, { mock: options.mock ?? false });

        const outputDir = options.output
          ? resolve(options.output)
          : resolve(config.agentName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_agent');

        mkdirSync(outputDir, { recursive: true });
        for (const [filename, content] of Object.entries(files)) {
          const filePath = resolve(outputDir, filename);
          writeFileSync(filePath, content as string, 'utf-8');
        }
        console.log(`Converted ${file} → ${outputDir}/ (package structure)`);
      } else {
        const result = convert(source, { mock: options.mock });

        const outputPath = options.output
          ? resolve(options.output)
          : inputPath.replace(/\.agent$/, '.py');

        writeFileSync(outputPath, result, 'utf-8');
        console.log(`Converted ${file} → ${outputPath}`);
      }
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

program.parse();
