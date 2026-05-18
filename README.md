# agentscript-cli

Convert Salesforce [AgentScript](https://developer.salesforce.com/docs/ai/agentforce/guide/ascript-reference.html) `.agent` files into runnable [AgentScope](https://github.com/modelscope/agentscope) Python code.

## Overview

AgentScript is Salesforce's DSL for defining AI agents — topics, variables, actions, and reasoning flows. This CLI reads `.agent` files and generates a fully-structured Python bot that:

- Mirrors all `variables` as a typed `StateManager` class
- Generates `_impl` stubs for every `action` (ready to fill in)
- Generates per-reasoning-action LLM tool wrappers with correct names, pre-bound state params, and post-call state writes
- Generates `before_reasoning` / `after_reasoning` wrapper classes with deterministic logic
- Handles `@utils.transition`, `@utils.setVariables`, and `@utils.escalate` reasoning tools
- Supports multi-agent routing via `start_agent` / `topic` transitions

## Installation

```bash
npm install
```

> Requires Node.js 18+ and the `@agentscript/agentforce` parser package (set up automatically via `postinstall`).

## Usage

### Convert a single file

```bash
npx tsx src/cli.ts convert examples/case_escalation_bot.agent
# → examples/case_escalation_bot.py
```

With a custom output path:

```bash
npx tsx src/cli.ts convert examples/case_escalation_bot.agent -o my_bot.py
```

Generate mock implementations instead of `NotImplementedError` stubs:

```bash
npx tsx src/cli.ts convert examples/case_escalation_bot.agent --mock
```

### Convert to a Python package (split mode)

```bash
npx tsx src/cli.ts convert examples/case_escalation_bot.agent --split
# → case_escalation_bot_agent/
#     __init__.py
#     state.py
#     tools.py
#     agents.py
#     pipeline.py
#     main.py
```

### Export action scaffolds

Generate a Python file with `_impl` function stubs for all actions:

```bash
npx tsx src/cli.ts actions examples/case_escalation_bot.agent
# → examples/case_escalation_bot_actions.py
```

Fill in each `_impl` function, then use the `--actions` flag with `deploy`.

### Generate e2e tests

Auto-generate a pytest e2e test file from any `.agent` file:

```bash
npx tsx src/cli.ts gen-tests examples/case_escalation_bot.agent \
  --email wudan@wdstudio.com
# → tests/test_customer_service_assistant_v1_e2e.py
```

The command uses a hybrid pipeline:
1. **Deterministic extraction** — parses the agent's variables, actions, score rules, and routing logic from the AST
2. **Path enumeration** — generates concrete workflow paths (verification failure, per-category score thresholds, resolution failure, reset, incomplete input)
3. **LLM enrichment** — calls `qwen-plus` on DashScope to produce realistic natural-language user inputs for each path
4. **Pytest rendering** — emits a fully runnable pytest file with `make_impls(**overrides)`, one test per path, and parametrized boundary tests

Each generated test includes inline comments describing the input, expected agent chain, and expected final state.

Options:

| Flag | Description |
|---|---|
| `--output <path>` | Output path (default: `tests/test_<agent>_e2e.py`) |
| `--email <email>` | A valid registered email to use in test inputs |
| `--api-key <key>` | DashScope API key (falls back to `DASHSCOPE_API_KEY` env var) |

If `DASHSCOPE_API_KEY` is not set, the command still generates tests using deterministic fallback inputs (no LLM call).

Before running the generated tests, generate the fixture:

```bash
npx tsx src/cli.ts convert examples/case_escalation_bot.agent \
  -o tests/fixtures/customer_service_assistant_v1.py

pytest tests/test_customer_service_assistant_v1_e2e.py -v
```

### Deploy to Alibaba Cloud Bailian

```bash
npx tsx src/cli.ts deploy examples/case_escalation_bot.agent \
  --actions examples/case_escalation_bot_actions.py
```

Options:

| Flag | Description |
|---|---|
| `--output-dir <dir>` | Output directory for the generated Bailian project |
| `--app-id <id>` | Bailian app ID to update an existing deployment |
| `--actions <file>` | Python file with `_impl` function implementations |
| `--build-only` | Build wheel only, skip deploy |
| `--mcp` | Include fastmcp dependency for Bailian MCP services |
| `--desc <text>` | Description override |

## Using the Generated Bot

```python
from case_escalation_bot import CustomerServiceAssistantV1Bot

async def verify_customer_identity(email: str, security_question_answer: str = None) -> dict:
    # Your implementation here
    return {"customer_found": True, "customer_name": "Alice", ...}

bot = CustomerServiceAssistantV1Bot(impls={
    "verify_customer_identity": verify_customer_identity,
    # ... other actions
})

response = await bot.chat("Hi, I need help with a billing issue")
```

Or run interactively from the CLI:

```bash
python case_escalation_bot.py
```

## AgentScript Concepts Supported

| AgentScript | Generated Python |
|---|---|
| `variables` | `StateManager` typed attrs |
| `actions` (inputs/outputs) | `_impl` stub + `ToolResponse` wrapper |
| `reasoning.actions: name: @actions.X` | Named async LLM tool with pre-bound state params |
| `with x=@variables.Y` | `state.get("Y")` at call time (not LLM input) |
| `with x=...` | LLM-supplied parameter in function signature |
| `set @variables.X = @outputs.Y` | `state.set("X", result["Y"])` after call |
| `available when <condition>` | Runtime guard returning `{"skipped": true}` |
| `@utils.setVariables` | `_set_variables_<agent>` tool with typed Args docstring |
| `@utils.transition to @topic.X` | Tool that sets `_pending_transition` for the chat loop |
| `@utils.escalate` | Stub with `# TODO: requires Omni-Channel connection` |
| `before_reasoning` / `after_reasoning` | `*Wrapper` class with `before_call` / `after_call` |
| `transition to @topic.X` (after_reasoning) | `self.next_agent = "X"` |

## Project Structure

```
src/
  cli.ts                  # CLI entry point (convert, deploy, actions, gen-tests commands)
  converter.ts            # Orchestrates single-file generation
  ast-utils.ts            # Extracts typed data from the parsed AST
  parser-bridge.ts        # Bridge to @agentscript/agentforce parser
  generator/
    index.ts              # CodeGenerator — single-file output
    state-generator.ts    # StateManager class
    tool-generator.ts     # Action _impl stubs and ToolResponse wrappers
    agent-generator.ts    # create_<agent>() factory functions
    pipeline-generator.ts # Bot class with _build_agents, chat, reset
    logic-generator.ts    # before/after_reasoning conditional logic
    split-generator.ts    # Package (split) mode
    python-writer.ts      # Indentation-aware Python code writer
  test-generator/
    index.ts              # generateE2ETests() — orchestrates the pipeline
    types.ts              # Shared types (WorkflowSpec, WorkflowPath, MockConfig, ...)
    workflow-extractor.ts # Deterministic AST → WorkflowSpec extraction
    workflow-enumerator.ts# WorkflowSpec → WorkflowPath[] enumeration
    llm-enricher.ts       # LLM (qwen-plus) → natural language inputs per path
    pytest-writer.ts      # WorkflowPath[] → pytest file rendering
examples/
  case_escalation_bot.agent
  order_tracking_assistant.agent
  weather.agent
  hello_world.agent
tests/
  fixtures/               # Generated bot fixtures for e2e tests
  generator/              # Unit tests for each generator component
  ast-utils.test.ts
  converter.test.ts
```

## Development

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Type-check
npx tsc --noEmit
```

## License

Apache-2.0
