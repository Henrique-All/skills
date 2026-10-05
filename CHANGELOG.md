# 📝 Changelog

Todas as alterações notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [2.3.1] - 2026-10-05 — 🚀 Desburocratização Radical, Zero Atrito no Chat & Densidade Real de Software

### ⚡ Desburocratização & Fim do "Process Theater"
- **Zero Intromissão no Chat:** Removidos do `hooks.json` os hooks `skill-router` (`PreInvocation`) e `ui-quality-gate` (`Stop`). O chat volta a ser 100% limpo, sem injeção de avisos de sistema ou bloqueios de parada de turno. Mantido apenas o `safety-firewall` (`pre-command-guard.js`) no SO para bloquear comandos destrutivos (`DROP TABLE`, `rm -rf`, `git push --force`).
- **Via Rápida Pragmática como Padrão (Route A):** Tarefas cotidianas (ajustes de tela, correções de bugs, pequenas refatorações, estilização) são resolvidas diretamente no código, com zero cerimônia (sem paradas forçadas para `DESIGN_SPEC.md`, sem Sabatinas 4Q forçadas e sem painéis HTML desnecessários). Planejamento formal fica restrito a quando o usuário invocar explicitamente `/plan` ou `/orch`.
- **Densidade Real de Software (Anti-Landing Page Bloat):** Atualizada a `rules/02-anti-ai-slop.md` e `agents/ui-craftsman.agent.md` proibindo o estilo de "landing page / Dribbble" (`rounded-3xl`, paddings inflados `p-8`/`p-10`, sombras neon desnecessárias) em softwares corporativos e ferramentas de trabalho. Foco em alta densidade, botões normais (32-38px) e tipografia sóbria.
- **Defensive CSS:** Regra inegociável contra quebra de layout: proibição de remoção de `min-width: 0`, preservação da cadeia flex/overflow e preservação rigorosa de callbacks e eventos (`onClick`, `onClose`).
- **Reescrita Arquitetural do `adapt-screen.js`:** Transforma o script em um analisador que detecta layouts multi-coluna e gera código pronto para arquitetura Master-Detail real (com estado de alternância, botão `← Voltar` tátil e Bottom Sheet para detalhes secundários), erradicando a preguiça de apenas empilhar colunas.

---

## [2.3.0] - 2026-10-05 — 🎨 Dual-Theme (Modo Claro + Escuro), Master-Detail Mobile & Fim dos Comandos Avulsos

### 🚀 Novas Funcionalidades & Arquitetura
- **🎨 Frontend Craftsman: Auditoria e Garantia Dual-Theme (Light & Dark Mode):**
  - Adicionado suporte a arquivos `.ts` (styled-components e TypeScript design systems).
  - Novas regras determinísticas no `craft-audit.js`:
    - `LIGHT_MODE_WHITE_TEXT`: Bloqueia `color: #fff` / `color: white` hardcoded sem condicional de tema, impedindo texto invisível no Modo Claro.
    - `LIGHT_MODE_GHOST_SURFACE`: Bloqueia superfícies e bordas `rgba(255, 255, 255, 0.0x)` que desaparecem sobre fundos claros (#F8FAFC).
    - `HARDCODED_DARK_SURFACE`: Bloqueia superfícies escuras fixas que não respondem à troca de tema.
  - Atualizada a `rules/02-anti-ai-slop.md` com o Pilar 3 (Coerência Obrigatória Dual-Theme).
- **📱 Mobile Converter: Metamorfose Master-Detail & Clearance Seguro:**
  - Adicionado suporte nativo a arquivos `.ts` no analisador.
  - Nova regra `FIXED_NAV_COLLISION`: Detecta botões flutuantes fixos no topo/esquerda (ex: menu hambúrguer) e exige `padding-left: 52px+` no cabeçalho mobile para evitar sobreposição com o título da tela.
  - Nova regra `DESKTOP_STACKED_SLOP`: Bloqueia o empilhamento vertical de colunas de chat/tabelas no mobile sem fluxo Master-Detail.
  - Adicionado o Pilar 4.f (Metamorfose Master-Detail de Chat/Inboxes) no `SKILL.md`.
- **⚡ Fim dos Comandos Avulsos — Modo Maestro Proativo (Diretrizes Globais v2.3.0):**
  - Atualizado `GEMINI.md` com o protocolo de proatividade: o agente é expressamente proibido de exigir que o usuário digite `/front`, `/mobile` ou `/db` para entregar código com qualidade.
  - O agente assume autonomamente a governança de ambos os temas (Claro e Escuro) e responsividade mobile em qualquer solicitação de interface.

---

## [2.2.1] - 2026-09-30 — ⚡ Correção do Fluxograma do /orch, Pipeline Determinístico & Flags Diretas

### 🐛 Correções & Estabilização Crítica
- **🚀 Pipeline Determinístico Unificado Local (`bin/orch.js run` / `scripts/orch-pipeline.js`):**
  - Elimina a dependência de leitura manual de arquivos no chat da LLM, executando as 6 auditorias diretamente na CPU da máquina local via AST e análise estática em ~2 segundos com **zero tokens de LLM gastos**.
  - Impede o viés de palavra-chave que fazia o modelo acionar exclusivamente o front-end ao identificar termos como *"design"* ou *"botão"*.
- **🎯 Suporte a Flags Diretas de Escopo:**
  - A Cartografia 360° (**S1**) é mantida compulsoriamente como fundação arquitetural de contexto (AST).
  - Novas flags direcionadas:
    - `--front` / `--ui`: Executa **S1 (Cartografia)** ➔ **S3 (UI Craftsman)** + **S4 (Mobile Converter)**.
    - `--mobile`: Executa **S1 (Cartografia)** ➔ **S4 (Mobile Converter)**.
    - `--db`: Executa **S1 (Cartografia)** ➔ **S5 (DB Sentinel)** + **S6 (Falsifier Concorrência)**.
    - `--sec`: Executa **S1 (Cartografia)** ➔ **S2 (DevSecOps 18 Pilares OWASP / RBAC)**.
    - `--api`: Executa **S1 (Cartografia)** ➔ **S2 (Segurança)** + **S6 (Falsifier Concorrência)**.
    - `--test`: Executa **S1 (Cartografia)** ➔ **Test Forge (Test Audit)**.
    - Sem flag (padrão): Executa compulsoriamente todas as 6 skills (Governança Total).
- **📄 Fim do Paredão de Texto no Chat:**
  - O pipeline grava o plano detalhado, scorecard e checklist de governança diretamente em `.plan/PLAN.md`. O chat recebe apenas um resumo executivo de 5 a 8 linhas e o link direto para o arquivo.
- **🛠️ Correção no `db-audit.js`:**
  - Corrigido erro `EISDIR` ao passar diretório raiz no argumento do scanner de banco de dados.
- **🌐 Sincronização Global das Diretrizes:**
  - Atualizado `GEMINI.md` global e `SKILL.md` em todas as instâncias locais e globais do Antigravity, Claude Code e Cursor.

---

## [2.2.0] - 2026-09-30 — 🚀 Enterprise AI Suite: Plugin Oficial, Enxame de Subagentes & 9 Skills

### ✨ Destaques da Release (Arquitetura de Plugin, Enxame de Subagentes & Redução Drástica de Tokens)
- **📦 Manifesto Oficial do Plugin Antigravity (`plugin.json`):**
  - O monorepo agora é empacotado como o plugin nativo **`enterprise-ai-suite`** (v2.2.0), permitindo instalação atômica em `.agents/plugins/` ou `~/.gemini/config/plugins/`.
- **🤖 Enxame de 7 Subagentes Especialistas com Contexto Isolado (`agents/`):**
  - **`cartographer.agent.md`**: Especialista em cartografia 360° em modo estritamente *Read-Only*, economizando até 90% dos tokens de exploração.
  - **`route-guard.agent.md`**: Guardião de contratos de API, DTOs e cálculo de Blast Radius.
  - **`ui-craftsman.agent.md`**: Design Engineer anti-AI slop, molas do Framer Motion e ergonomia mobile tátil.
  - **`db-sentinel.agent.md`**: Modelagem relacional e migrations seguras zero-downtime.
  - **`test-engineer.agent.md`**: Testes reais de integração de rotas e E2E Playwright.
  - **`falsifier.agent.md`**: Subagente adversário dedicado a quebrar o plano na fase pré-código (5 vetores de estresse).
  - **`security-auditor.agent.md`**: Portão DevSecOps dos 18 pilares OWASP com exportação SARIF e saída bloqueante.
- **💰 Economia Brutal de Tokens (78% a 85% de Redução):**
  - Adoção de subagentes efêmeros e handshakes compactos (`.code-map/handshake.json`), reduzindo o consumo de ~690k para ~149k tokens em fluxos fullstack de 9 turnos, eliminando perda de atenção (*context bloat*).
- **🗄️ Nova Skill: `db-sentinel` (Banco de Dados & Migrations Seguras):**
  - Migrations Zero-Downtime em 3 passos (Expand & Contract).
  - Detecção automática de Foreign Keys (`@relation`) sem índice (`@@index`).
  - Prevenção rigorosa de N+1 queries e gerador de seeds tipados (`scripts/generate-seed.js`).
  - Auditor determinístico de schemas Prisma/Drizzle/SQL (`scripts/db-audit.js`).
- **🧪 Nova Skill: `test-forge` (Engenharia de Testes Reais & Anti-Mock):**
  - Erradicação de testes cosméticos e mocks excessivos.
  - Gerador de testes de integração de rota em 4 cenários (`scripts/forge-api-test.js`).
  - Gerador E2E Playwright com ergonomia mobile (`scripts/forge-e2e.js`).
  - Auditor de qualidade de testes e cálculo do Test Quality Score (`scripts/test-audit.js`).
- **🛡️ Travas Reativas de Ciclo de Vida no Sistema Operacional (`hooks.json`):**
  - **`safety-firewall` (`pre-command-guard.js`)**: Intercepta comandos de terminal e bloqueia operações destrutivas (`DROP TABLE`, `rm -rf /`, `git push --force`, `Remove-Item -Recurse -Force`, `prisma migrate reset`).
  - **`code-quality-gate` (`post-write-lint.js`)**: Checagem silenciosa pós-escrita de arquivos.
- **⚡ Atalho Mestre `/orch` & CLI Unificada (`bin/orch.js`):**
  - Permite invocar a governança completa ou cirúrgica (`/orch` ou `/orch --fast`).
  - Ferramental CLI master: `npm run doctor`, `npm run init:suite`, `npm run switch`, `npm test`.
- **🚀 Modernizações de Ponta (Especificações 2026):**
  - **`frontend-craftsman`**: View Transitions API nativa (`document.startViewTransition`), CSS Container Queries (`@container`) e navegação por teclado acessível WAI-ARIA.
  - **`mobile-converter`**: Feedback háptico via Web Vibration API (`navigator.vibrate`) em Bottom Sheets e Tab Bar; auditoria de PWA (`theme-color`, `apple-mobile-web-app-capable`).
  - **`security-audit`**: Detecção de rotas de auth sem Rate Limiting, detecção de IDOR em queries de ID diretas sem escopo de tenant/usuário, e verificação de Helmet/CSP.
  - **`route-guard`**: Exportação automatizada de especificações OpenAPI 3.0.3 / Swagger JSON com a flag `--openapi`.
- **📜 Regras Globais do Sistema (`rules/`):**
  - **`01-zero-trust.md`**: Governança obrigatória de rotas A/B/C e honestidade de evidência.
  - **`02-anti-ai-slop.md`**: Diretrizes de estética premium, eliminação de clichês visuais e ergonomia mobile (44px+, dvh).
- **🚀 Instalador Central v2.2.0 (`install.js`):**
  - Novo comando `npm run install:plugin` / `npm run install:plugin:global` com empacotamento automatizado.
  - Sincronização 100% retrocompatível mantida para Claude Code (`~/.claude/skills/`) e Cursor (`~/.cursor/rules/`).

---

## [2.1.0] - 2026-09-29 — ⚡ Maestro Regente do Ecossistema & Tangibilidade Visual Total

### ✨ Adicionado & Aprimorado (Governança Ativa e Visual)
- **⚡ `hybrid-orchestrator` como Maestro Regente Automático:**
  - O Orchestrator agora atua como condutor universal das 6 skills, dispensando a necessidade de o usuário listar todas no prompt.
  - Se a demanda toca em **arquitetura/múltiplos arquivos**, dispara o `repo-cartographer` (gera `.code-map/handshake.json` e abre o canvas 360° no navegador).
  - Se a demanda toca em **rotas/endpoints/controllers**, dispara compulsoriamente o `route-guard` (`analyze-route.js`) para calcular o Blast Radius e travar no Q1.
  - Se a demanda toca em **telas/UI/modais**, dispara compulsoriamente o `frontend-craftsman` (gera `DESIGN_SPEC.md` e abre o preview visual).
  - No Turno 2 (pós-execução), dispara compulsoriamente o `security-audit` (`audit.js --pilares=...`) para rotas/auth/dados e `craft-audit.js` / `mobile-audit.js` para telas.
- **🌐 Dashboard Visual de Governança no Navegador (`scripts/preview-plan.js`):**
  - Transformado em gerador de dashboard HTML completo (`.plan/plan.html`) em tema escuro (Linear / Obsidian / Raycast).
  - Status em tempo real das ferramentas do ecossistema com links diretos para abrir o Grafo 360° e o Preview de UI.
  - Cards visuais dos **4 Quadrantes (Q1 Contratos, Q2 Banco, Q3 UI, Q4 Segurança)**.
  - **Checklist interativo de execução** com checkboxes persistidos em `localStorage`.
  - Botões táteis de 1 clique para copiar as respostas de autorização da trava (`OK - Executar Tudo`, `OK - Passo a Passo`, `Ajustes`).
  - Abertura automática no navegador padrão (`start` no Windows, `open` no macOS).
- **🚨 Princípio da Tangibilidade Absoluta (Anti-Alucinação de Chat):**
  - Proibição estrita de simular artefatos (`[CRIADO]`) em texto solto no chat da IA sem gravá-los fisicamente no disco com `write_to_file`.
  - Obrigatoriedade de fornecer links clicáveis locais (`file:///...`) no chat para visualização humana imediata.
- **🛑 Regra de Bloqueio Rígido do Turno 1 (Stop Rule):**
  - Governança com Rota B como padrão soberano ao acionar `@hybrid-orchestrator` sem `--fast`.
  - Proibição absoluta de chamar ferramentas de modificação/criação de código no Turno 1 até resposta expressa "OK" do usuário no Turno 2.

---

## [2.0.0] - 2026-09-28 — 🏆 Ecossistema Pleno 10.0/10 (Ultimate Release)

### ✨ Adicionado & Aprimorado (Todas as 6 Skills com Nota 10.0/10)
- **`hybrid-orchestrator` (Elevado para 10.0/10):**
  - Adicionado `scripts/snapshot.js`: Gerenciador atômico de snapshots git (`git stash create`) com rollback automático e instantâneo (`snapshot.js rollback`).
  - Adicionado `scripts/falsify.js`: Test runner automatizado para os 5 vetores de ataque adversário (detecção de loops assíncronos/anti-N+1, timeouts, valores extremos/boundary values, concorrência e integridade transacional).
  - Adicionado `scripts/preview-plan.js`: Visualizador gráfico ASCII do quadro dos 4 Quadrantes (Q1 Contratos, Q2 Concorrência, Q3 UI, Q4 Segurança) para aprovação de plano no Turno 1.
- **`security-audit` (Elevado para 10.0/10):**
  - Adicionada flag `--fix` ao `scripts/audit.js` para autocorreção imediata de vulnerabilidades de reverse tabnabbing (`rel="noopener noreferrer"`) e cookies inseguros (`HttpOnly; Secure; SameSite=Lax`).
  - Adicionada flag `--sarif` para exportação de relatórios no padrão industrial OASIS SARIF v2.1.0 para integração direta com GitHub Code Scanning e GitLab SAST.
  - Adicionado `scripts/install-hook.js`: Instalador automático de Git Hook pre-commit bloqueante contra vazamento acidental de credenciais e falhas críticas.
- **`repo-cartographer` (Elevado para 10.0/10):**
  - Adicionado comando `cartographer.js mermaid <file>` para geração instantânea de diagramas de fluxo arquiteturais em formato Mermaid (`flowchart TD`).
  - Adicionado comando `cartographer.js callers <file>` para análise reversa de blast radius (rastreia todos os arquivos dependentes de um módulo específico).
  - Adicionado `scripts/preview-graph.js`: Canvas interativo web no navegador com física de nós arrastáveis, filtro de camadas (L1 a L6) e destaque de caminhos de dependência.
- **`route-guard` (Elevado para 10.0/10):**
  - Adicionado `scripts/generate-contract.js`: Gerador automatizado de esquemas de validação de runtime (Zod), interfaces estáticas TypeScript e defensas tipadas contra breaking changes.
  - Adicionado `scripts/mock-route.js`: Servidor Mock HTTP zero-dependency com CORS total liberado, latência de rede simulada e responses estruturadas em menos de 1 segundo para descarrego do time de frontend.
- **Documentação e Governança:**
  - Adicionada a seção `## 🏆 O Motivo da Nota 10.0/10 de Cada Skill` no `README.md` raiz, detalhando os critérios técnicos e diferenciais práticos de cada ferramenta.
  - 100% de cobertura nos testes funcionais e unitários de todas as 6 skills (`npm test`).

---

## [1.3.0] - 2026-09-28 — 📱 Mobile Converter & Simulador de Smartphone (Nota 10.0/10)

### ✨ Adicionado
- **Nova Skill: `mobile-converter` (Nota 10.0/10):**
  - Metamorfose de tabelas desktop em pilhas de cards táteis com badges (`ResponsiveTableToCards.tsx`).
  - Navegação inferior estilo iOS (`MobileBottomNav.tsx`) posicionada na Thumb Zone natural do polegar.
  - Gavetas deslizantes estilo gaveta nativa (`BottomSheet.tsx`) com suporte a gestos verticais `drag="y"`.
  - Linhas com swipe lateral estilo WhatsApp/Mail (`SwipeableRow.tsx`).
  - Regras rígidas de ergonomia móvel: touch targets de 44×44px, safe areas de hardware (`env(safe-area-inset-bottom)`), viewport dinâmico (`100dvh`) e prevenção de auto-zoom no iOS Safari com `font-size: 16px`.
  - `scripts/preview-mobile.js`: Servidor e simulador web interativo de smartphone com molduras realistas de iPhone 15 Pro, iPhone SE e Galaxy S24 com Dynamic Island e Home Bar.
  - `scripts/mobile-audit.js`: Motor determinístico com cálculo do Mobile Readiness Score (0-100) e flag `--fix` para autocorreção de viewport e safe areas.
  - `scripts/adapt-screen.js`: Gerador de receitas passo a passo para conversão de componentes legados.

---

## [1.2.0] - 2026-09-28 — 🎨 Frontend Craftsman 10.0/10 & Matriz Inter-Skills

### ✨ Adicionado
- **Elevação do `frontend-craftsman` para a Nota 10.0/10:**
  - `scripts/preview-spec.js`: Servidor web local que abre no navegador uma interface interativa viva com botões táteis, tabs deslizantes e spotlight cards antes de codificar.
  - Suporte nativo a Tailwind CSS v4 (`@theme`) e Tailwind v3 clássico no exportador de paletas (`craft-palette.js`).
  - Presets de paletas Light calibradas (`stripe-clean-light`, `linear-light`) com escala tonal precisa.
  - Catálogo de componentes táteis de alta fidelidade: `ContentSkeleton.tsx` (anti-CLS), `MagneticButton.tsx`, `SpotlightCard.tsx`, `SmoothAccordion.tsx`.
- **Arquitetura & Visualização:**
  - Criação da **Matriz de Comunicação Inter-Skills** no README com tabela de handshakes tipados (`.code-map/handshake.json`, etc.).
  - Quebra e otimização dos diagramas Mermaid em pilhas verticais legíveis para GitHub com quebras `<br/>`.

---

## [1.1.0] - 2026-09-28 — 🖌️ Lançamento do Frontend Craftsman (Design Engineering)

### ✨ Adicionado
- **Nova Skill: `frontend-craftsman`:**
  - Erradicação de "AI Slop UI" (eliminação de gradientes roxos genéricos e blurs soltos).
  - Física de molas real do Framer Motion (`layoutId="active-pill"`, `stiffness: 450, damping: 30`).
  - Gerador de especificação visual (`scripts/generate-spec.js`) produzindo `DESIGN_SPEC.md` estruturado.
  - Motor determinístico de auditoria visual (`scripts/craft-audit.js`) com Craftsmanship Score (0-100).
  - Elo simbiótico bidirecional com o `hybrid-orchestrator` (Design-First e Engineering-First).

---

## [1.0.0] - 2026-09-28 — 🚀 Fundação do Ecossistema Enterprise AI Skills

### ✨ Adicionado
- **Infraestrutura Monorepo:**
  - Instalador unificado em comando único (`install.js`) com suporte simultâneo a **Google Antigravity**, **Claude Code** e **Cursor Rules**.
  - Pipeline de CI/CD multi-versão no **GitHub Actions** (`.github/workflows/ci.yml`) testando em Node.js 18, 20 e 22.
  - Test runner universal (`scripts/test-all.js`) para validação cruzada de todas as skills.
- **`hybrid-orchestrator`:** Orquestrador com classificação tripla (Rotas A, B e C), Sabatina dos 4 Quadrantes, Trava de Permissão em 2 Turnos, Âncoras Anti-Prompt-Drift e Falsifier adversário.
- **`repo-cartographer`:** Cartografia 360° em 6 camadas da UI ao Banco, resolução de path aliases (`@/`), barrels e ciclos de dependência.
- **`route-guard`:** Análise cirúrgica de rotas no backend e rastreamento de consumidores no frontend (Blast Radius).
- **`security-audit`:** Auditoria DevSecOps com os 18 pilares OWASP em modo estritamente somente-leitura e mascaramento de segredos.
- **Documentação Global:** Scorecard técnico, manuais de uso, slash commands (`/`) e regras contextuais (`@`).
