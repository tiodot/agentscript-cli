"""
Real-scenario flow tests for case_escalation_bot.

Tests the compiled Python code by importing AgentBot and injecting
mock implementations for all action functions. No LLM calls are made —
the ReActAgent is replaced with a MockAgent that simulates variable
capture from the user message.

Scenarios:
  1. Product crash → escalation_assessment (score >= 60)
  2. Order missing item → case_resolution (score < 60)
  3. Unverified customer → stays in customer_verification (no transition)
"""
import asyncio
import sys
import os

# Allow importing from examples/ directly
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from examples.case_escalation_bot import (
    AgentBot,
    StateManager,
    CustomerVerificationWrapper,
    CaseCreationWrapper,
    EscalationAssessmentWrapper,
    CaseResolutionWrapper,
)

# ─── Shared mock implementations ─────────────────────────────────────────────

async def mock_verify_customer_identity(email, security_question_answer=None):
    if email == "unknown@nobody.com":
        return {
            "customer_found": False,
            "customer_name": "",
            "customer_id": "",
            "account_status": "not_found",
            "verification_level": "none",
        }
    return {
        "customer_found": True,
        "customer_name": "Wudan",
        "customer_id": "003C600000613YKIAY",
        "account_status": "active",
        "verification_level": "full",
    }

async def mock_get_customer_case_history(customer_id):
    return {
        "previous_cases": 2,
        "recent_case_type": "technical",
        "customer_tier": "standard",
        "escalation_history": False,
    }

async def mock_create_support_case(customer_id, case_type, case_description, priority):
    return {
        "case_number": "CASE-20260513-001",
        "estimated_resolution": "2-3 business days",
        "assigned_agent": "Agent Smith",
        "auto_escalate": False,
    }

async def mock_calculate_escalation_score_high(case_type, customer_tier, previous_escalations, case_complexity):
    """Returns score 70 → escalation (product_problem scenario)."""
    return {
        "escalation_score": 70,
        "recommended_tier": "manager",
        "immediate_escalation": False,
    }

async def mock_calculate_escalation_score_low(case_type, customer_tier, previous_escalations, case_complexity):
    """Returns score 40 → no escalation (order_issue scenario)."""
    return {
        "escalation_score": 40,
        "recommended_tier": "l2_support",
        "immediate_escalation": False,
    }

async def mock_initiate_escalation(case_number, escalation_tier, escalation_reason, customer_id):
    return {
        "escalation_approved": True,
        "assigned_specialist": "Dr. Chen",
        "response_sla": "1-2 hours",
        "escalation_id": "ESC-001",
    }

async def mock_notify_customer(customer_id, case_number, escalation_details):
    return {
        "notification_sent": True,
        "delivery_method": "email",
    }

async def mock_provide_solution(case_type, case_description, customer_tier):
    return {
        "solution_found": True,
        "solution_steps": "Check order tracking at orders.example.com",
        "resolution_successful": False,  # still open, no close_case triggered
        "followup_needed": True,
    }

async def mock_close_case(case_number, resolution_summary, customer_satisfied):
    return {
        "case_closed": True,
        "satisfaction_score": 5,
        "feedback_collected": True,
    }


# ─── Mock ReActAgent ──────────────────────────────────────────────────────────

class MockAgent:
    """Replaces ReActAgent — simulates the LLM capturing variables from user message."""

    def __init__(self, name, state: StateManager, scenario_vars: dict):
        self.name = name
        self.state = state
        self.scenario_vars = scenario_vars  # variables this agent should set

    async def __call__(self, msg):
        # Simulate LLM extracting variables and calling setVariables
        for k, v in self.scenario_vars.get(self.name, {}).items():
            self.state.set(k, v)
        return type("Msg", (), {"get_text_content": lambda self: f"[{self.name} response]"})()


# ─── Helpers ─────────────────────────────────────────────────────────────────

def make_bot_with_mock_agents(scenario_vars: dict, calculate_score_fn) -> AgentBot:
    """Create an AgentBot with mock ReActAgents and injected impls."""
    impls = {
        "verify_customer_identity": mock_verify_customer_identity,
        "get_customer_case_history": mock_get_customer_case_history,
        "create_support_case": mock_create_support_case,
        "calculate_escalation_score": calculate_score_fn,
        "initiate_escalation": mock_initiate_escalation,
        "notify_customer": mock_notify_customer,
        "provide_solution": mock_provide_solution,
        "close_case": mock_close_case,
    }
    bot = AgentBot(impls=impls)

    # Replace real ReActAgents with mock agents inside the wrappers
    for agent_name, wrapped in bot._agents.items():
        if hasattr(wrapped, "agent"):
            wrapped.agent = MockAgent(agent_name, bot.state, scenario_vars)
        else:
            # unwrapped agent — replace directly in dict
            bot._agents[agent_name] = MockAgent(agent_name, bot.state, scenario_vars)

    return bot


def check(condition, msg, errors):
    if not condition:
        errors.append(msg)
        print(f"  FAIL: {msg}")
    else:
        print(f"  OK:   {msg}")


# ─── Scenario 1: Product crash → escalation ───────────────────────────────────

async def test_scenario_product_crash_escalates():
    """
    Customer: Wudan, wudan@wdstudio.com
    Issue: Software crashes every day on Export to PDF
    Case type: product_problem → escalation_score += 50
    calculate_escalation_score returns 70 → total >= 60 → escalation_assessment
    """
    print("\n" + "=" * 60)
    print("SCENARIO 1: Product crash → escalation_assessment")
    print("=" * 60)
    errors = []

    scenario_vars = {
        "customer_verification": {
            "customer_email": "wudan@wdstudio.com",
            "customer_name": "Wudan",
            "case_type": "product_problem",
        },
        "case_creation": {
            "case_description": "Software crashes every day when using Export to PDF, restart fixes it",
        },
    }
    bot = make_bot_with_mock_agents(scenario_vars, mock_calculate_escalation_score_high)

    # ── Step 1: customer_verification ──
    cv_wrapper = bot._agents["customer_verification"]
    await cv_wrapper.before_call(None)
    check(bot.state.get("escalation_score") == 0, "initial escalation_score=0", errors)

    # Simulate LLM sets email/case_type
    bot.state.set("customer_email", "wudan@wdstudio.com")
    bot.state.set("case_type", "product_problem")

    await cv_wrapper.after_call(None, None)
    check(bot.state.get("customer_verified") == True, "customer_verified=True", errors)
    check(bot.state.get("customer_id") == "003C600000613YKIAY", "customer_id set", errors)
    check(bot.state.get("escalation_score") == 2, "escalation_score=2 (previous_cases)", errors)
    check(cv_wrapper.next_agent == "case_creation", "transition→case_creation", errors)

    # ── Step 2: case_creation ──
    cc_wrapper = bot._agents["case_creation"]
    cc_wrapper.next_agent = None
    await cc_wrapper.before_call(None)
    check(bot.state.get("escalation_score") == 52, "escalation_score=52 (+50 for product_problem)", errors)

    bot.state.set("case_description", "Software crashes every day when using Export to PDF, restart fixes it")
    await cc_wrapper.after_call(None, None)
    check(bot.state.get("case_number") == "CASE-20260513-001", "case_number set", errors)
    check(bot.state.get("escalation_score") == 70, "escalation_score=70 from calculate", errors)
    check(bot.state.get("escalation_tier") == "manager", "escalation_tier=manager", errors)
    check(bot.state.get("escalation_required") == True, "escalation_required=True", errors)
    check(bot.state.get("case_priority") == "high", "case_priority=high", errors)
    check(cc_wrapper.next_agent == "escalation_assessment", "transition→escalation_assessment", errors)

    # ── Step 3: escalation_assessment ──
    ea_wrapper = bot._agents["escalation_assessment"]
    await ea_wrapper.before_call(None)
    # score=70: >= 60 → tier=manager, priority=high (elif cascade)
    check(bot.state.get("escalation_tier") == "manager", "escalation_tier=manager (elif cascade)", errors)
    check(bot.state.get("case_priority") == "high", "case_priority=high", errors)

    await ea_wrapper.after_call(None, None)
    check(bot.state.get("escalation_required") == True, "escalation_required=True after initiate", errors)
    check(ea_wrapper.next_agent is None, "no further transition", errors)

    return errors


# ─── Scenario 2: Missing order item → case_resolution ────────────────────────

async def test_scenario_order_issue_resolves():
    """
    Customer: Alice, alice@shop.com
    Issue: Package arrived but item missing
    Case type: order_issue → escalation_score += 20
    calculate_escalation_score returns 40 → total < 60 → case_resolution
    """
    print("\n" + "=" * 60)
    print("SCENARIO 2: Missing order item → case_resolution")
    print("=" * 60)
    errors = []

    scenario_vars = {
        "customer_verification": {
            "customer_email": "alice@shop.com",
            "customer_name": "Alice",
            "case_type": "order_issue",
        },
        "case_creation": {
            "case_description": "My package arrived but one item was missing from the order",
        },
    }
    bot = make_bot_with_mock_agents(scenario_vars, mock_calculate_escalation_score_low)

    # Step 1: verification
    cv_wrapper = bot._agents["customer_verification"]
    bot.state.set("customer_email", "alice@shop.com")
    bot.state.set("case_type", "order_issue")
    await cv_wrapper.after_call(None, None)
    check(bot.state.get("customer_verified") == True, "customer verified", errors)
    check(cv_wrapper.next_agent == "case_creation", "transition→case_creation", errors)

    # Step 2: case_creation
    cc_wrapper = bot._agents["case_creation"]
    cc_wrapper.next_agent = None
    await cc_wrapper.before_call(None)
    # 2 (previous_cases) + 20 (order_issue) = 22
    check(bot.state.get("escalation_score") == 22, "escalation_score=22 (+20 order_issue)", errors)

    bot.state.set("case_description", "My package arrived but one item was missing from the order")
    await cc_wrapper.after_call(None, None)
    check(bot.state.get("case_number") == "CASE-20260513-001", "case_number set", errors)
    # calculate returns 40
    check(bot.state.get("escalation_score") == 40, "escalation_score=40 from calculate", errors)
    check(bot.state.get("escalation_tier") == "l2_support", "escalation_tier=l2_support", errors)
    check(bot.state.get("escalation_required") == False, "escalation_required=False (score < 60)", errors)
    check(cc_wrapper.next_agent == "case_resolution", "transition→case_resolution", errors)

    # Step 3: case_resolution before_call runs provide_solution
    cr_wrapper = bot._agents["case_resolution"]
    await cr_wrapper.before_call(None)
    # provide_solution is called (resolution_successful=False → case_resolved stays False)
    check(bot.state.get("case_resolved") == False, "case_resolved=False (solution not yet confirmed)", errors)

    # after_call: case_description != "" → escalation_score += 20; case_resolved=False → no close_case
    await cr_wrapper.after_call(None, None)
    check(bot.state.get("escalation_score") == 60, "escalation_score=60 (+20 in after_call)", errors)
    check(cr_wrapper.next_agent is None, "no transition, waiting for user", errors)

    return errors


# ─── Scenario 3: Unverified customer → stays at customer_verification ─────────

async def test_scenario_unverified_customer():
    """
    Customer provides unknown email → verification fails → no transition.
    escalation_score stays 0, customer_verified stays False.
    """
    print("\n" + "=" * 60)
    print("SCENARIO 3: Unverified customer → no transition")
    print("=" * 60)
    errors = []

    bot = AgentBot(impls={
        "verify_customer_identity": mock_verify_customer_identity,
        "get_customer_case_history": mock_get_customer_case_history,
        "create_support_case": mock_create_support_case,
        "calculate_escalation_score": mock_calculate_escalation_score_high,
        "initiate_escalation": mock_initiate_escalation,
        "notify_customer": mock_notify_customer,
        "provide_solution": mock_provide_solution,
        "close_case": mock_close_case,
    })

    cv_wrapper = bot._agents["customer_verification"]
    await cv_wrapper.before_call(None)
    check(bot.state.get("escalation_score") == 0, "escalation_score reset to 0", errors)
    check(bot.state.get("case_priority") == "normal", "case_priority=normal", errors)

    # Unknown email → customer_found=False
    bot.state.set("customer_email", "unknown@nobody.com")
    await cv_wrapper.after_call(None, None)

    check(bot.state.get("customer_verified") == False, "customer_verified=False (unknown email)", errors)
    check(bot.state.get("customer_id") == "", "customer_id empty", errors)
    check(bot.state.get("escalation_score") == 0, "escalation_score stays 0 (no history fetched)", errors)
    check(cv_wrapper.next_agent is None, "no transition (not verified)", errors)

    return errors


# ─── Runner ───────────────────────────────────────────────────────────────────

async def run_all():
    total_errors = []

    e1 = await test_scenario_product_crash_escalates()
    total_errors.extend(e1)

    e2 = await test_scenario_order_issue_resolves()
    total_errors.extend(e2)

    e3 = await test_scenario_unverified_customer()
    total_errors.extend(e3)

    print("\n" + "=" * 60)
    if total_errors:
        print(f"FAILED: {len(total_errors)} assertion(s)")
        for e in total_errors:
            print(f"  - {e}")
    else:
        print("ALL SCENARIOS PASSED")
    print("=" * 60)

    return len(total_errors)


if __name__ == "__main__":
    n = asyncio.run(run_all())
    sys.exit(n)
