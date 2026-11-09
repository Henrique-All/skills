# ⚡ Enterprise AI Suite (v2.8.1)

> **Plugin Oficial, Enxame de 11 Subagentes Especialistas, 10 Skills de Engenharia e Firewall de Segurança no SO.**  
> Desenvolvido para apoiar agentes de IA (**Google Antigravity**, **Claude Code**, **Cursor**, **Windsurf**, **Copilot**) com engenharia de software determinística — reduzindo alucinações de caminho e contrato por meio de evidências estáticas, isolamento de contexto e travas de ciclo de vida.

[![Release](https://img.shields.io/github/v/release/Henrique-All/skills?color=brightgreen&label=release)](https://github.com/Henrique-All/skills/releases)
[![CI Status](https://github.com/Henrique-All/skills/actions/workflows/ci.yml/badge.svg)](https://github.com/Henrique-All/skills/actions)
[![Branch Protection](https://img.shields.io/badge/master%20branch-protected-success)](https://github.com/Henrique-All/skills/settings/branches)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](package.json)

---

## 🆕 Novidades da v2.8.1 — Audit-Code-Full (QA Brute-Force 360° com 4 Agentes Paralelos)

| Recurso | O que resolve | Onde |
| :--- | :--- | :--- |
| **Nova Skill `audit-code-full` (`orch qa`)** | QA 360° que percorre todo o código, executa fuzzing brute-force isolado em subprocesso `node:vm`, valida paleta de cores UI, testa se todos os botões têm ação real e gera o `.code-map/INDEX.md` completo ao final | `audit-code-full` |
| **Enxame de 4 Subagentes de QA em Paralelo** | `qa-crawler` (6 camadas), `qa-bruteforce` (fuzzing VM + AST), `qa-ui-palette` (tokens de cor & Dual-Theme) e `qa-button-action` (detecção de botões mortos/vazios) | `agents/qa-*.agent.md` |
| **Despacho Híbrido para Subagentes de IA** | Gera `.code-map/ai-agents-dispatch.json` com o código já estruturado para revisão semântica paralela pelos 4 agentes de IA | `audit-code-full` |

## 📦 Recursos Consolidados — Precisão Antes de Volume

| Recurso | O que resolve | Onde |
| :--- | :--- | :--- |
| **Radar de CVE ciente do lockfile** (`npm`/`pnpm`/`yarn`) | Fim do falso positivo que bloqueava o CI quando o lockfile já tinha a versão corrigida | `devsecops-audit` |
| **`--online` (OSV.dev, opt-in)** | CVEs do OSV.dev para até 1000 pacotes do lockfile, sem tabela desatualizada (severidade detalhada de até 40 vulnerabilidades; as demais como MEDIUM) | `devsecops-audit` |
| **`--baseline` / `--update-baseline`** | Adoção em projetos legados: só achados **novos** quebram o build | Todos os auditores |
| **`--changed`** | Mostra só achados de arquivos alterados ou não rastreados no git (a varredura continua completa) | Todos os auditores |
| **Supressão inline com motivo** (`// audit-ignore-next-line REGRA: motivo`) | Exceções documentadas no código, sem motivo = ignorada | Todos os auditores |
| **`--sarif` em todos os auditores** | Achados na aba **Security** do GitHub (job `security-sarif` no CI) | Todos os auditores |
| **Falsifier por função** | Vetores 2 e 4 avaliam cada rota/função isoladamente (arrow com tipo de retorno e assinaturas em várias linhas ainda caem no bloco vizinho) | `hybrid-orchestrator` |
| **Cartografia incremental + mapa parcial visível** | Reaproveita nós não modificados, limites maiores e aviso quando o mapa está incompleto | `repo-cartographer` |
| **Núcleo comum `shared/`** | Uma única implementação de varredura, baseline, supressão e SARIF, copiada para cada skill via `scripts/sync-shared.js` | Monorepo |
| **SKILL.md enxutos** (`references/` sob demanda) | `hybrid-orchestrator` 28→10 KB, `frontend-craftsman` 20→7 KB de contexto por ativação | Skills |

> Ao editar arquivos em `shared/`, rode `node scripts/sync-shared.js`. O `npm test` falha se alguma cópia ou versão divergir.

## 📌 Referências & Navegação Rápida

- 🚀 [**Instalação Rápida**](#-como-instalar-e-usar) — Antigravity, Claude Code, Cursor e Monorepo
- 🎛️ [**Ferramental CLI (Doctor & Init)**](#%EF%B8%8F-ferramental-cli-master) — `orch doctor`, `orch init`, `orch switch`, `orch qa`
- 💰 [**Economia de Tokens (Estimativa Teórica & Benchmark Real)**](#-efici%C3%AAncia-de-contexto--economia-de-tokens) — Simulação teórica de 9 turnos + benchmark reproduzível
- 🤖 [**Como Usar no Chat**](#-como-acionar-no-chat-com-seu-agente-de-ia) — Slash commands (`/`) e regras (`@`)
- ⚖️ [**Execução Individual vs. /orch**](#%EF%B8%8F-execu%C3%A7%C3%A3o-individual-vs-comando-mestre-orch-qual-a-diferen%C3%A7a) — Matriz comparativa de decisão
- 📊 [**Matriz de Capacidades das 10 Skills**](#-matriz-de-capacidades-das-10-skills) — Visão geral das 10 skills
- 🐝 [**Enxame de 11 Subagentes Especialistas**](#-enxame-de-11-subagentes-especialistas-agents) — Isolamento de contexto
- 🛑 [**Firewall de Segurança no SO (Hooks)**](#-firewall-de-seguran%C3%A7a-no-so-hooksjson) — Proteção no nível do SO
- 🔍 [**Detalhamento Completo das 10 Skills**](#-detalhamento-das-10-skills-e-comandos-cli)
- 🤝 [**Contribuições & Governança**](#-contribui%C3%A7%C3%B5es--governan%C3%A7a) — CI multi-versão e proteção de branch
- 🏗️ [**Estrutura do Repositório**](#%EF%B8%8F-estrutura-do-reposit%C3%B3rio)

---

## 🎛️ Ferramental CLI Master

O Enterprise AI Suite conta com utilitários CLI determinísticos para máxima produtividade:

```bash
# 🩺 Diagnóstico determinístico de saúde do ecossistema e subagentes:
npm run doctor
# ou via CLI: node bin/orch.js doctor

# ⚙️ Autoconfigurar qualquer projeto detectando a stack técnica (Next, Vite, Prisma, Express):
npm run init:suite
# ou via CLI: node bin/orch.js init

# 🕵️‍♂️ Executar QA Brute-Force 360° com 4 Agentes Paralelos:
node bin/orch.js qa .

# 📊 Executar benchmark reproduzível de economia de tokens no repositório:
npm run benchmark:tokens

# 🔄 Trocar de versão ou release do GitHub sem precisar clonar via git:
npm run switch
# ou via CLI: node bin/orch.js switch v2.2.0-beta.1

# 🧪 Executar a bateria de testes automatizados do ecossistema:
npm test
# ou via CLI: node bin/orch.js test
```

---

## 💰 Eficiência de Contexto & Economia de Tokens

> **Engenharia de Contexto Efêmero:** Como a v2.8.1 reduz o consumo de tokens enviados ao contexto principal da LLM por meio de indexação cartográfica local e subagentes descartáveis.

### 🧪 Benchmark Reproduzível no Próprio Repositório (`npm run benchmark:tokens`)

Você pode medir localmente a diferença real de bytes e tokens (aproximação BPE: `1 token ≈ 4 bytes UTF-8`) entre a leitura bruta dos arquivos-fonte/documentação deste repositório e o fluxo com `.code-map/INDEX.md` + saídas `--compact` dos motores CLI:

```bash
npm run benchmark:tokens
# ou: node scripts/benchmark-tokens.js --json
```

| Métrica Medida Localmente (`scripts/benchmark-tokens.js`) | Leitura Bruta Tradicional (Código + `SKILL.md`) | Fluxo Cartografia (`INDEX.md` + CLI `--compact`) | Redução Medida |
| :--- | :---: | :---: | :---: |
| **Volume de contexto carregado** | ~1,17 MB (~293.700 tokens) | ~18,7 KB (~4.670 tokens) | **~98,4% de redução na leitura inicial** |

### 📊 Estimativa Teórica: Cenário Hipotético de Demanda Fullstack (9 Turnos)

> **Nota de Transparência:** A tabela abaixo é uma **estimativa teórica de um cenário hipotético** de 9 turnos conversacionais (*criação de uma feature com banco Prisma, rotas de API, UI, adaptação mobile, testes e auditoria*). Os valores ilustram o efeito matemático do acúmulo de histórico mono-thread vs. delegação a subagentes efêmeros (78% a 85% de economia estimada no acumulado da sessão):

| Etapa do Desenvolvimento (Cenário Hipotético) | ❌ Modelo Mono-thread (Estimado)<br/>*Histórico Acumulado Reenviado na API* | ✅ Com Subagentes + Scripts Locais (Estimado)<br/>*Contexto Principal Enxuto* |
| :--- | :---: | :---: |
| **Turno 1: Cartografia do Repo** | 40.000 tokens lidos no chat principal | **500 tokens** *(cartógrafo rodou em thread limpa)* |
| **Turno 2: Banco & Migrations (`db-sentinel`)** | 45.000 tokens *(acumulou 40k + 5k)* | **1.500 tokens** *(banco validado em thread isolada)* |
| **Turno 3: Contratos de Rota (`route-guard`)** | 50.000 tokens *(acumulando)* | **2.800 tokens** *(recebeu só o Zod/DTO de 300t)* |
| **Turno 4: UI & Molas (`frontend-craftsman`)** | 60.000 tokens *(acumulando)* | **4.500 tokens** *(UI feita em subagente)* |
| **Turno 5: Mobile & Ergonomia (`mobile-converter`)** | 70.000 tokens *(acumulando)* | **6.500 tokens** *(cards/bottom sheet isolados)* |
| **Turno 6: Implementação de Código (Builder)** | 85.000 tokens *(acumulando)* | **9.000 tokens** *(diffs atômicos focados)* |
| **Turno 7: Criação de Testes (`test-forge`)** | 100.000 tokens *(acumulando)* | **11.500 tokens** *(testes gerados em subagente)* |
| **Turno 8: Auditoria DevSecOps (`devsecops-audit`)** | 115.000 tokens *(acumulando)* | **13.500 tokens** *(auditoria rodou em subagente)* |
| **Turno 9: Validação e Entrega** | 125.000 tokens *(acumulando)* | **15.000 tokens** |
| ➕ **Subagentes descartáveis** *(leitura pesada)* | *Não possui (tudo roda no chat)* | **+ 85.000 tokens** *(rodaram 1x e foram encerrados)* |
| **🔥 TOTAL ESTIMADO NA SESSÃO** | **~690.000 tokens** | **~149.000 tokens (~78,4% de redução teórica)** |

### 🛡️ Os 4 Pilares da Redução:
1. **Mitigação do Efeito "Bola de Neve" (Janelas Efêmeras):** Arquivos brutos lidos permanecem na thread descartável do subagente; o chat principal recebe resumos JSON estruturados de 300 a 500 tokens.
2. **Scripts Locais em Node.js (Custo Zero na LLM):** Cartografia AST (`cartographer.js`), auditoria de banco (`db-audit.js`), Blast Radius (`analyze-route.js`), QA 360° (`audit-full.js`) e 18 pilares OWASP (`audit.js`) rodam na CPU local.
3. **Handoffs Tipados Ultracompactos (JSON Puro):** Comunicação inter-agentes em schemas condensados evitando conversas prolixas.
4. **Escape Cirúrgico com `/orch --fast`:** Rota A direta sem subagentes para tarefas pontuais (< 3.000 tokens do início ao fim).

---

## 🤖 Como Acionar no Chat com seu Agente de IA

Você pode acionar as ferramentas tanto por **linguagem natural** quanto diretamente por **Slash Commands (`/`)** no Antigravity e Claude Code, ou via **Regras Contextuais (`@`)** no Cursor e Windsurf:

| Slash Command / Atalho | Especialidade | Exemplo de Uso no Chat |
| :--- | :--- | :--- |
| **`/orch`** ⭐ | **Comando Geral Mestre:** Orquestração completa das 10 skills | `/orch Implemente o checkout com Pix, Prisma e adaptação mobile` |
| **`/orch --fast`** ⚡ | **Execução Cirúrgica Direta:** Rota A sem travas e com diffs atômicos | `/orch --fast Corrija a tipagem de retorno do controller de tickets` |
| **`/audit-code-full`** (`orch qa`) 🆕 | **QA Brute-Force 360°:** 4 agentes paralelos (crawler, VM fuzzing, UI palette, botões) + `.code-map/INDEX.md` | `/audit-code-full Execute a varredura QA 360° no projeto` |
| **`/frontend-craftsman`** | Design Engineering sem cara de IA (Framer Motion / Tailwind v4) | `/frontend-craftsman Crie a tela de faturamento com paleta Linear` |
| **`/mobile-converter`** | Converter tela desktop para mobile nativo (Bottom Sheets / 44px+) | `/mobile-converter Adapte a tabela de pedidos para cards no mobile` |
| **`/db-sentinel`** | Banco de Dados, Migrations Seguras e Índices Faltantes | `/db-sentinel Valide a migration e gere o seed tipado do Prisma` |
| **`/test-forge`** | Testes de Integração de API Reais e E2E Playwright | `/test-forge Crie os testes de integração para POST /api/orders` |
| **`/repo-cartographer`** | Mapear arquitetura e fluxo 360° em 6 camadas | `/repo-cartographer Mapeie o fluxo da tela de Checkout até o banco` |
| **`/route-guard`** | Prevenir quebras de contrato de API e Blast Radius | `/route-guard Analise o impacto de alterar a rota em api/routes` |
| **`/devsecops-audit`** | Auditoria DevSecOps completa dos 18 pilares OWASP | `/devsecops-audit Execute a auditoria de segurança pré-deploy` |
| **`/hybrid-orchestrator`** | Desenvolver feature com governança rígida e Falsifier | `/hybrid-orchestrator Implemente a regra de frete com rollback seguro` |

---

## ⚖️ Execução Individual vs. Comando Mestre `/orch`: Qual a Diferença?

O **Enterprise AI Suite** possui arquitetura de **dupla camada de acionamento**:

| Critério de Comparação | 🎯 Execução Individual (Skills Isoladas)<br/>*(ex: `/frontend-craftsman`, `/db-sentinel`)* | 🚀 Comando Mestre `/orch` (Teamwork & Swarm)<br/>*(Governança Total do Ecossistema)* |
| :--- | :--- | :--- |
| **Comando / Gatilho** | `/frontend-craftsman`, `/mobile-converter`, `/db-sentinel`, `/test-forge`, `/audit-code-full`, etc. | `/orch <demanda>`, `/orch --fast <demanda>` ou `orch qa` |
| **Escopo de Ação** | **Laser-Focused:** Atua estritamente no domínio de conhecimento daquela skill. | **Holístico & Multi-Camadas:** Orquestra compulsoriamente as disciplinas de ponta a ponta. |
| **Quem Conecta as Etapas?** | **O Desenvolvedor:** Você decide manualmente quando mapear, desenhar, testar e auditar. | **O Orchestrator (Lead):** Conecta as etapas e repassa artefatos automaticamente. |
| **Consumo de Contexto** | Ultrabaixo (< 2.000 tokens na sessão principal). Ideal para tarefas atômicas. | Otimizado via subagentes efêmeros e scripts locais `--compact`. |
| **Troca de Informações** | Manual (o usuário copia saídas de um comando para o outro). | **Automática via Handshakes:** `.code-map/handshake.json`, `DESIGN_SPEC.md` e SARIF. |
| **Trava & Sabatina (4Q)** | Não possui (vai direto ao ponto daquela skill). | **Ativa no Turno 1 (Rota B):** Sabatina 4Q e Trava rígida anti-drift antes de editar arquivos. |
| **Ciclo Adversário (Falsifier)** | Não roda (a menos que no hybrid). | **Obrigatório:** O subagente Falsifier ataca a solução com estresse de 5 vetores. |
| **Verificação Pós-Código** | Apenas as ferramentas daquela skill. | **Pipeline Integrado:** `craft-audit`, `mobile-audit`, `db-audit`, `devsecops-audit` e `audit-full`. |
| **Opção de Bypass Cirúrgico** | Já é naturalmente direto. | Possui a flag **`/orch --fast`** (aplica Rota A sem travas e com velocidade máxima). |

---

## 📊 Matriz de Capacidades das 10 Skills

| Skill | Cobertura / Verificação | Foco Principal | Maior Diferencial Prático |
| :--- | :---: | :--- | :--- |
| **[`hybrid-orchestrator`](#1--hybrid-orchestrator)** | **5 Vetores + Rollback** | **Governança & Execução Cirúrgica** | Trava de Permissão em 2 Turnos anti-drift + Snapshot git stash + Falsifier adversário com estresse (`falsify.js`). |
| **[`frontend-craftsman`](#2--frontend-craftsman)** | **UX + Dual-Theme** | **Design Engineering & Anti-AI Slop** | Previne vícios visuais genéricos, molas Framer Motion, preview visual instantâneo HTML, Tailwind v4 (@theme) e `craft-audit.js`. |
| **[`mobile-converter`](#3--mobile-converter)** | **Score 0–100 + Autofix** | **Adaptação Mobile de Alta Fidelidade** | Metamorfose Tabela ➔ Cards, Bottom Sheets com swipe `drag="y"`, Bottom Nav, simulador interativo e `mobile-audit.js --fix`. |
| **[`db-sentinel`](#4--db-sentinel)** | **Zero-Downtime + FK** | **Banco de Dados & Migrations Seguras** | Zero-Downtime em 3 passos, detecção de Foreign Keys sem índice, anti-N+1, gerador de seeds tipados e `db-audit.js`. |
| **[`test-forge`](#5--test-forge)** | **4 Cenários API + E2E** | **QA & Testes Reais (Anti-Mock Slop)** | Testes de integração de API em 4 cenários (Supertest/Vitest), Playwright E2E em viewport mobile e `test-audit.js`. |
| **[`devsecops-audit`](#6--devsecops-audit)** | **13 Regras + 18 Pilares** | **DevSecOps & Red Team Engine** | 13 regras de análise ofensiva determinística (BOLA, MFA bypass, mass assignment, webhooks HMAC, SSRF, SVG XSS), 18 pilares OWASP, SARIF v2.1.0 e `--fix` com backup. |
| **[`repo-cartographer`](#7--repo-cartographer)** | **6 Camadas + AST** | **Cartografia 360° & Context IR** | Varredura de UI até Banco em 6 camadas, resolução de aliases (`@/`), diagramas Mermaid dinâmicos e canvas web. |
| **[`route-guard`](#8--route-guard)** | **Blast Radius + Zod** | **Contratos de Rotas & Zero-Trust** | Blast Radius reverso no front, trava de retrocompatibilidade, gerador Zod/DTO e Mock Server HTTP com CORS. |
| **[`orch`](#9--orch)** | **CLI Unificada** | **Maestro Regente do Ecossistema** | Acionamento centralizado de todas as 10 skills, Rota A rápida (`--fast`), Rota B com governança e `orch qa`. |
| **[`audit-code-full`](#10--audit-code-full)** 🆕 | **4 Agentes QA + VM** | **QA Brute-Force 360° & Code-Map** | Varredura com 4 workers paralelos (`qa-crawler`, `qa-bruteforce`, `qa-ui-palette`, `qa-button-action`), fuzzing isolado e geração de `.code-map/INDEX.md`. |

---

## 🐝 Enxame de 11 Subagentes Especialistas (`agents/`)

Os subagentes operam em **janelas de contexto limpas e descartáveis**, permitindo análises profundas sem sobrecarregar o chat principal:

### Subagentes de Arquitetura, Engenharia e Segurança (7)
1. **`cartographer.agent.md`**: Exploração arquitetural 360° em modo *Read-Only*, gerando handoffs estruturados e reduzindo a leitura bruta inicial.
2. **`route-guard.agent.md`**: Análise de contratos de rotas, cálculo de Blast Radius e geração de schemas Zod/DTO.
3. **`ui-craftsman.agent.md`**: Design Engineering anti-slop, molas do Framer Motion e ergonomia mobile (Bottom Sheets, 44px+).
4. **`db-sentinel.agent.md`**: Arquiteto relacional que valida schemas Prisma/Drizzle e impede migrations destrutivas.
5. **`test-engineer.agent.md`**: Engenheiro de QA que cria testes de integração de API e E2E Playwright reais.
6. **`falsifier.agent.md`**: Red Teamer adversário que ataca o plano na fase pré-código com 5 vetores de estresse.
7. **`security-auditor.agent.md`**: Portão DevSecOps dos 18 pilares OWASP e Red Team Engine (13 regras determinísticas de lógica de negócio) com exportação SARIF.

### Subagentes de QA Brute-Force 360° (4)
8. **`qa-crawler.agent.md`**: Mapeador de completude estrutural nas 6 camadas arquiteturais, rotas e detecção de arquivos órfãos ou código morto.
9. **`qa-bruteforce.agent.md`**: Agente de teste de estresse que combina resultados de fuzzing em subprocesso `node:vm` com inspeção de resiliência e tratamento de erros.
10. **`qa-ui-palette.agent.md`**: Auditor de coerência de paleta de cores, tokens de Design System, contraste WCAG AA e paridade Dual-Theme (Light/Dark).
11. **`qa-button-action.agent.md`**: Auditor de interatividade que rastreia elementos `<button>` e gatilhos de UI para detectar botões sem handler ou com callbacks vazios.

---

## 🛑 Firewall de Segurança no SO (`hooks.json`)

O monorepo conta com firewall determinístico de comandos no SO (`pre-command-guard.js`) que intercepta comandos de terminal antes de executar (`PreToolUse`) e bloqueia operações destrutivas (`DROP TABLE`, `rm -rf /`, `rm -fr ./*`, `Remove-Item -Recurse -Force`, `git push --force`, `prisma migrate reset --force`). A suite opera em modo desburocratizado com zero intromissão ou ruído no chat.

---

## 🔍 Detalhamento das 10 Skills e Comandos CLI

### 1. ⚡ `hybrid-orchestrator`
- Snapshot atômico com `git stash create` e rollback instantâneo (`node scripts/snapshot.js rollback`);
- Falsifier adversário com estresse automatizado em 5 vetores (`node scripts/falsify.js`);
- Painel dos 4 Quadrantes no terminal e navegador (`preview-plan.js`).

### 2. 🎨 `frontend-craftsman`
- Prevenção de AI Slop (proibição de gradientes roxos genéricos e blur desregulado);
- Molas táteis Framer Motion (`stiffness: 450, damping: 30`) e abas com `layoutId`;
- Preview visual instantâneo em 1s (`node scripts/preview-spec.js`);
- Auditoria determinística de interface (`node scripts/craft-audit.js`).

### 3. 📱 `mobile-converter`
- Metamorfose de tabelas largas em cards verticais (`ResponsiveTableToCards.tsx`);
- Modais transformados em gavetas deslizantes com gesto de arrasto (`BottomSheet.tsx`);
- Touch targets obrigatórios de 44x44px e viewport dinâmico `100dvh`;
- Simulador de iPhone 15 Pro no navegador (`node scripts/preview-mobile.js`) e auditoria com Autofix seguro (`mobile-audit.js --fix` / `--dry-run`).

### 4. 🗄️ `db-sentinel`
- Zero-Downtime migrations em 3 passos para adições de colunas e renomeações;
- Auditoria de schemas Prisma, Drizzle e SQL (`node scripts/db-audit.js`);
- Detecção automática de chaves estrangeiras (`@relation`) sem índice (`@@index`);
- Gerador de seeds sintéticos e tipados com coerência relacional (`node scripts/generate-seed.js`).

### 5. 🧪 `test-forge`
- Prevenção do "Mock Fantasma" e testes com asserções cosméticas;
- Gerador de testes de integração de rota em 4 cenários (`node scripts/forge-api-test.js POST /api/orders`);
- Gerador E2E Playwright cobrindo Desktop e Mobile iPhone 15 Pro (`node scripts/forge-e2e.js /checkout`);
- Auditor de robustez de testes e cálculo do Test Quality Score (`node scripts/test-audit.js test/`).

### 6. 🔒 `devsecops-audit`
- Motor de Segurança Ofensiva & Red Team com 13 regras determinísticas de lógica de negócio:
  - 🔑 `RULE_AUTH_HARDCODED_MASTER_PASSWORDS` (CRITICAL): Senhas mestres, plain-text e partial auth (`LIKE '%...%'`);
  - 🛡️ `RULE_AUTH_MFA_UNIVERSAL_BYPASS` (CRITICAL): Bypasses de segundo fator estáticos;
  - 🎯 `RULE_BOLA_IDOR_MISSING_OWNERSHIP_CHECK` (HIGH): Endpoints `:id` sem filtro de posse do usuário (`req.user.id`);
  - 📦 `RULE_MASS_ASSIGNMENT_UNSANITIZED_BODY` (HIGH): Mutações diretas com `req.body` sem whitelist Zod;
  - 🚨 `RULE_AUTH_INFO_DISCLOSURE_IN_ERRORS` (MEDIUM): Dicas de senha e enumeração de e-mails corporativos;
  - 🔗 `RULE_WEBHOOK_MISSING_HMAC_SIGNATURE` (HIGH): Webhooks sem validação HMAC (`crypto.createHmac`);
  - 🔌 `RULE_WEBSOCKET_UNAUTHENTICATED_ROOMS` (HIGH): Inscrição em salas Socket.IO e presença com `userId` de cliente;
  - 🌐 `RULE_SSRF_UNVALIDATED_MEDIA_DOWNLOAD` (HIGH): Fetches externos sem bloqueio de redes privadas/locais;
  - ⏱️ `RULE_TIMING_ATTACK_STRING_COMPARE` (MEDIUM): Operador `===` em segredos em vez de `crypto.timingSafeEqual()`;
  - 🖼️ `RULE_STORED_XSS_UNSANITIZED_SVG_UPLOAD` (HIGH): Uploads SVG sem sanitização de `<script>` nem header attachment;
  - 📁 `RULE_UNPROTECTED_FILE_DOWNLOAD_ROUTE` (HIGH): Download de arquivos sem middleware de autenticação;
  - 🗝️ `RULE_JWT_MISSING_ALGORITHM_OPTION` (MEDIUM): `jwt.verify()` sem opção explícita `{ algorithms: ['HS256'] }`;
  - 🖥️ `RULE_TAURI_IPC_UNRESTRICTED_CSP` (HIGH): Tauri desktop combinando CSP nula com comandos de shell ativos;
- Auditoria estritamente somente-leitura por padrão dos 18 pilares OWASP e DevSecOps (`node devsecops-audit/scripts/audit.js`);
- Autofix de links vulneráveis e cookies com suporte a `--dry-run` e backup `.bak` automático (`node devsecops-audit/scripts/audit.js --fix`);
- Exportação SARIF v2.1.0 para GitHub Code Scanning (`--sarif`) e JSON estruturado (`--json`);
- Git hook pre-commit bloqueante (`node devsecops-audit/scripts/install-hook.js`);
- Coexistência limpa com ferramentas terceiras (resolvido conflito de rota com Cloudflare).

### 7. 🗺️ `repo-cartographer`
- Rastreamento determinístico em 6 camadas (`node scripts/cartographer.js trace`);
- Diagramas Mermaid dinâmicos prontos para PRs (`node scripts/cartographer.js mermaid`);
- Análise de Blast Radius reverso (`node scripts/cartographer.js callers`);
- Canvas web interativo com nós arrastáveis (`node scripts/preview-graph.js`).

### 8. 🛡️ `route-guard`
- Identificação de consumidores HTTP no frontend antes de tocar em rotas (`node scripts/analyze-route.js`);
- Gerador automático de contratos Zod e DTOs TypeScript (`node scripts/generate-contract.js`);
- Servidor de Mock HTTP Zero-Dependency com CORS e CSP na porta 3333 (`node scripts/mock-route.js`).

### 9. ⭐ `orch`
- Comando geral mestre do ecossistema para governança unificada;
- Modo completo com Sabatina 4Q (`/orch <demanda>`), modo rápido cirúrgico (`/orch --fast <demanda>`) e atalho para QA 360° (`orch qa`).

### 10. 🕵️‍♂️ `audit-code-full`
- Orquestração de 4 workers paralelos (`qa-crawler`, `qa-bruteforce`, `qa-ui-palette`, `qa-button-action`) via `node audit-code-full/scripts/audit-full.js` (ou `orch qa`);
- Fuzzing de funções exportadas em subprocesso isolado com limite de memória (`--max-old-space-size=128`), timeout por chamada e por arquivo, bloqueio de geração dinâmica de código (`codeGeneration: { strings: false, wasm: false }`) e exclusão de código de terceiros (`node_modules`, `vendor`, `.min.js`);
- Consolidação automática em `.code-map/INDEX.md`, `.code-map/full-audit-report.json` e `.code-map/ai-agents-dispatch.json`.

---

## 🚀 Como Instalar e Usar

### 1. Instalação Unificada (Todos os Agentes e Todas as 10 Skills)
Instala simultaneamente no **Google Antigravity**, **Claude Code** e **Cursor Rules**:

```bash
# Na raiz do monorepo:
npm run install:all

# Ou instalando tanto local quanto globalmente:
npm run install:both
```

### 2. Instalação como Plugin Oficial do Antigravity:
```bash
# Perfil Global (~/.gemini/config/plugins/enterprise-ai-suite):
npm run install:plugin:global

# Ou no Workspace Local (.agents/plugins/enterprise-ai-suite):
npm run install:plugin
```

### 3. Troca de Versões sem Git Clone (`scripts/switch-version.js`):
```bash
# Baixa e instala uma tag de versão validada do GitHub:
node scripts/switch-version.js --version=v2.2.0-beta.1 --yes
node scripts/switch-version.js v2.1.0 --dry-run
```

### 4. Rodar Testes de Integridade (Plugin + 11 Subagentes + 10 Skills):
```bash
npm test
```

---

## 🤝 Contribuições & Governança

- 📖 **Guia Completo de Contribuição:** Consulte o [**`CONTRIBUTING.md`**](CONTRIBUTING.md).
- 📋 **Template de Pull Request:** Todos os PRs devem preencher o [**`PULL_REQUEST_TEMPLATE.md`**](.github/PULL_REQUEST_TEMPLATE.md).
- 🛡️ **Branch Protection na `master`:** Configurada no GitHub com bloqueio de *force push* e deleção de branch, exigência de status checks do CI (`validate-skills` em Node 20, 22 e 24) e política de 1 aprovação em Pull Requests para contribuidores não-administradores (`enforce_admins: false` e `require_code_owner_reviews: false` — administradores do repositório podem mesclar diretamente; não há arquivo `CODEOWNERS` ativo).

---

## 🏗️ Estrutura do Repositório

```
enterprise-ai-suite/
├── plugin.json            # Manifesto oficial do Plugin Antigravity (v2.8.1)
├── hooks.json             # Travas de ciclo de vida reativas no SO (Firewall de comandos)
├── LICENSE                # Licença MIT
├── bin/
│   └── orch.js            # CLI Master da Suite (run, qa, doctor, init, switch, test, audit)
├── agents/                # 🤖 Enxame de 11 Subagentes Especialistas (Contextos Limpos)
│   ├── cartographer.agent.md     # Mapeamento 360° em modo estrito Read-Only
│   ├── route-guard.agent.md      # Blast Radius e contratos Zod/DTO
│   ├── ui-craftsman.agent.md     # Design Engineering anti-slop e física de molas
│   ├── db-sentinel.agent.md      # Modelagem relacional e migrations seguras
│   ├── test-engineer.agent.md    # Testes de integração de API e E2E Playwright
│   ├── falsifier.agent.md        # Subagente adversário para estresse pré-código
│   ├── security-auditor.agent.md # DevSecOps & Red Team Engine (13 regras, SARIF)
│   ├── qa-crawler.agent.md       # Varredura estrutural em 6 camadas e código órfão
│   ├── qa-bruteforce.agent.md    # Fuzzing brute-force em VM isolada + AST
│   ├── qa-ui-palette.agent.md    # Auditoria de paleta de cores e Dual-Theme
│   └── qa-button-action.agent.md # Auditoria de funcionalidade real de botões
├── rules/                 # 📜 Regras Globais (Zero-Trust, Anti-AI Slop)
├── shared/                # Núcleo comum compartilhado (suite-core.js)
├── audit-code-full/       # QA Brute-Force 360° com 4 agentes paralelos e code-map
├── frontend-craftsman/    # Design Engineering, molas Framer Motion e Anti-AI Slop
├── mobile-converter/      # Adaptação mobile tátil, Bottom Sheets, Tab Bar e dvh
├── db-sentinel/           # Banco de dados, migrations zero-downtime e seeds tipados
├── test-forge/            # Engenharia de testes reais, integração e Playwright mobile
├── hybrid-orchestrator/   # Orquestrador de decisão, execução e Falsifier
├── repo-cartographer/     # Cartógrafo de arquitetura 360° e Context IR
├── route-guard/           # Guardião de contratos de API e Zero-Trust
├── devsecops-audit/       # Motor DevSecOps Red Team (13 regras de lógica de negócio)
├── orch/                  # Atalho mestre do ecossistema (/orch, /orch --fast e orch qa)
├── scripts/
│   ├── doctor.js            # Diagnóstico determinístico de saúde do ecossistema
│   ├── init.js              # Autoconfiguração inteligente por detecção de stack
│   ├── test-all.js          # Test runner universal (Plugin + 11 Subagentes + 10 Skills)
│   ├── sync-versions.js     # Unificador e validador de versões (package.json -> monorepo)
│   ├── sync-shared.js       # Sincronizador idempotente do núcleo shared/suite-core.js
│   ├── benchmark-tokens.js  # Benchmark reproduzível de economia de tokens
│   ├── switch-version.js    # Seletor e trocador seguro de versões remotas sem git clone
│   └── hooks/               # Firewall de segurança no SO (PreToolUse)
│       └── pre-command-guard.js  # Intercepta e bloqueia comandos perigosos no SO
├── package.json           # Scripts globais e binário orch
└── README.md              # Este manual completo
```

---

## 📜 Licença
Distribuído sob a [Licença MIT](LICENSE). Criado por **[Henrique Alves](https://github.com/Henrique-All)**.
