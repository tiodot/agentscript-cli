"""Auto-generated from  by agentscript-cli.
AgentScope implementation of .
"""

from typing import Any

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
        self.escalation_score: int = 0  # Escalation score based on issue complexity (0-100)
        self.escalation_required: bool = False  # Whether case requires escalation
        self.escalation_tier: str = ""  # Escalation tier: l2_support, manager, senior_manager

    def set(self, name: str, value: Any) -> None:
        setattr(self, name, value)

    def get(self, name: str) -> Any:
        return getattr(self, name, None)


async def verify_customer_identity(email: str, security_question_answer: str | None = None) -> dict:
    """Verifies customer identity using email address and security questions

    Args:
        email: Customer's registered email address
        security_question_answer: Answer to security question

    Returns:
        dict with keys: customer_found, customer_name, customer_id, account_status, verification_level

    Target: flow://VerifyCustomerIdentity
    """

    raise NotImplementedError("Action target: flow://VerifyCustomerIdentity")


async def get_customer_case_history(customer_id: str) -> dict:
    """Retrieves customer's previous case history for context

    Args:
        customer_id: Salesforce Contact ID (e.g. 003C600000613YKIAY) — do NOT use email address

    Returns:
        dict with keys: previous_cases, recent_case_type, customer_tier, escalation_history

    Target: flow://GetCustomerCaseHistory
    """

    raise NotImplementedError("Action target: flow://GetCustomerCaseHistory")


async def create_support_case(customer_id: str, case_type: str, case_description: str, priority: str) -> dict:
    """Creates a new support case in the system

    Args:
        customer_id: Salesforce Contact ID (e.g. 003C600000613YKIAY) — do NOT use email address
        case_type: Type of issue being reported
        case_description: Detailed description of the issue
        priority: Case priority level

    Returns:
        dict with keys: case_number, estimated_resolution, assigned_agent, auto_escalate

    Target: flow://CreateSupportCase
    """

    raise NotImplementedError("Action target: flow://CreateSupportCase")


async def calculate_escalation_score(case_type: str, customer_tier: str, previous_escalations: int, case_complexity: str) -> dict:
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


async def initiate_escalation(case_number: str, escalation_tier: str, escalation_reason: str, customer_id: str) -> dict:
    """Initiates escalation to appropriate support tier

    Args:
        case_number: Case to escalate
        escalation_tier: Target escalation tier
        escalation_reason: Reason for escalation
        customer_id: Salesforce Contact ID (e.g. 003C600000613YKIAY) — do NOT use email address

    Returns:
        dict with keys: escalation_approved, assigned_specialist, response_sla, escalation_id

    Target: flow://InitiateEscalation
    """

    raise NotImplementedError("Action target: flow://InitiateEscalation")


async def notify_customer(customer_id: str, case_number: str, escalation_details: str) -> dict:
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


async def provide_solution(case_type: str, case_description: str, customer_tier: str) -> dict:
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


async def close_case(case_number: str, resolution_summary: str, customer_satisfied: bool) -> dict:
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


from agentscope.agent import ReActAgent
from agentscope.message import Msg

class CustomerVerificationWrapper:
    def __init__(self, agent: ReActAgent, state: StateManager):
        self.agent = agent
        self.state = state

    async def __call__(self, msg: Msg) -> Msg:
        await self.before_call(msg)
        result = await self.agent(msg)
        await self.after_call(msg, result)
        return result

    async def before_call(self, msg: Msg) -> None:
        if state.get("customer_verified") == False:
            state.set("escalation_score", 0)
            state.set("case_priority", "normal")

    async def after_call(self, msg: Msg, result: Msg) -> None:
        if state.get("customer_email") != "":
            result = await verify_customer_identity(email=state.get("customer_email"), security_question_answer="")
            state.set("customer_verified", result["customer_found"])
            state.set("customer_name", result["customer_name"])
            state.set("customer_id", result["customer_id"])
        if state.get("customer_verified"):
            result = await get_customer_case_history(customer_id=state.get("customer_id"))
            state.set("escalation_score", result["previous_cases"])
        if state.get("customer_verified"):
            pass  # transition to case_creation


from agentscope.agent import ReActAgent
from agentscope.message import Msg

class CaseCreationWrapper:
    def __init__(self, agent: ReActAgent, state: StateManager):
        self.agent = agent
        self.state = state

    async def __call__(self, msg: Msg) -> Msg:
        await self.before_call(msg)
        result = await self.agent(msg)
        await self.after_call(msg, result)
        return result

    async def before_call(self, msg: Msg) -> None:
        if state.get("case_type") == "billing":
            state.set("escalation_score", state.get("escalation_score") + 30)
        if state.get("case_type") == "technical":
            state.set("escalation_score", state.get("escalation_score") + 40)
        if state.get("case_type") == "product_problem":
            state.set("escalation_score", state.get("escalation_score") + 50)
        if state.get("case_type") == "order_issue":
            state.set("escalation_score", state.get("escalation_score") + 20)

    async def after_call(self, msg: Msg, result: Msg) -> None:
        if state.get("case_description") != "":
            result = await create_support_case(customer_id=state.get("customer_id"), case_type=state.get("case_type"), case_description=state.get("case_description"), priority=state.get("case_priority"))
            state.set("case_number", result["case_number"])
            result = await calculate_escalation_score(case_type=state.get("case_type"), customer_tier="standard", previous_escalations=1, case_complexity="medium")
            state.set("escalation_score", result["escalation_score"])
            state.set("escalation_tier", result["recommended_tier"])
        if state.get("case_number") != "" and state.get("escalation_score") >= 60:
            state.set("escalation_required", True)
            state.set("case_priority", "high")
            pass  # transition to escalation_assessment
        if state.get("case_number") != "" and state.get("escalation_score") < 60:
            pass  # transition to case_resolution


from agentscope.agent import ReActAgent
from agentscope.message import Msg

class EscalationAssessmentWrapper:
    def __init__(self, agent: ReActAgent, state: StateManager):
        self.agent = agent
        self.state = state

    async def __call__(self, msg: Msg) -> Msg:
        await self.before_call(msg)
        result = await self.agent(msg)
        await self.after_call(msg, result)
        return result

    async def before_call(self, msg: Msg) -> None:
        if state.get("escalation_score") >= 80:
            state.set("escalation_tier", "senior_manager")
            state.set("case_priority", "urgent")
        if state.get("escalation_score") >= 60:
            state.set("escalation_tier", "manager")
            state.set("case_priority", "high")
        if state.get("escalation_score") >= 40:
            state.set("escalation_tier", "l2_support")

    async def after_call(self, msg: Msg, result: Msg) -> None:
        if state.get("escalation_tier") != "":
            result = await initiate_escalation(case_number=state.get("case_number"), escalation_tier=state.get("escalation_tier"), escalation_reason="Complex issue requiring specialized expertise", customer_id=state.get("customer_id"))
            state.set("escalation_required", True)
            result = await notify_customer(customer_id=state.get("customer_id"), case_number=state.get("case_number"), escalation_details="Your case has been escalated to " + state.get("escalation_tier"))


from agentscope.agent import ReActAgent
from agentscope.message import Msg

class CaseResolutionWrapper:
    def __init__(self, agent: ReActAgent, state: StateManager):
        self.agent = agent
        self.state = state

    async def __call__(self, msg: Msg) -> Msg:
        await self.before_call(msg)
        result = await self.agent(msg)
        await self.after_call(msg, result)
        return result

    async def before_call(self, msg: Msg) -> None:
        if state.get("case_type") != "":
            result = await provide_solution(case_type=state.get("case_type"), case_description=state.get("case_description"), customer_tier="standard")

    async def after_call(self, msg: Msg, result: Msg) -> None:
        if state.get("case_description") != "":
            state.set("escalation_score", state.get("escalation_score") + 20)
        if state.get("case_resolved"):
            result = await close_case(case_number=state.get("case_number"), resolution_summary="Issue resolved through direct support", customer_satisfied=True)


import os

from agentscope.agent import ReActAgent
from agentscope.formatter import DashScopeChatFormatter
from agentscope.memory import InMemoryMemory
from agentscope.model import DashScopeChatModel
from agentscope.tool import Toolkit

def create_customer_verification(state: StateManager, toolkit: Toolkit) -> ReActAgent:
    """Create the customer_verification agent."""

    sys_prompt = """
Welcome to customer support! I'm here to help you with any issues you're experiencing.
To ensure I can access your account information securely, I'll need to verify your identity first.
Please provide:
- Your email address associated with your account
- Your name as it appears on the account
What type of issue can I help you with today?"""

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


import os

from agentscope.agent import ReActAgent
from agentscope.formatter import DashScopeChatFormatter
from agentscope.memory import InMemoryMemory
from agentscope.model import DashScopeChatModel
from agentscope.tool import Toolkit

def create_case_creation(state: StateManager, toolkit: Toolkit) -> ReActAgent:
    """Create the case_creation agent."""

    sys_prompt = """
Thank you for verifying your identity, @variables.customer_name!
I see you have a @variables.case_type issue. Let me gather some details to create your case.
Current escalation score: @variables.escalation_score/100
Priority level: @variables.case_priority
If case_description is not already provided, ask the user to describe their issue.
If case_description is already available, set it via set_variables and tell the user you are creating their case now.
CRITICAL: Do NOT claim the case has been created, do NOT invent case details (case number, assigned agent, etc.).
The actual case creation happens automatically AFTER your response, so you cannot know the result yet.
Simply say "I'm creating your case now" or similar."""

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


import os

from agentscope.agent import ReActAgent
from agentscope.formatter import DashScopeChatFormatter
from agentscope.memory import InMemoryMemory
from agentscope.model import DashScopeChatModel
from agentscope.tool import Toolkit

def create_escalation_assessment(state: StateManager, toolkit: Toolkit) -> ReActAgent:
    """Create the escalation_assessment agent."""

    sys_prompt = """
Based on the complexity and nature of your issue, I've determined that your case requires escalation.
Case Details:
- Case Number: @variables.case_number
- Priority: @variables.case_priority
- Escalation Score: @variables.escalation_score/100
- Escalation Tier: @variables.escalation_tier
I'm routing your case to our @variables.escalation_tier team who will be better equipped to handle your specific situation.
You can expect to hear from them within:
- L2 Support: 2-4 hours
- Manager: 1-2 hours
- Senior Manager: 30 minutes
Is there anything else I can help clarify about your case before the handoff?"""

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


import os

from agentscope.agent import ReActAgent
from agentscope.formatter import DashScopeChatFormatter
from agentscope.memory import InMemoryMemory
from agentscope.model import DashScopeChatModel
from agentscope.tool import Toolkit

def create_case_resolution(state: StateManager, toolkit: Toolkit) -> ReActAgent:
    """Create the case_resolution agent."""

    sys_prompt = """
I'll work to resolve your @variables.case_type issue directly.
Your Case: @variables.case_number
Priority: @variables.case_priority
Issue: @variables.case_description
Based on similar cases, here are the most common solutions:
1. For order issues: Check order status and tracking information
2. For billing questions: Review recent charges and payment methods
3. For technical problems: Verify account settings and try basic troubleshooting
4. For product issues: Check warranty status and available support options
Does this help resolve your issue, or do you need me to escalate this to a specialist?"""

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
    toolkit_customer_verification = Toolkit()
    toolkit_case_creation = Toolkit()
    toolkit_escalation_assessment = Toolkit()
    toolkit_case_resolution = Toolkit()

    customer_verification = create_customer_verification(state, toolkit_customer_verification)
    case_creation = create_case_creation(state, toolkit_case_creation)
    escalation_assessment = create_escalation_assessment(state, toolkit_escalation_assessment)
    case_resolution = create_case_resolution(state, toolkit_case_resolution)

    toolkit_customer_verification.register_tool_function(verify_customer_identity)
    toolkit_customer_verification.register_tool_function(get_customer_case_history)
    toolkit_case_creation.register_tool_function(create_support_case)
    toolkit_case_creation.register_tool_function(calculate_escalation_score)
    toolkit_escalation_assessment.register_tool_function(initiate_escalation)
    toolkit_escalation_assessment.register_tool_function(notify_customer)
    toolkit_case_resolution.register_tool_function(provide_solution)
    toolkit_case_resolution.register_tool_function(close_case)

    customer_verification_wrapped = CustomerVerificationWrapper(customer_verification, state)
    case_creation_wrapped = CaseCreationWrapper(case_creation, state)
    escalation_assessment_wrapped = EscalationAssessmentWrapper(escalation_assessment, state)
    case_resolution_wrapped = CaseResolutionWrapper(case_resolution, state)

    user = UserAgent(name="user")

    print("Welcome to our customer support! I can help you create a new case, check your order status, or assist with escalating existing issues. How can I help you today?")

    msg = None
    while True:
        try:
            msg = await customer_verification_wrapped(msg)
        except Exception as e:
            print("I apologize, but I'm experiencing technical difficulties. Please try again or contact us directly at support@company.com.")
        msg = await user(msg)
        if msg.get_text_content() == "exit":
            break


if __name__ == "__main__":
    asyncio.run(main())
