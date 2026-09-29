# 📝 Changelog

Todas as alterações notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

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
