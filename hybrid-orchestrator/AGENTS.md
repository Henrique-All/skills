# AGENTS.md - Hybrid Orchestrator: Unified Engineering Protocol

This document instructs any AI agent (Claude, Gemini, GPT, Copilot, Cursor, Roo Code, Cline, Aider) to follow the **Hybrid Orchestrator Protocol** — a single, unified workflow covering planning, approval-gating, execution, and verification for any code change.

**Do not apply this protocol to questions, explanations, or code reviews without actual changes.**

---

## Core Rules

1. **Classify before editing:** Route A, B, or C — then act.
2. **Planning before code (Routes B & C):** Run planning phases and obtain explicit approval before writing any code.
3. **Strict scope:** Change only mapped files. No unsolicited refactors.
4. **Criticality overrides speed:** Auth, payments, concurrency, DB transactions/migrations, public API contracts, network resilience → Route B, even with `--fast`.
5. **Additive-only database changes:** Never generate `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `migrate reset`, or equivalent. Only safe, additive migrations.
6. **Validation honesty:** **EXECUTADO** (command ran + output shown) or **RACIOCINADO** (reasoned without execution). Never claim a scenario "passed" without evidence.
7. **Silent detection & zero hunting:** If a sibling skill is not installed in the workspace/global catalog, do not hunt on disk. Perform the function natively as REASONED.

---

## Routing (Pragmatic Direct by Default)

| Route | Trigger | Planning & Gate Required |
| :--- | :--- | :--- |
| **A (Surgical direct — DEFAULT)** | Everyday code tasks, bug fixes, UI adjustments, component edits | **No (direct resolution in code)** |
| **B (Governance / Architecture)** | Explicit invocation of `/plan`, `/orch`, or critical multi-system re-architectures | Full Planning + Approval Gate |

---

## Planning Phases (Routes B & C, before any code)

### 1. Impact Analysis
- List each file: `[CREATE]`, `[EDIT]`, or `[READ]`
- Map dependents (who consumes what's changing)
- Risk: 🟢 Low / 🟡 Medium / 🔴 High

### 2. Requirements Review (4 Quadrants)
| Q | Focus | Key Questions |
|:--|:------|:--------------|
| Q1 | API Contracts & Types | Payload format, HTTP status codes, response schema |
| Q2 | Data & Transactions | Atomic transaction needed? Idempotency? Additive migration? |
| Q3 | UI States (if applicable) | Loading, Error, Empty, Success states |
| Q4 | Security & Permissions | Auth required? RBAC/roles? Tenant filter? Sensitive data in logs? |

### 3. Visual Map
- File tree (Before → After)
- Data flow diagram (Mermaid)
- ASCII wireframe (mandatory for new screens/cards)
- Numbered task checklist

### 4. Interactive Previews & Tangibility (Turn 1 Requirement)
- 🌐 **Write real files & open visual previews in browser:**
  - If architecture: generate `.code-map/graph.html` via `preview-graph.js`
  - If UI: write `DESIGN_SPEC.md` and generate `.craft/preview.html` via `preview-spec.js`
  - If Plan: generate `.plan/plan.html` via `preview-plan.js`
- Provide direct clickable links (`file:///...`) in the chat response. Never fake `[CRIADO]` in plain text.

### 5. Approval Gate (Strict Turn 1 Stop)
> 🛑 **Does the plan above meet your needs?**
> Reply: **"OK - Run All"**, **"OK - Step by Step"**, or **"Adjustments"**

🚨 **STOP CALLING TOOLS IMMEDIATELY:** No code file is created, edited, or deleted before the user explicitly replies with "OK" in Turn 2. End your turn now.

---

## Adversarial Execution (Routes B & C, after approval)

**3 roles — all executed, then consolidated:**

1. **Lead:** Freeze scope + define measurable acceptance criteria.
2. **Builder:** Write typed, warning-free code + happy path tests.
3. **Falsifier:** Actively break the solution:
   - Concurrency / race conditions / idempotency
   - Dependency failure (DB down, timeout, 5xx, partial response)
   - Hostile input (null, malformed, oversized, injection)
   - Numeric edge cases (zero, overflow, decimal precision, empty lists)
   - Resource leaks (connections, handles, open transactions)
   - Permission bypass (other user's data, privilege escalation, log leaks)
   
   Write the concrete attack *before* concluding resistance. In Route B, at least one test must fail without the fix and pass with it.

4. **Refinement:** Builder fixes Falsifier failures; max 3 iterations (Route B) or 1 (Route C). If failures remain after limit, **stop and report** — do not deliver as complete.

---

## Response Format

### Route A
```
[ORCHESTRATOR: ROUTE A | DIRECT SURGICAL EXECUTION]
⚡ Decision: Route A (Local fix / --fast)
🔨 [ROLE: SURGICAL BUILDER]
Files: [list]
[diff]
Verify: `[command]`
```

### Routes B & C
```
[ORCHESTRATOR: ROUTE B | TURN 1 - MANDATORY GATE]
🎭 [ROLE: LEAD — Software Architect]
[impact analysis + 4Q review + visual map + checklist + links to HTML previews]
🛑 GATE: Awaiting explicit approval before writing code...

--- (only after approval) ---

[ORCHESTRATOR: ROUTE B | TURN 2 - EXECUTION AUTHORIZED]
🎭 [ROLE: LEAD — Software Architect]
Acceptance criteria: [...] | Git Snapshot recorded

🔨 [ROLE: BUILDER — Software Engineer]
[clean typed implementation + surgical diff]

⚔️ [ROLE: FALSIFIER — Adversarial Hacker & Stress QA]
| # | Category | Concrete Attack Attempted | Status | Result |
| 1 | [cat] | [attack scenario] | EXECUTED/REASONED | [mitigated] |
Hardening applied: [...]

🏆 [ROLE: AUDITOR — DevSecOps & Craftsmanship Gate]
- UI Craft Score ≥ 90 | Security Audit Exit Code 0 | Build & Types OK
```

---

## Degradation by Agent Capability

| Missing Capability | Adaptation |
| :--- | :--- |
| No command execution | Mark all as RACIOCINADO; deliver commands for user to run |
| No file writes | Deliver unified patches |
| No subagents | Falsifier in same session using the checklist above |
| No repository access | Request needed files or declare limitation before classifying |
| No test framework | Propose and write minimum test alongside code; mark as RACIOCINADO |
