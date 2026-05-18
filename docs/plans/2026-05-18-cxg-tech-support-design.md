# CXG Technical Support Assistant — AgentScript Design

**Date:** 2026-05-18  
**Product:** CXG CRM Integration (Salesforce on Alibaba Cloud)  
**Target Users:** Salesforce Administrators, Enterprise Developers

---

## Overview

A multi-node AgentScript workflow that handles technical support requests for CXG's CRM integration product. The assistant verifies the user's Salesforce org, triages issues by category and severity, attempts self-service resolution via knowledge base, collects advanced diagnostics when needed, creates support tickets, and escalates critical cases to senior engineers.

---

## Issue Categories

| Category | Scope |
|----------|-------|
| `wechat_integration` | WeChat configuration, message sync, public account binding |
| `package_install` | Salesforce package install / upgrade / uninstall failures |
| `data_sync` | Data sync errors, field mapping issues, duplicate records |
| `ai_connector` | CXG AI Connector setup, Prompt Builder, RAG knowledge base, AI Actions/templates, generative AI audit and feedback |

---

## State Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `user_org_id` | string | `""` | Salesforce Org ID |
| `user_role` | string | `""` | `admin` or `developer` |
| `user_email` | string | `""` | Contact email |
| `user_verified` | boolean | `false` | Org verification status |
| `issue_category` | string | `""` | One of the four categories above |
| `issue_description` | string | `""` | User-described problem |
| `issue_severity` | string | `"low"` | `low / medium / high / critical` |
| `env_type` | string | `""` | `production` or `sandbox` |
| `kb_solution_found` | boolean | `false` | Whether KB returned a match |
| `ticket_number` | string | `""` | Created ticket reference |
| `ticket_created` | boolean | `false` | Whether ticket has been created |
| `escalation_required` | boolean | `false` | Whether escalation is needed |
| `escalation_reason` | string | `""` | Reason for escalation |
| `subscription_tier` | string | `""` | Customer tier (enterprise triggers auto-escalation) |

---

## Severity Rules

Evaluated deterministically in `issue_triage` `before_reasoning`:

```
env_type == production  AND  issue_category == data_sync         → high
env_type == production  AND  issue_category == ai_connector      → high
env_type == production  AND  issue_category == wechat_integration → medium
user describes "completely unavailable" or "all users affected"  → critical
all other cases                                                  → low
```

Routing based on severity:
- `critical` or `high` → skip self-service → `advanced_diagnosis`
- `medium` or `low` → `self_service_diagnosis`

---

## Node Design

### Node 1: `user_identification` *(initial)*

**Purpose:** Collect user info, verify Salesforce Org, identify role.

**Slot-fill:** `user_org_id`, `user_email`, `user_role`

**Actions:**
- `Verify_Salesforce_Org(org_id)` → `org_valid`, `org_name`, `subscription_tier`
- `Get_User_Profile(org_id, email)` → `user_role`, `contact_name`

**Routing:**
- Verified → `issue_triage`
- Verification fails after 2 retries → prompt user to contact support directly

---

### Node 2: `issue_triage`

**Purpose:** Classify the issue, compute severity, detect active incidents.

**Slot-fill:** `issue_category`, `issue_description`, `env_type`

**before_reasoning:** Apply severity rules (pure state computation, no API calls).

**Actions:**
- `Search_Known_Issues(issue_category, env_type)` → `has_active_incident`, `incident_summary`

**Routing:**
- `has_active_incident == true` → inform user of active incident, create linked ticket, end
- `severity in [critical, high]` → `advanced_diagnosis`
- `severity in [medium, low]` → `self_service_diagnosis`

---

### Node 3: `self_service_diagnosis`

**Purpose:** Attempt KB-driven self-service resolution.

**Actions:**
- `Query_Knowledge_Base(issue_category, issue_description)` → `solution_found`, `solution_steps`, `article_id`
- `Collect_Basic_Diagnostics(issue_category)` → guide user to provide screenshots / config info

**Routing:**
- `kb_solution_found AND user_confirmed_resolved` → end (log as resolved)
- `kb_solution_found == false OR user not resolved` → `ticket_creation`
- User requests escalation → `advanced_diagnosis`

---

### Node 4: `advanced_diagnosis`

**Purpose:** Deep technical diagnosis; collect logs and environment details.

**Diagnostics by category:**

| Category | Collected Info |
|----------|---------------|
| `wechat_integration` | Public account config, message logs |
| `package_install` | Package version, install logs, Org permissions |
| `data_sync` | Sync job ID, field mapping config, error timestamps |
| `ai_connector` | Connector version, Prompt templates, RAG knowledge base ID, audit logs |

**Actions:**
- `Analyze_Error_Logs(issue_category, log_data)` → `root_cause_hint`, `suggested_fix`
- `Check_Service_Health(issue_category)` → `service_status`, `degraded_components`

**Routing:** → `ticket_creation`

---

### Node 5: `ticket_creation`

**Purpose:** Create support ticket, notify user, determine escalation.

**Actions:**
- `Create_Support_Ticket(org_id, issue_category, severity, description, diagnostics)` → `ticket_number`, `sla_hours`
- `Notify_User(email, ticket_number, sla_hours)` → send confirmation email

**after_reasoning escalation logic:**
```
severity == critical                          → escalation_required = true, reason = "Critical severity"
severity == high AND env_type == production   → escalation_required = true, reason = "Production high severity"
subscription_tier == enterprise               → escalation_required = true, reason = "Enterprise SLA"
```

**Routing:**
- `escalation_required == true` → `escalation`
- Otherwise → end

---

### Node 6: `escalation`

**Purpose:** Assign to senior engineer, notify account manager, confirm to user.

**Actions:**
- `Escalate_Ticket(ticket_number, escalation_reason, severity)` → `assigned_engineer`, `response_sla`
- `Notify_Account_Manager(org_id, ticket_number)` → alert account manager
- `Send_Escalation_Confirmation(email, assigned_engineer, response_sla)` → user confirmation

**Routing:** End. Supports `help_another` → back to `user_identification`.

---

## Data Flow

```
user_identification
  → [slot-fill] org_id, email, role
  → Verify_Salesforce_Org → user_verified, subscription_tier
  → Get_User_Profile → user_role
        ↓
issue_triage
  → [slot-fill] issue_category, issue_description, env_type
  → [before_reasoning] severity computation
  → Search_Known_Issues → has_active_incident?
        ↓                         ↓ yes
  severity high/critical     inform + linked ticket + end
        ↓
advanced_diagnosis          self_service_diagnosis
  → Collect_Diagnostics       → Query_Knowledge_Base
  → Analyze_Error_Logs        → kb_solution_found?
  → Check_Service_Health           ↓ yes → end
        ↓                          ↓ no
        └─────────────────→ ticket_creation
                               → Create_Support_Ticket
                               → Notify_User
                               → [after_reasoning] escalation check
                                      ↓ true
                                  escalation
                               → Escalate_Ticket
                               → Notify_Account_Manager
                               → Send_Escalation_Confirmation
```

---

## Error Handling

| Scenario | Handling |
|----------|---------|
| Org verification fails | Retry up to 2 times; on failure prompt user to contact support directly |
| KB returns no results | Auto-route to `ticket_creation`; do not block the user |
| Log analysis yields no root cause | Set `root_cause_hint = unknown`; ticket notes manual investigation required |
| Action call timeout | Catch exception, fall back to ticket creation flow with error context |
| User abandons mid-flow | Any node supports `help_another` to restart at `user_identification` |

---

## SLA Commitments

| Severity | Response Time |
|----------|--------------|
| `critical` | 1 hour |
| `high` | 4 hours |
| `medium` | 1 business day |
| `low` | 3 business days |
| Enterprise escalation | 30 minutes |
