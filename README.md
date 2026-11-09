# ⚡ Enterprise AI Suite (v2.8.1)

> 🇧🇷 **[Português](#-português-pt-br)** | 🇺🇸 **[English](#-english-en)**

[![Release](https://img.shields.io/github/v/release/Henrique-All/skills?color=brightgreen&label=release)](https://github.com/Henrique-All/skills/releases)
[![CI Status](https://img.shields.io/github/actions/workflow/status/Henrique-All/skills/ci.yml?label=CI)](https://github.com/Henrique-All/skills/actions)
[![Branch Protection](https://img.shields.io/badge/master%20branch-protected-success)](https://github.com/Henrique-All/skills/settings/branches)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](package.json)

---

# 🇧🇷 Português (PT-BR)

> **Plugin Oficial, Enxame de 11 Subagentes Especialistas, 10 Skills de Alta Engenharia e Firewall de Segurança no SO.**  
> Desenvolvido para transformar agentes (**Google Antigravity**, **Claude Code**, **Cursor**, **Windsurf**, **Copilot**) em engenheiros de software seniores, eliminando alucinações, desperdício de tokens, leituras cegas em cascata e quebras em produção.

---

## 🆕 Novidades da v2.8.0 — QA Brute-Force 360°, Cartografia Cirúrgica por Linha & Auto-Blindagem (`--fix`)

| Recurso | O que resolve | Onde |
| :--- | :--- | :--- |
| **Nova Skill `audit-code-full` (`orch qa`)** | QA 360° movido por **4 Agentes em Paralelo**: percorre todo o código, executa fuzzing brute-force real em `node:vm`, audita a UI e a paleta Dual-Theme, valida se todos os botões têm ação real e gera o `.code-map/INDEX.md` completo ao final | `audit-code-full` |
| **Enxame de 4 Subagentes de QA em Paralelo** | `qa-crawler` (6 camadas), `qa-bruteforce` (fuzzing VM + AST), `qa-ui-palette` (tokens de cor & Dual-Theme) e `qa-button-action` (detecção de botões mortos/vazios) | `agents/qa-*.agent.md` |
| **Cartografia Cirúrgica com Intervalo de Linhas (`LInício-LFim`)** | O `.code-map/INDEX.md`, `graph.json` e `cartographer.js query <termo>` agora indexam o **total de linhas do arquivo (`242L`)**, o **intervalo exato de cada função/classe (`verifyToken:L42-242`)** e a **linha exata de cada rota HTTP (`GET /download/:filename:L11`)** — acabando com leituras fatiadas às cegas | `repo-cartographer` & `audit-code-full` |
| **Motor de Auto-Blindagem Defensiva (`audit --fix`)** | Corrige automaticamente em projetos locais: `jwt.verify()` sem `{ algorithms: ['HS256'] }` (inclusive com chamadas aninhadas), CORS wildcard com `credentials: true`, cookies sem `httpOnly/sameSite/secure`, fallback estático de `JWT_SECRET`, vazamento de `err.stack`, Reverse Tabnabbing (`rel="noopener noreferrer"`), CVEs e dependências `*` no `package.json`, além de blindagem do `.gitignore` | `devsecops-audit` |
| **Relatório Consolidado com Recortes Prontos (`Zero Read-File Hops`)** | Gera `.code-map/security-remediation-report.md` com tabela Antes vs. Depois e **recortes de código (`±6 linhas`, `Lstart-Lend`) prontos para edição direta**, permitindo que a IA aplique `edit_file` sem precisar abrir os arquivos antes | `devsecops-audit` |

## 📌 Destaques da v2.7.0 — Precisão Antes de Volume

| Recurso | O que resolve | Onde |
| :--- | :--- | :--- |
| **Radar de CVE ciente do lockfile** (`npm`/`pnpm`/`yarn`) | Fim do falso positivo que bloqueava o CI quando o lockfile já tinha a versão corrigida | `devsecops-audit` |
| **`--online` (OSV.dev, opt-in)** | CVEs em tempo real via OSV.dev para até 1000 pacotes do lockfile | `devsecops-audit` |
| **`--baseline` / `--update-baseline` / `--changed`** | Adoção gradual em projetos legados: só achados **novos** ou em arquivos alterados quebram o build | Todos os auditores |
| **Supressão inline com motivo** (`// audit-ignore-next-line REGRA: motivo`) | Exceções documentadas no código; sem motivo explícito a supressão é ignorada (Pilar 16 nunca é suprimível) | Todos os auditores |
| **`--sarif` em todos os auditores** | Exportação SARIF v2.1.0 nativa para a aba **Security** do GitHub | Todos os auditores |
| **Núcleo comum `shared/`** | Implementação unificada de varredura, baseline, supressão e SARIF sincronizada via `node scripts/sync-shared.js` | Monorepo |

---

## 🎛️ Ferramental CLI Master (`bin/orch.js`)

```bash
# 🕵️‍♂️ Executar o QA Brute-Force 360° (4 Agentes em Paralelo + Code-Map Final):
node bin/orch.js qa .
# ou dentro do pipeline completo: node bin/orch.js run "Auditoria completa" --qa

# 🛡️ Executar Auditoria de Segurança DevSecOps + Auto-Blindagem Defensiva (--fix):
node bin/orch.js audit . --fix

# 🗺️ Consultar função, rota ou arquivo com intervalo exato de linhas (Lstart-Lend):
node repo-cartographer/scripts/cartographer.js query verifyToken .

# 🩺 Diagnóstico determinístico de saúde do ecossistema e dos 11 subagentes:
npm run doctor

# 🧪 Executar a bateria de testes automatizados (Plugin + 11 Subagentes + 10 Skills):
npm test
```

---

## 💰 Eficiência Extrema & Leitura Cirúrgica (78% a 90% de Economia de Tokens)

1. **Cartografia com Endereçamento Exato (`função:LInício-LFim`):** Ao ler `.code-map/INDEX.md`, o agente já sabe que `verifyToken` está em `gid-api/src/middleware/verifyToken.ts` nas linhas `L42-242` e que o arquivo possui `242L`, indo direto ao alvo em **1 única leitura**.
2. **Recortes Prontos no Relatório (`Zero Read-File Hops`):** O `.code-map/security-remediation-report.md` já traz as `±6` linhas ao redor de cada vulnerabilidade pendente para aplicação direta via `edit_file`.
3. **Janelas de Contexto Efêmeras (11 Subagentes):** Leitura pesada morre na thread descartável do subagente; o chat principal recebe apenas handoffs JSON/Markdown enxutos.
4. **Motores Locais em Node.js (Custo Zero na LLM):** Cartografia AST, fuzzing em `node:vm`, auditoria de banco, Blast Radius e 18 pilares OWASP rodam localmente na CPU.

---

## 📊 As 10 Skills & Os 11 Subagentes Especialistas

### 🛠️ As 10 Skills (`10.0 / 10`)
1. **`audit-code-full`** 🆕: QA Brute-Force 360° com 4 agentes paralelos (`qa-crawler`, `qa-bruteforce`, `qa-ui-palette`, `qa-button-action`), execução real em `node:vm`, despacho IA (`.code-map/ai-agents-dispatch.json`) e sincronização final do `.code-map/INDEX.md`.
2. **`devsecops-audit`**: 18 pilares OWASP + 23 regras determinísticas de AppSec, radar de CVEs em `package.json`/lockfiles/OSV.dev, motor de **Auto-Blindagem Defensiva (`--fix`)** e relatório `.code-map/security-remediation-report.md`.
3. **`repo-cartographer`**: Cartografia 360° em 6 camadas (`UI -> Estado -> API -> Backend -> Banco -> Infra`) com indexação de símbolos por linha (`Lstart-Lend`), rotas HTTP (`:Lline`), detecção de ciclos e módulos órfãos.
4. **`hybrid-orchestrator`**: Governança fullstack com Sabatina 4Q, snapshot/rollback via `git stash`, e Falsifier adversário por função (`falsify.js`).
5. **`frontend-craftsman`**: Design Engineering anti-AI slop, física de molas (Framer Motion / GSAP), psicologia de UX (5 estados) e coerência obrigatória Dual-Theme (Light/Dark).
6. **`mobile-converter`**: Conversão mobile nativa com fluxo Master-Detail, Bottom Sheets táteis, Safe Areas, `100dvh` e touch targets `>= 44px`.
7. **`db-sentinel`**: Migrations Zero-Downtime em 3 passos, detecção de Foreign Keys sem índice, prevenção de queries N+1 e precisão monetária.
8. **`route-guard`**: Cálculo de Blast Radius reverso entre frontend e backend, prevenção de breaking changes e validação Zod/DTO.
9. **`test-forge`**: Geração e auditoria de testes de integração reais (Supertest/Vitest — 200, 400, 401, 409) e E2E mobile (Playwright).
10. **`orch`**: Maestro regente centralizado (`/orch`, `/orch --fast`, `orch qa`, `orch audit --fix`).

### 🐝 Os 11 Subagentes (`agents/`)
- **Engenharia & Arquitetura (7):** `cartographer`, `route-guard`, `ui-craftsman`, `db-sentinel`, `test-engineer`, `falsifier`, `security-auditor`.
- **Enxame Paralelo do `audit-code-full` (4):** `qa-crawler`, `qa-bruteforce`, `qa-ui-palette`, `qa-button-action`.

---

## 🚀 Instalação Rápida (PT-BR)

```bash
# Instalar em todos os agentes (Antigravity, Claude Code e Cursor Rules):
npm run install:all

# Instalar ou atualizar o Plugin Global do Antigravity (~/.gemini/config/plugins/enterprise-ai-suite):
node install.js --plugin-only --global

# Rodar validação completa (10 Skills + 11 Subagentes + QA 100/100):
npm test
```

---
---

# 🇺🇸 English (EN)

> **Official Plugin, Swarm of 11 Specialist Subagents, 10 High-Engineering Skills, and OS-Level Command Firewall.**  
> Built to turn AI coding agents (**Google Antigravity**, **Claude Code**, **Cursor**, **Windsurf**, **Copilot**) into senior software engineers — eliminating hallucinations, token waste, blind file-reading loops, and production regressions.

---

## 🆕 What's New in v2.8.0 — 360° Brute-Force QA, Surgical Line-Range Cartography & Auto-Remediation (`--fix`)

| Feature | Problem Solved | Module |
| :--- | :--- | :--- |
| **New Skill `audit-code-full` (`orch qa`)** | 360° QA powered by **4 Parallel Agents**: walks the entire codebase, runs real brute-force fuzzing inside `node:vm`, audits UI code & Dual-Theme color palettes, verifies every button has a real action, and syncs `.code-map/INDEX.md` | `audit-code-full` |
| **4 Parallel QA Subagents** | `qa-crawler` (6 layers), `qa-bruteforce` (VM fuzzing + AST), `qa-ui-palette` (color tokens & Light/Dark coherence), and `qa-button-action` (dead/noop button detection) | `agents/qa-*.agent.md` |
| **Surgical Line-Range Cartography (`LStart-LEnd`)** | `.code-map/INDEX.md`, `graph.json`, and `cartographer.js query <term>` now index **total file lines (`242L`)**, **exact function/class line ranges (`verifyToken:L42-242`)**, and **exact HTTP route lines (`GET /download/:filename:L11`)** — eliminating blind multi-hop file slicing | `repo-cartographer` & `audit-code-full` |
| **Defensive Auto-Remediation Engine (`audit --fix`)** | Automatically patches local projects: adds `{ algorithms: ['HS256'] }` to `jwt.verify()` (including nested call arguments), fixes wildcard CORS with `credentials: true`, adds `httpOnly/sameSite/secure` cookie flags, removes static `JWT_SECRET` fallbacks, replaces `err.stack` leaks, adds `rel="noopener noreferrer"`, pins `*` dependencies, upgrades vulnerable `package.json` ranges, and hardens `.gitignore` | `devsecops-audit` |
| **Zero Read-File Hop Remediation Report** | Generates `.code-map/security-remediation-report.md` with Before/After tables plus **ready-to-edit code context snippets (`±6 lines`, `Lstart-Lend`)** so the AI can call `edit_file` directly without extra `read_file` round-trips | `devsecops-audit` |

## 📌 Highlights from v2.7.0 — Precision Before Volume

| Feature | Problem Solved | Module |
| :--- | :--- | :--- |
| **Lockfile-Aware CVE Radar** (`npm`/`pnpm`/`yarn`) | Eliminates false positives when `package-lock.json` / `pnpm-lock.yaml` / `yarn.lock` already resolves a patched version | `devsecops-audit` |
| **`--online` (OSV.dev, opt-in)** | Real-time CVE lookup via OSV.dev for up to 1,000 lockfile packages | `devsecops-audit` |
| **`--baseline` / `--update-baseline` / `--changed`** | Seamless adoption in legacy repositories: only **new** findings or modified files fail CI | All auditors |
| **Documented Inline Suppression** (`// audit-ignore-next-line RULE: reason`) | Auditable exceptions in code; suppressions without a reason are ignored (Pillar 16 secrets can never be suppressed) | All auditors |
| **`--sarif` Across All Auditors** | Native SARIF v2.1.0 export for GitHub **Security / Code Scanning** | All auditors |
| **Unified `shared/` Core** | Single source of truth for scanning, baselines, inline suppressions, and SARIF synced via `node scripts/sync-shared.js` | Monorepo |

---

## 🎛️ Master CLI Toolkit (`bin/orch.js`)

```bash
# 🕵️‍♂️ Run 360° Brute-Force QA (4 Parallel Agents + Final Code-Map):
node bin/orch.js qa .
# or inside the orchestrator pipeline: node bin/orch.js run "Full audit" --qa

# 🛡️ Run DevSecOps Security Audit + Automated Defensive Remediation (--fix):
node bin/orch.js audit . --fix

# 🗺️ Query any function, route, or file with exact line ranges (Lstart-Lend):
node repo-cartographer/scripts/cartographer.js query verifyToken .

# 🩺 Run deterministic health diagnostics across the suite and 11 subagents:
npm run doctor

# 🧪 Run the full automated test suite (Plugin + 11 Subagents + 10 Skills):
npm test
```

---

## 📊 The 10 Skills & 11 Specialist Subagents

### 🛠️ The 10 Skills (`10.0 / 10`)
1. **`audit-code-full`** 🆕: 360° Brute-Force QA with 4 parallel agents (`qa-crawler`, `qa-bruteforce`, `qa-ui-palette`, `qa-button-action`), real `node:vm` execution, AI subagent dispatch manifest (`.code-map/ai-agents-dispatch.json`), and `.code-map/INDEX.md` generation.
2. **`devsecops-audit`**: 18 OWASP pillars + 23 deterministic AppSec rules, Supply Chain CVE radar (`package.json` + lockfiles + OSV.dev), **Defensive Auto-Remediation (`--fix`)**, and `.code-map/security-remediation-report.md`.
3. **`repo-cartographer`**: 6-layer architectural cartography (`UI -> State -> API -> Backend -> Database -> Infra`) with symbol line-range indexing (`Lstart-Lend`), HTTP route line indexing (`:Lline`), cycle detection, and dead-code orphan analysis.
4. **`hybrid-orchestrator`**: Fullstack governance with 4-Quadrant interview, atomic `git stash` snapshots/rollbacks, and per-function adversarial Falsifier (`falsify.js`).
5. **`frontend-craftsman`**: Anti-AI-slop Design Engineering, 120fps spring physics (Framer Motion / GSAP), 5-state UX psychology, and strict Dual-Theme (Light/Dark) contrast coherence.
6. **`mobile-converter`**: Native-grade mobile adaptation with Master-Detail flows, swipeable Bottom Sheets, Safe Areas, `100dvh`, and `>= 44px` touch targets.
7. **`db-sentinel`**: 3-step Zero-Downtime migrations, unindexed Foreign Key detection, N+1 query prevention, and monetary precision checks.
8. **`route-guard`**: Reverse Blast Radius analysis across frontend and backend, breaking-change prevention, and Zod/DTO contract generation.
9. **`test-forge`**: Anti-Mock-Slop real API integration tests (Supertest/Vitest — 200, 400, 401, 409) and mobile E2E Playwright suites.
10. **`orch`**: Master ecosystem conductor (`/orch`, `/orch --fast`, `orch qa`, `orch audit --fix`).

### 🐝 The 11 Specialist Subagents (`agents/`)
- **Core Architecture & Engineering (7):** `cartographer`, `route-guard`, `ui-craftsman`, `db-sentinel`, `test-engineer`, `falsifier`, `security-auditor`.
- **Parallel `audit-code-full` QA Swarm (4):** `qa-crawler`, `qa-bruteforce`, `qa-ui-palette`, `qa-button-action`.

---

## 🚀 Quick Installation (EN)

```bash
# Install across all supported agents (Antigravity, Claude Code, and Cursor Rules):
npm run install:all

# Install or update the Global Antigravity Plugin (~/.gemini/config/plugins/enterprise-ai-suite):
node install.js --plugin-only --global

# Run full integrity & regression test suite (10 Skills + 11 Subagents + QA 100/100):
npm test
```

---

## 🏗️ Repository Structure / Estrutura do Repositório

```
enterprise-ai-suite/
├── plugin.json               # Official Antigravity Plugin Manifest (v2.8.0)
├── hooks.json                # OS-level PreToolUse & PostToolUse lifecycle hooks
├── bin/
│   └── orch.js               # Master CLI (run, qa, audit, doctor, init, switch, test)
├── agents/                   # 🤖 11 Specialist Subagents (7 Core + 4 Parallel QA Agents)
├── shared/                   # Unified scanner, baseline, suppression, SARIF & UI style blocks
├── audit-code-full/          # 🕵️‍♂️ 360° Brute-Force QA (4 Parallel Agents + VM Fuzzing + Code-Map)
├── devsecops-audit/          # 🔒 18 OWASP Pillars + 23 AppSec Rules + Auto-Fix (--fix)
├── repo-cartographer/        # 🗺️ 6-Layer AST Cartography with Symbol Line Ranges (Lstart-Lend)
├── hybrid-orchestrator/      # ⚡ Fullstack Governance, Snapshots & Adversarial Falsifier
├── frontend-craftsman/       # 🎨 Anti-AI-Slop Design Engineering & Dual-Theme Coherence
├── mobile-converter/         # 📱 Native Mobile Ergonomics, Bottom Sheets & 44px+ Targets
├── db-sentinel/              # 🗄️ Zero-Downtime Migrations, FK Indexes & Anti-N+1
├── route-guard/              # 🛡️ API Contract Guard, Reverse Blast Radius & Mock Server
├── test-forge/               # 🧪 Real API Integration & Mobile Playwright E2E Tests
├── orch/                     # ⭐ Master Shortcut Skill (/orch, /orch --fast, orch qa)
├── scripts/                  # doctor.js, init.js, sync-shared.js, test-all.js, hooks/
└── README.md                 # Bilingual Documentation (PT-BR & EN)
```

---

## 📜 License / Licença
MIT License — Created by **[Henrique Alves](https://github.com/Henrique-All)**.
