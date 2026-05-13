import { PythonWriter } from './python-writer';
import { StateGenerator } from './state-generator';
import { ToolGenerator } from './tool-generator';
import { AgentGenerator } from './agent-generator';
import { PipelineGenerator } from './pipeline-generator';
import type { ConfigData, SystemData, VariableData, SubagentData, ActionData } from '../ast-utils';

export interface GenerateOptions {
  mock: boolean;
}

/** A code section with an optional PythonWriter for import collection. */
interface CodeSection {
  code: string;
  writer?: PythonWriter;
}

export class CodeGenerator {
  private stateGen = new StateGenerator();
  private toolGen = new ToolGenerator();
  private agentGen = new AgentGenerator();
  private pipelineGen = new PipelineGenerator();

  generate(
    config: ConfigData,
    system: SystemData,
    variables: VariableData[],
    subagents: SubagentData[],
    options: GenerateOptions,
  ): string {
    const sections: CodeSection[] = [];

    // Module docstring
    sections.push({ code: `"""Auto-generated from ${config.agentName} by agentscript-cli.\nAgentScope implementation of ${config.agentName}.\n"""` });

    // StateManager
    sections.push(this.stateGen.generateSection(variables));

    // Tool stubs/mocks
    const allActions = this.collectAllActions(subagents);
    for (const action of allActions) {
      sections.push(options.mock ? this.toolGen.generateMockSection(action) : this.toolGen.generateStubSection(action));
    }

    // AgentWrapper classes
    for (const sa of subagents) {
      if (sa.beforeReasoning.length > 0 || sa.afterReasoning.length > 0) {
        sections.push(this.pipelineGen.generateAgentWrapperSection(sa));
      }
    }

    // Agent factories
    for (const sa of subagents) {
      sections.push(this.agentGen.generateFactorySection(sa));
    }

    // Main + pipeline
    sections.push(this.pipelineGen.generateMainSection(config, system, subagents));

    // Collect all imports into a single master writer
    const masterWriter = new PythonWriter();
    for (const section of sections) {
      if (section.writer) {
        masterWriter.mergeImportsFrom(section.writer);
      }
    }

    // Build output: imports first, then code sections (without their own imports)
    const parts: string[] = [];
    const importLines = masterWriter.getImportLines();
    if (importLines.length > 0) {
      parts.push(importLines.join('\n'));
    }
    for (const section of sections) {
      parts.push(section.code.trimEnd());
    }

    return parts.join('\n\n') + '\n';
  }

  private collectAllActions(subagents: SubagentData[]): ActionData[] {
    const seen = new Set<string>();
    const actions: ActionData[] = [];
    for (const sa of subagents) {
      for (const action of sa.actions) {
        if (!seen.has(action.name)) {
          seen.add(action.name);
          actions.push(action);
        }
      }
    }
    return actions;
  }
}
