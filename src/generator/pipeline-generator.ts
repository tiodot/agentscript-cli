import { PythonWriter } from './python-writer';
import { LogicGenerator } from './logic-generator';
import { ToolGenerator } from './tool-generator';
import type { SubagentData, SystemData, ConfigData } from '../ast-utils';

export class PipelineGenerator {
  private logicGen = new LogicGenerator();
  private toolGen = new ToolGenerator();

  /** Derive the Bot class name from the agent config name. */
  private toBotClassName(agentName: string): string {
    // "Customer_Service_Assistant_v1" → "CustomerServiceAssistantV1Bot"
    return agentName
      .split(/[^a-zA-Z0-9]+/)
      .filter(Boolean)
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join('') + 'Bot';
  }

  generateMain(config: ConfigData, system: SystemData, subagents: SubagentData[]): string {
    const w = new PythonWriter();
    w.addImport('asyncio');
    w.addImport('functools');
    w.addImport('json');
    w.addImport('os');
    w.addImportFrom('agentscope.agent', 'ReActAgent');
    w.addImportFrom('agentscope.agent', 'UserAgent');
    w.addImportFrom('agentscope.model', 'DashScopeChatModel');
    w.addImportFrom('agentscope.memory', 'InMemoryMemory');
    w.addImportFrom('agentscope.formatter', 'DashScopeChatFormatter');
    w.addImportFrom('agentscope.tool', 'ToolResponse');
    w.addImportFrom('agentscope.tool', 'Toolkit');
    w.addImportFrom('agentscope.message', 'Msg');
    w.addImportFrom('agentscope.message', 'TextBlock');
    w.addImportFrom('typing', 'Callable');
    w.addImportFrom('typing', 'Optional');

    this.writeBotClass(w, config, system, subagents);

    return w.toString();
  }

  generateMainSection(config: ConfigData, system: SystemData, subagents: SubagentData[]): { code: string; writer: PythonWriter } {
    const w = new PythonWriter();
    w.addImport('asyncio');
    w.addImport('functools');
    w.addImport('json');
    w.addImportFrom('agentscope.agent', 'UserAgent');
    w.addImportFrom('agentscope.message', 'Msg');
    w.addImportFrom('agentscope.message', 'TextBlock');
    w.addImportFrom('agentscope.tool', 'ToolResponse');
    w.addImportFrom('typing', 'Callable');
    w.addImportFrom('typing', 'Optional');

    this.writeBotClass(w, config, system, subagents);

    return { code: w.toCodeOnly(), writer: w };
  }

  private writeBotClass(w: PythonWriter, config: ConfigData, system: SystemData, subagents: SubagentData[]): void {
    const botClass = this.toBotClassName(config.agentName || 'Agent');
    const startAgent = subagents.find(s => s.kind === 'start_agent') ?? subagents[0];
    const welcomeMsg = system.welcomeMessage ?? '';
    const errorMsg = system.errorMessage ?? 'I apologize, but I am experiencing technical difficulties.';

    // ── class definition ──
    w.writeLine(`class ${botClass}:`);
    w.setIndent(1);
    w.writeLine(`"""Auto-generated bot class. Supports package import and CLI execution.`);
    w.writeBlankLine();
    w.writeLine('Usage::');
    w.writeBlankLine();
    w.writeLine(`    bot = ${botClass}(impls={`);
    w.writeLine('        "verify_customer_identity": my_verify_fn,');
    w.writeLine('        ...');
    w.writeLine('    })');
    w.writeLine('    response = await bot.chat("Hello, I need help")');
    w.writeLine('"""');

    // ── __init__ ──
    w.writeBlankLine();
    w.writeLine('def __init__(self, impls: dict[str, Callable] | None = None):');
    w.setIndent(2);
    w.writeLine('self.state = StateManager()');
    w.writeLine('self._impls = impls or {}');
    w.writeLine(`self._current_agent_name = "${startAgent.name}"`);
    w.writeLine('self._agents: dict = {}');
    w.writeLine('self._build_agents()');

    // ── _resolve_impl ──
    w.setIndent(1);
    w.writeBlankLine();
    w.writeLine('async def _resolve_impl(self, name: str, **kwargs):');
    w.setIndent(2);
    w.writeLine('if name in self._impls:');
    w.setIndent(3);
    w.writeLine('return await self._impls[name](**kwargs)');
    w.setIndent(2);
    w.writeLine('raise NotImplementedError(');
    w.setIndent(3);
    w.writeLine(`f"No implementation for '{name}'. Pass via impls={{'{name}': your_fn}}."`);
    w.setIndent(2);
    w.writeLine(')');

    // ── _build_agents ──
    w.setIndent(1);
    w.writeBlankLine();
    w.writeLine('def _build_agents(self):');
    w.setIndent(2);
    for (const sa of subagents) {
      w.writeLine(`toolkit_${sa.name} = Toolkit()`);
    }
    w.writeBlankLine();
    for (const sa of subagents) {
      w.writeLine(`${sa.name}_agent = create_${sa.name}(self.state, toolkit_${sa.name})`);
    }
    w.writeBlankLine();
    // Use functools.wraps to copy the typed signature from the stub onto the closure,
    // so agentscope's JSON schema parser generates correct tool parameters for the LLM.
    w.writeLine('import functools');
    w.writeLine('def _make_tool(bot_self, name, fn):');
    w.setIndent(3);
    w.writeLine('@functools.wraps(fn)');
    w.writeLine('async def _tool(*args, **kwargs):');
    w.setIndent(4);
    w.writeLine('result = await bot_self._resolve_impl(name, **kwargs)');
    w.writeLine('return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])');
    w.setIndent(3);
    w.writeLine('return _tool');
    w.setIndent(2);
    w.writeBlankLine();
    // Register tools by wrapping each stub through _make_tool
    for (const sa of subagents) {
      for (const action of sa.actions) {
        const snakeName = this.toolGen.toSnakeCase(action.name);
        w.writeLine(`toolkit_${sa.name}.register_tool_function(_make_tool(self, "${snakeName}", ${snakeName}))`);
      }
    }
    w.writeBlankLine();
    // Generate set_variables tool per agent (from @utils.setVariables reasoningActions).
    // The LLM uses this to write variable values into state during reasoning.
    for (const sa of subagents) {
      const setVarActions = sa.reasoningActions.filter(ra => ra.reference === '@utils.setVariables');
      if (setVarActions.length === 0) continue;
      const varNames = new Set<string>();
      for (const ra of setVarActions) {
        for (const b of ra.withBindings) {
          varNames.add(b.param);
        }
      }
      if (varNames.size === 0) continue;
      const paramList = [...varNames].map(v => `${v}: str | None = None`).join(', ');
      const docVars = [...varNames].join(', ');
      const setLines = [...varNames].map(v => `if ${v} is not None: _captured_state.set("${v}", ${v})`).join('; ');
      w.writeLine(`_captured_state_${sa.name} = self.state`);
      w.writeLine(`async def _set_variables_${sa.name}(${paramList}):`);
      w.setIndent(3);
      w.writeLine(`"""Set state variables for the ${sa.name} agent. Fields: ${docVars}"""`);
      w.writeLine(`_captured_state = _captured_state_${sa.name}`);
      for (const v of varNames) {
        w.writeLine(`if ${v} is not None: _captured_state.set("${v}", ${v})`);
      }
      w.writeLine('return ToolResponse(content=[TextBlock(type="text", text=\'{"ok": true}\')])');
      w.setIndent(2);
      w.writeLine(`toolkit_${sa.name}.register_tool_function(_set_variables_${sa.name})`);
    }

    // Build wrappers — pass self._resolve_impl as the impl resolver
    for (const sa of subagents) {
      if (sa.beforeReasoning.length > 0 || sa.afterReasoning.length > 0) {
        const wrapperClass = this.toPascalCase(sa.name) + 'Wrapper';
        w.writeLine(`${sa.name}_wrapped = ${wrapperClass}(${sa.name}_agent, self.state, self._resolve_impl)`);
      }
    }
    w.writeBlankLine();
    const agentEntries: string[] = [];
    for (const sa of subagents) {
      const hasHooks = sa.beforeReasoning.length > 0 || sa.afterReasoning.length > 0;
      const varName = hasHooks ? `${sa.name}_wrapped` : `${sa.name}_agent`;
      agentEntries.push(`"${sa.name}": ${varName}`);
    }
    w.writeLine(`self._agents = {${agentEntries.join(', ')}}`);

    // ── chat ──
    w.setIndent(1);
    w.writeBlankLine();
    w.writeLine('async def chat(self, user_message: str) -> str:');
    w.setIndent(2);
    w.writeLine('"""Send a message and get a response. Maintains conversation state across calls."""');
    w.writeLine('msg = Msg(name="user", content=user_message, role="user")');
    w.writeLine('while True:');
    w.setIndent(3);
    w.writeLine('agent = self._agents[self._current_agent_name]');
    w.writeLine('try:');
    w.setIndent(4);
    w.writeLine('result = await agent(msg)');
    w.setIndent(3);
    w.writeLine('except NotImplementedError:');
    w.setIndent(4);
    w.writeLine('raise');
    w.setIndent(3);
    w.writeLine('except Exception as e:');
    w.setIndent(4);
    w.writeLine(`return "${errorMsg}"`);
    w.setIndent(3);
    w.writeLine('if hasattr(agent, "next_agent") and agent.next_agent:');
    w.setIndent(4);
    w.writeLine('self._current_agent_name = agent.next_agent');
    w.writeLine('agent.next_agent = None');
    w.writeLine('msg = result');
    w.writeLine('continue');
    w.setIndent(3);
    w.writeLine('return result.get_text_content() if hasattr(result, "get_text_content") else str(result)');

    // ── reset ──
    w.setIndent(1);
    w.writeBlankLine();
    w.writeLine('def reset(self):');
    w.setIndent(2);
    w.writeLine('"""Reset state and restart from the beginning (new session)."""');
    w.writeLine('self.state = StateManager()');
    w.writeLine(`self._current_agent_name = "${startAgent.name}"`);
    w.writeLine('self._build_agents()');

    // ── run_cli ──
    w.setIndent(1);
    w.writeBlankLine();
    w.writeLine('async def run_cli(self):');
    w.setIndent(2);
    w.writeLine('"""Interactive CLI loop (replaces old main())."""');
    if (welcomeMsg) {
      w.writeLine(`print("${welcomeMsg}")`);
    }
    w.writeLine('while True:');
    w.setIndent(3);
    w.writeLine('user_input = input("You: ").strip()');
    w.writeLine('if user_input.lower() in ("exit", "quit"):');
    w.setIndent(4);
    w.writeLine('break');
    w.setIndent(3);
    w.writeLine('response = await self.chat(user_input)');
    w.writeLine('print(f"Bot: {response}")');

    // ── module entry point: auto-inject module-level _impl functions ──
    w.setIndent(0);
    w.writeBlankLine();
    w.writeBlankLine();
    w.writeLine('if __name__ == "__main__":');
    w.setIndent(1);
    // Build a dict of all action names → their module-level _impl functions
    const implEntries = subagents
      .flatMap(sa => sa.actions)
      .filter((a, i, arr) => arr.findIndex(b => b.name === a.name) === i)
      .map(a => {
        const snake = this.toolGen.toSnakeCase(a.name);
        return `"${snake}": ${snake}_impl`;
      });
    w.writeLine(`_impls = {${implEntries.join(', ')}}`);
    w.writeLine(`asyncio.run(${botClass}(impls=_impls).run_cli())`);
  }

  private writeWrapperClass(w: PythonWriter, subagent: SubagentData): void {
    const className = this.toPascalCase(subagent.name) + 'Wrapper';

    w.writeLine(`class ${className}:`);
    w.setIndent(1);
    w.writeLine('def __init__(self, agent: ReActAgent, state: StateManager, resolve_impl=None):');
    w.setIndent(2);
    w.writeLine('self.agent = agent');
    w.writeLine('self.state = state');
    w.writeLine('self._resolve_impl = resolve_impl');
    w.writeLine('self.next_agent = None');
    w.setIndent(1);
    w.writeBlankLine();

    w.writeLine('async def __call__(self, msg: Msg) -> Msg:');
    w.setIndent(2);
    w.writeLine('await self.before_call(msg)');
    w.writeLine('result = await self.agent(msg)');
    w.writeLine('try:');
    w.setIndent(3);
    w.writeLine('await self.after_call(msg, result)');
    w.setIndent(2);
    w.writeLine('except NotImplementedError:');
    w.setIndent(3);
    w.writeLine('pass  # unimplemented action stubs — result still returned');
    w.setIndent(2);
    w.writeLine('return result');
    w.setIndent(1);
    w.writeBlankLine();

    w.writeLine('async def before_call(self, msg: Msg) -> None:');
    w.setIndent(2);
    if (subagent.beforeReasoning.length > 0) {
      const code = this.logicGen.generateStatements(subagent.beforeReasoning, 2, 'self.state', true);
      const savedIndent = w.getIndent();
      w.setIndent(0);
      for (const line of code.split('\n')) {
        if (line) w.writeLine(line);
      }
      w.setIndent(savedIndent);
    } else {
      w.writeLine('pass');
    }
    w.setIndent(1);
    w.writeBlankLine();

    w.writeLine('async def after_call(self, msg: Msg, result: Msg) -> None:');
    w.setIndent(2);
    if (subagent.afterReasoning.length > 0) {
      const code = this.logicGen.generateStatements(subagent.afterReasoning, 2, 'self.state', true);
      const savedIndent = w.getIndent();
      w.setIndent(0);
      for (const line of code.split('\n')) {
        if (line) w.writeLine(line);
      }
      w.setIndent(savedIndent);
    } else {
      w.writeLine('pass');
    }
  }

  generateAgentWrapper(subagent: SubagentData): string {
    const w = new PythonWriter();
    w.addImportFrom('agentscope.agent', 'ReActAgent');
    w.addImportFrom('agentscope.message', 'Msg');
    this.writeWrapperClass(w, subagent);
    return w.toString();
  }

  generateAgentWrapperSection(subagent: SubagentData): { code: string; writer: PythonWriter } {
    const w = new PythonWriter();
    w.addImportFrom('agentscope.agent', 'ReActAgent');
    w.addImportFrom('agentscope.message', 'Msg');
    this.writeWrapperClass(w, subagent);
    return { code: w.toCodeOnly(), writer: w };
  }

  private toPascalCase(name: string): string {
    return name.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  }
}
