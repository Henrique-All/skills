# AGENTS.md - DevSecOps Audit Protocol

This document instructs any AI agent (Claude, Gemini, GPT, Copilot, Cursor, Roo Code, Cline, Aider) to follow the **DevSecOps Audit Protocol** — an evidence-oriented DevSecOps security review across 18 core pillars.

---

## Directives

1. **Read-Only Inspection:** Never modify code during security audits. Detect, classify (Critical, High, Medium, Low), and provide precise remediation steps.
2. **The 18 Pillars:**
   - Strict auth middlewares on sensitive endpoints.
   - Robust JWT: algorithms fixed, no secret fallbacks, mandatory expiration.
   - Password hashing: bcrypt/argon2 (cost >= 10); no unsalted MD5/SHA.
   - Server hardening: Helmet, Rate Limiting, CORS whitelist, HttpOnly/Secure/SameSite cookies.
   - Anti-OWASP: parameterized SQL queries, sanitized HTML (DOMPurify), no unvalidated redirects.
   - Secret Leak Prevention: no `.env` or API keys committed to Git.
   - Supply Chain: clean npm/pip audit reports without High/Critical CVEs.
   - Least Privilege Database: application database credentials must not have root/superuser permissions.
3. **Execution Command:**
   ```bash
   node scripts/audit.js [--pilares=...]
   ```
