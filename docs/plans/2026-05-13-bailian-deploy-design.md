# Bailian Deploy — Design

**Date:** 2026-05-13

## Goal

Add an `agentscript deploy` CLI command that converts a `.agent` file to a Bailian high-code project, builds a Python wheel, and deploys it to Alibaba Cloud Bailian via `runtime-fc-deploy`.

## Command

```
agentscript deploy <file> [options]

Options:
  --output-dir <dir>   Directory for the generated Bailian project (default: <agentName>_bailian/)
  --app-id <id>        Bailian app ID to update an existing deployment
  --mcp-code <code>    Bailian MCP service code (optional)
  --build-only         Build wheel only, skip deploy
  --desc <text>        Description override (default: from config.description)
```

## Pipeline

```
.agent file
  → parse (parser-bridge)
  → extract (ast-utils): config, system, variables, subagents
  → CodeGenerator.generate() → coreCode (agent_core.py)
  → generateBailianProject() → project dir with deploy_starter/, pyproject.toml, requirements.txt
  → buildWheel() → dist/*.whl
  → deployToBailian() (skipped if --build-only)
```

## Data Mapping

| Bailian field     | Source                          |
|-------------------|---------------------------------|
| `app_name`        | `config.agentName`              |
| `app_description` | `options.desc ?? config.description` |
| `welcomeMessage`  | `system.welcomeMessage`         |

## Files Changed

- **`bailian-deploy.ts`** — fixed `BuildBailianOptions` (added `description`, `welcomeMessage`; removed broken `agentDef` reference); updated `generateBailianProject` and `generateMainPy` signatures.
- **`src/cli.ts`** — added `deploy` command; imports `CodeGenerator` and Bailian functions.

## Prerequisites for Deploy

- `ALIBABA_CLOUD_ACCESS_KEY_ID` and `ALIBABA_CLOUD_ACCESS_KEY_SECRET` env vars set
- `runtime-fc-deploy` installed (`pip install "agentscope-runtime[deployment]"`)
- Python 3.10+ with `build` package available
