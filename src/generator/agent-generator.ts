import { PythonWriter } from './python-writer';
import type { SubagentData } from '../ast-utils';

export class AgentGenerator {
  /** Build the resolved system prompt string for a subagent, including any
   *  auto-generated _set_variables instruction when @utils.setVariables is used. */
  private buildSysPrompt(subagent: SubagentData): string {
    const promptParts: string[] = [];
    if (subagent.systemInstructions) promptParts.push(subagent.systemInstructions);
    if (subagent.reasoningInstructions) promptParts.push('\n' + subagent.reasoningInstructions);
    let sysPrompt = promptParts.join('\n\n') || subagent.description;

    // When this agent has @utils.setVariables actions, inject an explicit instruction
    // so the LLM knows it must call _set_variables_<name> to persist collected values.
    const setVarActions = subagent.reasoningActions.filter(ra => ra.reference === '@utils.setVariables');
    if (setVarActions.length > 0) {
      const allFields = new Set<string>();
      for (const ra of setVarActions) {
        for (const b of ra.withBindings) allFields.add(b.param);
      }
      const fieldList = [...allFields].join(', ');
      sysPrompt +=
        `\nCRITICAL: Whenever the user provides any of the following values — ${fieldList} — you MUST` +
        ` immediately call _set_variables_${subagent.name}(${[...allFields].map(f => `${f}=<value>`).join(', ')})` +
        ` to save them before calling any other tool. Do NOT skip this step.`;
    }

    return sysPrompt;
  }

  private writeFactoryBody(w: PythonWriter, subagent: SubagentData): void {
    w.writeLine(`def create_${subagent.name}(state: StateManager, toolkit: Toolkit) -> ReActAgent:`);
    w.setIndent(1);
    w.writeLine(`"""Create the ${subagent.name} agent."""`);

    const sysPrompt = this.buildSysPrompt(subagent);

    // Convert @variables.X → {state.get("X")} for f-string interpolation
    const usesVariables = /@variables\.\w+/.test(sysPrompt);
    const convertedPrompt = sysPrompt.replace(/@variables\.(\w+)/g, '{state.get("$1")}');

    w.writeBlankLine();
    const prefix = usesVariables ? 'f' : '';
    w.writeLine(`sys_prompt = ${prefix}"""${convertedPrompt}"""`);
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
  }

  generateFactory(subagent: SubagentData): string {
    const w = new PythonWriter();
    w.addImportFrom('agentscope.agent', 'ReActAgent');
    w.addImportFrom('agentscope.model', 'DashScopeChatModel');
    w.addImportFrom('agentscope.formatter', 'DashScopeChatFormatter');
    w.addImportFrom('agentscope.memory', 'InMemoryMemory');
    w.addImportFrom('agentscope.tool', 'Toolkit');
    w.addImport('os');
    this.writeFactoryBody(w, subagent);
    return w.toString();
  }

  generateFactorySection(subagent: SubagentData): { code: string; writer: PythonWriter } {
    const w = new PythonWriter();
    w.addImportFrom('agentscope.agent', 'ReActAgent');
    w.addImportFrom('agentscope.model', 'DashScopeChatModel');
    w.addImportFrom('agentscope.formatter', 'DashScopeChatFormatter');
    w.addImportFrom('agentscope.memory', 'InMemoryMemory');
    w.addImportFrom('agentscope.tool', 'Toolkit');
    w.addImport('os');
    this.writeFactoryBody(w, subagent);
    return { code: w.toCodeOnly(), writer: w };
  }
}
