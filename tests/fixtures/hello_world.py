import asyncio
import json
import os

from agentscope.agent import ReActAgent, UserAgent
from agentscope.formatter import DashScopeChatFormatter
from agentscope.memory import InMemoryMemory
from agentscope.message import Msg, TextBlock
from agentscope.model import DashScopeChatModel
from agentscope.tool import ToolResponse, Toolkit
from typing import Any, Callable, Optional

"""Auto-generated from HelloWorldBot by agentscript-cli.
AgentScope implementation of HelloWorldBot.
"""

class StateManager:
    """Shared state mirroring AgentScript variables."""

    def __init__(self):
        pass

    def set(self, name: str, value: Any) -> None:
        setattr(self, name, value)

    def get(self, name: str) -> Any:
        return getattr(self, name, None)

def create_hello_world(state: StateManager, toolkit: Toolkit) -> ReActAgent:
    """Create the hello_world agent."""

    sys_prompt = """
respond to whatever the user says! Make sure to speak in iambic pentameter"""

    return ReActAgent(
        name="hello_world",
        sys_prompt=sys_prompt,
        model=DashScopeChatModel(
            model_name="qwen3.6-flash",
            api_key=os.environ["DASHSCOPE_API_KEY"],
            stream=True,
            enable_thinking=False,
            multimodality=True,
        ),
        memory=InMemoryMemory(),
        formatter=DashScopeChatFormatter(),
        toolkit=toolkit,
    )

class HelloWorldBotBot:
    """Auto-generated bot class. Supports package import and CLI execution.

    Usage::

        bot = HelloWorldBotBot(impls={
            "verify_customer_identity": my_verify_fn,
            ...
        })
        response = await bot.chat("Hello, I need help")
    """

    def __init__(self, impls: dict[str, Callable] | None = None):
        self.state = StateManager()
        self._impls = impls or {}
        self._current_agent_name = "hello_world"
        self._agents: dict = {}
        self._pending_transition: str | None = None
        self._build_agents()

    async def _resolve_impl(self, name: str, **kwargs):
        if name in self._impls:
            return await self._impls[name](**kwargs)
        raise NotImplementedError(
            f"No implementation for '{name}'. Pass via impls={{'{name}': your_fn}}."
        )

    def _build_agents(self):
        toolkit_hello_world = Toolkit()

        hello_world_agent = create_hello_world(self.state, toolkit_hello_world)


        self._agents = {"hello_world": hello_world_agent}

    async def chat(self, user_message: str) -> str:
        """Send a message and get a response. Maintains conversation state across calls."""
        msg = Msg(name="user", content=user_message, role="user")
        while True:
            agent = self._agents[self._current_agent_name]
            try:
                result = await agent(msg)
            except NotImplementedError:
                raise
            except Exception as e:
                return "Sorry, something went wrong."
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
            return result.get_text_content() if hasattr(result, "get_text_content") else str(result)

    def reset(self):
        """Reset state and restart from the beginning (new session)."""
        self.state = StateManager()
        self._current_agent_name = "hello_world"
        self._pending_transition = None
        self._build_agents()

    async def run_cli(self):
        """Interactive CLI loop (replaces old main())."""
        print("Hello! I'm Greeting Bot. How are you feeling today?")
        while True:
            user_input = input("You: ").strip()
            if user_input.lower() in ("exit", "quit"):
                break
            response = await self.chat(user_input)
            print(f"Bot: {response}")


if __name__ == "__main__":
    _impls = {}
    asyncio.run(HelloWorldBotBot(impls=_impls).run_cli())
