import { PythonWriter } from './python-writer';
import { StateGenerator } from './state-generator';
import { ToolGenerator } from './tool-generator';
import { AgentGenerator } from './agent-generator';
import { PipelineGenerator } from './pipeline-generator';
import type { ConfigData, SystemData, VariableData, SubagentData, ActionData } from '../ast-utils';

export interface GenerateOptions {
  mock: boolean;
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
    const sections: string[] = [];

    // Module docstring
    sections.push(`"""Auto-generated from ${config.agentName} by agentscript-cli.\nAgentScope implementation of ${config.agentName}.\n"""`);

    // StateManager
    sections.push(this.stateGen.generate(variables));

    // Tool stubs/mocks
    const allActions = this.collectAllActions(subagents);
    const toolSection = allActions.map(a =>
      options.mock ? this.toolGen.generateMock(a) : this.toolGen.generateStub(a)
    ).join('\n\n');
    sections.push(toolSection);

    // AgentWrapper classes
    for (const sa of subagents) {
      if (sa.beforeReasoning.length > 0 || sa.afterReasoning.length > 0) {
        sections.push(this.pipelineGen.generateAgentWrapper(sa));
      }
    }

    // Agent factories
    for (const sa of subagents) {
      sections.push(this.agentGen.generateFactory(sa));
    }

    // Main + pipeline
    sections.push(this.pipelineGen.generateMain(config, system, subagents));

    return sections.join('\n\n');
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
