# Reference | Agent Script | Agentforce Developer Guide | Salesforce Developers

> Source: https://developer.salesforce.com/docs/ai/agentforce/guide/ascript-reference.html

---

# Agent Script Reference

Use this reference to look up Agent Script syntax, keywords, and concepts. For common patterns and examples, see [Agent Script Patterns](/docs/ai/agentforce/guide/ascript-patterns.html).

> **Note**
>
> Beginning in April 2026, agent **topics** are now called **subagents**. There are no changes to functionality. During this transition, you may see a mix of the new and previous terms in our documentation

## Syntax

This table lists some of the key terms used in an Agent Script file.

| Symbol | Description | More Info |
| --- | --- | --- |
| `#` | Single-line comment. For example: `# This is a comment` | [Comments](/docs/ai/agentforce/guide/ascript-lang.html#comments-to-help-the-humans) |
| `...` | Slot-fill token that instructs the LLM to set the value. For example: `with order_id = ...` | [Variables](/docs/ai/agentforce/guide/ascript-ref-variables.html), [Utils](/docs/ai/agentforce/guide/ascript-ref-utils.html) |
| `->` | Begins logic instructions. For example: `instructions: -> if @variables.verified:` | [Reasoning Instructions](/docs/ai/agentforce/guide/ascript-ref-instructions.html) |
| `|` | Begins prompt instructions. For example: `| Help the customer with their order.` | [Reasoning Instructions](/docs/ai/agentforce/guide/ascript-ref-instructions.html) |
| `{!expression}` | Resolve a variable or resource in prompt instructions. For example: `{!@variables.promotion_product}` | [Reasoning Instructions](/docs/ai/agentforce/guide/ascript-ref-instructions.html) |
| `==`, `!=`, `<`, `>`, `is None`, etc. | Comparison operators. For example: `@variables.count > 0` | [Supported Operators](/docs/ai/agentforce/guide/ascript-ref-operators.html) |
| `@actions.name` | Reference an action. For example: `run @actions.get_order` | [Actions](/docs/ai/agentforce/guide/ascript-ref-actions.html) |
| `@outputs.name` | Reference an action's output value. For example: `set @variables.status = @outputs.status` | [Actions](/docs/ai/agentforce/guide/ascript-ref-actions.html) |
| `@subagent.name` | Delegate to another subagent. For example: `consult: @subagent.specialist` | [Tools](/docs/ai/agentforce/guide/ascript-ref-tools.html#referencing-a-subagent-as-a-tool) |
| `@utils.escalate` | Define a tool that escalates to a human service rep. For example: `escalate: @utils.escalate` | [Utils](/docs/ai/agentforce/guide/ascript-ref-utils.html#utilsescalate) |
| `@utils.setVariables` | Define a tool that instructs the LLM to set variable values. For example: `set_name: @utils.setVariables` | [Utils](/docs/ai/agentforce/guide/ascript-ref-utils.html#utilssetvariables) |
| `@utils.transition to` | Define a tool that transitions to a different subagent. For example: `@utils.transition to @subagent.Order_Management` | [Utils](/docs/ai/agentforce/guide/ascript-ref-utils.html#utilstransition-to) |
| `@variables.name` | Reference a variable from logic instructions. For example: `@variables.order_id` | [Variables](/docs/ai/agentforce/guide/ascript-ref-variables.html) |
| `actions` | Define agent actions or tools available from a subagent. | [Actions](/docs/ai/agentforce/guide/ascript-ref-actions.html), [Tools](/docs/ai/agentforce/guide/ascript-ref-tools.html) |
| `after_reasoning` | Run logic after the reasoning loop exits. | [After Reasoning](/docs/ai/agentforce/guide/ascript-ref-before-after-reasoning.html) |
| `available when` | Conditionally show or hide a tool. For example: `available when @variables.verified == True` | [Tools](/docs/ai/agentforce/guide/ascript-ref-tools.html) |
| `config` | Top-level block for agent configuration. | [Config Block](/docs/ai/agentforce/guide/ascript-blocks.html#config-block) |
| `connection` | Top-level block for external connections like Enhanced Chat. For example: `connection messaging:` | [Connection Block](/docs/ai/agentforce/guide/ascript-blocks.html#connection-block) |
| `if` / `else` | Conditional branching. For example: `if @variables.is_member == True:` | [Conditional Expressions](/docs/ai/agentforce/guide/ascript-ref-expressions.html) |
| `instructions` | Guidance for the LLM within system or reasoning blocks. | [Reasoning Instructions](/docs/ai/agentforce/guide/ascript-ref-instructions.html) |
| `language` | Top-level block for supported languages. | [Language Block](/docs/ai/agentforce/guide/ascript-blocks.html#language-block) |
| `linked` | Declare a variable whose value comes from an external source. For example: `session_id: linked string` | [Variables](/docs/ai/agentforce/guide/ascript-ref-variables.html#linked-variables) |
| `messages` | System messages like welcome and error prompts. | [System Block](/docs/ai/agentforce/guide/ascript-blocks.html#system-block) |
| `mutable` | Allow a variable's value to be changed. For example: `order_id: mutable string = ""` | [Variables](/docs/ai/agentforce/guide/ascript-ref-variables.html#regular-variables) |
| `reasoning` | Block containing instructions and tools for the LLM. | [Reasoning Instructions](/docs/ai/agentforce/guide/ascript-ref-instructions.html) |
| `reasoning.actions` | Tools the LLM can choose to call within a subagent. | [Tools (Reasoning Actions)](/docs/ai/agentforce/guide/ascript-ref-tools.html) |
| `reasoning.instructions` | Prompt and logic instructions sent to the reasoning engine. | [Reasoning Instructions](/docs/ai/agentforce/guide/ascript-ref-instructions.html) |
| `run` | Execute an action deterministically. For example: `run @actions.get_order` | [Actions](/docs/ai/agentforce/guide/ascript-ref-actions.html#call-an-action-in-the-reasoning-logic) |
| `set` | Store a value in a variable. For example: `set @variables.status = @outputs.status` | [Variables](/docs/ai/agentforce/guide/ascript-ref-variables.html), [Actions](/docs/ai/agentforce/guide/ascript-ref-actions.html) |
| `start_agent` | Entry point block for subagent classification and routing. For example: `start_agent agent_router:` | [Start Agent Block](/docs/ai/agentforce/guide/ascript-blocks.html#start-agent-block) |
| `system` | Top-level block for agent instructions and messages. | [System Block](/docs/ai/agentforce/guide/ascript-blocks.html#system-block) |
| `system.instructions` | Override system instructions for a specific subagent. | [System Overrides](/docs/ai/agentforce/guide/ascript-patterns-system-overrides.html) |
| `target` | The flow or action target for an agent action. For example: `target: "flow://Get_Order"` | [Actions](/docs/ai/agentforce/guide/ascript-ref-actions.html) |
| `subagent` | Top-level block defining a subagent's instructions and actions. For example: `subagent Order_Management:` | [Subagent Blocks](/docs/ai/agentforce/guide/ascript-blocks.html#subagent-blocks) |
| `topic` | Deprecated. Use `subagent` instead. | [Subagent Blocks](/docs/ai/agentforce/guide/ascript-blocks.html#subagent-blocks) |
| `transition to` | Move to a different subagent from logic instructions. For example: `transition to @subagent.wrap_up` | [Utils](/docs/ai/agentforce/guide/ascript-ref-utils.html#utilstransition-to) |
| `variables` | Top-level block for global agent variables. | [Variables](/docs/ai/agentforce/guide/ascript-ref-variables.html) |
| `with` | Bind an input parameter. For example: `with order_id = @variables.order_id` | [Actions](/docs/ai/agentforce/guide/ascript-ref-actions.html) |

## Concepts

These reference topics cover key concepts and terms associated with Agent Script.

- **[Actions](/docs/ai/agentforce/guide/ascript-ref-actions.html)** - Define executable tasks that an agent can perform, such as running a flow or transitioning to a new subagent.
- **[After Reasoning](/docs/ai/agentforce/guide/ascript-ref-before-after-reasoning.html)** - Optional block inside a subagent that runs after the reasoning loop exits.
- **[Blocks](/docs/ai/agentforce/guide/ascript-blocks.html)** - The structural components of an Agent Script, where each block contains a set of properties that describe data or procedures.
- **[Conditional Expressions](/docs/ai/agentforce/guide/ascript-ref-expressions.html)** - Deterministically specify what actions to take or which prompts to include based on the current context.
- **[Reasoning Instructions](/docs/ai/agentforce/guide/ascript-ref-instructions.html)** - Instructions that Agentforce resolves into a prompt for the LLM.
- **[Start Agent Block](/docs/ai/agentforce/guide/ascript-blocks.html#start-agent-block)** - A special subagent used for subagent classification, filtering, and routing.
- **[Supported Operators](/docs/ai/agentforce/guide/ascript-ref-operators.html)** - The comparison, logical, and arithmetic operators you can use in Agent Script.
- **[Tools (Reasoning Actions)](/docs/ai/agentforce/guide/ascript-ref-tools.html)** - Executable functions that the LLM can choose to call, based on the tool's description and current context.
- **[Subagents](/docs/ai/agentforce/guide/ascript-blocks.html#subagent-blocks)** - A set of instructions, actions, and reasoning that defines a job that an agent can do.
- **[Utils](/docs/ai/agentforce/guide/ascript-ref-utils.html)** - Utility functions used as tools, such as transitioning to subagents or setting variable values.
- **[Variables](/docs/ai/agentforce/guide/ascript-ref-variables.html)** - Let agents track information across conversation turns.
