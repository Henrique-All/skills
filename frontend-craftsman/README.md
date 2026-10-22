# 🎨 Frontend Craftsman — Design Engineering, UX & Multi-Engine Motion (v4.0)

> **Elimine o "AI Slop UI & UX" e construa interfaces artesanais 120fps / 0 Re-renders com Motion (Framer Motion v12), GSAP (`useGSAP`/`Flip`), AutoAnimate, View Transitions API, Radix UI, Tailwind e Psicologia de UX nível Linear, Apple, Stripe e Raycast.**

[![Status](https://img.shields.io/badge/status-active-emerald.svg)]()
[![Version](https://img.shields.io/badge/version-4.0.0-amber.svg)]()
[![Platform](https://img.shields.io/badge/platform-Antigravity%20|%20Claude%20|%20Cursor%20|%20Windsurf-blue.svg)]()

---

## 💡 Por Que Esta Skill Existe?

Quando IAs geram código de front-end sem governança de Design Engineering, elas repetem os mesmos vícios visuais e de usabilidade:
- Gradientes roxos/índigo (`from-purple-600 to-indigo-600`) e `backdrop-blur` exagerado sem contraste;
- Modo Claro quebrado (`text-white` sobre fundo branco e `bg-white/5` invisível);
- Engasgos de CPU com `transition-all` e `useState` dentro de `onMouseMove` (60 re-renders/s);
- Ausência dos 5 estados de UX (Skeleton, Empty State, Filtered Empty, Error Retry, Data);
- Uso amador de `window.confirm()` / `window.alert()` e números dançantes sem `tabular-nums`.

O **Frontend Craftsman v4.0** governa **UI + UX + Motion Multi-Engine** com auditoria estática e visual determinística.

---

## ⚡ Matriz Multi-Engine de Animação & UX

| Necessidade | Solução Frontend Craftsman v4.0 |
| :--- | :--- |
| **Micro-interações & Morphing** | **Motion (`framer-motion`)** com molas físicas calibradas, `layoutId` e `AnimatePresence` |
| **Tracking de Mouse / Spotlight (0 Re-renders)** | `useMotionValue` + `useSpring` + `useMotionTemplate` direto na GPU |
| **Listas CRUD & Filtros** | **AutoAnimate (`@formkit/auto-animate`)** em 1 linha (`useAutoAnimate()`) |
| **Timelines, Scroll & Grid FLIP** | **GSAP (`useGSAP`, `Flip`, `ScrollTrigger`)** + **Lenis Smooth Scroll** |
| **Troca de Tema & Popovers Nativos** | **View Transitions API (`startViewTransition`)** com reveal circular + `@starting-style` |
| **Confirmação de Ações Destrutivas** | **`HoldToConfirmButton.tsx`** (segurar por 1.2s com barra de mola) em vez de `window.confirm` |
| **Métricas, Preços e KPIs** | **`SpringNumberTicker.tsx`** + `tabular-nums` obrigatório |

---

## 🧩 Catálogo de 10 Templates Artesanais Dual-Theme (`templates/`)

1. **`SpotlightCard.tsx`**: Card Dual-Theme com iluminação radial via `useMotionValue` + `useMotionTemplate` (0 re-renders).
2. **`MagneticButton.tsx`**: Botão com atração elástica `useSpring` (0 re-renders) e variantes Dual-Theme.
3. **`AnimatedTabs.tsx`**: Abas deslizantes com `layoutId`, setas do teclado (`ArrowLeft`/`Right`) e `startViewTransition`.
4. **`SmoothAccordion.tsx`**: Sanfona fluida com altura animada por mola e chevron vetorial SVG.
5. **`ContentSkeleton.tsx`**: `ShimmerBlock`, `CardSkeleton`, `TableRowSkeleton` e `EmptyStateCard` acionável.
6. **`CommandPalette.tsx`**: Paleta de comandos `⌘K` estilo Linear/Raycast com busca, setas e `layoutId`.
7. **`MorphingDialog.tsx`**: Trigger/Card que se expande fisicamente transformando-se no Modal via `layoutId`.
8. **`SpringNumberTicker.tsx`**: Contador numérico animado por mola com `Intl.NumberFormat` e `tabular-nums`.
9. **`StackedToast.tsx`**: Notificações empilhadas em 3D (estilo Sonner) expansíveis no hover.
10. **`HoldToConfirmButton.tsx`**: Botão tátil "Segure para confirmar" com barra de progresso em mola.

---

## 🛠️ Ferramentas CLI Inclusas

```bash
# 1. Auditoria Estática v4.0 (Dual-Theme, Contraste WCAG, Motion & UX)
node scripts/craft-audit.js src/

# 2. Verificação Visual Headless no Browser (Playwright 4 Viewports)
node scripts/visual-check.js .craft/preview.html

# 3. Preview Visual Interativo Instantâneo
node scripts/preview-spec.js DESIGN_SPEC.md

# 4. Especificação de Design & Gerador de Paletas
node scripts/generate-spec.js "Central Financeira" --preset=linear-dark
node scripts/craft-palette.js stripe-clean-light --format=tailwind-v4
```

---

## 🧪 Validação dos Testes

```bash
npm test
```
