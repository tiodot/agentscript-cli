"""Auto-generated from HelloWorldBot by agentscript-cli.
AgentScope implementation of HelloWorldBot.
"""

from typing import Any

class StateManager:
    """Shared state mirroring AgentScript variables."""

    def __init__(self):
        pass

    def set(self, name: str, value: Any) -> None:
        setattr(self, name, value)

    def get(self, name: str) -> Any:
        return getattr(self, name, None)




import os

from agentscope.agent import ReActAgent
from agentscope.formatter import DashScopeChatFormatter
from agentscope.memory import InMemoryMemory
from agentscope.model import DashScopeChatModel
from agentscope.tool import Toolkit

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


import asyncio
import os

from agentscope.agent import ReActAgent, UserAgent
from agentscope.formatter import DashScopeChatFormatter
from agentscope.memory import InMemoryMemory
from agentscope.message import Msg
from agentscope.model import DashScopeChatModel
from agentscope.pipeline import MsgHub
from agentscope.tool import Toolkit

async def main():
    state = StateManager()
    toolkit_hello_world = Toolkit()

    hello_world = create_hello_world(state, toolkit_hello_world)



    user = UserAgent(name="user")

    print("Hello! I'm Greeting Bot. How are you feeling today?")

    msg = None
    while True:
        try:
            msg = await hello_world(msg)
        except Exception as e:
            print("Sorry, something went wrong.")
        msg = await user(msg)
        if msg.get_text_content() == "exit":
            break


if __name__ == "__main__":
    asyncio.run(main())
