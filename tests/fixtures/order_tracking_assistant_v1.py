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

"""Auto-generated from  by agentscript-cli.
AgentScope implementation of .
"""

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
        self.order_total: float = 0  # Order total amount
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

async def get_customer_info_impl(email: str) -> dict:
    """Retrieves customer information using email address

    Args:
        email: Customer's email address

    Returns:
        dict with keys: customer_found, customer_name, customer_id, verified

    Target: flow://GetCustomerInfo
    """

    raise NotImplementedError("Action target: flow://GetCustomerInfo")

async def get_customer_info(email: str) -> ToolResponse:
    """Retrieves customer information using email address"""

    result = await get_customer_info_impl(email=email)
    return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])

async def find_order_by_number_impl(order_number: str, customer_id: str | None = None) -> dict:
    """Locates order using order number

    Args:
        order_number: Customer's order number
        customer_id: Customer identifier for validation

    Returns:
        dict with keys: order_found, order_data, valid_customer

    Target: flow://FindOrderByNumber
    """

    raise NotImplementedError("Action target: flow://FindOrderByNumber")

async def find_order_by_number(order_number: str, customer_id: str | None = None) -> ToolResponse:
    """Locates order using order number"""

    result = await find_order_by_number_impl(order_number=order_number, customer_id=customer_id)
    return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])

async def get_order_details_impl(order_number: str, customer_id: str) -> dict:
    """Retrieves comprehensive order information

    Args:
        order_number: Order identifier
        customer_id: Customer identifier

    Returns:
        dict with keys: order_status, tracking_number, delivery_date, order_total, shipping_address, return_eligible

    Target: flow://GetOrderDetails
    """

    raise NotImplementedError("Action target: flow://GetOrderDetails")

async def get_order_details(order_number: str, customer_id: str) -> ToolResponse:
    """Retrieves comprehensive order information"""

    result = await get_order_details_impl(order_number=order_number, customer_id=customer_id)
    return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])

async def get_tracking_updates_impl(tracking_number: str) -> dict:
    """Gets real-time tracking updates from shipping carrier

    Args:
        tracking_number: Shipping tracking number

    Returns:
        dict with keys: current_status, location, updated_delivery_date, delivery_attempts

    Target: flow://GetTrackingUpdates
    """

    raise NotImplementedError("Action target: flow://GetTrackingUpdates")

async def get_tracking_updates(tracking_number: str) -> ToolResponse:
    """Gets real-time tracking updates from shipping carrier"""

    result = await get_tracking_updates_impl(tracking_number=tracking_number)
    return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])

async def process_return_request_impl(order_number: str, return_reason: str, customer_id: str) -> dict:
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

async def process_return_request(order_number: str, return_reason: str, customer_id: str) -> ToolResponse:
    """Initiates return process for eligible orders"""

    result = await process_return_request_impl(order_number=order_number, return_reason=return_reason, customer_id=customer_id)
    return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])

async def report_shipping_issue_impl(tracking_number: str, issue_description: str, customer_id: str) -> dict:
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

async def report_shipping_issue(tracking_number: str, issue_description: str, customer_id: str) -> ToolResponse:
    """Reports shipping problem to carrier and customer service"""

    result = await report_shipping_issue_impl(tracking_number=tracking_number, issue_description=issue_description, customer_id=customer_id)
    return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])

class OrderLocatorWrapper:
    def __init__(self, agent: ReActAgent, state: StateManager, resolve_impl=None):
        self.agent = agent
        self.state = state
        self._resolve_impl = resolve_impl
        self.next_agent = None

    async def __call__(self, msg: Msg) -> Msg:
        await self.before_call(msg)
        result = await self.agent(msg)
        try:
            await self.after_call(msg, result)
        except NotImplementedError:
            pass  # unimplemented action stubs — result still returned
        return result

    async def before_call(self, msg: Msg) -> None:
        if self.state.get("order_number") == "" and self.state.get("customer_email") == "":
            self.state.set("order_found", False)
            self.state.set("customer_verified", False)

    async def after_call(self, msg: Msg, result: Msg) -> None:
        if self.state.get("customer_email") != "":
            result = await self._resolve_impl("get_customer_info", **{"email": self.state.get("customer_email")})
            self.state.set("customer_verified", result["customer_found"])
            self.state.set("customer_name", result["customer_name"])
            self.state.set("customer_id", result["customer_id"])
        if self.state.get("order_number") != "":
            result = await self._resolve_impl("find_order_by_number", **{"order_number": self.state.get("order_number"), "customer_id": self.state.get("customer_id")})
            self.state.set("order_found", result["order_found"])
        if self.state.get("order_found") or self.state.get("customer_verified"):
            self.next_agent = "order_details"

class OrderDetailsWrapper:
    def __init__(self, agent: ReActAgent, state: StateManager, resolve_impl=None):
        self.agent = agent
        self.state = state
        self._resolve_impl = resolve_impl
        self.next_agent = None

    async def __call__(self, msg: Msg) -> Msg:
        await self.before_call(msg)
        result = await self.agent(msg)
        try:
            await self.after_call(msg, result)
        except NotImplementedError:
            pass  # unimplemented action stubs — result still returned
        return result

    async def before_call(self, msg: Msg) -> None:
        if self.state.get("order_found") and self.state.get("order_status") == "":
            result = await self._resolve_impl("get_order_details", **{"order_number": self.state.get("order_number"), "customer_id": self.state.get("customer_id")})
            self.state.set("order_status", result["order_status"])
            self.state.set("tracking_number", result["tracking_number"])
            self.state.set("delivery_date", result["delivery_date"])
            self.state.set("order_total", result["order_total"])
            self.state.set("shipping_address", result["shipping_address"])
            self.state.set("return_eligible", result["return_eligible"])

    async def after_call(self, msg: Msg, result: Msg) -> None:
        if self.state.get("tracking_number") != "":
            result = await self._resolve_impl("get_tracking_updates", **{"tracking_number": self.state.get("tracking_number")})
            self.state.set("delivery_date", result["updated_delivery_date"])
        if self.state.get("issue_type") != "":
            self.next_agent = "issue_resolver"

class IssueResolverWrapper:
    def __init__(self, agent: ReActAgent, state: StateManager, resolve_impl=None):
        self.agent = agent
        self.state = state
        self._resolve_impl = resolve_impl
        self.next_agent = None

    async def __call__(self, msg: Msg) -> Msg:
        await self.before_call(msg)
        result = await self.agent(msg)
        try:
            await self.after_call(msg, result)
        except NotImplementedError:
            pass  # unimplemented action stubs — result still returned
        return result

    async def before_call(self, msg: Msg) -> None:
        if self.state.get("issue_type") == "return" and self.state.get("return_eligible") == False:
            self.state.set("return_eligible", True)

    async def after_call(self, msg: Msg, result: Msg) -> None:
        if self.state.get("issue_type") == "return" and self.state.get("return_eligible"):
            result = await self._resolve_impl("process_return_request", **{"order_number": self.state.get("order_number"), "return_reason": self.state.get("issue_type"), "customer_id": self.state.get("customer_id")})
        elif self.state.get("issue_type") == "shipping_delay" or self.state.get("issue_type") == "damaged":
            result = await self._resolve_impl("report_shipping_issue", **{"tracking_number": self.state.get("tracking_number"), "issue_description": self.state.get("issue_type"), "customer_id": self.state.get("customer_id")})

def create_order_locator(state: StateManager, toolkit: Toolkit) -> ReActAgent:
    """Create the order_locator agent."""

    sys_prompt = """
Welcome! I'm here to help you with your order.

To locate your order, I can search by:
1. Order number (fastest option)
2. Email address used for the order

Which would you prefer to use? Please provide either your order number or the email address you used when placing the order.
CRITICAL: Whenever the user provides any of the following values — order_number, customer_email — you MUST immediately call _set_variables_order_locator(order_number=<value>, customer_email=<value>) to save them before calling any other tool. Do NOT skip this step."""

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

def create_order_details(state: StateManager, toolkit: Toolkit) -> ReActAgent:
    """Create the order_details agent."""

    sys_prompt = f"""
Great! I found your order. Here are the current details:

**Order Information:**
- Customer: {state.get("customer_name")}
- Order Number: {state.get("order_number")}
- Order Status: {state.get("order_status")}
- Order Total: ${state.get("order_total")}

**Shipping Details:**
- Tracking Number: {state.get("tracking_number")}
- Expected Delivery: {state.get("delivery_date")}
- Shipping Address: {state.get("shipping_address")}

Would you like me to:
1. Get real-time tracking updates
2. Help with a return or exchange
3. Report a shipping issue
4. Look up another order
CRITICAL: Whenever the user provides any of the following values — issue_type — you MUST immediately call _set_variables_order_details(issue_type=<value>) to save them before calling any other tool. Do NOT skip this step."""

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

def create_issue_resolver(state: StateManager, toolkit: Toolkit) -> ReActAgent:
    """Create the issue_resolver agent."""

    sys_prompt = f"""
I understand you're having an issue with your order. Let me help you resolve this.

**Issue Type:** {state.get("issue_type")}
**Order:** {state.get("order_number")}
**Return Eligible:** {state.get("return_eligible")}

Based on your issue, I can help you with:
- Processing a return or exchange (if eligible)
- Reporting shipping delays or damage
- Contacting the carrier for delivery updates
- Escalating to our customer service team

What specific assistance do you need?
CRITICAL: Whenever the user provides any of the following values — issue_type — you MUST immediately call _set_variables_issue_resolver(issue_type=<value>) to save them before calling any other tool. Do NOT skip this step."""

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

class AgentBot:
    """Auto-generated bot class. Supports package import and CLI execution.

    Usage::

        bot = AgentBot(impls={
            "verify_customer_identity": my_verify_fn,
            ...
        })
        response = await bot.chat("Hello, I need help")
    """

    def __init__(self, impls: dict[str, Callable] | None = None):
        self.state = StateManager()
        self._impls = impls or {}
        self._current_agent_name = "order_locator"
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
        toolkit_order_locator = Toolkit()
        toolkit_order_details = Toolkit()
        toolkit_issue_resolver = Toolkit()

        order_locator_agent = create_order_locator(self.state, toolkit_order_locator)
        order_details_agent = create_order_details(self.state, toolkit_order_details)
        issue_resolver_agent = create_issue_resolver(self.state, toolkit_issue_resolver)

        _state_order_locator = self.state
        async def lookup_customer() -> ToolResponse:
            """Retrieves customer information using email address"""
            result = await self._resolve_impl(
                "get_customer_info",
                email=_state_order_locator.get("customer_email"),
            )
            _state_order_locator.set("customer_verified", result["customer_found"])
            _state_order_locator.set("customer_name", result["customer_name"])
            _state_order_locator.set("customer_id", result["customer_id"])
            return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])
        toolkit_order_locator.register_tool_function(lookup_customer)

        _state_order_locator = self.state
        async def find_order() -> ToolResponse:
            """Locates order using order number"""
            result = await self._resolve_impl(
                "find_order_by_number",
                order_number=_state_order_locator.get("order_number"),
                customer_id=_state_order_locator.get("customer_id"),
            )
            _state_order_locator.set("order_found", result["order_found"])
            return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])
        toolkit_order_locator.register_tool_function(find_order)

        _state_order_details = self.state
        async def load_order_details() -> ToolResponse:
            """Retrieves comprehensive order information"""
            result = await self._resolve_impl(
                "get_order_details",
                order_number=_state_order_details.get("order_number"),
                customer_id=_state_order_details.get("customer_id"),
            )
            _state_order_details.set("order_status", result["order_status"])
            _state_order_details.set("tracking_number", result["tracking_number"])
            _state_order_details.set("delivery_date", result["delivery_date"])
            _state_order_details.set("order_total", result["order_total"])
            _state_order_details.set("shipping_address", result["shipping_address"])
            _state_order_details.set("return_eligible", result["return_eligible"])
            return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])
        toolkit_order_details.register_tool_function(load_order_details)

        _state_order_details = self.state
        async def get_live_tracking() -> ToolResponse:
            """Gets real-time tracking updates from shipping carrier"""
            result = await self._resolve_impl(
                "get_tracking_updates",
                tracking_number=_state_order_details.get("tracking_number"),
            )
            _state_order_details.set("delivery_date", result["updated_delivery_date"])
            return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])
        toolkit_order_details.register_tool_function(get_live_tracking)

        _state_issue_resolver = self.state
        async def initiate_return() -> ToolResponse:
            """Initiates return process for eligible orders"""
            result = await self._resolve_impl(
                "process_return_request",
                order_number=_state_issue_resolver.get("order_number"),
                return_reason=_state_issue_resolver.get("issue_type"),
                customer_id=_state_issue_resolver.get("customer_id"),
            )
            _state_issue_resolver.set("return_eligible", result["return_authorized"])
            return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])
        toolkit_issue_resolver.register_tool_function(initiate_return)

        _state_issue_resolver = self.state
        async def report_issue() -> ToolResponse:
            """Reports shipping problem to carrier and customer service"""
            result = await self._resolve_impl(
                "report_shipping_issue",
                tracking_number=_state_issue_resolver.get("tracking_number"),
                issue_description=_state_issue_resolver.get("issue_type"),
                customer_id=_state_issue_resolver.get("customer_id"),
            )
            _state_issue_resolver.set("case_number", result["case_number"])
            return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])
        toolkit_issue_resolver.register_tool_function(report_issue)

        _bot_ref_order_locator_show_order_details = self
        async def show_order_details() -> ToolResponse:
            """Show detailed order information"""
            _bot_ref_order_locator_show_order_details._pending_transition = "order_details"
            return ToolResponse(content=[TextBlock(type="text", text='{"transitioning": true}')])
        toolkit_order_locator.register_tool_function(show_order_details)

        _bot_ref_order_details_handle_issue = self
        async def handle_issue() -> ToolResponse:
            """Handle shipping issues or returns"""
            _bot_ref_order_details_handle_issue._pending_transition = "issue_resolver"
            return ToolResponse(content=[TextBlock(type="text", text='{"transitioning": true}')])
        toolkit_order_details.register_tool_function(handle_issue)

        _bot_ref_order_details_search_another = self
        async def search_another() -> ToolResponse:
            """Search for another order"""
            _bot_ref_order_details_search_another._pending_transition = "order_locator"
            return ToolResponse(content=[TextBlock(type="text", text='{"transitioning": true}')])
        toolkit_order_details.register_tool_function(search_another)

        _bot_ref_issue_resolver_back_to_order = self
        async def back_to_order() -> ToolResponse:
            """Return to order details"""
            _bot_ref_issue_resolver_back_to_order._pending_transition = "order_details"
            return ToolResponse(content=[TextBlock(type="text", text='{"transitioning": true}')])
        toolkit_issue_resolver.register_tool_function(back_to_order)

        _captured_state_order_locator = self.state
        async def _set_variables_order_locator(order_number: str | None = None, customer_email: str | None = None):
            """Set state variables for the order_locator agent.

            Args:
                order_number: Order number provided by customer
                customer_email: Customer's email address
            """
            _captured_state = _captured_state_order_locator
            if order_number is not None: _captured_state.set("order_number", order_number)
            if customer_email is not None: _captured_state.set("customer_email", customer_email)
            return ToolResponse(content=[TextBlock(type="text", text='{"ok": true}')])
        toolkit_order_locator.register_tool_function(_set_variables_order_locator)
        _captured_state_order_details = self.state
        async def _set_variables_order_details(issue_type: str | None = None):
            """Set state variables for the order_details agent.

            Args:
                issue_type: Type of shipping issue reported
            """
            _captured_state = _captured_state_order_details
            if issue_type is not None: _captured_state.set("issue_type", issue_type)
            return ToolResponse(content=[TextBlock(type="text", text='{"ok": true}')])
        toolkit_order_details.register_tool_function(_set_variables_order_details)
        _captured_state_issue_resolver = self.state
        async def _set_variables_issue_resolver(issue_type: str | None = None):
            """Set state variables for the issue_resolver agent.

            Args:
                issue_type: Type of shipping issue reported
            """
            _captured_state = _captured_state_issue_resolver
            if issue_type is not None: _captured_state.set("issue_type", issue_type)
            return ToolResponse(content=[TextBlock(type="text", text='{"ok": true}')])
        toolkit_issue_resolver.register_tool_function(_set_variables_issue_resolver)
        order_locator_wrapped = OrderLocatorWrapper(order_locator_agent, self.state, self._resolve_impl)
        order_details_wrapped = OrderDetailsWrapper(order_details_agent, self.state, self._resolve_impl)
        issue_resolver_wrapped = IssueResolverWrapper(issue_resolver_agent, self.state, self._resolve_impl)

        self._agents = {"order_locator": order_locator_wrapped, "order_details": order_details_wrapped, "issue_resolver": issue_resolver_wrapped}

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
                return "I'm having trouble accessing the order system right now. Please try again in a moment or contact customer service directly."
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
        self._current_agent_name = "order_locator"
        self._pending_transition = None
        self._build_agents()

    async def run_cli(self):
        """Interactive CLI loop (replaces old main())."""
        print("Hello! I'm here to help you track your orders, check delivery status, and assist with any shipping or return questions. Please provide your order number or email address to get started.")
        while True:
            user_input = input("You: ").strip()
            if user_input.lower() in ("exit", "quit"):
                break
            response = await self.chat(user_input)
            print(f"Bot: {response}")


if __name__ == "__main__":
    _impls = {"get_customer_info": get_customer_info_impl, "find_order_by_number": find_order_by_number_impl, "get_order_details": get_order_details_impl, "get_tracking_updates": get_tracking_updates_impl, "process_return_request": process_return_request_impl, "report_shipping_issue": report_shipping_issue_impl}
    asyncio.run(AgentBot(impls=_impls).run_cli())
