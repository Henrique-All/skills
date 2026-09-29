# ⚡ Enterprise AI Suite (v2.2.0)

> **Plugin Oficial, Enxame de 7 Subagentes Especialistas, 9 Skills de Alta Engenharia, Cockpit Visual e Firewall de Segurança no SO.**  
> Desenvolvido para transformar agentes (**Google Antigravity**, **Claude Code**, **Cursor**, **Windsurf**, **Copilot**) em engenheiros de software seniores, eliminando alucinações, desperdício de tokens, quebras em produção e vícios de IA com isolamento de contexto e travas de ciclo de vida.

[![Release](https://img.shields.io/github/v/release/Henrique-All/skills?color=brightgreen&label=release)](https://github.com/Henrique-All/skills/releases)
[![CI Status](https://github.com/Henrique-All/skills/actions/workflows/ci.yml/badge.svg)](https://github.com/Henrique-All/skills/actions)
[![Branch Protection](https://img.shields.io/badge/master%20branch-protected-success)](https://github.com/Henrique-All/skills/settings/branches)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](package.json)

---

## 📌 Referências & Navegação Rápida

- 🚀 [**Instalação Rápida**](#-como-instalar-e-usar) — Antigravity, Claude Code, Cursor e Monorepo
- 🖥️ [**O Cockpit Visual Unificado**](#%EF%B8%8F-o-cockpit-visual-unificado) — Central de comando no navegador (`localhost:3456`)
- 🎛️ [**Ferramental CLI (Doctor & Init)**](#%EF%B8%8F-ferramental-cli-master) — `orch doctor`, `orch init`, `orch switch`
- 💰 [**Economia Brutal de Tokens (78% a 85%)**](#-efici%C3%AAncia-extrema--economia-de-tokens-78-a-85-de-redu%C3%A7%C3%A3o) — Simulação matemática de 9 turnos
- 🤖 [**Como Usar no Chat**](#-como-acionar-no-chat-com-seu-agente-de-ia) — Slash commands (`/`) e regras (`@`)
- ⚖️ [**Execução Individual vs. /orch**](#%EF%B8%8F-execu%C3%A7%C3%A3o-individual-vs-comando-mestre-orch-qual-a-diferen%C3%A7a) — Matriz comparativa de decisão
- 📊 [**Scorecard das 9 Skills (Ecosistema 10.0)**](#-scorecard--notas-t%C3%A9cnicas-das-skills-ecosistema-100) — Tabela geral de notas
- 🐝 [**Enxame de 7 Subagentes Especialistas**](#-enxame-de-7-subagentes-especialistas-agents) — Isolamento de contexto
- 🛑 [**Firewall de Segurança Reativo (Hooks)**](#-firewall-de-seguran%C3%A7a-reativo-no-so-hooksjson) — Proteção no nível do SO
- 🔍 [**Detalhamento Completo das 9 Skills**](#-detalhamento-das-9-skills-e-comandos-cli)
- 🤝 [**Contribuições & Governança**](#-contribui%C3%A7%C3%B5es--governan%C3%A7a) — CI multi-versão e proteção de branch
- 🏗️ [**Estrutura do Repositório**](#%EF%B8%8F-estrutura-do-reposit%C3%B3rio)

---

## 🖥️ O Cockpit Visual Unificado

O **Cockpit** (`scripts/cockpit.js`) é a central gráfica unificada do desenvolvedor servida nativamente no navegador (porta `3456`, zero dependências externas, estética moderna *Dark Mode* inspirada no Linear, Raycast e Apple).

```bash
# Iniciar o Cockpit localmente:
npm run cockpit
# ou via CLI: node bin/orch.js cockpit
```
👉 Acesse no navegador: [**http://localhost:3456**](http://localhost:3456)

### As 4 Abas do Cockpit:
1. **📊 Painel Geral:** Medidor de economia de tokens (78% a 85%), status dos 7 subagentes e monitor das 9 skills com notas 10.0/10;
2. **📋 Governança dos 4 Quadrantes:** Visualização do plano pré-código (Contratos, Concorrência, UI, Segurança) com a caixa da **Trava do Turno 1** e botão interativo para copiar o `"OK"`;
3. **📱 Simulador de Smartphone (Mobile):** Moldura realista de iPhone com Dynamic Island, Tab Bar tátil, checagem de touch targets (44px+) e Bottom Sheet;
4. **🔒 Centro DevSecOps (OWASP):** Relatório de vulnerabilidades, escaneamento de segredos no Git e exit codes de CI.

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

# 🔄 Trocar de versão ou release do GitHub sem precisar clonar via git:
npm run switch
# ou via CLI: node bin/orch.js switch v2.2.0-beta.1

# 🧪 Executar a bateria de testes automatizados do ecossistema:
npm test
# ou via CLI: node bin/orch.js test
```

---

## 💰 Eficiência Extrema & Economia de Tokens (78% a 85% de Redução)

> **Engenharia de Contexto Efêmero:** Como a v2.2.0 reduz drasticamente o consumo de tokens faturados na API da LLM enquanto eleva a precisão analítica e a velocidade de entrega.

### 📊 Simulação Real: Uma Demanda Fullstack Completa (9 Turnos)
Ao implementar uma funcionalidade completa (*ex: criação de nova tela com banco de dados Prisma, rotas de API, mobile, testes e segurança*), veja a diferença matemática real:

| Etapa do Desenvolvimento | ❌ Modelo Antigo (Mono-thread)<br/>*Histórico Acumulado Reenviado na API* | ✅ Enterprise AI Suite Completa<br/>*Subagentes Descartáveis + Scripts Locais* |
| :--- | :---: | :---: |
| **Turno 1: Cartografia do Repo** | 40.000 tokens lidos no chat principal | **500 tokens** *(cartógrafo rodou em thread limpa)* |
| **Turno 2: Banco & Migrations (`db-sentinel`)** | 45.000 tokens *(acumulou 40k + 5k)* | **1.500 tokens** *(banco validado em thread isolada)* |
| **Turno 3: Contratos de Rota (`route-guard`)** | 50.000 tokens *(acumulando)* | **2.800 tokens** *(recebeu só o Zod/DTO de 300t)* |
| **Turno 4: UI & Molas (`frontend-craftsman`)** | 60.000 tokens *(acumulando)* | **4.500 tokens** *(UI feita em subagente)* |
| **Turno 5: Mobile & Ergonomia (`mobile-converter`)** | 70.000 tokens *(acumulando)* | **6.500 tokens** *(cards/bottom sheet isolados)* |
| **Turno 6: Implementação de Código (Builder)** | 85.000 tokens *(acumulando)* | **9.000 tokens** *(diffs atômicos focados)* |
| **Turno 7: Criação de Testes (`test-forge`)** | 100.000 tokens *(acumulando)* | **11.500 tokens** *(testes gerados em subagente)* |
| **Turno 8: Auditoria DevSecOps (`security-audit`)** | 115.000 tokens *(acumulando)* | **13.500 tokens** *(auditoria rodou em subagente)* |
| **Turno 9: Validação e Entrega** | 125.000 tokens *(acumulando)* | **15.000 tokens** |
| ➕ **Subagentes descartáveis** *(leitura pesada)* | *Não possui (tudo roda no chat)* | **+ 85.000 tokens** *(rodaram 1x e foram deletados)* |
| **🔥 TOTAL FATURADO PELA API** | **~690.000 tokens** 💸 | **~149.000 tokens** 🟢 |

> 📉 **Resultado:** **~78.4% a 85% de economia direta de tokens** (redução de mais de **540.000 tokens** em uma única feature!).
> ⚡ **Zero Perda de Atenção ("Context Bloat"):** Enquanto o modelo antigo acumula 125k tokens e começa a alucinar, a suite termina a tarefa com apenas **15k tokens de contexto ativo** no chat principal.

### 🛡️ Os 4 Pilares da Redução:
1. **Fim do Efeito "Bola de Neve" (Janelas Efêmeras):** Arquivos brutos lidos morrem na thread descartável do subagente; o chat principal recebe apenas resumos JSON estruturados de 300 a 500 tokens.
2. **Scripts Locais em Node.js (Custo Zero na LLM):** Cartografia AST (`cartographer.js`), auditoria de banco (`db-audit.js`), Blast Radius (`analyze-route.js`) e 18 pilares OWASP (`audit.js`) rodam na CPU da sua máquina local.
3. **Handoffs Tipados Ultracompactos (JSON Puro):** Comunicação inter-agentes em schemas condensados eliminando conversas prolixas.
4. **Escape Cirúrgico com `/orch --fast`:** Rota A direta sem subagentes para tarefas pontuais (< 3.000 tokens do início ao fim).

---

## 🤖 Como Acionar no Chat com seu Agente de IA

Você pode acionar as ferramentas tanto por **linguagem natural** quanto diretamente por **Slash Commands (`/`)** no Antigravity e Claude Code, ou via **Regras Contextuais (`@`)** no Cursor e Windsurf:

| Slash Command / Atalho | Especialidade | Exemplo de Uso no Chat |
| :--- | :--- | :--- |
| **`/orch`** ⭐ | **Comando Geral Mestre:** Orquestração completa das 9 skills | `/orch Implemente o checkout com Pix, Prisma e adaptação mobile` |
| **`/orch --fast`** ⚡ | **Execução Cirúrgica Direta:** Rota A sem travas e com diffs atômicos | `/orch --fast Corrija a tipagem de retorno do controller de tickets` |
| **`/frontend-craftsman`** | Design Engineering sem cara de IA (Framer Motion / Tailwind v4) | `/frontend-craftsman Crie a tela de faturamento com paleta Linear` |
| **`/mobile-converter`** | Converter tela desktop para mobile nativo (Bottom Sheets / 44px+) | `/mobile-converter Adapte a tabela de pedidos para cards no mobile` |
| **`/db-sentinel`** 🆕 | Banco de Dados, Migrations Seguras e Índices Faltantes | `/db-sentinel Valide a migration e gere o seed tipado do Prisma` |
| **`/test-forge`** 🆕 | Testes de Integração de API Reais e E2E Playwright | `/test-forge Crie os testes de integração para POST /api/orders` |
| **`/repo-cartographer`** | Mapear arquitetura e fluxo 360° em 6 camadas | `/repo-cartographer Mapeie o fluxo da tela de Checkout até o banco` |
| **`/route-guard`** | Prevenir quebras de contrato de API e Blast Radius | `/route-guard Analise o impacto de alterar a rota em api/routes` |
| **`/security-audit`** | Auditoria DevSecOps completa dos 18 pilares OWASP | `/security-audit Execute a auditoria de segurança pré-deploy` |
| **`/hybrid-orchestrator`** | Desenvolver feature com governança rígida e Falsifier | `/hybrid-orchestrator Implemente a regra de frete com rollback seguro` |

---

## ⚖️ Execução Individual vs. Comando Mestre `/orch`: Qual a Diferença?

O **Enterprise AI Suite** possui arquitetura de **dupla camada de acionamento**:

| Critério de Comparação | 🎯 Execução Individual (Skills Isoladas)<br/>*(ex: `/frontend-craftsman`, `/db-sentinel`)* | 🚀 Comando Mestre `/orch` (Teamwork & Swarm)<br/>*(Governança Total do Ecossistema)* |
| :--- | :--- | :--- |
| **Comando / Gatilho** | `/frontend-craftsman`, `/mobile-converter`, `/db-sentinel`, `/test-forge`, etc. | `/orch <demanda>` ou `/orch --fast <demanda>` |
| **Escopo de Ação** | **Laser-Focused:** Atua estritamente no domínio de conhecimento daquela skill. | **Holístico & Multi-Camadas:** Orquestra compulsoriamente as disciplinas de ponta a ponta. |
| **Quem Conecta as Etapas?** | **O Desenvolvedor:** Você decide manualmente quando mapear, desenhar, testar e auditar. | **O Orchestrator (Lead):** Conecta as etapas e repassa artefatos automaticamente. |
| **Consumo de Contexto** | Ultrabaixo (< 2.000 tokens na sessão principal). Ideal para tarefas atômicas. | Otimizado via subagentes efêmeros (redução de 78% a 85% de tokens na API). |
| **Troca de Informações** | Manual (o usuário copia saídas de um comando para o outro). | **Automática via Handshakes:** `.code-map/handshake.json`, `DESIGN_SPEC.md` e SARIF. |
| **Trava & Sabatina (4Q)** | Não possui (vai direto ao ponto daquela skill). | **Ativa no Turno 1 (Rota B):** Sabatina 4Q e Trava rígida anti-drift antes de editar arquivos. |
| **Ciclo Adversário (Falsifier)** | Não roda (a menos que no hybrid). | **Obrigatório:** O subagente Falsifier ataca a solução com estresse de 5 vetores. |
| **Verificação Pós-Código** | Apenas as ferramentas daquela skill. | **Pipeline Quádruplo:** `craft-audit`, `mobile-audit`, `db-audit` e `security-audit`. |
| **Opção de Bypass Cirúrgico** | Já é naturalmente direto. | Possui a flag **`/orch --fast`** (aplica Rota A sem travas e com velocidade máxima). |

---

## 📊 Scorecard & Notas Técnicas das Skills (Ecosistema 10.0)

| Skill | Nota | Foco Principal | Maior Diferencial Prático |
| :--- | :---: | :--- | :--- |
| **[`hybrid-orchestrator`](#1--hybrid-orchestrator--nota-10010)** | **`10.0` / 10** | **Governança & Execução Cirúrgica** | Trava de Permissão em 2 Turnos anti-drift + Snapshot git stash + Falsifier adversário com estresse (`falsify.js`). |
| **[`frontend-craftsman`](#2--frontend-craftsman--nota-10010)** | **`10.0` / 10** | **Design Engineering & Anti-AI Slop** | Elimina 'cara de IA', molas Framer Motion, preview visual instantâneo HTML, Tailwind v4 (@theme) e `craft-audit.js`. |
| **[`mobile-converter`](#3--mobile-converter--nota-10010)** | **`10.0` / 10** | **Adaptação Mobile de Alta Fidelidade** | Metamorfose Tabela ➔ Cards, Bottom Sheets com swipe `drag="y"`, Bottom Nav, simulador interativo e `mobile-audit.js --fix`. |
| **[`db-sentinel`](#4--db-sentinel--nota-10010)** 🆕 | **`10.0` / 10** | **Banco de Dados & Migrations Seguras** | Zero-Downtime em 3 passos, detecção de Foreign Keys sem índice, anti-N+1, gerador de seeds tipados e `db-audit.js`. |
| **[`test-forge`](#5--test-forge--nota-10010)** 🆕 | **`10.0` / 10** | **QA & Testes Reais (Anti-Mock Slop)** | Testes de integração de API em 4 cenários (Supertest/Vitest), Playwright E2E em viewport mobile e `test-audit.js`. |
| **[`security-audit`](#6--security-audit--nota-10010)** | **`10.0` / 10** | **DevSecOps & 18 Pilares OWASP** | Modo estritamente somente-leitura, mascaramento de segredos, Autofix seguro (`--fix`), exportação SARIF v2.1.0 e git hook. |
| **[`repo-cartographer`](#7--repo-cartographer--nota-10010)** | **`10.0` / 10** | **Cartografia 360° & Context IR** | Varredura de UI até Banco em 6 camadas, resolução de aliases (`@/`), diagramas Mermaid dinâmicos e canvas web. |
| **[`route-guard`](#8--route-guard--nota-10010)** | **`10.0` / 10** | **Contratos de Rotas & Zero-Trust** | Blast Radius reverso no front, trava de retrocompatibilidade, gerador Zod/DTO e Mock Server HTTP com CORS. |
| **[`orch`](#9--orch-comando-mestre--nota-10010)** | **`10.0` / 10** | **Maestro Regente do Ecossistema** | Acionamento centralizado de todas as skills, Rota A rápida (`--fast`) e Rota B com governança soberana. |

---

## 🐝 Enxame de 7 Subagentes Especialistas (`agents/`)

Os subagentes operam em **janelas de contexto limpas e descartáveis**, permitindo análises profundas sem sobrecarregar o chat principal:

1. **`cartographer.agent.md`**: Exploração arquitetural 360° em modo *Read-Only*, economizando até 90% dos tokens de leitura inicial.
2. **`route-guard.agent.md`**: Análise de contratos de rotas, cálculo de Blast Radius e geração de schemas Zod/DTO.
3. **`ui-craftsman.agent.md`**: Design Engineering anti-slop, molas do Framer Motion e ergonomia mobile (Bottom Sheets, 44px+).
4. **`db-sentinel.agent.md`**: Arquiteto relacional que valida schemas Prisma/Drizzle e impede migrations destrutivas.
5. **`test-engineer.agent.md`**: Engenheiro de QA que cria testes de integração de API e E2E Playwright reais.
6. **`falsifier.agent.md`**: Red Teamer adversário que ataca o plano na fase pré-código com 5 vetores de estresse.
7. **`security-auditor.agent.md`**: Portão DevSecOps dos 18 pilares OWASP com exportação SARIF.

---

## 🛑 Firewall de Segurança Reativo no SO (`hooks.json`)

O monorepo conta com travas de ciclo de vida que interceptam a execução de ferramentas no nível do sistema operacional:

- **`pre-command-guard.js`**: Intercepta comandos de terminal antes de executar e bloqueia no SO comandos destrutivos (`DROP TABLE`, `rm -rf /`, `Remove-Item -Recurse -Force`, `git push --force`, `prisma migrate reset`).
- **`post-write-lint.js`**: Validação silenciosa de integridade pós-escrita de arquivos.

---

## 🔍 Detalhamento das 9 Skills e Comandos CLI

### 1. ⚡ `hybrid-orchestrator` — Nota: 10.0/10
- Snapshot atômico com `git stash create` e rollback instantâneo (`node scripts/snapshot.js rollback`);
- Falsifier adversário com estresse automatizado em 5 vetores (`node scripts/falsify.js`);
- Painel dos 4 Quadrantes no terminal e navegador (`preview-plan.js`).

### 2. 🎨 `frontend-craftsman` — Nota: 10.0/10
- Erradicação de AI Slop (proibição de gradientes roxos genéricos e blur desregulado);
- Molas táteis Framer Motion (`stiffness: 450, damping: 30`) e abas com `layoutId`;
- Preview visual instantâneo em 1s (`node scripts/preview-spec.js`);
- Auditoria determinística de interface (`node scripts/craft-audit.js`).

### 3. 📱 `mobile-converter` — Nota: 10.0/10
- Metamorfose de tabelas largas em cards verticais (`ResponsiveTableToCards.tsx`);
- Modais transformados em gavetas deslizantes com gesto de arrasto (`BottomSheet.tsx`);
- Touch targets obrigatórios de 44x44px e viewport dinâmico `100dvh`;
- Simulador de iPhone 15 Pro no navegador (`node scripts/preview-mobile.js`) e auditoria com Autofix (`mobile-audit.js --fix`).

### 4. 🗄️ `db-sentinel` — Nota: 10.0/10 🆕
- Zero-Downtime migrations em 3 passos para adições de colunas e renomeações;
- Auditoria de schemas Prisma, Drizzle e SQL (`node scripts/db-audit.js`);
- Detecção automática de chaves estrangeiras (`@relation`) sem índice (`@@index`);
- Gerador de seeds sintéticos e tipados com coerência relacional (`node scripts/generate-seed.js`).

### 5. 🧪 `test-forge` — Nota: 10.0/10 🆕
- Erradicação do "Mock Fantasma" e testes com asserções cosméticas;
- Gerador de testes de integração de rota em 4 cenários (`node scripts/forge-api-test.js POST /api/orders`);
- Gerador E2E Playwright cobrindo Desktop e Mobile iPhone 15 Pro (`node scripts/forge-e2e.js /checkout`);
- Auditor de robustez de testes e cálculo do Test Quality Score (`node scripts/test-audit.js test/`).

### 6. 🔒 `security-audit` — Nota: 10.0/10
- Auditoria estritamente somente-leitura dos 18 pilares OWASP e DevSecOps (`node scripts/audit.js`);
- Autofix seguro de links vulneráveis e cookies (`node scripts/audit.js --fix`);
- Exportação SARIF v2.1.0 para GitHub Code Scanning (`--sarif`);
- Git hook pre-commit bloqueante (`node scripts/install-hook.js`).

### 7. 🗺️ `repo-cartographer` — Nota: 10.0/10
- Rastreamento determinístico em 6 camadas economizando até 90% dos tokens (`node scripts/cartographer.js trace`);
- Diagramas Mermaid dinâmicos prontos para PRs (`node scripts/cartographer.js mermaid`);
- Análise de Blast Radius reverso (`node scripts/cartographer.js callers`);
- Canvas web interativo com nós arrastáveis (`node scripts/preview-graph.js`).

### 8. 🛡️ `route-guard` — Nota: 10.0/10
- Identificação de consumidores HTTP no frontend antes de tocar em rotas (`node scripts/analyze-route.js`);
- Gerador automático de contratos Zod e DTOs TypeScript (`node scripts/generate-contract.js`);
- Servidor de Mock HTTP Zero-Dependency com CORS total na porta 3333 (`node scripts/mock-route.js`).

### 9. ⭐ `orch` — Nota: 10.0/10
- Comando geral mestre do ecossistema para governança unificada;
- Modo completo com Sabatina 4Q (`/orch <demanda>`) e modo rápido cirúrgico (`/orch --fast <demanda>`).

---

## 🚀 Como Instalar e Usar

### 1. Instalação Unificada (Todos os Agentes e Todas as 9 Skills)
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
# Baixa e instala qualquer versão diretamente do GitHub:
node scripts/switch-version.js v2.2.0-beta.1
node scripts/switch-version.js v2.1.0
```

### 4. Rodar Testes de Integridade (Plugin + 7 Subagentes + 9 Skills):
```bash
npm test
```

---

## 🤝 Contribuições & Governança

- 📖 **Guia Completo de Contribuição:** Consulte o [**`CONTRIBUTING.md`**](CONTRIBUTING.md).
- 📋 **Template de Pull Request:** Todos os PRs devem preencher o [**`PULL_REQUEST_TEMPLATE.md`**](.github/PULL_REQUEST_TEMPLATE.md).
- 🛡️ **Branch Protection na `master`:** Requer PR obrigatório, code review humano, CI Actions (Node 18, 20, 22) 100% verde e anti-force-push.

---

## 🏗️ Estrutura do Repositório

```
enterprise-ai-suite/
├── plugin.json            # Manifesto oficial do Plugin Antigravity (v2.2.0)
├── hooks.json             # Travas de ciclo de vida reativas no SO (Firewall de comandos)
├── bin/
│   └── orch.js            # CLI Master da Suite (doctor, init, cockpit, switch, test, audit)
├── agents/                # 🤖 Enxame de 7 Subagentes Especialistas (Contextos Limpos)
│   ├── cartographer.agent.md   # Mapeamento 360° em modo estrito Read-Only
│   ├── route-guard.agent.md    # Blast Radius e contratos Zod/DTO
│   ├── ui-craftsman.agent.md   # Design Engineering anti-slop e física de molas
│   ├── db-sentinel.agent.md    # Modelagem relacional e migrations seguras
│   ├── test-engineer.agent.md  # Testes de integração de API e E2E Playwright
│   ├── falsifier.agent.md      # Subagente adversário para estresse pré-código
│   └── security-auditor.agent.md # Auditoria DevSecOps dos 18 pilares OWASP (SARIF)
├── rules/                 # 📜 Regras Globais (Zero-Trust, Anti-AI Slop)
├── frontend-craftsman/    # Design Engineering, molas Framer Motion e Anti-AI Slop
├── mobile-converter/      # Adaptação mobile tátil, Bottom Sheets, Tab Bar e dvh
├── db-sentinel/           # Banco de dados, migrations zero-downtime e seeds tipados
├── test-forge/            # Engenharia de testes reais, integração e Playwright mobile
├── hybrid-orchestrator/   # Orquestrador de decisão, execução e Falsifier
├── repo-cartographer/     # Cartógrafo de arquitetura 360° e Context IR
├── route-guard/           # Guardião de contratos de API e Zero-Trust
├── security-audit/        # Motor DevSecOps com os 18 pilares OWASP
├── orch/                  # Atalho mestre do ecossistema (/orch e /orch --fast)
├── scripts/
│   ├── cockpit.js         # Cockpit visual web unificado no navegador (localhost:3456)
│   ├── doctor.js          # Diagnóstico determinístico de saúde do ecossistema
│   ├── init.js            # Autoconfiguração inteligente por detecção de stack
│   ├── test-all.js        # Test runner universal (Plugin + 7 Subagentes + 9 Skills)
│   ├── switch-version.js  # Seletor e trocador de versões remotas sem git clone
│   └── hooks/             # Scripts executados pelas travas reativas (hooks.json)
│       ├── pre-command-guard.js  # Intercepta e bloqueia comandos perigosos
│       └── post-write-lint.js    # Checagem silenciosa pós-edição
├── package.json           # Scripts globais e binário orch
└── README.md              # Este manual completo
```

---

## 📜 Licença
Distribuído sob a licença MIT. Criado por **[Henrique Alves](https://github.com/Henrique-All)**.
