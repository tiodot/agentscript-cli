"""Auto-generated from  by agentscript-cli.
AgentScope implementation of .
"""

from typing import Any

class StateManager:
    """Shared state mirroring AgentScript variables."""

    def __init__(self):
        self.customer_email: str = ""  # Customer's email address
        self.customer_verified: bool = False  # Whether customer identity has been verified
        self.customer_name: str = ""  # Customer's name from lookup
        self.customer_id: str = ""  # Internal customer ID
        self.order_number: str = ""  # Order number provided by customer
        self.order_found: bool = False  # Whether order was successfully found
        self.order_status: str = ""  # Current order status
        self.order_total: int = 0  # Order total amount
        self.tracking_number: str = ""  # Shipping tracking number
        self.delivery_date: str = ""  # Expected delivery date
        self.shipping_address: str = ""  # Shipping address
        self.issue_type: str = ""  # Type of shipping issue reported
        self.return_eligible: bool = False  # Whether order is eligible for return
        self.case_number: str = ""  # Support case number for issues

    def set(self, name: str, value: Any) -> None:
        setattr(self, name, value)

    def get(self, name: str) -> Any:
        return getattr(self, name, None)


async def get_customer_info(email: str) -> dict:
    """Retrieves customer information using email address

    Args:
        email: Customer's email address

    Returns:
        dict with keys: customer_found, customer_name, customer_id, verified

    Target: flow://GetCustomerInfo
    """

    raise NotImplementedError("Action target: flow://GetCustomerInfo")


async def find_order_by_number(order_number: str, customer_id: str | None = None) -> dict:
    """Locates order using order number

    Args:
        order_number: Customer's order number
        customer_id: Customer identifier for validation

    Returns:
        dict with keys: order_found, order_data, valid_customer

    Target: flow://FindOrderByNumber
    """

    raise NotImplementedError("Action target: flow://FindOrderByNumber")


async def get_order_details(order_number: str, customer_id: str) -> dict:
    """Retrieves comprehensive order information

    Args:
        order_number: Order identifier
        customer_id: Customer identifier

    Returns:
        dict with keys: order_status, tracking_number, delivery_date, order_total, shipping_address, return_eligible

    Target: flow://GetOrderDetails
    """

    raise NotImplementedError("Action target: flow://GetOrderDetails")


async def get_tracking_updates(tracking_number: str) -> dict:
    """Gets real-time tracking updates from shipping carrier

    Args:
        tracking_number: Shipping tracking number

    Returns:
        dict with keys: current_status, location, updated_delivery_date, delivery_attempts

    Target: flow://GetTrackingUpdates
    """

    raise NotImplementedError("Action target: flow://GetTrackingUpdates")


async def process_return_request(order_number: str, return_reason: str, customer_id: str) -> dict:
    """Initiates return process for eligible orders

    Args:
        order_number: Order to process return for
        return_reason: Reason for return
        customer_id: Customer identifier

    Returns:
        dict with keys: return_authorized, return_label_url, refund_amount, return_deadline

    Target: flow://ProcessReturnRequest
    """

    raise NotImplementedError("Action target: flow://ProcessReturnRequest")


async def report_shipping_issue(tracking_number: str, issue_description: str, customer_id: str) -> dict:
    """Reports shipping problem to carrier and customer service

    Args:
        tracking_number: Affected shipment tracking number
        issue_description: Description of the shipping problem
        customer_id: Customer identifier

    Returns:
        dict with keys: case_number, resolution_timeframe, escalated

    Target: flow://ReportShippingIssue
    """

    raise NotImplementedError("Action target: flow://ReportShippingIssue")


from agentscope.agent import ReActAgent
from agentscope.message import Msg

class OrderLocatorWrapper:
    def __init__(self, agent: ReActAgent, state: StateManager):
        self.agent = agent
        self.state = state

    async def __call__(self, msg: Msg) -> Msg:
        await self.before_call(msg)
        result = await self.agent(msg)
        await self.after_call(msg, result)
        return result

    async def before_call(self, msg: Msg) -> None:
        if state.get("order_number") == "" and state.get("customer_email") == "":
            state.set("order_found", False)
            state.set("customer_verified", False)

    async def after_call(self, msg: Msg, result: Msg) -> None:
        if state.get("customer_email") != "":
            result = await get_customer_info(email=state.get("customer_email"))
            state.set("customer_verified", result["customer_found"])
            state.set("customer_name", result["customer_name"])
            state.set("customer_id", result["customer_id"])
        if state.get("order_number") != "":
            result = await find_order_by_number(order_number=state.get("order_number"), customer_id=state.get("customer_id"))
            state.set("order_found", result["order_found"])
        if state.get("order_found") or state.get("customer_verified"):
            pass  # transition to order_details


from agentscope.agent import ReActAgent
from agentscope.message import Msg

class OrderDetailsWrapper:
    def __init__(self, agent: ReActAgent, state: StateManager):
        self.agent = agent
        self.state = state

    async def __call__(self, msg: Msg) -> Msg:
        await self.before_call(msg)
        result = await self.agent(msg)
        await self.after_call(msg, result)
        return result

    async def before_call(self, msg: Msg) -> None:
        if state.get("order_found") and state.get("order_status") == "":
            result = await get_order_details(order_number=state.get("order_number"), customer_id=state.get("customer_id"))
            state.set("order_status", result["order_status"])
            state.set("tracking_number", result["tracking_number"])
            state.set("delivery_date", result["delivery_date"])
            state.set("order_total", result["order_total"])
            state.set("shipping_address", result["shipping_address"])
            state.set("return_eligible", result["return_eligible"])

    async def after_call(self, msg: Msg, result: Msg) -> None:
        if state.get("tracking_number") != "":
            result = await get_tracking_updates(tracking_number=state.get("tracking_number"))
            state.set("delivery_date", result["updated_delivery_date"])
        if state.get("issue_type") != "":
            pass  # transition to issue_resolver


from agentscope.agent import ReActAgent
from agentscope.message import Msg

class IssueResolverWrapper:
    def __init__(self, agent: ReActAgent, state: StateManager):
        self.agent = agent
        self.state = state

    async def __call__(self, msg: Msg) -> Msg:
        await self.before_call(msg)
        result = await self.agent(msg)
        await self.after_call(msg, result)
        return result

    async def before_call(self, msg: Msg) -> None:
        if state.get("issue_type") == "return" and state.get("return_eligible") == False:
            state.set("return_eligible", True)

    async def after_call(self, msg: Msg, result: Msg) -> None:
        if state.get("issue_type") == "return" and state.get("return_eligible"):
            result = await process_return_request(order_number=state.get("order_number"), return_reason=state.get("issue_type"), customer_id=state.get("customer_id"))
        if state.get("issue_type") == "shipping_delay" or state.get("issue_type") == "damaged":
            result = await report_shipping_issue(tracking_number=state.get("tracking_number"), issue_description=state.get("issue_type"), customer_id=state.get("customer_id"))


import os

from agentscope.agent import ReActAgent
from agentscope.formatter import DashScopeChatFormatter
from agentscope.memory import InMemoryMemory
from agentscope.model import DashScopeChatModel
from agentscope.tool import Toolkit

def create_order_locator(state: StateManager, toolkit: Toolkit) -> ReActAgent:
    """Create the order_locator agent."""

    sys_prompt = """
Welcome! I'm here to help you with your order.

To locate your order, I can search by:
1. Order number (fastest option)
2. Email address used for the order

Which would you prefer to use? Please provide either your order number or the email address you used when placing the order."""

    return ReActAgent(
        name="order_locator",
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


import os

from agentscope.agent import ReActAgent
from agentscope.formatter import DashScopeChatFormatter
from agentscope.memory import InMemoryMemory
from agentscope.model import DashScopeChatModel
from agentscope.tool import Toolkit

def create_order_details(state: StateManager, toolkit: Toolkit) -> ReActAgent:
    """Create the order_details agent."""

    sys_prompt = """
Great! I found your order. Here are the current details:

**Order Information:**
- Customer: @variables.customer_name
- Order Number: @variables.order_number
- Order Status: @variables.order_status
- Order Total: $@variables.order_total

**Shipping Details:**
- Tracking Number: @variables.tracking_number
- Expected Delivery: @variables.delivery_date
- Shipping Address: @variables.shipping_address

Would you like me to:
1. Get real-time tracking updates
2. Help with a return or exchange
3. Report a shipping issue
4. Look up another order"""

    return ReActAgent(
        name="order_details",
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


import os

from agentscope.agent import ReActAgent
from agentscope.formatter import DashScopeChatFormatter
from agentscope.memory import InMemoryMemory
from agentscope.model import DashScopeChatModel
from agentscope.tool import Toolkit

def create_issue_resolver(state: StateManager, toolkit: Toolkit) -> ReActAgent:
    """Create the issue_resolver agent."""

    sys_prompt = """
I understand you're having an issue with your order. Let me help you resolve this.

**Issue Type:** @variables.issue_type
**Order:** @variables.order_number
**Return Eligible:** @variables.return_eligible

Based on your issue, I can help you with:
- Processing a return or exchange (if eligible)
- Reporting shipping delays or damage
- Contacting the carrier for delivery updates
- Escalating to our customer service team

What specific assistance do you need?"""

    return ReActAgent(
        name="issue_resolver",
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
    toolkit_order_locator = Toolkit()
    toolkit_order_details = Toolkit()
    toolkit_issue_resolver = Toolkit()

    order_locator = create_order_locator(state, toolkit_order_locator)
    order_details = create_order_details(state, toolkit_order_details)
    issue_resolver = create_issue_resolver(state, toolkit_issue_resolver)

    toolkit_order_locator.register_tool_function(get_customer_info)
    toolkit_order_locator.register_tool_function(find_order_by_number)
    toolkit_order_details.register_tool_function(get_order_details)
    toolkit_order_details.register_tool_function(get_tracking_updates)
    toolkit_issue_resolver.register_tool_function(process_return_request)
    toolkit_issue_resolver.register_tool_function(report_shipping_issue)

    order_locator_wrapped = OrderLocatorWrapper(order_locator, state)
    order_details_wrapped = OrderDetailsWrapper(order_details, state)
    issue_resolver_wrapped = IssueResolverWrapper(issue_resolver, state)

    user = UserAgent(name="user")

    print("Hello! I'm here to help you track your orders, check delivery status, and assist with any shipping or return questions. Please provide your order number or email address to get started.")

    msg = None
    while True:
        try:
            msg = await order_locator_wrapped(msg)
        except Exception as e:
            print("I'm having trouble accessing the order system right now. Please try again in a moment or contact customer service directly.")
        msg = await user(msg)
        if msg.get_text_content() == "exit":
            break


if __name__ == "__main__":
    asyncio.run(main())
