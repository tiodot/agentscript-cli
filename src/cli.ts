import { Command } from 'commander';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { convert } from './converter';
import { parse } from './parser-bridge';
import { extractConfig, extractSystem, extractVariables, extractSubagents } from './ast-utils';
import { SplitGenerator } from './generator/split-generator';
import { CodeGenerator } from './generator/index';
import { ToolGenerator } from './generator/tool-generator';
import { generateBailianProject, buildWheel, deployToBailian } from './bailian-deploy.js';
import { generateE2ETests } from './test-generator/index';

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

program
  .command('deploy')
  .description('Convert an AgentScript .agent file and deploy to Alibaba Cloud Bailian')
  .argument('<file>', 'Path to the .agent file')
  .option('--output-dir <dir>', 'Directory for the generated Bailian project')
  .option('--app-id <id>', 'Bailian app ID to update an existing deployment')
  .option('--mcp', 'Include fastmcp dependency for Bailian MCP services')
  .option('--build-only', 'Build wheel only, skip deploy')
  .option('--desc <text>', 'Description override')
  .option('--actions <file>', 'Python file with action implementations (async def <action_name>_impl(...))')
  .action(async (file, options) => {
    const inputPath = resolve(file);
    const source = readFileSync(inputPath, 'utf-8');

    let doc: any;
    try {
      doc = parse(source);
    } catch (err) {
      console.error(`Error parsing ${file}: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }

    if (doc.hasErrors) {
      const errorMessages = doc.errors.map((d: any) => d.message).join('\n');
      console.error(`AgentScript parse errors:\n${errorMessages}`);
      process.exit(1);
    }

    const config = extractConfig(doc.ast);
    const system = extractSystem(doc.ast);
    const variables = extractVariables(doc.ast);
    const subagents = extractSubagents(doc.ast);

    // Collect all unique action names (snake_case _impl functions expected)
    const seen = new Set<string>();
    const allActionNames: string[] = [];
    for (const sa of subagents) {
      for (const action of sa.actions) {
        const snake = action.name
          .replace(/([A-Z])/g, '_$1').toLowerCase()
          .replace(/^_/, '').replace(/_+/g, '_');
        if (!seen.has(snake)) {
          seen.add(snake);
          allActionNames.push(snake);
        }
      }
    }

    // Validate and check coverage of --actions file
    let implsPath: string | undefined;
    if (options.actions) {
      implsPath = resolve(options.actions);
      if (!existsSync(implsPath)) {
        console.error(`Error: --actions file not found: ${implsPath}`);
        process.exit(1);
      }
      const implsSource = readFileSync(implsPath, 'utf-8');
      const defined = new Set(
        [...implsSource.matchAll(/^async\s+def\s+(\w+)\s*\(/gm)].map(m => m[1])
      );
      const missing = allActionNames.filter(n => !defined.has(`${n}_impl`));
      if (missing.length > 0) {
        console.warn(`Warning: the following action implementations are missing from ${options.actions}:`);
        for (const name of missing) {
          console.warn(`  - ${name}_impl(...) -> dict`);
        }
        console.warn('These actions will raise NotImplementedError at runtime.');
      }
    } else {
      console.warn(`Warning: no --actions file provided. All ${allActionNames.length} action(s) will raise NotImplementedError at runtime:`);
      for (const name of allActionNames) {
        console.warn(`  - ${name}_impl(...) -> dict`);
      }
    }

    const codeGen = new CodeGenerator();
    const coreCode = codeGen.generate(config, system, variables, subagents, { mock: false });

    const appName = config.agentName || config.developerName || 'bailian_agent';
    const outputDir = options.outputDir
      ? resolve(options.outputDir)
      : resolve(appName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_bailian');

    try {
      generateBailianProject({
        coreCode,
        outputDir,
        appName,
        description: options.desc ?? config.description,
        welcomeMessage: system.welcomeMessage,
        enableMcp: options.mcp ?? false,
        implsPath,
      });
      console.log(`Generated Bailian project → ${outputDir}/`);

      const whlPath = await buildWheel(outputDir);
      console.log(`Built wheel → ${whlPath}`);

      if (!options.buildOnly) {
        await deployToBailian({
          whlPath,
          appName,
          appId: options.appId,
          desc: options.desc ?? config.description,
        });
        console.log(`Deployed ${appName} to Bailian.`);
      }
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

program
  .command('actions')
  .description('Export action implementation scaffolds from an AgentScript .agent file')
  .argument('<file>', 'Path to the .agent file')
  .option('-o, --output <path>', 'Output Python file (default: <agentName>_actions.py)')
  .action((file, options) => {
    const inputPath = resolve(file);
    const source = readFileSync(inputPath, 'utf-8');

    let doc: any;
    try {
      doc = parse(source);
    } catch (err) {
      console.error(`Error parsing ${file}: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }

    if (doc.hasErrors) {
      const errorMessages = doc.errors.map((d: any) => d.message).join('\n');
      console.error(`AgentScript parse errors:\n${errorMessages}`);
      process.exit(1);
    }

    const config = extractConfig(doc.ast);
    const subagents = extractSubagents(doc.ast);

    // Collect unique actions across all subagents
    const seen = new Set<string>();
    const allActions = [];
    for (const sa of subagents) {
      for (const action of sa.actions) {
        if (!seen.has(action.name)) {
          seen.add(action.name);
          allActions.push(action);
        }
      }
    }

    if (allActions.length === 0) {
      console.warn('No actions found in the agent file.');
      process.exit(0);
    }

    const toolGen = new ToolGenerator();
    const scaffold = toolGen.generateActionsScaffold(allActions);

    const agentSlug = (config.agentName || config.developerName || 'agent')
      .toLowerCase().replace(/[^a-z0-9]/g, '_');
    const outputPath = options.output
      ? resolve(options.output)
      : inputPath.replace(/\.agent$/, '_actions.py');

    writeFileSync(outputPath, scaffold, 'utf-8');
    console.log(`Exported ${allActions.length} action scaffold(s) → ${outputPath}`);
    console.log('Fill in each _impl function, then run:');
    console.log(`  agentscript deploy ${file} --actions ${outputPath}`);
  });

program
  .command('gen-tests')
  .description('Generate e2e pytest tests from an AgentScript .agent file')
  .argument('<file>', 'Path to the .agent file')
  .option('-o, --output <path>', 'Output test file path (default: tests/test_<agentSlug>_e2e.py)')
  .option('--email <email>', 'Valid test email address used in generated inputs (default: test@example.com)')
  .option('--api-key <key>', 'DashScope API key for LLM enrichment (falls back to DASHSCOPE_API_KEY env var)')
  .action(async (file, options) => {
    const inputPath = resolve(file);
    const source = readFileSync(inputPath, 'utf-8');

    let doc: any;
    try {
      doc = parse(source);
    } catch (err) {
      console.error(`Error parsing ${file}: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }

    if (doc.hasErrors) {
      const errorMessages = doc.errors.map((d: any) => d.message).join('\n');
      console.error(`AgentScript parse errors:\n${errorMessages}`);
      process.exit(1);
    }

    const config = extractConfig(doc.ast);
    const variables = extractVariables(doc.ast);
    const subagents = extractSubagents(doc.ast);

    const agentSlug = (config.agentName || config.developerName || 'agent')
      .toLowerCase().replace(/[^a-z0-9]/g, '_');

    const outputPath = options.output
      ? resolve(options.output)
      : resolve('tests', `test_${agentSlug}_e2e.py`);

    const validEmail = options.email ?? 'test@example.com';
    const apiKey = options.apiKey ?? process.env['DASHSCOPE_API_KEY'];

    if (!apiKey) {
      console.warn('[gen-tests] DASHSCOPE_API_KEY not set — generating tests with fallback inputs (no LLM enrichment).');
    }

    try {
      console.log(`[gen-tests] Analysing ${file}...`);
      const output = await generateE2ETests({ config, variables, subagents, validEmail, apiKey });

      // Ensure output directory exists
      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, output, 'utf-8');
      console.log(`[gen-tests] Generated → ${outputPath}`);
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

program.parse();
