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
        self.customer_email: str = ""  # Customer's email address for verification
        self.customer_verified: bool = False  # Whether customer identity has been verified
        self.customer_name: str = ""  # Customer's name
        self.customer_id: str = ""  # Internal customer ID
        self.case_type: str = ""  # Type of case: order_issue, product_problem, billing, technical
        self.case_priority: str = "normal"  # Case priority: low, normal, high, urgent
        self.case_description: str = ""  # Detailed description of the issue
        self.case_number: str = ""  # Generated case number
        self.case_resolved: bool = False  # Whether case has been resolved
        self.escalation_score: float = 0  # Escalation score based on issue complexity (0-100)
        self.escalation_required: bool = False  # Whether case requires escalation
        self.escalation_tier: str = ""  # Escalation tier: l2_support, manager, senior_manager

    def set(self, name: str, value: Any) -> None:
        setattr(self, name, value)

    def get(self, name: str) -> Any:
        return getattr(self, name, None)

async def verify_customer_identity_impl(email: str, security_question_answer: str | None = None) -> dict:
    """Verifies customer identity using email address and security questions

    Args:
        email: Customer's registered email address
        security_question_answer: Answer to security question

    Returns:
        dict with keys: customer_found, customer_name, customer_id, account_status, verification_level

    Target: flow://VerifyCustomerIdentity
    """

    raise NotImplementedError("Action target: flow://VerifyCustomerIdentity")

async def verify_customer_identity(email: str, security_question_answer: str | None = None) -> ToolResponse:
    """Verifies customer identity using email address and security questions"""

    result = await verify_customer_identity_impl(email=email, security_question_answer=security_question_answer)
    return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])

async def get_customer_case_history_impl(customer_id: str) -> dict:
    """Retrieves customer's previous case history for context

    Args:
        customer_id: Customer identifier

    Returns:
        dict with keys: previous_cases, recent_case_type, customer_tier, escalation_history

    Target: flow://GetCustomerCaseHistory
    """

    raise NotImplementedError("Action target: flow://GetCustomerCaseHistory")

async def get_customer_case_history(customer_id: str) -> ToolResponse:
    """Retrieves customer's previous case history for context"""

    result = await get_customer_case_history_impl(customer_id=customer_id)
    return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])

async def create_support_case_impl(customer_id: str, case_type: str, case_description: str, priority: str) -> dict:
    """Creates a new support case in the system

    Args:
        customer_id: Customer identifier
        case_type: Type of issue being reported
        case_description: Detailed description of the issue
        priority: Case priority level

    Returns:
        dict with keys: case_number, estimated_resolution, assigned_agent, auto_escalate

    Target: flow://CreateSupportCase
    """

    raise NotImplementedError("Action target: flow://CreateSupportCase")

async def create_support_case(customer_id: str, case_type: str, case_description: str, priority: str) -> ToolResponse:
    """Creates a new support case in the system"""

    result = await create_support_case_impl(customer_id=customer_id, case_type=case_type, case_description=case_description, priority=priority)
    return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])

async def calculate_escalation_score_impl(case_type: str, customer_tier: str, previous_escalations: float, case_complexity: str) -> dict:
    """Calculates escalation score based on case details and customer history

    Args:
        case_type: Type of case being created
        customer_tier: Customer's service tier
        previous_escalations: Number of previous escalations
        case_complexity: Assessed complexity level

    Returns:
        dict with keys: escalation_score, recommended_tier, immediate_escalation

    Target: flow://CalculateEscalationScore
    """

    raise NotImplementedError("Action target: flow://CalculateEscalationScore")

async def calculate_escalation_score(case_type: str, customer_tier: str, previous_escalations: float, case_complexity: str) -> ToolResponse:
    """Calculates escalation score based on case details and customer history"""

    result = await calculate_escalation_score_impl(case_type=case_type, customer_tier=customer_tier, previous_escalations=previous_escalations, case_complexity=case_complexity)
    return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])

async def initiate_escalation_impl(case_number: str, escalation_tier: str, escalation_reason: str, customer_id: str) -> dict:
    """Initiates escalation to appropriate support tier

    Args:
        case_number: Case to escalate
        escalation_tier: Target escalation tier
        escalation_reason: Reason for escalation
        customer_id: Customer identifier

    Returns:
        dict with keys: escalation_approved, assigned_specialist, response_sla, escalation_id

    Target: flow://InitiateEscalation
    """

    raise NotImplementedError("Action target: flow://InitiateEscalation")

async def initiate_escalation(case_number: str, escalation_tier: str, escalation_reason: str, customer_id: str) -> ToolResponse:
    """Initiates escalation to appropriate support tier"""

    result = await initiate_escalation_impl(case_number=case_number, escalation_tier=escalation_tier, escalation_reason=escalation_reason, customer_id=customer_id)
    return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])

async def notify_customer_impl(customer_id: str, case_number: str, escalation_details: str) -> dict:
    """Notifies customer about escalation and next steps

    Args:
        customer_id: Customer to notify
        case_number: Case reference
        escalation_details: Details about the escalation

    Returns:
        dict with keys: notification_sent, delivery_method

    Target: flow://NotifyCustomer
    """

    raise NotImplementedError("Action target: flow://NotifyCustomer")

async def notify_customer(customer_id: str, case_number: str, escalation_details: str) -> ToolResponse:
    """Notifies customer about escalation and next steps"""

    result = await notify_customer_impl(customer_id=customer_id, case_number=case_number, escalation_details=escalation_details)
    return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])

async def provide_solution_impl(case_type: str, case_description: str, customer_tier: str) -> dict:
    """Provides solution recommendation based on case type

    Args:
        case_type: Type of issue to resolve
        case_description: Issue details
        customer_tier: Customer service tier

    Returns:
        dict with keys: solution_found, solution_steps, resolution_successful, followup_needed

    Target: flow://ProvideSolution
    """

    raise NotImplementedError("Action target: flow://ProvideSolution")

async def provide_solution(case_type: str, case_description: str, customer_tier: str) -> ToolResponse:
    """Provides solution recommendation based on case type"""

    result = await provide_solution_impl(case_type=case_type, case_description=case_description, customer_tier=customer_tier)
    return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])

async def close_case_impl(case_number: str, resolution_summary: str, customer_satisfied: bool) -> dict:
    """Closes resolved case and gathers customer satisfaction feedback

    Args:
        case_number: Case to close
        resolution_summary: Summary of how issue was resolved
        customer_satisfied: Customer satisfaction status

    Returns:
        dict with keys: case_closed, satisfaction_score, feedback_collected

    Target: flow://CloseCase
    """

    raise NotImplementedError("Action target: flow://CloseCase")

async def close_case(case_number: str, resolution_summary: str, customer_satisfied: bool) -> ToolResponse:
    """Closes resolved case and gathers customer satisfaction feedback"""

    result = await close_case_impl(case_number=case_number, resolution_summary=resolution_summary, customer_satisfied=customer_satisfied)
    return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])

class CustomerVerificationWrapper:
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
        if self.state.get("customer_verified") == False:
            self.state.set("escalation_score", 0)
            self.state.set("case_priority", "normal")

    async def after_call(self, msg: Msg, result: Msg) -> None:
        if self.state.get("customer_email") != "" and self.state.get("customer_name") != "":
            result = await self._resolve_impl("verify_customer_identity", **{"email": self.state.get("customer_email"), "security_question_answer": ""})
            self.state.set("customer_verified", result["customer_found"])
            self.state.set("customer_name", result["customer_name"])
            self.state.set("customer_id", result["customer_id"])
        if self.state.get("customer_verified"):
            result = await self._resolve_impl("get_customer_case_history", **{"customer_id": self.state.get("customer_id")})
            self.state.set("escalation_score", result["previous_cases"])
        if self.state.get("case_type") != "":
            self.next_agent = "case_creation"

class CaseCreationWrapper:
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
        if self.state.get("case_type") == "billing":
            self.state.set("escalation_score", self.state.get("escalation_score") + 30)
        elif self.state.get("case_type") == "technical":
            self.state.set("escalation_score", self.state.get("escalation_score") + 40)
        elif self.state.get("case_type") == "product_problem":
            self.state.set("escalation_score", self.state.get("escalation_score") + 50)
        elif self.state.get("case_type") == "order_issue":
            self.state.set("escalation_score", self.state.get("escalation_score") + 20)

    async def after_call(self, msg: Msg, result: Msg) -> None:
        if self.state.get("case_description") != "":
            result = await self._resolve_impl("create_support_case", **{"customer_id": self.state.get("customer_id"), "case_type": self.state.get("case_type"), "case_description": self.state.get("case_description"), "priority": self.state.get("case_priority")})
            self.state.set("case_number", result["case_number"])
            result = await self._resolve_impl("calculate_escalation_score", **{"case_type": self.state.get("case_type"), "customer_tier": "standard", "previous_escalations": 1, "case_complexity": "medium"})
            self.state.set("escalation_score", result["escalation_score"])
            self.state.set("escalation_tier", result["recommended_tier"])
        if self.state.get("escalation_score") >= 60:
            self.state.set("escalation_required", True)
            self.state.set("case_priority", "high")
            self.next_agent = "escalation_assessment"
        elif self.state.get("escalation_score") < 60:
            self.next_agent = "case_resolution"

class EscalationAssessmentWrapper:
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
        if self.state.get("escalation_score") >= 80:
            self.state.set("escalation_tier", "senior_manager")
            self.state.set("case_priority", "urgent")
        elif self.state.get("escalation_score") >= 60:
            self.state.set("escalation_tier", "manager")
            self.state.set("case_priority", "high")
        elif self.state.get("escalation_score") >= 40:
            self.state.set("escalation_tier", "l2_support")

    async def after_call(self, msg: Msg, result: Msg) -> None:
        if self.state.get("escalation_tier") != "":
            result = await self._resolve_impl("initiate_escalation", **{"case_number": self.state.get("case_number"), "escalation_tier": self.state.get("escalation_tier"), "escalation_reason": "Complex issue requiring specialized expertise", "customer_id": self.state.get("customer_id")})
            self.state.set("escalation_required", True)
            result = await self._resolve_impl("notify_customer", **{"customer_id": self.state.get("customer_id"), "case_number": self.state.get("case_number"), "escalation_details": "Your case has been escalated to " + self.state.get("escalation_tier")})

class CaseResolutionWrapper:
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
        if self.state.get("case_type") != "":
            result = await self._resolve_impl("provide_solution", **{"case_type": self.state.get("case_type"), "case_description": self.state.get("case_description"), "customer_tier": "standard"})

    async def after_call(self, msg: Msg, result: Msg) -> None:
        if self.state.get("case_description") != "":
            self.state.set("escalation_score", self.state.get("escalation_score") + 20)
        if self.state.get("case_resolved"):
            result = await self._resolve_impl("close_case", **{"case_number": self.state.get("case_number"), "resolution_summary": "Issue resolved through direct support", "customer_satisfied": True})

def create_customer_verification(state: StateManager, toolkit: Toolkit) -> ReActAgent:
    """Create the customer_verification agent."""

    sys_prompt = """
Welcome to customer support! I'm here to help you with any issues you're experiencing.
To ensure I can access your account information securely, I'll need to verify your identity first.
Please provide:
- Your email address associated with your account
- Your name as it appears on the account
What type of issue can I help you with today?
CRITICAL: Whenever the user provides any of the following values — customer_email, customer_name, case_type — you MUST immediately call _set_variables_customer_verification(customer_email=<value>, customer_name=<value>, case_type=<value>) to save them before calling any other tool. Do NOT skip this step."""

    return ReActAgent(
        name="customer_verification",
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

def create_case_creation(state: StateManager, toolkit: Toolkit) -> ReActAgent:
    """Create the case_creation agent."""

    sys_prompt = f"""
Thank you for verifying your identity, {state.get("customer_name")}!
I see you have a {state.get("case_type")} issue. Let me gather some details to create your case.
Current escalation score: {state.get("escalation_score")}/100
Priority level: {state.get("case_priority")}
Please describe your issue in detail. The more specific information you can provide, the better I can assist you.
CRITICAL: Whenever the user provides any of the following values — case_description — you MUST immediately call _set_variables_case_creation(case_description=<value>) to save them before calling any other tool. Do NOT skip this step."""

    return ReActAgent(
        name="case_creation",
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

def create_escalation_assessment(state: StateManager, toolkit: Toolkit) -> ReActAgent:
    """Create the escalation_assessment agent."""

    sys_prompt = f"""
Based on the complexity and nature of your issue, I've determined that your case requires escalation.
Case Details:
- Case Number: {state.get("case_number")}
- Priority: {state.get("case_priority")}
- Escalation Score: {state.get("escalation_score")}/100
- Escalation Tier: {state.get("escalation_tier")}
I'm routing your case to our {state.get("escalation_tier")} team who will be better equipped to handle your specific situation.
You can expect to hear from them within:
- L2 Support: 2-4 hours
- Manager: 1-2 hours
- Senior Manager: 30 minutes
Is there anything else I can help clarify about your case before the handoff?
CRITICAL: Whenever the user provides any of the following values — case_description — you MUST immediately call _set_variables_escalation_assessment(case_description=<value>) to save them before calling any other tool. Do NOT skip this step."""

    return ReActAgent(
        name="escalation_assessment",
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

def create_case_resolution(state: StateManager, toolkit: Toolkit) -> ReActAgent:
    """Create the case_resolution agent."""

    sys_prompt = f"""
I'll work to resolve your {state.get("case_type")} issue directly.
Your Case: {state.get("case_number")}
Priority: {state.get("case_priority")}
Issue: {state.get("case_description")}
Based on similar cases, here are the most common solutions:
1. For order issues: Check order status and tracking information
2. For billing questions: Review recent charges and payment methods
3. For technical problems: Verify account settings and try basic troubleshooting
4. For product issues: Check warranty status and available support options
Does this help resolve your issue, or do you need me to escalate this to a specialist?
CRITICAL: Whenever the user provides any of the following values — case_description — you MUST immediately call _set_variables_case_resolution(case_description=<value>) to save them before calling any other tool. Do NOT skip this step."""

    return ReActAgent(
        name="case_resolution",
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
        self._current_agent_name = "customer_verification"
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
        toolkit_customer_verification = Toolkit()
        toolkit_case_creation = Toolkit()
        toolkit_escalation_assessment = Toolkit()
        toolkit_case_resolution = Toolkit()

        customer_verification_agent = create_customer_verification(self.state, toolkit_customer_verification)
        case_creation_agent = create_case_creation(self.state, toolkit_case_creation)
        escalation_assessment_agent = create_escalation_assessment(self.state, toolkit_escalation_assessment)
        case_resolution_agent = create_case_resolution(self.state, toolkit_case_resolution)

        _state_customer_verification = self.state
        async def verify_customer() -> ToolResponse:
            """Verifies customer identity using email address and security questions"""
            result = await self._resolve_impl(
                "verify_customer_identity",
                email=_state_customer_verification.get("customer_email"),
                security_question_answer="",
            )
            _state_customer_verification.set("customer_verified", result["customer_found"])
            _state_customer_verification.set("customer_name", result["customer_name"])
            _state_customer_verification.set("customer_id", result["customer_id"])
            return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])
        toolkit_customer_verification.register_tool_function(verify_customer)

        _state_customer_verification = self.state
        async def get_case_history() -> ToolResponse:
            """Retrieves customer's previous case history for context"""
            result = await self._resolve_impl(
                "get_customer_case_history",
                customer_id=_state_customer_verification.get("customer_id"),
            )
            _state_customer_verification.set("escalation_score", result["previous_cases"])
            return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])
        toolkit_customer_verification.register_tool_function(get_case_history)

        _state_case_creation = self.state
        async def create_case() -> ToolResponse:
            """Creates a new support case in the system"""
            result = await self._resolve_impl(
                "create_support_case",
                customer_id=_state_case_creation.get("customer_id"),
                case_type=_state_case_creation.get("case_type"),
                case_description=_state_case_creation.get("case_description"),
                priority=_state_case_creation.get("case_priority"),
            )
            _state_case_creation.set("case_number", result["case_number"])
            return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])
        toolkit_case_creation.register_tool_function(create_case)

        _state_case_creation = self.state
        async def calculate_escalation() -> ToolResponse:
            """Calculates escalation score based on case details and customer history"""
            result = await self._resolve_impl(
                "calculate_escalation_score",
                case_type=_state_case_creation.get("case_type"),
                customer_tier="standard",
                previous_escalations=1,
                case_complexity="medium",
            )
            _state_case_creation.set("escalation_score", result["escalation_score"])
            _state_case_creation.set("escalation_tier", result["recommended_tier"])
            return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])
        toolkit_case_creation.register_tool_function(calculate_escalation)

        _state_escalation_assessment = self.state
        async def escalate_case() -> ToolResponse:
            """Initiates escalation to appropriate support tier"""
            result = await self._resolve_impl(
                "initiate_escalation",
                case_number=_state_escalation_assessment.get("case_number"),
                escalation_tier=_state_escalation_assessment.get("escalation_tier"),
                escalation_reason="Complex issue requiring specialized expertise",
                customer_id=_state_escalation_assessment.get("customer_id"),
            )
            _state_escalation_assessment.set("escalation_required", True)
            return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])
        toolkit_escalation_assessment.register_tool_function(escalate_case)

        _state_escalation_assessment = self.state
        async def send_escalation_notification() -> ToolResponse:
            """Notifies customer about escalation and next steps"""
            result = await self._resolve_impl(
                "notify_customer",
                customer_id=_state_escalation_assessment.get("customer_id"),
                case_number=_state_escalation_assessment.get("case_number"),
                escalation_details="Your case has been escalated to " + _state_escalation_assessment.get("escalation_tier"),
            )
            return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])
        toolkit_escalation_assessment.register_tool_function(send_escalation_notification)

        _state_case_resolution = self.state
        async def offer_solution() -> ToolResponse:
            """Provides solution recommendation based on case type"""
            result = await self._resolve_impl(
                "provide_solution",
                case_type=_state_case_resolution.get("case_type"),
                case_description=_state_case_resolution.get("case_description"),
                customer_tier="standard",
            )
            _state_case_resolution.set("case_resolved", result["resolution_successful"])
            return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])
        toolkit_case_resolution.register_tool_function(offer_solution)

        _state_case_resolution = self.state
        async def close_resolved_case() -> ToolResponse:
            """Closes resolved case and gathers customer satisfaction feedback"""
            result = await self._resolve_impl(
                "close_case",
                case_number=_state_case_resolution.get("case_number"),
                resolution_summary="Issue resolved through direct support",
                customer_satisfied=True,
            )
            return ToolResponse(content=[TextBlock(type="text", text=json.dumps(result))])
        toolkit_case_resolution.register_tool_function(close_resolved_case)

        _bot_ref_customer_verification_create_case = self
        async def create_case() -> ToolResponse:
            """Create a new support case"""
            _bot_ref_customer_verification_create_case._pending_transition = "case_creation"
            return ToolResponse(content=[TextBlock(type="text", text='{"transitioning": true}')])
        toolkit_customer_verification.register_tool_function(create_case)

        _bot_ref_case_creation_assess_escalation = self
        async def assess_escalation() -> ToolResponse:
            """Assess if escalation is needed"""
            _bot_ref_case_creation_assess_escalation._pending_transition = "escalation_assessment"
            return ToolResponse(content=[TextBlock(type="text", text='{"transitioning": true}')])
        toolkit_case_creation.register_tool_function(assess_escalation)

        _bot_ref_case_creation_resolve_case = self
        async def resolve_case() -> ToolResponse:
            """Attempt to resolve case directly"""
            _bot_ref_case_creation_resolve_case._pending_transition = "case_resolution"
            return ToolResponse(content=[TextBlock(type="text", text='{"transitioning": true}')])
        toolkit_case_creation.register_tool_function(resolve_case)

        _bot_ref_escalation_assessment_help_another = self
        async def help_another() -> ToolResponse:
            """Help another customer"""
            _bot_ref_escalation_assessment_help_another._pending_transition = "customer_verification"
            return ToolResponse(content=[TextBlock(type="text", text='{"transitioning": true}')])
        toolkit_escalation_assessment.register_tool_function(help_another)

        _bot_ref_case_resolution_escalate_case = self
        async def escalate_case() -> ToolResponse:
            """Escalate to higher tier support"""
            _bot_ref_case_resolution_escalate_case._pending_transition = "escalation_assessment"
            return ToolResponse(content=[TextBlock(type="text", text='{"transitioning": true}')])
        toolkit_case_resolution.register_tool_function(escalate_case)

        _bot_ref_case_resolution_help_another = self
        async def help_another() -> ToolResponse:
            """Help another customer"""
            _bot_ref_case_resolution_help_another._pending_transition = "customer_verification"
            return ToolResponse(content=[TextBlock(type="text", text='{"transitioning": true}')])
        toolkit_case_resolution.register_tool_function(help_another)

        _captured_state_customer_verification = self.state
        async def _set_variables_customer_verification(customer_email: str | None = None, customer_name: str | None = None, case_type: str | None = None):
            """Set state variables for the customer_verification agent.

            Args:
                customer_email: Customer's email address for verification
                customer_name: Customer's name
                case_type: Type of case: order_issue, product_problem, billing, technical
            """
            _captured_state = _captured_state_customer_verification
            if customer_email is not None: _captured_state.set("customer_email", customer_email)
            if customer_name is not None: _captured_state.set("customer_name", customer_name)
            if case_type is not None: _captured_state.set("case_type", case_type)
            return ToolResponse(content=[TextBlock(type="text", text='{"ok": true}')])
        toolkit_customer_verification.register_tool_function(_set_variables_customer_verification)
        _captured_state_case_creation = self.state
        async def _set_variables_case_creation(case_description: str | None = None):
            """Set state variables for the case_creation agent.

            Args:
                case_description: Detailed description of the issue
            """
            _captured_state = _captured_state_case_creation
            if case_description is not None: _captured_state.set("case_description", case_description)
            return ToolResponse(content=[TextBlock(type="text", text='{"ok": true}')])
        toolkit_case_creation.register_tool_function(_set_variables_case_creation)
        _captured_state_escalation_assessment = self.state
        async def _set_variables_escalation_assessment(case_description: str | None = None):
            """Set state variables for the escalation_assessment agent.

            Args:
                case_description: Detailed description of the issue
            """
            _captured_state = _captured_state_escalation_assessment
            if case_description is not None: _captured_state.set("case_description", case_description)
            return ToolResponse(content=[TextBlock(type="text", text='{"ok": true}')])
        toolkit_escalation_assessment.register_tool_function(_set_variables_escalation_assessment)
        _captured_state_case_resolution = self.state
        async def _set_variables_case_resolution(case_description: str | None = None):
            """Set state variables for the case_resolution agent.

            Args:
                case_description: Detailed description of the issue
            """
            _captured_state = _captured_state_case_resolution
            if case_description is not None: _captured_state.set("case_description", case_description)
            return ToolResponse(content=[TextBlock(type="text", text='{"ok": true}')])
        toolkit_case_resolution.register_tool_function(_set_variables_case_resolution)
        customer_verification_wrapped = CustomerVerificationWrapper(customer_verification_agent, self.state, self._resolve_impl)
        case_creation_wrapped = CaseCreationWrapper(case_creation_agent, self.state, self._resolve_impl)
        escalation_assessment_wrapped = EscalationAssessmentWrapper(escalation_assessment_agent, self.state, self._resolve_impl)
        case_resolution_wrapped = CaseResolutionWrapper(case_resolution_agent, self.state, self._resolve_impl)

        self._agents = {"customer_verification": customer_verification_wrapped, "case_creation": case_creation_wrapped, "escalation_assessment": escalation_assessment_wrapped, "case_resolution": case_resolution_wrapped}

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
                return "I apologize, but I'm experiencing technical difficulties. Please try again or contact us directly at support@company.com."
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
        self._current_agent_name = "customer_verification"
        self._pending_transition = None
        self._build_agents()

    async def run_cli(self):
        """Interactive CLI loop (replaces old main())."""
        print("Welcome to our customer support! I can help you create a new case, check your order status, or assist with escalating existing issues. How can I help you today?")
        while True:
            user_input = input("You: ").strip()
            if user_input.lower() in ("exit", "quit"):
                break
            response = await self.chat(user_input)
            print(f"Bot: {response}")


if __name__ == "__main__":
    _impls = {"verify_customer_identity": verify_customer_identity_impl, "get_customer_case_history": get_customer_case_history_impl, "create_support_case": create_support_case_impl, "calculate_escalation_score": calculate_escalation_score_impl, "initiate_escalation": initiate_escalation_impl, "notify_customer": notify_customer_impl, "provide_solution": provide_solution_impl, "close_case": close_case_impl}
    asyncio.run(AgentBot(impls=_impls).run_cli())
