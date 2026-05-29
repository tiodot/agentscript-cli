# AgentScript to AgentScope Converter — Design Spec

## Overview

A TypeScript CLI tool that converts Salesforce AgentScript `.agent` files into AgentScope Python code. It uses the official `@agentscript/agentforce` parser for correct syntax handling, walks the resulting AST, and generates idiomatic AgentScope Python code.

## Architecture

```
.agent file → [@agentscript/agentforce parse()] → SyntaxNode AST → [Code Generator] → .py file(s)
```

No intermediate representation layer — the code generator walks `SyntaxNode` directly.

### Modules

| Module | Responsibility |
|---|---|
| `src/cli.ts` | Commander CLI entry point |
| `src/converter.ts` | Orchestrates: parse → walk AST → generate Python |
| `src/ast-utils.ts` | Helper functions for walking SyntaxNode tree |
| `src/generator/index.ts` | CodeGenerator class (main entry for generation) |
| `src/generator/python-writer.ts` | Python code emission utilities (indentation, imports) |
| `src/generator/state-generator.ts` | StateManager class generation |
| `src/generator/tool-generator.ts` | Toolkit function stub generation |
| `src/generator/agent-generator.ts` | ReActAgent factory generation |
| `src/generator/logic-generator.ts` | before/after_reasoning → Python control flow |
| `src/generator/pipeline-generator.ts` | MsgHub + main() orchestration |
| `src/generator/split-generator.ts` | --split package output |

## Mapping: AgentScript → AgentScope

### Structural Mapping

| AgentScript | AgentScope Python |
|---|---|
| `system.instructions` | `sys_prompt` of the start_agent ReActAgent |
| `system.messages.welcome` | Welcome message printed in main() before agent loop |
| `system.messages.error` | Error handler in agent loop try/except |
| `config.agent_name` | Module docstring / class naming prefix |
| `variables` block | `StateManager` class with typed properties |
| `start_agent X:` | `ReActAgent(name="X", ...)` — entry agent |
| `topic X:` / `subagent X:` | `ReActAgent(name="X", ...)` — each is its own agent |

### Subagent Mapping

| AgentScript subagent content | AgentScope equivalent |
|---|---|
| `system.instructions` (per-subagent) | `sys_prompt` override for that agent |
| `actions` block | Functions registered in that agent's Toolkit |
| `reasoning.instructions` | Appended to sys_prompt as behavioral guidance |
| `reasoning.actions` | Also registered as tools in that agent's Toolkit |
| `before_reasoning` | Python code in a `before_call(state, msg)` async method on a wrapper class, executed before the agent's `__call__` |
| `after_reasoning` | Python code in an `after_call(state, msg, result)` async method on a wrapper class, executed after the agent's `__call__` |

Each subagent is wrapped in an `AgentWrapper` class that calls `before_call()`, then the agent, then `after_call()`:

```python
class AgentWrapper:
    def __init__(self, agent: ReActAgent, state: StateManager):
        self.agent = agent
        self.state = state
    
    async def __call__(self, msg: Msg) -> Msg:
        await self.before_call(msg)
        result = await self.agent(msg)
        await self.after_call(msg, result)
        return result
    
    async def before_call(self, msg: Msg) -> None:
        # Generated from before_reasoning block
        ...
    
    async def after_call(self, msg: Msg, result: Msg) -> None:
        # Generated from after_reasoning block
        ...
```

### Action/Tool Mapping

| AgentScript action | AgentScope tool |
|---|---|
| `@actions.Name` (with `target: "flow://X"`) | `async def name_tool(...) -> dict` stub raising NotImplementedError, registered via toolkit.register_tool_function() |
| Action `inputs` | Python function parameters with type hints |
| Action `outputs` | Return type annotation (`-> dict`), output schema in docstring |
| `@utils.transition to @subagent.Y` | `async def transition_to_Y()` — routes to agent Y via MsgHub |
| `@utils.setVariables` | `async def set_variables(**kwargs)` — updates StateManager |
| `@utils.escalate` | `async def escalate()` — raises handoff flag |

### State/Variable Mapping

All AgentScript variables become a shared `StateManager` class:

```python
class StateManager:
    """Shared state mirroring AgentScript variables."""
    def __init__(self):
        self.customer_email: str = ""
        self.customer_verified: bool = False
        self.escalation_score: int = 0
    
    def set(self, name: str, value: Any) -> None:
        setattr(self, name, value)
    
    def get(self, name: str) -> Any:
        return getattr(self, name, None)
```

### Logic Mapping (before/after_reasoning)

| AgentScript logic | AgentScope Python |
|---|---|
| `if @variables.x != "":` | `if state.get("x") != "":` |
| `run @actions.X with y=@variables.z` | `await x_tool(y=state.get("z"))` |
| `set @variables.a = @outputs.b` | `state.set("a", result["b"])` |
| `transition to @topic.Y` | `return await agent_y(msg)` |
| `@variables.score + 30` | `state.get("score") + 30` |

### Model Configuration

Generated code uses `DashScopeChatModel` as the model class. API key read from environment variable.

```python
model=DashScopeChatModel(
    model_name="qwen3.6-flash",
    api_key=os.environ["DASHSCOPE_API_KEY"],
    stream=True,
    enable_thinking=False,
    multimodality=True
)
```

### Pipeline/Orchestration

The generated `main()` function:
1. Initialize StateManager
2. Create all ReActAgent instances with their toolkits
3. Set up MsgHub for multi-agent routing
4. Run the start_agent in a conversation loop with UserAgent
5. Transitions between agents are handled by tool functions that route messages

## CLI Interface

```
agentscript convert <file>              # Convert to single .py file (default)
agentscript convert <file> -o out.py    # Specify output path
agentscript convert <file> --split      # Generate package structure
agentscript convert <file> --mock       # Generate mock implementations instead of stubs
```

## Output Format

### Single File (default)

For `weather.agent`, generates `weather.py` containing:
- Module docstring with source info
- Imports (agentscope, asyncio, os)
- StateManager class
- Tool function stubs (one per action)
- Agent factory functions (one per subagent)
- main() function with pipeline orchestration
- `if __name__ == "__main__"` entry point

### Split Package (--split)

```
<agent_name>_agent/
├── __init__.py
├── state.py          # StateManager class
├── tools.py          # All tool function stubs
├── agents.py         # Agent factory functions
├── pipeline.py       # Main orchestration
└── main.py           # Entry point
```

### Action Stub Format

By default, action implementations are typed stubs:

```python
async def get_current_weather_data(city: str, country: str, coordinates: dict | None = None) -> dict:
    """Retrieves comprehensive current weather data for a specified location.
    
    Args:
        city: City name for weather lookup
        country: Country name or code for weather lookup
        coordinates: Latitude and longitude coordinates (optional)
    
    Returns:
        dict with keys: temperature_celsius, temperature_fahrenheit, conditions,
        humidity, wind_speed, wind_direction, pressure, visibility_km, uv_index, weather_alerts
    
    Target: flow://300WX000001WeatherCurrentAPI
    """
    raise NotImplementedError("Action target: flow://300WX000001WeatherCurrentAPI")
```

With `--mock`, returns dummy data matching the output schema:

```python
async def get_current_weather_data(city: str, country: str, coordinates: dict | None = None) -> dict:
    """Retrieves comprehensive current weather data for a specified location.
    (MOCK IMPLEMENTATION)
    """
    return {
        "temperature_celsius": 22.0,
        "temperature_fahrenheit": 71.6,
        "conditions": "Partly Cloudy",
        "humidity": 65,
        "wind_speed": 12,
        "wind_direction": "NW",
        "pressure": 1013,
        "visibility_km": 10,
        "uv_index": 5,
        "weather_alerts": [],
    }
```

Mock values use sensible defaults per type: strings are empty, numbers are 0, booleans are False, lists are empty, objects are empty dicts.

## Error Handling

- Parser diagnostics from `@agentscript/agentforce` are reported to the user; conversion aborts on errors
- Unmappable constructs emit `# TODO: unsupported AgentScript construct` comments in the generated Python
- Generated Python can be syntax-validated with `python -c "import ast; ast.parse(output)"`

## Project Structure

```
agentscript-cli-v2/
├── src/
│   ├── cli.ts
│   ├── converter.ts
│   ├── ast-utils.ts
│   └── generator/
│       ├── index.ts
│       ├── python-writer.ts
│       ├── state-generator.ts
│       ├── tool-generator.ts
│       ├── agent-generator.ts
│       ├── logic-generator.ts
│       ├── pipeline-generator.ts
│       └── split-generator.ts
├── examples/                     # Existing .agent example files
├── tests/
│   ├── converter.test.ts
│   ├── generator/
│   │   ├── state-generator.test.ts
│   │   ├── tool-generator.test.ts
│   │   ├── agent-generator.test.ts
│   │   ├── logic-generator.test.ts
│   │   └── pipeline-generator.test.ts
│   └── fixtures/
│       ├── hello_world.py
│       ├── weather.py
│       ├── case_escalation_bot.py
│       ├── lead_qualification_bot.py
│       └── order_tracking_assistant.py
├── package.json
└── tsconfig.json
```

## Dependencies

```json
{
  "dependencies": {
    "commander": "^13.0.0",
    "@agentscript/agentforce": "latest"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

## Testing Strategy

1. Unit tests per generator module — test that a given AST fragment produces expected Python code
2. Integration tests — convert each example .agent file, compare output to fixture .py file
3. Snapshot testing — store expected outputs as fixtures, update on intentional changes
4. Syntax validation — run python AST parse on generated code to verify validity

## Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| Parser | Use official @agentscript/agentforce | Correct syntax handling, diagnostics, maintained by Salesforce |
| IR layer | None — direct AST walk | Simpler, fewer abstractions to maintain |
| Subagent mapping | 1:1 to ReActAgent | Faithful to original structure, modular |
| State management | Shared StateManager class | Mimics AgentScript's shared mutable variables |
| Action stubs | Typed NotImplementedError stubs | Clear contract, easy to fill in |
| Model config | DashScopeChatModel | User preference |
| Output format | Single file (default), --split flag | Covers both simple and organized use cases |
