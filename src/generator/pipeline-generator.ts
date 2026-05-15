import { PythonWriter } from './python-writer';
import { LogicGenerator } from './logic-generator';
import { ToolGenerator } from './tool-generator';
import type { SubagentData, SystemData, ConfigData, VariableData } from '../ast-utils';

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

  generateMain(config: ConfigData, system: SystemData, subagents: SubagentData[], variables: VariableData[] = []): string {
    const w = new PythonWriter();
    w.addImport('asyncio');
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

    this.writeBotClass(w, config, system, subagents, variables);

    return w.toString();
  }

  generateMainSection(config: ConfigData, system: SystemData, subagents: SubagentData[], variables: VariableData[] = []): { code: string; writer: PythonWriter } {
    const w = new PythonWriter();
    w.addImport('asyncio');
    w.addImport('json');
    w.addImportFrom('agentscope.agent', 'UserAgent');
    w.addImportFrom('agentscope.message', 'Msg');
    w.addImportFrom('agentscope.message', 'TextBlock');
    w.addImportFrom('agentscope.tool', 'ToolResponse');
    w.addImportFrom('typing', 'Callable');
    w.addImportFrom('typing', 'Optional');

    this.writeBotClass(w, config, system, subagents, variables);

    return { code: w.toCodeOnly(), writer: w };
  }

  private writeBotClass(w: PythonWriter, config: ConfigData, system: SystemData, subagents: SubagentData[], variables: VariableData[] = []): void {
    const botClass = this.toBotClassName(config.agentName || 'Agent');
    const startAgent = subagents.find(s => s.kind === 'start_agent') ?? subagents[0];
    const welcomeMsg = system.welcomeMessage ?? '';
    const errorMsg = system.errorMessage ?? 'I apologize, but I am experiencing technical difficulties.';

    // Build a lookup map: variable name → description (for _set_variables docstrings)
    const varDescMap = new Map<string, string>();
    for (const v of variables) {
      if (v.description) varDescMap.set(v.name, v.description);
    }

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
    w.writeLine('self._pending_transition: str | None = None');
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

    // ── Loop A: @actions.X reasoning tools ──
    // Generate one named async wrapper per reasoning action that references @actions.X.
    // The LLM sees only slot-fill params (value === '...'); pre-bound params are resolved
    // from state or inlined as literals at call time.
    for (const sa of subagents) {
      // Build a lookup: action name (snake_case) → ActionData
      const actionMap = new Map(sa.actions.map(a => [this.toolGen.toSnakeCase(a.name), a]));

      for (const ra of sa.reasoningActions) {
        if (!ra.reference.startsWith('@actions.')) continue;

        const implName = this.toolGen.toSnakeCase(ra.reference.replace('@actions.', ''));
        const actionDef = actionMap.get(implName);

        // Identify free (slot-fill) params — value is '...' in AgentScript
        const freeParams = ra.withBindings.filter(b => b.value === '...');
        const paramSig = freeParams.map(b => {
          // Look up the type from the action definition inputs
          const inputDef = actionDef?.inputs.find(i => i.name === b.param);
          const pyType = inputDef ? this.toolGen.mapParamType(inputDef.type) : 'str';
          return `${b.param}: ${pyType} | None = None`;
        }).join(', ');

        const stateVar = `_state_${sa.name}`;
        const fnName = ra.name;

        // Description: prefer reasoning action's description, fall back to action's
        const desc = ra.description || actionDef?.description || fnName;

        w.writeLine(`${stateVar} = self.state`);
        w.writeLine(`async def ${fnName}(${paramSig}) -> ToolResponse:`);
        w.setIndent(3);
        w.writeLine(`"""${desc}"""`);

        // available_when guard
        if (ra.availableWhen) {
          const condition = ra.availableWhen.replace(/@variables\.(\w+)/g, (_: string, n: string) => `${stateVar}.get("${n}")`);
          w.writeLine(`if not (${condition}):`);
          w.setIndent(4);
          w.writeLine(`return ToolResponse(content=[TextBlock(type="text", text='{"skipped": true}')])`);
          w.setIndent(3);
        }

        // Build call arguments
        const callArgs = ra.withBindings.map(b => {
          if (b.value === '...') {
            return `${b.param}=${b.param}`;
          }
          return `${b.param}=${this.resolveBindingValue(b.value, stateVar)}`;
        });

        w.writeLine(`result = await self._resolve_impl(`);
        w.setIndent(4);
        w.writeLine(`"${implName}",`);
        for (const arg of callArgs) {
          w.writeLine(`${arg},`);
        }
        w.setIndent(3);
        w.writeLine(')');

        // set-bindings
        for (const sb of ra.setBindings) {
          const varName = sb.variable.replace('@variables.', '');
          const pyValue = sb.value.startsWith('@outputs.')
            ? `result["${sb.value.replace('@outputs.', '')}"]`
            : this.resolveBindingValue(sb.value, stateVar);
          w.writeLine(`${stateVar}.set("${varName}", ${pyValue})`);
        }

        w.writeLine(`return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])`);
        w.setIndent(2);
        w.writeLine(`toolkit_${sa.name}.register_tool_function(${fnName})`);
        w.writeBlankLine();
      }
    }

    // ── Loop C: @utils.transition tools ──
    // Generate a transition stub that sets next_agent so the bot loop picks it up.
    for (const sa of subagents) {
      for (const ra of sa.reasoningActions) {
        if (!ra.reference.startsWith('@utils.transition')) continue;

        // Use the ToClause target extracted from the AST (@topic.X or @subagent.X)
        const rawTarget = ra.transitionTarget ?? '';
        const target = rawTarget.replace(/^@(?:topic|subagent)\./, '');
        const desc = ra.description || `Transition to ${target}`;

        w.writeLine(`_bot_ref_${sa.name}_${ra.name} = self`);
        w.writeLine(`async def ${ra.name}() -> ToolResponse:`);
        w.setIndent(3);
        w.writeLine(`"""${desc}"""`);
        w.writeLine(`_bot_ref_${sa.name}_${ra.name}._pending_transition = "${target}"`);
        w.writeLine(`return ToolResponse(content=[TextBlock(type="text", text='{"transitioning": true}')])`);
        w.setIndent(2);
        w.writeLine(`toolkit_${sa.name}.register_tool_function(${ra.name})`);
        w.writeBlankLine();
      }
    }

    // ── Loop D: @utils.escalate tools ──
    for (const sa of subagents) {
      for (const ra of sa.reasoningActions) {
        if (!ra.reference.startsWith('@utils.escalate')) continue;

        const desc = ra.description || 'Escalate to human representative';
        w.writeLine(`async def ${ra.name}() -> ToolResponse:`);
        w.setIndent(3);
        w.writeLine(`"""${desc}"""`);
        w.writeLine(`# TODO: requires Omni-Channel connection`);
        w.writeLine(`return ToolResponse(content=[TextBlock(type="text", text='{"escalating": true}')])`);
        w.setIndent(2);
        w.writeLine(`toolkit_${sa.name}.register_tool_function(${ra.name})`);
        w.writeBlankLine();
      }
    }

    // ── Loop B: @utils.setVariables tools ──
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
      w.writeLine(`_captured_state_${sa.name} = self.state`);
      w.writeLine(`async def _set_variables_${sa.name}(${paramList}):`);
      w.setIndent(3);
      w.writeLine(`"""Set state variables for the ${sa.name} agent.`);
      w.writeBlankLine();
      w.writeLine('Args:');
      for (const v of varNames) {
        const desc = varDescMap.get(v);
        w.writeLine(`    ${v}: ${desc ?? v}`);
      }
      w.writeLine('"""');
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
    w.writeLine('if self._pending_transition:');
    w.setIndent(4);
    w.writeLine('self._current_agent_name = self._pending_transition');
    w.writeLine('self._pending_transition = None');
    w.writeLine('msg = result');
    w.writeLine('continue');
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
    w.writeLine('self._pending_transition = None');
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

  /**
   * Convert a `with` binding value string (from exprToString) to a Python expression.
   *   @variables.X  →  stateVar.get("X")
   *   @outputs.X    →  result["X"]
   *   "text" + @variables.X  →  "text" + stateVar.get("X")
   *   "literal"     →  "literal"   (already quoted by exprToString)
   *   123 / True    →  as-is
   */
  private resolveBindingValue(value: string, stateVar: string): string {
    if (value.startsWith('@variables.')) {
      return `${stateVar}.get("${value.replace('@variables.', '')}")`;
    }
    if (value.startsWith('@outputs.')) {
      return `result["${value.replace('@outputs.', '')}"]`;
    }
    // Handle @variables.X embedded within expressions (e.g. BinaryExpression)
    if (value.includes('@variables.')) {
      return value.replace(/@variables\.(\w+)/g, (_: string, n: string) => `${stateVar}.get("${n}")`);
    }
    // Literal: already in Python-ready form ("string", 123, True, etc.)
    return value;
  }

  private toPascalCase(name: string): string {
    return name.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  }
}
