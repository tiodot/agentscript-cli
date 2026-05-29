# chat_stream — 流式进度接口设计

**Date:** 2026-05-19

## 目标

在 Bailian 高代码应用中，向前端实时推送 action 执行和 topic 跳转的进度消息，同时保持 `chat()` 接口向后兼容。

## 消息协议

`chat_stream()` yield 两种消息：

```python
{"type": "progress", "text": "🔄 Search Knowledge Base…"}   # 中间帧
{"type": "final",    "text": "根据知识库，您的问题解决步骤是…"} # 最终帧
```

Bailian `AgentApp` 的 `yield Msg(...), is_end` 协议：`is_end=False` 对应 progress，`is_end=True` 对应 final。

## 架构

### 进度推送机制

用 `asyncio.Queue` 解耦工具闭包和外层生成器：

```
工具闭包 / transition 闭包
    └─ await self._emit_progress(text)
           └─ self._progress_queue.put({"type": "progress", "text": text})

chat_stream()
    └─ asyncio.create_task(_run_agent())   # agent 在后台跑
    └─ while True: item = await queue.get()
           └─ yield item                   # 实时推送给调用方
```

### 触发点

| 触发时机 | 文案来源 | 示例 |
|---|---|---|
| action tool 执行前 | `.agent` action 的 `label:` 字段 | `"Search Knowledge Base"` |
| topic 跳转时（transition 闭包） | `.agent` topic 的 `description:` 字段 | `"Performing advanced technical diagnosis…"` |

## 代码生成改动

### 1. `agent-generator.ts` — action tool 闭包

在每个 action tool 闭包的 `_resolve_impl` 调用前注入：

```python
# 生成前
async def search_knowledge_base() -> ToolResponse:
    result = await self._resolve_impl("query_knowledge_base", ...)

# 生成后
async def search_knowledge_base() -> ToolResponse:
    await self._emit_progress("Search Knowledge Base")
    result = await self._resolve_impl("query_knowledge_base", ...)
```

### 2. `agent-generator.ts` — transition tool 闭包

在每个 transition 闭包的 `_pending_transition` 赋值前注入：

```python
# 生成后
async def go_to_advanced_diagnosis() -> ToolResponse:
    await self._emit_progress("Performing advanced technical diagnosis…")
    self._pending_transition = "advanced_diagnosis"
    return ToolResponse(...)
```

### 3. `AgentBot` 新增成员

```python
def __init__(self, ...):
    ...
    self._progress_queue: asyncio.Queue | None = None

async def _emit_progress(self, text: str) -> None:
    if self._progress_queue is not None:
        await self._progress_queue.put({"type": "progress", "text": text})
```

### 4. `AgentBot.chat_stream()`

```python
async def chat_stream(self, user_message: str):
    self._progress_queue = asyncio.Queue()
    msg = Msg(name="user", content=user_message, role="user")

    async def _run_agent():
        nonlocal msg
        while True:
            agent = self._agents[self._current_agent_name]
            result = await agent(msg)
            if self._pending_transition:
                self._current_agent_name = self._pending_transition
                self._pending_transition = None
                msg = result
                continue
            if hasattr(agent, "next_agent") and agent.next_agent:
                self._current_agent_name = agent.next_agent
                agent.next_agent = None
                msg = result
                continue
            text = result.get_text_content() if hasattr(result, "get_text_content") else str(result)
            await self._progress_queue.put({"type": "final", "text": text})
            await self._progress_queue.put(None)
            return

    task = asyncio.create_task(_run_agent())
    while True:
        item = await self._progress_queue.get()
        if item is None:
            break
        yield item
    await task
    self._progress_queue = None
```

### 5. `AgentBot.chat()` 复用 `chat_stream()`

```python
async def chat(self, user_message: str) -> str:
    async for chunk in self.chat_stream(user_message):
        if chunk["type"] == "final":
            return chunk["text"]
```

向后兼容，原有调用方零改动。

## `bailian-deploy.ts` 模板改动

`main.py` 的 `process` handler 改为消费 `chat_stream()`：

```python
@app.query("agentscope")
async def process(self, request, msgs, **kwargs):
    session_id = getattr(request, "session_id", None) or kwargs.get("session_id")
    bot, is_new = _sessions.get_or_create(session_id)

    if not msgs:
        if not is_new:
            bot.reset()
        yield Msg("assistant", WELCOME_MESSAGE, "assistant"), True
        return

    user_msg = msgs[-1] if isinstance(msgs, list) else msgs
    text = user_msg.content if isinstance(user_msg.content, str) else str(user_msg.content)

    async for chunk in bot.chat_stream(text):
        is_end = chunk["type"] == "final"
        yield Msg("assistant", chunk["text"], "assistant"), is_end
```

## 涉及文件

| 文件 | 改动 |
|---|---|
| `src/generator/agent-generator.ts` | action 闭包注入 `_emit_progress`；transition 闭包注入 topic description |
| `src/generator/pipeline-generator.ts` | 同上（如 pipeline 独立生成） |
| `src/generator/python-writer.ts` | `AgentBot` 新增 `_progress_queue`、`_emit_progress()`、`chat_stream()`；`chat()` 改为复用 `chat_stream()` |
| `src/bailian-deploy.ts` | `generateMainPy()` 模板改为消费 `chat_stream()` |
