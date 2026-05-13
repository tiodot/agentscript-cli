import { PythonWriter } from './python-writer';
import type { SubagentData } from '../ast-utils';

export class AgentGenerator {
  generateFactory(subagent: SubagentData): string {
    const w = new PythonWriter();

    w.addImportFrom('agentscope.agent', 'ReActAgent');
    w.addImportFrom('agentscope.model', 'DashScopeChatModel');
    w.addImportFrom('agentscope.formatter', 'DashScopeChatFormatter');
    w.addImportFrom('agentscope.memory', 'InMemoryMemory');
    w.addImportFrom('agentscope.tool', 'Toolkit');
    w.addImport('os');

    w.writeLine(`def create_${subagent.name}(state: StateManager, toolkit: Toolkit) -> ReActAgent:`);
    w.setIndent(1);
    w.writeLine(`"""Create the ${subagent.name} agent."""`);

    const promptParts: string[] = [];
    if (subagent.systemInstructions) promptParts.push(subagent.systemInstructions);
    if (subagent.reasoningInstructions) promptParts.push('\n' + subagent.reasoningInstructions);
    const sysPrompt = promptParts.join('\n\n') || subagent.description;

    w.writeBlankLine();
    w.writeLine(`sys_prompt = """${sysPrompt}"""`);
    w.writeBlankLine();
    w.writeLine('return ReActAgent(');
    w.setIndent(2);
    w.writeLine(`name="${subagent.name}",`);
    w.writeLine('sys_prompt=sys_prompt,');
    w.writeLine('model=DashScopeChatModel(');
    w.setIndent(3);
    w.writeLine('model_name="qwen3.6-flash",');
    w.writeLine('api_key=os.environ["DASHSCOPE_API_KEY"],');
    w.writeLine('stream=True,');
    w.writeLine('enable_thinking=False,');
    w.writeLine('multimodality=True,');
    w.setIndent(2);
    w.writeLine('),');
    w.writeLine('memory=InMemoryMemory(),');
    w.writeLine('formatter=DashScopeChatFormatter(),');
    w.writeLine('toolkit=toolkit,');
    w.setIndent(1);
    w.writeLine(')');

    return w.toString();
  }
}
