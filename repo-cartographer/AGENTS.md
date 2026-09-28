# AGENTS.md - Repo Cartographer Protocol

This document instructs any AI agent (Claude, Gemini, GPT, Copilot, Cursor, Roo Code, Cline, Aider) to follow the **Repo Cartographer Protocol** — an evidence-oriented, 360° architectural discovery workflow that maps dependencies and generates structured handoffs for execution without wasting tokens.

---

## Core Directives

1. **Cartography Only:** The Cartographer maps, contextualizes, and documents uncertainty. It NEVER modifies production code.
2. **Evidence-Driven 360° Trace:** Trace only nodes with verifiable links across 6 layers:
   - `Layer 1 (UI)`: Page, route, components, forms, events.
   - `Layer 2 (State)`: Store (Zustand, Redux, Context), mutation hooks, local state.
   - `Layer 3 (API/Contracts)`: Endpoints, HTTP methods, DTOs, schemas (Zod/Joi).
   - `Layer 4 (Backend)`: Routers, middleware (auth/RBAC), controllers, services.
   - `Layer 5 (Database)`: ORM models, tables, migrations, repositories.
   - `Layer 6 (Infra/External)`: Cache (Redis), queues, external APIs, workers.
3. **Incremental Cache (`.code-map/graph.json`):** Validate file hashes before trusting cached nodes. Reindex only stale nodes.
4. **Explicit Uncertainty:** Every mapped relationship must be labeled:
   - `confirmed`: Explicit import or typed call.
   - `inferred`: Naming convention or dynamic template.
   - `unknown`: Missing evidence or loose decoupling (with explicit reason).
5. **Structured Handshake:** When alteration intent is detected, generate `.code-map/handshake.json` matching `schemas/handshake.schema.json` and delegate execution to the `hybrid-orchestrator`.
