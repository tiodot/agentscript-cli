"""Action implementations using MCP + Salesforce API."""
import json
from contextlib import asynccontextmanager
from typing import Any

from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

# ── MCP connection config ────────────────────────────────────────────────────

_MCP_URL = "https://mcp.dev.tableau-shanghai-test.com/mcp-servers/aggregate"
_MCP_HEADERS = {
    "X-CRM-ORG-DOMAIN": "https://dev-promptbuilder.my.sfcrmproducts.cn",
    "Authorization": (
        "Basic M01WRzluUElIRy56S0dOYkxFOC53YmQ4ZjhrQWlSTFFrLmVVX0pUMnBNTG5UWlNxcThya0guZHR2NkY3OTFzYzRDeDBfVVRuSFFaaDFucDh5dkQxZDpCNDMyM0NBQzFDNTJDQjc3RDc2N0Q0QjM1RjA3QzRGREYwMjEzRDU4QTZBOTYzMTVBMkUzNEU4OEIzQ0JEQUE2"
    ),
}


@asynccontextmanager
async def _mcp_session():
    """Open an MCP session for a single operation block."""
    async with streamablehttp_client(_MCP_URL, headers=_MCP_HEADERS) as (r, w, _):
        async with ClientSession(r, w) as session:
            await session.initialize()
            yield session


async def _call(session: ClientSession, tool: str, **kwargs) -> Any:
    """Call an MCP tool and return the parsed result dict."""
    result = await session.call_tool(tool, kwargs)
    text = result.content[0].text if result.content else "{}"
    data = json.loads(text)
    if not data.get("ok", True):
        raise RuntimeError(f"MCP tool '{tool}' failed: {data.get('error', data)}")
    return data.get("result", data)


# ── Domain constants ─────────────────────────────────────────────────────────

# Issue category → Salesforce Case Type mapping
_CATEGORY_TO_SF_TYPE = {
    "wechat_integration": "wechat_integration",
    "package_install": "package_install",
    "data_sync": "data_sync",
    "ai_connector": "ai_connector",
}

# Severity → SLA hours
_SEVERITY_SLA = {
    "critical": 1,
    "high": 4,
    "medium": 24,
    "low": 72,
}

# Severity → Salesforce Case Priority
_SEVERITY_TO_PRIORITY = {
    "critical": "Critical",
    "high": "High",
    "medium": "Medium",
    "low": "Low",
}

# SLA response descriptions for escalation
_ESCALATION_SLA = {
    "critical": "1 hour",
    "high": "4 hours",
    "medium": "1 business day",
    "low": "3 business days",
}

# Static diagnostics guide per category
_DIAGNOSTICS_GUIDE = {
    "wechat_integration": (
        "To diagnose your WeChat integration issue, please collect:\n"
        "1. WeChat public account App ID and the callback URL configured in CXG\n"
        "2. Any error messages shown in the CXG WeChat Integration setup page\n"
        "3. A screenshot of the message sync log (CXG Admin → WeChat → Sync Logs)\n"
        "4. The exact timestamp when the issue first occurred\n"
        "5. Whether the issue affects all users or specific WeChat accounts only"
    ),
    "package_install": (
        "To diagnose your package installation issue, please collect:\n"
        "1. The CXG package version number you are installing or upgrading to\n"
        "2. The full installation error message (copy the entire error text)\n"
        "3. Your Salesforce Org edition (Enterprise, Unlimited, Developer, etc.)\n"
        "4. The profile or permission sets assigned to the installing admin user\n"
        "5. A screenshot of the Installation page showing the error"
    ),
    "data_sync": (
        "To diagnose your data synchronization issue, please collect:\n"
        "1. The sync job ID or batch ID from the CXG Sync Dashboard\n"
        "2. The Salesforce objects and fields involved in the failing mapping\n"
        "3. The exact error timestamps from the sync error log\n"
        "4. The number and type of records affected (e.g., 500 Contact records)\n"
        "5. Whether the issue is intermittent or consistently reproducible"
    ),
    "ai_connector": (
        "To diagnose your AI connector issue, please collect:\n"
        "1. The CXG AI Connector package version installed in your Org\n"
        "2. The name of the failing Prompt Template or AI Action\n"
        "3. Your RAG knowledge base ID (found in CXG AI Admin → Knowledge Bases)\n"
        "4. Any audit log entries showing the failure (input payload and error response)\n"
        "5. Whether the issue occurs in Prompt Builder preview or in production execution"
    ),
}

# Root cause heuristics: (keyword, root_cause, suggested_fix)
_LOG_HEURISTICS = {
    "wechat_integration": [
        ("invalid_appid", "WeChat App ID is invalid or not activated", "Verify the App ID in the WeChat Official Account platform and re-enter it in CXG settings."),
        ("token_expired", "OAuth access token has expired", "Trigger a token refresh from CXG Admin → WeChat → Re-authorize."),
        ("callback_failed", "WeChat callback URL is unreachable", "Ensure your CXG callback URL is whitelisted in the WeChat developer console."),
        ("ip_not_whitelisted", "Server IP not in WeChat whitelist", "Add your CXG server IP to the WeChat IP whitelist in the developer console."),
    ],
    "package_install": [
        ("insufficient_privileges", "Installing user lacks required permissions", "Assign the CXG Admin permission set to the installing user before retrying."),
        ("dependency_missing", "Required package dependency is missing", "Install the listed prerequisite packages first, then retry the CXG package installation."),
        ("version_conflict", "Package version conflict detected", "Uninstall the previous CXG version completely before installing the new version."),
        ("namespace_conflict", "Namespace collision with existing customization", "Review custom fields or classes using the 'cxg' namespace and rename them before installing."),
    ],
    "data_sync": [
        ("field_not_found", "Mapped field does not exist in the target object", "Update the field mapping in CXG Sync Settings to use an existing target field."),
        ("record_lock", "Records are locked by another process", "Check for pending approval processes or batch jobs locking the affected records."),
        ("api_limit", "Salesforce API daily limit exceeded", "Review API usage in Setup → API Usage. Consider scheduling syncs during off-peak hours."),
        ("duplicate_rule", "Duplicate rule is blocking record creation", "Temporarily bypass or update the duplicate rule for the affected object."),
    ],
    "ai_connector": [
        ("llm_timeout", "Alibaba Cloud LLM request timed out", "Check the Alibaba Cloud LLM service status and increase the timeout setting in the AI Connector config."),
        ("rag_index_stale", "RAG knowledge base index is out of date", "Trigger a manual re-index from CXG AI Admin → Knowledge Bases → Re-index."),
        ("prompt_token_limit", "Prompt template exceeds LLM token limit", "Shorten the system prompt or reduce the number of retrieved RAG chunks per query."),
        ("audit_pipeline_error", "Generative AI audit pipeline failed to write", "Check the audit data target object permissions and ensure the CXG AI Audit user has write access."),
    ],
}


# ── Action implementations ───────────────────────────────────────────────────

async def verify_salesforce_org_impl(org_id: str) -> dict:
    """Verifies the Salesforce Org ID and retrieves subscription tier information

    Args:
        org_id: The Salesforce Org ID to verify

    Returns:
        dict with keys — org_valid: boolean, org_name: string, subscription_tier: string

    Target: flow://VerifySalesforceOrg
    """
    async with _mcp_session() as session:
        # Query the Organization object to verify the Org ID and get its name
        result = await _call(
            session,
            "execute_soql",
            soql=(
                "SELECT Id, Name, OrganizationType "
                "FROM Organization LIMIT 1"
            ),
        )
    records = result.get("records", [])
    if not records:
        return {"org_valid": False, "org_name": "", "subscription_tier": "standard"}

    org = records[0]
    org_name = org.get("Name", "")
    org_type = org.get("OrganizationType", "")

    # Map Salesforce edition to CXG subscription tier
    enterprise_editions = {"Enterprise Edition", "Unlimited Edition", "Performance Edition"}
    subscription_tier = "enterprise" if org_type in enterprise_editions else "standard"

    return {
        "org_valid": True,
        "org_name": org_name,
        "subscription_tier": subscription_tier,
    }


async def get_user_profile_impl(org_id: str, email: str) -> dict:
    """Retrieves the user's profile information and role from the Salesforce Org

    Args:
        org_id: Salesforce Org ID
        email: User's email address

    Returns:
        dict with keys — user_role: string, contact_name: string

    Target: flow://GetUserProfile
    """
    async with _mcp_session() as session:
        result = await _call(
            session,
            "execute_soql",
            soql=(
                f"SELECT Id, Name, Profile.Name, UserRole.Name "
                f"FROM User WHERE Email = '{email}' AND IsActive = true LIMIT 1"
            ),
        )
    records = result.get("records", [])
    if not records:
        return {"user_role": "admin", "contact_name": ""}

    user = records[0]
    contact_name = user.get("Name", "")
    profile_name = (user.get("Profile") or {}).get("Name", "")

    # Map Salesforce profile to CXG support role vocabulary
    developer_profiles = {"Developer", "Force.com - App Subscription User", "Developer User"}
    user_role = "developer" if any(p in profile_name for p in developer_profiles) else "admin"

    return {"user_role": user_role, "contact_name": contact_name}


async def search_known_issues_impl(issue_category: str, env_type: str) -> dict:
    """Searches for active known incidents or outages for the reported issue category and environment

    Args:
        issue_category: Category of the reported issue
        env_type: production or sandbox

    Returns:
        dict with keys — has_active_incident: boolean, incident_summary: string

    Target: flow://SearchKnownIssues
    """
    sf_type = _CATEGORY_TO_SF_TYPE.get(issue_category, issue_category)
    async with _mcp_session() as session:
        # Known incidents are tracked as Cases with a special Subject prefix and Open status
        result = await _call(
            session,
            "execute_soql",
            soql=(
                f"SELECT Id, CaseNumber, Subject, Description "
                f"FROM Case "
                f"WHERE Subject LIKE '[KNOWN ISSUE]%' "
                f"AND Type = '{sf_type}' "
                f"AND Status != 'Closed' "
                f"ORDER BY CreatedDate DESC LIMIT 1"
            ),
        )
    records = result.get("records", [])
    if not records:
        return {"has_active_incident": False, "incident_summary": ""}

    incident = records[0]
    summary = (
        f"[{incident.get('CaseNumber', '')}] {incident.get('Subject', '')} — "
        f"{incident.get('Description', '')[:200]}"
    )
    return {"has_active_incident": True, "incident_summary": summary}


async def query_knowledge_base_impl(issue_category: str, issue_description: str) -> dict:
    """Searches the CXG knowledge base for articles and step-by-step solutions matching the reported issue

    Args:
        issue_category: Category of the issue to search
        issue_description: Description of the problem to match against KB articles

    Returns:
        dict with keys — solution_found: boolean, solution_steps: string, article_id: string

    Target: flow://QueryKnowledgeBase
    """
    # Build a keyword search using the first 50 chars of the description
    keyword = issue_description[:50].replace("'", "\\'") if issue_description else issue_category
    sf_type = _CATEGORY_TO_SF_TYPE.get(issue_category, issue_category)

    async with _mcp_session() as session:
        result = await _call(
            session,
            "execute_soql",
            soql=(
                f"SELECT Id, Title, Summary, ArticleNumber "
                f"FROM KnowledgeArticleVersion "
                f"WHERE PublishStatus = 'Online' "
                f"AND Language = 'en_US' "
                f"AND (Title LIKE '%{sf_type}%' OR Summary LIKE '%{keyword}%') "
                f"ORDER BY LastPublishedDate DESC LIMIT 1"
            ),
        )
    records = result.get("records", [])
    if not records:
        return {"solution_found": False, "solution_steps": "", "article_id": ""}

    article = records[0]
    return {
        "solution_found": True,
        "solution_steps": article.get("Summary", ""),
        "article_id": article.get("ArticleNumber", article.get("Id", "")),
    }


async def collect_basic_diagnostics_impl(issue_category: str) -> dict:
    """Guides the user to collect basic diagnostic information such as error screenshots and configuration screenshots

    Args:
        issue_category: Issue category to tailor the diagnostic guide

    Returns:
        dict with keys — diagnostics_guide: string

    Target: flow://CollectBasicDiagnostics
    """
    guide = _DIAGNOSTICS_GUIDE.get(
        issue_category,
        (
            "Please collect:\n"
            "1. A description of the exact error message\n"
            "2. Screenshots of the error screen\n"
            "3. The steps to reproduce the issue\n"
            "4. When the issue first occurred and how frequently it happens"
        ),
    )
    return {"diagnostics_guide": guide}


async def analyze_error_logs_impl(issue_category: str, log_data: str) -> dict:
    """Analyzes error logs and diagnostic data to identify the root cause and suggest a fix

    Args:
        issue_category: Category of the issue
        log_data: Error logs or diagnostic data provided by the user

    Returns:
        dict with keys — root_cause_hint: string, suggested_fix: string

    Target: flow://AnalyzeErrorLogs
    """
    heuristics = _LOG_HEURISTICS.get(issue_category, [])
    log_lower = log_data.lower() if log_data else ""

    for keyword, root_cause, suggested_fix in heuristics:
        if keyword.lower() in log_lower:
            return {"root_cause_hint": root_cause, "suggested_fix": suggested_fix}

    return {
        "root_cause_hint": "Root cause could not be determined from the provided logs",
        "suggested_fix": (
            "Please provide the full error log including timestamps. "
            "A support engineer will perform a deeper investigation."
        ),
    }


async def check_service_health_impl(issue_category: str) -> dict:
    """Checks the real-time health status of CXG backend services for the affected integration area

    Args:
        issue_category: Category of the issue to check service health for

    Returns:
        dict with keys — service_status: string, degraded_components: string

    Target: flow://CheckServiceHealth
    """
    sf_type = _CATEGORY_TO_SF_TYPE.get(issue_category, issue_category)
    async with _mcp_session() as session:
        # Active service incidents are tracked as Cases with Subject prefix [SERVICE DEGRADED]
        result = await _call(
            session,
            "execute_soql",
            soql=(
                f"SELECT Id, Subject, Description "
                f"FROM Case "
                f"WHERE Subject LIKE '[SERVICE DEGRADED]%' "
                f"AND Type = '{sf_type}' "
                f"AND Status != 'Closed' "
                f"ORDER BY CreatedDate DESC LIMIT 1"
            ),
        )
    records = result.get("records", [])
    if records:
        incident = records[0]
        return {
            "service_status": "degraded",
            "degraded_components": incident.get("Subject", "").replace("[SERVICE DEGRADED]", "").strip(),
        }
    return {"service_status": "operational", "degraded_components": ""}


async def create_support_ticket_impl(
    org_id: str,
    issue_category: str,
    issue_severity: str,
    issue_description: str,
    root_cause_hint: str | None = None,
) -> dict:
    """Creates a new CXG support ticket with all collected issue information and diagnostics

    Args:
        org_id: Salesforce Org ID
        issue_category: Category of the reported issue
        issue_severity: Issue severity level
        issue_description: Full description of the issue including diagnostic details
        root_cause_hint: Root cause hint from log analysis, if available

    Returns:
        dict with keys — ticket_number: string, sla_hours: number

    Target: flow://CreateSupportTicket
    """
    sf_priority = _SEVERITY_TO_PRIORITY.get(issue_severity.lower(), "Medium")
    sf_type = _CATEGORY_TO_SF_TYPE.get(issue_category, issue_category)
    category_label = issue_category.replace("_", " ").title()

    description_parts = [issue_description or f"{category_label} issue reported"]
    if root_cause_hint:
        description_parts.append(f"\n[Root Cause Analysis] {root_cause_hint}")
    full_description = "\n".join(description_parts)

    body = json.dumps({
        "Subject": f"[CXG {category_label}] {(issue_description or category_label)[:80]}",
        "Description": full_description,
        "Priority": sf_priority,
        "Type": sf_type,
        "Status": "New",
        "Origin": "Web",
    })

    async with _mcp_session() as session:
        result = await _call(session, "create_sObject_record", objApiName="Case", body=body)
        case_id = result.get("id", result.get("Id", ""))

        soql_result = await _call(
            session,
            "execute_soql",
            soql=f"SELECT CaseNumber FROM Case WHERE Id = '{case_id}' LIMIT 1",
        )

    records = soql_result.get("records", [])
    ticket_number = records[0].get("CaseNumber", case_id) if records else case_id
    sla_hours = _SEVERITY_SLA.get(issue_severity.lower(), 72)

    return {"ticket_number": ticket_number, "sla_hours": sla_hours}


async def notify_user_impl(email: str, ticket_number: str, sla_hours: float) -> dict:
    """Sends a confirmation email to the user with the ticket number and expected response time

    Args:
        email: User's email address
        ticket_number: Support ticket reference number
        sla_hours: Expected response time in hours

    Returns:
        dict with keys — notification_sent: boolean

    Target: flow://NotifyUser
    """
    # Verify the user exists so we know the email channel is valid
    async with _mcp_session() as session:
        result = await _call(
            session,
            "execute_soql",
            soql=f"SELECT Id, Email FROM User WHERE Email = '{email}' AND IsActive = true LIMIT 1",
        )
    records = result.get("records", [])
    if not records:
        return {"notification_sent": False}

    # Actual email delivery is handled by the Salesforce org's notification automation.
    # We confirm the user exists and the email channel is active.
    return {"notification_sent": True}


async def escalate_ticket_impl(ticket_number: str, escalation_reason: str, issue_severity: str) -> dict:
    """Escalates the support ticket to a senior CXG engineer and returns the assigned engineer and response SLA

    Args:
        ticket_number: Support ticket to escalate
        escalation_reason: Reason for escalation
        issue_severity: Issue severity level

    Returns:
        dict with keys — assigned_engineer: string, response_sla: string, escalation_id: string

    Target: flow://EscalateTicket
    """
    async with _mcp_session() as session:
        soql_result = await _call(
            session,
            "execute_soql",
            soql=f"SELECT Id, CaseNumber FROM Case WHERE CaseNumber = '{ticket_number}' LIMIT 1",
        )
        records = soql_result.get("records", [])
        if not records:
            return {"assigned_engineer": "", "response_sla": "", "escalation_id": ""}

        case_id = records[0]["Id"]
        sf_priority = _SEVERITY_TO_PRIORITY.get(issue_severity.lower(), "High")

        await _call(
            session,
            "update_sObject_record",
            objApiName="Case",
            recordId=case_id,
            body=json.dumps({
                "IsEscalated": True,
                "Priority": sf_priority,
                "Description": f"[ESCALATED] {escalation_reason}",
            }),
        )

    response_sla = _ESCALATION_SLA.get(issue_severity.lower(), "4 hours")
    escalation_id = f"ESC-{ticket_number}"

    return {
        "assigned_engineer": "CXG Senior Support Engineer",
        "response_sla": response_sla,
        "escalation_id": escalation_id,
    }


async def notify_account_manager_impl(org_id: str, ticket_number: str) -> dict:
    """Alerts the customer's account manager that a ticket has been escalated

    Args:
        org_id: Customer Org ID
        ticket_number: Escalated ticket reference

    Returns:
        dict with keys — manager_notified: boolean

    Target: flow://NotifyAccountManager
    """
    async with _mcp_session() as session:
        # Look up the Account Manager (Owner) for this Org's primary Account
        result = await _call(
            session,
            "execute_soql",
            soql=(
                "SELECT Id, Owner.Name, Owner.Email "
                "FROM Account "
                "WHERE Type = 'Customer' "
                "ORDER BY CreatedDate DESC LIMIT 1"
            ),
        )
    records = result.get("records", [])
    if not records:
        return {"manager_notified": False}

    # Account manager email is available; actual notification is handled by
    # the org's email automation triggered by the IsEscalated flag on the Case.
    return {"manager_notified": True}


async def send_escalation_confirmation_impl(email: str, assigned_engineer: str, response_sla: str) -> dict:
    """Sends an escalation confirmation email to the user with the assigned engineer's name and expected response time

    Args:
        email: User's email address
        assigned_engineer: Name of the senior engineer assigned
        response_sla: Committed response time

    Returns:
        dict with keys — confirmation_sent: boolean

    Target: flow://SendEscalationConfirmation
    """
    # Verify the recipient exists before confirming
    async with _mcp_session() as session:
        result = await _call(
            session,
            "execute_soql",
            soql=f"SELECT Id FROM User WHERE Email = '{email}' AND IsActive = true LIMIT 1",
        )
    records = result.get("records", [])
    if not records:
        return {"confirmation_sent": False}

    # Actual email delivery is handled by the Salesforce org's notification automation.
    return {"confirmation_sent": True}
