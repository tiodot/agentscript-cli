# Generator: Reasoning Actions & LLM Tool Fidelity

Date: 2026-05-15

## Problem Statement

The generator currently ignores almost all semantics of `reasoning.actions` entries that
reference real `@actions.X` targets. Every action from `subagent.actions` is blindly
registered with its full raw signature (all inputs free), regardless of what the
AgentScript author wrote in the reasoning binding.

The result: the LLM sees the wrong tool names, wrong parameter sets, and none of the
state-write side effects described in the script.

---

## What AgentScript Actually Means

```agentscript
reasoning:
    actions:
        verify_customer: @actions.Verify_Customer_Identity
            with email=@variables.customer_email      # pre-bound from state
            with security_question_answer=""          # pre-bound literal
            set @variables.customer_verified = @outputs.customer_found   # write back
            set @variables.customer_name    = @outputs.customer_name
            available when @variables.step == "verify"   # conditional gate
```

Each `reasoning.actions` entry defines an **LLM tool** with:

| Concept | AgentScript | Python equivalent |
|---|---|---|
| Tool name | `verify_customer` (the entry key) | function name registered with toolkit |
| Pre-bound inputs | `with email=@variables.customer_email` | resolved from state at call time, not LLM inputs |
| Free inputs | any `with x = ...` (slot-fill token) | LLM-supplied parameters |
| Post-call writes | `set @variables.X = @outputs.Y` | write to StateManager after action returns |
| Conditional gate | `available when @variables.step == "verify"` | runtime check; return early if not met |
| Description | `description: "..."` | function docstring seen by LLM |

---

## Current Behaviour (the Bug)

```python
# WRONG — generated today for case_escalation_bot
toolkit_customer_verification.register_tool_function(
    _make_tool(self, "verify_customer_identity", verify_customer_identity)
)
# Problems:
# 1. Tool name is "verify_customer_identity" not "verify_customer"
# 2. LLM sees all inputs (email, security_question_answer) as free params
# 3. No state writes after the call
# 4. No available_when guard
# 5. ALL actions from sa.actions are registered, regardless of what reasoning.actions says
```

---

## Proposed Fix: Option A — One Wrapper Per Reasoning Action

Generate a distinct async function for each `reasoning.actions` entry that references
`@actions.X`. The function:
1. Checks `available when` condition; returns early if not met
2. Resolves pre-bound parameters from state
3. Calls the action impl
4. Writes set-bindings back to state
5. Returns a ToolResponse

### Generated Output (target)

```python
# For: verify_customer: @actions.Verify_Customer_Identity
#        with email=@variables.customer_email
#        with security_question_answer=""
#        set @variables.customer_verified = @outputs.customer_found
#        set @variables.customer_name = @outputs.customer_name
#        available when @variables.step == "verify"

_state_customer_verification = self.state
async def verify_customer() -> ToolResponse:
    """Verifies customer identity using email address and security questions"""
    if not (_state_customer_verification.get("step") == "verify"):
        return ToolResponse(content=[TextBlock(type="text", text='{"skipped": true}')])
    result = await self._resolve_impl(
        "verify_customer_identity",
        email=_state_customer_verification.get("customer_email"),
        security_question_answer="",
    )
    _state_customer_verification.set("customer_verified", result["customer_found"])
    _state_customer_verification.set("customer_name", result["customer_name"])
    return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])

toolkit_customer_verification.register_tool_function(verify_customer)
```

### Rules for Parameter Exposure

| `with` binding value | LLM sees it? | Resolution |
|---|---|---|
| `@variables.X` | No | `state.get("X")` at call time |
| `""` / `"literal"` | No | inline literal |
| `...` (slot-fill token) | **Yes** | LLM-supplied parameter |
| `@outputs.X` (chained) | No | result from previous action |

For slot-fill (`...`), the parameter is added to the function signature so the LLM
must supply it.

### Tool Description

Use the reasoning action's `description` field if present; otherwise fall back to the
referenced action's `description` from `subagent.actions`.

---

## Changes Required

### 1. `ast-utils.ts` — extract `available_when`

Add `availableWhen?: string` to `ReasoningActionData`:

```typescript
export interface ReasoningActionData {
  name: string;
  description?: string;
  reference: string;
  withBindings: { param: string; value: string }[];
  setBindings: { variable: string; value: string }[];
  availableWhen?: string;   // ← new
}
```

In `extractReasoningAction`, look for `AvailableWhen` children:

```typescript
} else if (innerKind === 'AvailableWhen') {
  availableWhen = exprToString(inner.condition);
}
```

### 2. `pipeline-generator.ts` — generate per-reasoning-action wrappers

Replace the current block that registers all `sa.actions` with `_make_tool` with
three distinct registration loops:

**Loop A — `@actions.X` reasoning tools** (the main fix)

For each reasoning action where `reference.startsWith('@actions.')`:
- Derive the action name: `reference.replace('@actions.', '')`
- Look up the action definition in `sa.actions` to get its description and param types
- Identify free params (value === `'...'`)
- Generate the wrapper function as shown above

**Loop B — `@utils.setVariables` tools** (existing, keep as-is)

No change to current `_set_variables_X` generation.

**Loop C — `@utils.transition` tools** (new — currently missing)

For each reasoning action where `reference.startsWith('@utils.transition')`:

```python
async def create_case() -> ToolResponse:
    """Create a new support case"""
    self._current_agent_name = "case_creation"  # via next_agent mechanism
    return ToolResponse(content=[TextBlock(type="text", text='{"transitioning": true}')])
toolkit_customer_verification.register_tool_function(create_case)
```

**Loop D — `@utils.escalate` tools** (new)

Emit a stub with a `# TODO: requires Omni-Channel connection` comment.

**Remove the old raw registration loop** (lines 139–144 currently).
The only actions registered with a toolkit are those explicitly named in
`reasoning.actions`. If an action exists in `subagent.actions` but is NOT in
`reasoning.actions`, it is NOT registered as an LLM tool (correct per spec).

### 3. `split-generator.ts` — pass `variables`

Line 44: `generateMain(config, system, subagents)` → `generateMain(config, system, subagents, variables)`

### 4. `state-generator.ts` + `tool-generator.ts` — fix type mapping

| AgentScript | Current | Fix |
|---|---|---|
| `number` | `int` | `float` |
| `integer` | `Any` | `int` |
| `long` | `Any` | `int` |
| `currency` | `Any` | `float` |
| `date`, `id` | `Any` | `str` |
| `datetime`, `time`, `timestamp` | `Any` | `str` |

---

## What Does NOT Change

- `after_reasoning` logic generation is correct — keep as-is
- `before_reasoning` logic generation is correct — keep as-is
- `_set_variables` description passthrough (shipped today) — keep
- `@utils.transition` in `after_reasoning` / logic → `self.next_agent` — keep

---

## Revised Tool Registration Mental Model

```
subagent.actions          →  action impls (_impl functions, called by after_reasoning)
reasoning.actions entries →  LLM tools (one wrapper per entry, registered with toolkit)
```

Before this fix, the generator conflated these two. After the fix they are separate.

---

## Test Plan

1. Update snapshot fixtures after generation changes
2. Add a unit test for `extractReasoningAction` that covers `available_when` extraction
3. Add a `pipeline-generator` test that asserts:
   - A `@actions.X` reasoning entry generates a wrapper with correct name
   - Pre-bound `@variables.X` params are NOT in the function signature
   - Slot-fill `...` params ARE in the function signature
   - `available_when` guard is emitted when present
   - `set` bindings are emitted after the impl call
4. Verify with `case_escalation_bot.agent` output by inspection
