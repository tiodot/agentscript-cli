"""
Flow validation test for case_escalation_bot.

Traces the execution logic for the input:
  "I'm Wudan email wudan@wdstudio.com. Your software crashes about once a day,
   always when using Export to PDF, but a restart fixes it. Could you help diagnose the cause?"

Expected flow per the .agent file:
  customer_verification → case_creation → escalation_assessment (if score >= 60)

We mock:
  - Action functions return realistic data
  - The ReActAgent is a no-op (just returns the message)
  - UserAgent returns predefined responses

We verify:
  - State at each step matches the .agent logic
  - Transitions happen at the right conditions
  - No NameError or logic bugs
"""
import asyncio
import sys
import os

# Add temp dir to path for the mock file
sys.path.insert(0, os.environ.get('TEMP', '/tmp'))

from case_mock_flow import (
    StateManager,
    CustomerVerificationWrapper,
    CaseCreationWrapper,
    EscalationAssessmentWrapper,
    CaseResolutionWrapper,
)

# ─── Realistic mock action functions ──────────────────────

async def verify_customer_identity(email, security_question_answer=None):
    """Mock: found customer"""
    return {
        "customer_found": True,
        "customer_name": "Wudan",
        "customer_id": "003C600000613YKIAY",
        "account_status": "active",
        "verification_level": "full",
    }

async def get_customer_case_history(customer_id):
    """Mock: 2 previous cases"""
    return {
        "previous_cases": 2,
        "recent_case_type": "technical",
        "customer_tier": "standard",
        "escalation_history": False,
    }

async def create_support_case(customer_id, case_type, case_description, priority):
    """Mock: creates a case"""
    return {
        "case_number": "CASE-20260512-001",
        "estimated_resolution": "2-3 business days",
        "assigned_agent": "Agent Smith",
        "auto_escalate": False,
    }

async def calculate_escalation_score(case_type, customer_tier, previous_escalations, case_complexity):
    """Mock: returns high score for product_problem"""
    base_score = {"product_problem": 70, "technical": 55, "billing": 40, "order_issue": 25}.get(case_type, 30)
    return {
        "escalation_score": base_score,
        "recommended_tier": "senior_manager" if base_score >= 80 else "manager" if base_score >= 60 else "l2_support",
        "immediate_escalation": base_score >= 80,
    }

async def initiate_escalation(case_number, escalation_tier, escalation_reason, customer_id):
    """Mock: escalation approved"""
    return {
        "escalation_approved": True,
        "assigned_specialist": "Dr. Chen",
        "response_sla": "30 minutes",
        "escalation_id": "ESC-001",
    }

async def notify_customer(customer_id, case_number, escalation_details):
    """Mock: notification sent"""
    return {
        "notification_sent": True,
        "delivery_method": "email",
    }

async def provide_solution(case_type, case_description, customer_tier):
    """Mock: solution found"""
    return {
        "solution_found": True,
        "solution_steps": "Update to latest version and disable hardware acceleration for PDF export",
        "resolution_successful": True,
        "followup_needed": False,
    }

async def close_case(case_number, resolution_summary, customer_satisfied):
    """Mock: case closed"""
    return {
        "case_closed": True,
        "satisfaction_score": 5,
        "feedback_collected": True,
    }


# ─── Mock Agent (replaces ReActAgent) ────────────────────

class MockAgent:
    """Minimal mock that simulates an agent call (no-op)."""
    def __init__(self, name):
        self.name = name

    async def __call__(self, msg):
        # The real ReActAgent would process the message and call tools.
        # Here we just return a dummy Msg to keep the flow going.
        return type('Msg', (), {'get_text_content': lambda self: 'mock response'})()


# ─── Patch action functions into module ───────────────────

import case_mock_flow as m
m.verify_customer_identity = verify_customer_identity
m.get_customer_case_history = get_customer_case_history
m.create_support_case = create_support_case
m.calculate_escalation_score = calculate_escalation_score
m.initiate_escalation = initiate_escalation
m.notify_customer = notify_customer
m.provide_solution = provide_solution
m.close_case = close_case


# ─── Flow Test ───────────────────────────────────────────

async def test_flow():
    errors = []
    
    def check(condition, msg):
        if not condition:
            errors.append(msg)
            print(f"  FAIL: {msg}")
        else:
            print(f"  OK: {msg}")

    # ── Step 0: Initial state ──
    print("\n=== Step 0: Initial State ===")
    state = StateManager()
    check(state.get("customer_email") == "", "customer_email initially empty")
    check(state.get("customer_verified") == False, "customer_verified initially False")
    check(state.get("escalation_score") == 0, "escalation_score initially 0")
    check(state.get("case_priority") == "normal", "case_priority initially 'normal'")

    # ── Step 1: customer_verification ──
    print("\n=== Step 1: customer_verification ===")
    
    # 1a. before_call
    print("-- 1a. before_call --")
    cv_agent = MockAgent("customer_verification")
    cv_wrapper = CustomerVerificationWrapper(cv_agent, state)
    await cv_wrapper.before_call(None)
    
    # .agent: if @variables.customer_verified == False: set escalation_score=0, case_priority="normal"
    check(state.get("escalation_score") == 0, "escalation_score reset to 0 (customer_verified was False)")
    check(state.get("case_priority") == "normal", "case_priority reset to 'normal'")
    check(cv_wrapper.next_agent is None, "no transition yet")

    # 1b. Simulate: LLM extracts email and name from user message
    print("-- 1b. LLM sets variables --")
    state.set("customer_email", "wudan@wdstudio.com")
    state.set("customer_name", "Wudan")
    # case_type would be determined by LLM as "product_problem" (software crash)
    state.set("case_type", "product_problem")
    state.set("case_description", "Software crashes about once a day when using Export to PDF, restart fixes it")

    # 1c. after_call
    print("-- 1c. after_call --")
    mock_result = MockAgent("dummy")  # dummy Msg
    await cv_wrapper.after_call(None, mock_result)
    
    # .agent after_reasoning:
    #   if customer_email != "": run verify_customer_identity → set customer_verified, customer_name, customer_id
    #   if customer_verified: run get_customer_case_history → set escalation_score = previous_cases
    #   if customer_verified: transition to case_creation
    
    check(state.get("customer_verified") == True, 
          f"customer_verified=True after verify (got {state.get('customer_verified')})")
    check(state.get("customer_name") == "Wudan", 
          f"customer_name='Wudan' (got {state.get('customer_name')})")
    check(state.get("customer_id") == "003C600000613YKIAY",
          f"customer_id='003C600000613YKIAY' (got {state.get('customer_id')})")
    check(state.get("escalation_score") == 2,
          f"escalation_score=2 from previous_cases (got {state.get('escalation_score')})")
    check(cv_wrapper.next_agent == "case_creation",
          f"transition to case_creation (got {cv_wrapper.next_agent})")

    print(f"  State after step 1: escalation_score={state.get('escalation_score')}, "
          f"customer_verified={state.get('customer_verified')}, case_type={state.get('case_type')}")

    # ── Step 2: case_creation ──
    print("\n=== Step 2: case_creation ===")
    
    # 2a. before_call
    print("-- 2a. before_call --")
    cc_agent = MockAgent("case_creation")
    cc_wrapper = CaseCreationWrapper(cc_agent, state)
    await cc_wrapper.before_call(None)
    
    # .agent before_reasoning:
    #   if case_type == "billing": escalation_score += 30
    #   if case_type == "technical": escalation_score += 40
    #   if case_type == "product_problem": escalation_score += 50
    #   if case_type == "order_issue": escalation_score += 20
    
    # Previous escalation_score was 2, case_type="product_problem" → +50 = 52
    expected_score_before = 2 + 50
    check(state.get("escalation_score") == expected_score_before,
          f"escalation_score={expected_score_before} after before_call (got {state.get('escalation_score')})")
    check(cc_wrapper.next_agent is None, "no transition in before_call")

    # 2b. LLM processes (no-op in mock)
    print("-- 2b. LLM processes --")
    # LLM might call create_support_case and calculate_escalation_score
    # But in the real flow, after_call handles this deterministically

    # 2c. after_call
    print("-- 2c. after_call --")
    await cc_wrapper.after_call(None, mock_result)
    
    # .agent after_reasoning:
    #   if case_description != "": 
    #     run create_support_case → set case_number
    #     run calculate_escalation_score → set escalation_score, escalation_tier
    #   if case_number != "" and escalation_score >= 60:
    #     set escalation_required=True, case_priority="high"
    #     transition to escalation_assessment
    #   if case_number != "" and escalation_score < 60:
    #     transition to case_resolution
    
    check(state.get("case_number") == "CASE-20260512-001",
          f"case_number set (got {state.get('case_number')})")
    
    # calculate_escalation_score returns 70 for "product_problem"
    check(state.get("escalation_score") == 70,
          f"escalation_score=70 from calculate (got {state.get('escalation_score')})")
    check(state.get("escalation_tier") == "manager",
          f"escalation_tier='manager' for score 70 (got {state.get('escalation_tier')})")
    
    # 70 >= 60 → escalation
    check(state.get("escalation_required") == True,
          f"escalation_required=True (got {state.get('escalation_required')})")
    check(state.get("case_priority") == "high",
          f"case_priority='high' for escalation (got {state.get('case_priority')})")
    check(cc_wrapper.next_agent == "escalation_assessment",
          f"transition to escalation_assessment (got {cc_wrapper.next_agent})")

    print(f"  State after step 2: escalation_score={state.get('escalation_score')}, "
          f"escalation_tier={state.get('escalation_tier')}, case_number={state.get('case_number')}")

    # ── Step 3: escalation_assessment ──
    print("\n=== Step 3: escalation_assessment ===")
    
    # 3a. before_call
    print("-- 3a. before_call --")
    ea_agent = MockAgent("escalation_assessment")
    ea_wrapper = EscalationAssessmentWrapper(ea_agent, state)
    await ea_wrapper.before_call(None)
    
    # .agent before_reasoning (CRITICAL: sequential if, not elif!):
    #   if escalation_score >= 80: escalation_tier="senior_manager", case_priority="urgent"
    #   if escalation_score >= 60: escalation_tier="manager", case_priority="high"
    #   if escalation_score >= 40: escalation_tier="l2_support"
    # With score=70: matches >=60 and >=40, last match wins → escalation_tier="l2_support" !!!
    # This is a BUG in the .agent file (should use elif), but our code faithfully reproduces it.
    
    score = state.get("escalation_score")
    print(f"  escalation_score before escalation_assessment: {score}")
    
    # What the .agent file INTENDS (elif cascade):
    # 70 >= 80? No
    # 70 >= 60? Yes → escalation_tier="manager", case_priority="high"
    # (elif 70 >= 40? Not evaluated because previous elif matched)
    # Final: escalation_tier="manager" — CORRECT after elif fix
    actual_tier = state.get("escalation_tier")
    actual_priority = state.get("case_priority")
    
    check(actual_tier == "manager",
          f"escalation_tier='manager' for score 70 (got '{actual_tier}')")
    check(actual_priority == "high",
          f"case_priority='high' (got '{actual_priority}')")

    # 3b. after_call
    print("-- 3b. after_call --")
    await ea_wrapper.after_call(None, mock_result)
    
    # .agent after_reasoning:
    #   if escalation_tier != "": 
    #     run initiate_escalation → set escalation_required=True
    #     run notify_customer
    # No transition → agent waits for user
    
    check(state.get("escalation_required") == True,
          f"escalation_required=True after initiate (got {state.get('escalation_required')})")
    check(ea_wrapper.next_agent is None,
          f"no transition after escalation_assessment (got {ea_wrapper.next_agent})")

    print(f"  State after step 3: escalation_tier={state.get('escalation_tier')}, "
          f"escalation_required={state.get('escalation_required')}")

    # ── Summary ──
    print("\n" + "=" * 60)
    if errors:
        print(f"FAILURES: {len(errors)}")
        for e in errors:
            print(f"  - {e}")
    else:
        print("ALL CHECKS PASSED")
    
    # ── Logic discrepancy report ──
    print("\n" + "=" * 60)
    print("LOGIC DISCREPANCY REPORT")
    print("=" * 60)
    
    print("""
1. IF/ELIF CASCADE (FIXED):
   .agent uses sequential 'if' for score thresholds, which causes the last
   matching condition to win (e.g., score=70 would set tier="l2_support" 
   instead of "manager"). The generator now detects cascading conditions on
   the same variable and generates 'elif' instead. This produces the 
   semantically correct behavior the .agent author intended.
   
2. TRANSITION LOOP (FIXED):
   After an agent sets next_agent, the main loop now uses 'continue' to
   skip user input and go directly to the next agent. This matches the
   .agent flow where transitions are automatic.

3. BEFORE_CALL ACTION RESULTS DISCARDED (KNOWN LIMITATION):
   CaseResolutionWrapper.before_call calls provide_solution() but
   discards the result. In .agent, the result provides context for
   the LLM. This is a design limitation — before_call results are
   not injected into the agent's message context.
""")

    return len(errors)


if __name__ == "__main__":
    n_errors = asyncio.run(test_flow())
    sys.exit(n_errors)
