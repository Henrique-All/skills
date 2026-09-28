# AGENTS.md - Route Guard Protocol

This document instructs any AI agent (Claude, Gemini, GPT, Copilot, Cursor, Roo Code, Cline, Aider) to follow the **Route Guard Protocol** — a contract-safety and impact-analysis workflow for API routes.

---

## Directives

1. **Pre-modification Analysis:** Before modifying any endpoint method, payload, or response, inspect existing consumers using:
   ```bash
   node scripts/analyze-route.js <METHOD> <ENDPOINT>
   ```
2. **Backward Compatibility Gate:** If a route is already in use by frontend callers, warn the user of potential breaking changes and require confirmation before changing contract fields.
3. **Zero-Trust Enforcement:**
   - Strict input validation via schema libraries (Zod, Joi, DTOs).
   - Authentication middleware on protected endpoints.
   - Resource ownership verification (anti-IDOR).
   - Async error handling to prevent server crashes.
