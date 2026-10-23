---
name: frontend-craftsman
description: Engenharia de Front-end, UX de Produto e Orquestração Multi-Engine de Animações (Design Engineer). Elimina a 'cara de IA' e produz interfaces artesanais 120fps/0-rerender com Motion (Framer Motion v12), GSAP (useGSAP/Flip/ScrollTrigger), AutoAnimate, View Transitions API, Radix/Tailwind, Psicologia de UX e Dual-Theme nível Linear/Stripe/Apple/Raycast.
---

# 🎨 Frontend Craftsman — Protocolo de Design Engineering, UX & Motion (v4.0)

O **Frontend Craftsman** é o protocolo de engenharia de interface (*Design Engineering*), psicologia de UX e animação de alta performance projetado para erradicar o **"AI Slop UI & UX"** (interfaces genéricas, lentas, sem alma e com usabilidade amadora). Ele estabelece regras determinísticas para construir aplicações web que pareçam esculpidas manualmente por equipes de elite (**Linear, Apple, Stripe, Raycast, Vercel e Emil Kowalski / Rauno Freiberg**).

> 📚 Núcleo apenas. Código, tabelas e leis completas estão em `references/` — abra cada arquivo **somente** no gatilho indicado em **📚 Referências**.

## Quando ativar

Qualquer criação ou alteração de tela, componente, estilo, tema, animação ou fluxo de UX (`.tsx`, `.jsx`, `.vue`, `.svelte`, `.css`, `.html`).

---

## 🚫 Regras Inegociáveis (resumo — os 10 vícios do AI Slop)

1. **Paleta:** monocromática (Zinc/Slate) + **1 única cor de acento** (< 5% da área). Proibido roxo neon (`from-purple-600 to-indigo-600`) e `backdrop-blur` sem critério.
2. **Dual-Theme:** proibido texto branco fixo (`color: #fff`, `text-white` sem `dark:`) e superfícies fantasma (`bg-white/5`, `border-white/10` sem `dark:`). Contraste WCAG AA >= 4.5:1 nos **dois** temas. Regra 60-30-10 (canvas `#f8fafc`/`#09090b`, nunca `#000000`).
3. **Motion 120fps:** proibido `transition-all` — use `transition-colors`/`transition-transform`/`transition-opacity`; anime só `transform`/`opacity`; molas calibradas (`SPRINGS`), nunca curvas lineares em interações táteis.
4. **Zero Re-renders:** proibido `useState` em `onMouseMove`/`onScroll` — use `useMotionValue` + `useSpring` + `useMotionTemplate`.
5. **Listas vivas:** `useAutoAnimate` ou `<AnimatePresence mode="popLayout">` + `layout`.
6. **UX Defensiva:** proibido `window.alert`/`confirm`/`prompt` — use `HoldToConfirmButton` (1.2s) ou `MorphingDialog`; erros via `StackedToast`.
7. **5 Estados obrigatórios:** Skeleton content-aware, Empty State com CTA, Filtered Empty State (`Limpar filtros`), Error com `Tentar novamente`, Populated.
8. **Optimistic UI:** ações frequentes refletem em < 16ms (limiar de Doherty < 400ms), com rollback suave em falha.
9. **Micro-tipografia:** `tabular-nums` em todo preço/KPI/coluna numérica; títulos `text-balance`, parágrafos `text-pretty max-w-[65ch]`.
10. **Keyboard-First:** `⌘K` (`CommandPalette`), setas, `Escape`, `focus-visible:ring-2` (nunca `outline-none` sozinho); `useReducedMotion()` respeitado.

---

## 🧭 Fluxo de Decisão — Engine certa para a física certa

| Cenário | Engine |
| :--- | :--- |
| Botões, abas, modais, morphing (`layoutId`) | **Motion** (`framer-motion` / `motion/react`) |
| Tracking de mouse, spotlight, tilt 3D | **Motion GPU Values** (`useMotionValue` + `useMotionTemplate`) |
| Listas CRUD, filtros, tags | **AutoAnimate** (`@formkit/auto-animate`) |
| Timelines, scroll scrubbing, grid FLIP | **GSAP** (`useGSAP`, `Flip`, `ScrollTrigger`) |
| Rolagem suave de página | **Lenis** (`<ReactLenis root>` + `data-lenis-prevent` em scroll interno) |
| Troca de tema, popovers nativos | **CSS moderno** (`document.startViewTransition`, `@starting-style`) |

Fluxo: identifique o cenário → abra a referência da engine → reutilize um template de `templates/` quando existir → aplique as regras dual-theme e os 5 estados → rode `craft-audit.js` e `visual-check.js` → feche o checklist final.

---

## 🛠️ 5. Ferramentas Determinísticas da Skill

### 1. Auditoria Estática de UI, UX & Motion (`craft-audit.js v4.0.0`)
Audita arquivos CSS, Styled-Components e Tailwind/TSX contra vícios de Light Mode, contraste WCAG, `transition-all`, re-render thrashing em `onMouseMove`/`onScroll`, diálogos nativos (`alert`/`confirm`) e falta de `tabular-nums`:
```bash
node frontend-craftsman/scripts/craft-audit.js src/ --json
```

### 2. Verificação Visual Headless (`visual-check.js`)
Executa o Playwright em modo headless para auditar a interface renderizada real em 4 combinações (Desktop/Mobile × Light/Dark):
```bash
node frontend-craftsman/scripts/visual-check.js .craft/preview.html
node frontend-craftsman/scripts/visual-check.js http://localhost:3000 --json
```

### 3. Preview Visual Interativo Instantâneo (`preview-spec.js`)
Gera `.craft/preview.html` com demonstração viva de **View Transition Theme Toggle**, **Spotlight Card**, **Animated Tabs**, **Spring Number Ticker**, **Hold-to-Confirm Button** e **Stacked Toast**:
```bash
node frontend-craftsman/scripts/preview-spec.js DESIGN_SPEC.md
```

### 4. Gerador de Especificação Visual (`generate-spec.js`) & Paletas (`craft-palette.js`)
```bash
node frontend-craftsman/scripts/generate-spec.js "Nome da Tela" --preset=linear-dark
node frontend-craftsman/scripts/craft-palette.js stripe-clean-light --format=tailwind-v4
```

---

## 📋 Checklist de Validação Final (Critérios de Aceite)

Antes de considerar qualquer tela ou ajuste pronto:
- [ ] **Coerência Dual-Theme:** Zero texto branco sobre fundo claro; zero superfícies brancas translúcidas soltas no modo claro; contraste WCAG AA >= 4.5:1 nos dois temas.
- [ ] **Performance de Movimento (120fps):** Zero `transition-all`; zero `useState` dentro de `onMouseMove`/`onScroll` (usar `useMotionValue`).
- [ ] **Arquitetura dos 5 Estados de UX:** Skeletons content-aware (`ContentSkeleton.tsx`), Empty State acionável (`EmptyStateCard`), Filtered Empty State e Error Retry implementados.
- [ ] **UX Defensiva & Micro-Tipografia:** Zero `window.alert`/`confirm` (usar `HoldToConfirmButton` ou `MorphingDialog`); classe `tabular-nums` aplicada em preços, métricas e tabelas numéricas.
- [ ] **Auditoria Aprovada:** `craft-audit.js` com score **>= 90/100** (zero erros) e `visual-check.js` sem sobreposições ou falhas de contraste.

---

## 📚 Referências (carregar sob demanda)

- Antes de escrever qualquer animação, mola, tracking de ponteiro, GSAP/Flip, Lenis ou View Transition → leia [references/motion-engines.md](references/motion-engines.md).
- Antes de implementar listagens, dashboards, estados vazios/erro, ações otimistas, confirmações destrutivas, atalhos `⌘K` ou dados numéricos → leia [references/ux-psychology.md](references/ux-psychology.md).
- Antes de estilizar cards, superfícies, bordas, sombras, paleta ou tema claro/escuro → leia [references/dual-theme-surfaces.md](references/dual-theme-surfaces.md).
- Antes de criar um componente do zero (para verificar se já existe template pronto em `templates/`) → leia [references/templates-catalog.md](references/templates-catalog.md).
- Ao revisar/auditar UI existente ou explicar por que um padrão é "AI Slop" → leia [references/ai-slop-diagnosis.md](references/ai-slop-diagnosis.md).
