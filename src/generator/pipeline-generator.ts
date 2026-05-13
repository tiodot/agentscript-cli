import { PythonWriter } from './python-writer';
import { LogicGenerator } from './logic-generator';
import { ToolGenerator } from './tool-generator';
import type { SubagentData, SystemData, ConfigData } from '../ast-utils';

export class PipelineGenerator {
  private logicGen = new LogicGenerator();
  private toolGen = new ToolGenerator();

  generateMain(config: ConfigData, system: SystemData, subagents: SubagentData[]): string {
    const w = new PythonWriter();
    w.addImport('asyncio');
    w.addImport('os');
    w.addImportFrom('agentscope.agent', 'ReActAgent');
    w.addImportFrom('agentscope.agent', 'UserAgent');
    w.addImportFrom('agentscope.model', 'DashScopeChatModel');
    w.addImportFrom('agentscope.memory', 'InMemoryMemory');
    w.addImportFrom('agentscope.formatter', 'DashScopeChatFormatter');
    w.addImportFrom('agentscope.tool', 'Toolkit');
    w.addImportFrom('agentscope.pipeline', 'MsgHub');
    w.addImportFrom('agentscope.message', 'Msg');

    w.writeLine('async def main():');
    w.setIndent(1);
    w.writeLine('state = StateManager()');

    for (const sa of subagents) {
      w.writeLine(`toolkit_${sa.name} = Toolkit()`);
    }
    w.writeBlankLine();

    for (const sa of subagents) {
      w.writeLine(`${sa.name} = create_${sa.name}(state, toolkit_${sa.name})`);
    }

    w.writeBlankLine();
    for (const sa of subagents) {
      for (const action of sa.actions) {
        const snakeName = this.toolGen.toSnakeCase(action.name);
        w.writeLine(`toolkit_${sa.name}.register_tool_function(${snakeName})`);
      }
    }

    w.writeBlankLine();
    for (const sa of subagents) {
      if (sa.beforeReasoning.length > 0 || sa.afterReasoning.length > 0) {
        const wrapperClass = this.toPascalCase(sa.name) + 'Wrapper';
        w.writeLine(`${sa.name}_wrapped = ${wrapperClass}(${sa.name}, state)`);
      }
    }

    w.writeBlankLine();
    w.writeLine('user = UserAgent(name="user")');

    if (system.welcomeMessage) {
      w.writeBlankLine();
      w.writeLine(`print("${system.welcomeMessage}")`);
    }

    const startAgent = subagents.find(s => s.kind === 'start_agent') ?? subagents[0];
    const hasHooks = startAgent.beforeReasoning.length > 0 || startAgent.afterReasoning.length > 0;
    const agentVar = hasHooks ? `${startAgent.name}_wrapped` : startAgent.name;

    w.writeBlankLine();
    w.writeLine('msg = None');
    w.writeLine('while True:');
    w.setIndent(2);
    w.writeLine('try:');
    w.setIndent(3);
    w.writeLine(`msg = await ${agentVar}(msg)`);
    w.setIndent(2);
    w.writeLine('except Exception as e:');
    w.setIndent(3);
    w.writeLine(`print("${system.errorMessage ?? 'Error: {e}'}")`);
    w.setIndent(2);
    w.writeLine('msg = await user(msg)');
    w.writeLine('if msg.get_text_content() == "exit":');
    w.setIndent(3);
    w.writeLine('break');

    w.setIndent(0);
    w.writeBlankLine();
    w.writeBlankLine();
    w.writeLine('if __name__ == "__main__":');
    w.setIndent(1);
    w.writeLine('asyncio.run(main())');

    return w.toString();
  }

  generateAgentWrapper(subagent: SubagentData): string {
    const className = this.toPascalCase(subagent.name) + 'Wrapper';
    const w = new PythonWriter();

    w.addImportFrom('agentscope.agent', 'ReActAgent');
    w.addImportFrom('agentscope.message', 'Msg');

    w.writeLine(`class ${className}:`);
    w.setIndent(1);
    w.writeLine('def __init__(self, agent: ReActAgent, state: StateManager):');
    w.setIndent(2);
    w.writeLine('self.agent = agent');
    w.writeLine('self.state = state');
    w.setIndent(1);
    w.writeBlankLine();

    w.writeLine('async def __call__(self, msg: Msg) -> Msg:');
    w.setIndent(2);
    w.writeLine('await self.before_call(msg)');
    w.writeLine('result = await self.agent(msg)');
    w.writeLine('await self.after_call(msg, result)');
    w.writeLine('return result');
    w.setIndent(1);
    w.writeBlankLine();

    w.writeLine('async def before_call(self, msg: Msg) -> None:');
    w.setIndent(2);
    if (subagent.beforeReasoning.length > 0) {
      const code = this.logicGen.generateStatements(subagent.beforeReasoning, 2);
      for (const line of code.trim().split('\n')) {
        w.writeLine(line.trimStart());
      }
    } else {
      w.writeLine('pass');
    }
    w.setIndent(1);
    w.writeBlankLine();

    w.writeLine('async def after_call(self, msg: Msg, result: Msg) -> None:');
    w.setIndent(2);
    if (subagent.afterReasoning.length > 0) {
      const code = this.logicGen.generateStatements(subagent.afterReasoning, 2);
      for (const line of code.trim().split('\n')) {
        w.writeLine(line.trimStart());
      }
    } else {
      w.writeLine('pass');
    }

    return w.toString();
  }

  private toPascalCase(name: string): string {
    return name.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  }
}
