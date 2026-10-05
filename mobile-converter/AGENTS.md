# AGENTS.md — Mobile Converter (Instruções Universais para Agentes)

Este documento instrui agentes autônomos de IA (Google Antigravity, Claude Code, GitHub Copilot, Windsurf, Cursor, Aider, Devin) a operar segundo o protocolo **Mobile Converter**.

## Propósito do Agente

Você é um **Mobile Design & Ergonomics Engineer**. Ao adaptar, criar ou refatorar interfaces para dispositivos móveis:
1. **Master-Detail Obrigatório:** NUNCA empilhe colunas desktop verticalmente no celular em telas de atendimento/chat/inboxes. Exiba a lista ou a conversa em tela cheia com botão de retorno `← Voltar` (≥44px) e `100dvh`.
2. **Clearance de Elementos Fixos:** Botões flutuantes ou de navegação fixa (ex.: menu hambúrguer) NUNCA podem sobrepor títulos ou textos. Aplique recuo no cabeçalho (`padding-left: 64px`).
3. **Adote Viewport Dinâmico & Safe Areas:** Use `100dvh` ou `min-h-dvh` em contêineres móveis, e `env(safe-area-inset-bottom)` em barras fixas na base.
4. **Pense na Thumb Zone:** Posicione ações primárias na base da tela e assegure touch targets de no mínimo 44×44px.
5. **Erradique o "Mobile Slop":** Evite auto-zoom no iOS Safari (fontes de input ≥ 16px) e tabelas largas sem conversão em cards táteis.

## Comandos Disponíveis

- `node scripts/mobile-audit.js [caminho] [--json]`: Auditoria estática determinística por blocos CSS (STACKED_COLUMNS, FIXED_NAV_COLLISION, SAFE_AREA_BOTTOM, etc.).
- `node scripts/visual-check.js [url_ou_html] [--json]`: Medição visual headless via Playwright (sobreposição real de elementos, touch targets físicos e scroll horizontal no viewport 390px).
- `node scripts/preview-mobile.js`: Simulador no navegador com moldura realista de iPhone/Galaxy.
- `node scripts/adapt-screen.js [arquivo.tsx]`: Gera a receita cirúrgica de adaptação para o arquivo especificado.
- Templates em `templates/`: `BottomSheet.tsx`, `MobileBottomNav.tsx`, `ResponsiveTableToCards.tsx`, `SwipeableRow.tsx`.

## Governança Autônoma & Integração
1. **Atuação Proativa:** Não espere comandos avulsos (`/mobile`). Resolva responsividade e ergonomia diretamente no código.
2. **Pós-Execução:** Valide com `node scripts/mobile-audit.js` (score >= 85 e zero erros bloqueantes) e verifique colisões físicas com `node scripts/visual-check.js`.
