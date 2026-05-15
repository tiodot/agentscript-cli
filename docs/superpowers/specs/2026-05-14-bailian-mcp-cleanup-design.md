# Bailian Deploy MCP Cleanup — Design

**Date:** 2026-05-14

## Goal

Remove MCP runtime code generation from `bailian-deploy.ts` and `pipeline-generator.ts`. The `--mcp-code` CLI option becomes a boolean `--mcp` flag that only controls whether `fastmcp>=2.0` is added as a dependency.

## Rationale

The current `--mcp-code <code>` option does two things:
1. Injects ~60 lines of MCP runtime wiring Python code into `main.py` (`_mcp_call_async`, `_make_mcp_override`, auto-register loop)
2. Adds `fastmcp>=2.0` to `requirements.txt` and `pyproject.toml`

The runtime code is tightly coupled to a specific MCP integration pattern. Users should write their own MCP wiring. The CLI should only signal that the dependency is needed.

## Changes

### 1. CLI Interface (`src/cli.ts`)

**Before:**
```
--mcp-code <code>    Bailian MCP service code
```

**After:**
```
--mcp                Include fastmcp dependency for Bailian MCP services
```

In the `deploy` action handler, change `mcpCode: options.mcpCode` to `enableMcp: options.mcp ?? false`.

### 2. `src/bailian-deploy.ts`

| Item | Before | After |
|------|--------|-------|
| `BuildBailianOptions.mcpCode` | `mcpCode?: string` | `enableMcp?: boolean` |
| `generateMainPy()` params | `(appName, welcomeMessage, description, _pkgName, mcpCode, hasImpls)` | `(appName, welcomeMessage, description, hasImpls)` |
| `generateMainPy()` body | Contains `mcpOverrideSection` (~60 lines of Python template) | No MCP code at all |
| `generateRequirementsTxt()` | `mcpCode?: string` param | `enableMcp?: boolean` param |
| `generatePyProjectToml()` | `mcpCode?: string` param | `enableMcp?: boolean` param |
| `generateBailianProject()` | Passes `mcpCode` to all generators | Passes `enableMcp` to `generateRequirementsTxt` and `generatePyProjectToml` only |

The `main.py` template simplifies to: imports, SessionManager, AgentApp, `process` handler, `__main__` block. No `fastmcp` imports, no `_mcp_call_async`, no `_make_mcp_override`, no auto-register loop.

### 3. `src/generator/pipeline-generator.ts`

Remove the `_STUB_TOOLS` / `_TOOL_OVERRIDES` block at the end of `writeBotClass()` (lines 261-269). The generated `agent_core.py` ends at the `if __name__ == "__main__":` block.

`Callable` import from `typing` is retained — it is still used in `AgentBot.__init__` signature.

### 4. Generated Python output

**`agent_core.py`** — no longer ends with:
```python
_STUB_TOOLS = ["verify_customer_identity", ...]
_TOOL_OVERRIDES: dict[str, Callable] = {}
```

**`main.py`** — no longer contains:
```python
from deploy_starter.agent_core import _STUB_TOOLS, _TOOL_OVERRIDES
from fastmcp import Client
from fastmcp.client.transports import StreamableHttpTransport
# ... _mcp_call_async, _make_mcp_override, auto-register loop
```

**`requirements.txt` / `pyproject.toml`** — when `--mcp` is set, includes `fastmcp>=2.0`. Otherwise unchanged.

## Files Changed

- `src/cli.ts` — `--mcp-code` → `--mcp`, pass `enableMcp` instead of `mcpCode`
- `src/bailian-deploy.ts` — remove MCP runtime generation, change `mcpCode` to `enableMcp`
- `src/generator/pipeline-generator.ts` — remove `_STUB_TOOLS` / `_TOOL_OVERRIDES` generation

## Backward Compatibility

This is a breaking change for users who pass `--mcp-code <value>` on the CLI. The flag is now `--mcp` (boolean). No migration path needed — this is an internal tool with no external consumers.
