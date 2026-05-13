import { StateGenerator } from './state-generator';
import { ToolGenerator } from './tool-generator';
import { AgentGenerator } from './agent-generator';
import { PipelineGenerator } from './pipeline-generator';
import type { ConfigData, SystemData, VariableData, SubagentData, ActionData } from '../ast-utils';
import type { GenerateOptions } from './index';

export class SplitGenerator {
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
  ): Record<string, string> {
    const allActions = this.collectAllActions(subagents);
    const pkgName = config.agentName.toLowerCase().replace(/[^a-z0-9]/g, '_');

    const files: Record<string, string> = {};

    // __init__.py — just imports
    files['__init__.py'] = `"""${config.agentName} — Auto-generated AgentScope package."""\n`;

    // state.py
    files['state.py'] = this.stateGen.generate(variables);

    // tools.py
    const toolCode = allActions.map(a =>
      options.mock ? this.toolGen.generateMock(a) : this.toolGen.generateStub(a)
    ).join('\n\n');
    files['tools.py'] = toolCode;

    // agents.py
    const agentCode = subagents.map(sa => this.agentGen.generateFactory(sa)).join('\n\n');
    files['agents.py'] = agentCode;

    // pipeline.py
    files['pipeline.py'] = this.pipelineGen.generateMain(config, system, subagents);

    // main.py
    files['main.py'] = `from ${pkgName}.pipeline import main\n\nif __name__ == "__main__":\n    import asyncio\n    asyncio.run(main())\n`;

    return files;
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
