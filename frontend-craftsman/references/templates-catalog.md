# Catálogo de 10 Templates Artesanais (`templates/`)

> Referência carregada sob demanda pelo `SKILL.md` do Frontend Craftsman (Seção 4 original, movida na íntegra). Os links apontam para `../templates/` a partir desta pasta.

## 🧩 4. Catálogo de 10 Templates Artesanais (`templates/`)

Todos os templates são **100% Dual-Theme (Light + Dark)**, possuem **Zero Re-renders em tracking de ponteiro**, acessibilidade **WAI-ARIA** e respeito a **`useReducedMotion()`**:

| Template | Categoria | O Que Resolve |
| :--- | :--- | :--- |
| [`SpotlightCard.tsx`](../templates/SpotlightCard.tsx) | Superfície GPU | Iluminação radial reativa ao cursor via `useMotionValue` + `useMotionTemplate` (**0 re-renders**). |
| [`MagneticButton.tsx`](../templates/MagneticButton.tsx) | Micro-interação | Atração magnética ao cursor via `useSpring` (120fps) com variantes `primary`, `secondary`, `ghost`. |
| [`AnimatedTabs.tsx`](../templates/AnimatedTabs.tsx) | Navegação | Abas deslizantes com `layoutId`, setas do teclado (`ArrowLeft`/`Right`), contadores e `startViewTransition`. |
| [`SmoothAccordion.tsx`](../templates/SmoothAccordion.tsx) | Layout Fluido | Sanfona com altura animada por mola, ícone vetorial rotativo e `aria-expanded`. |
| [`ContentSkeleton.tsx`](../templates/ContentSkeleton.tsx) | Estados de UX | `ShimmerBlock`, `CardSkeleton`, `TableRowSkeleton` e `EmptyStateCard` acionável (Zero CLS). |
| [`CommandPalette.tsx`](../templates/CommandPalette.tsx) | UX Keyboard-First | Paleta `⌘K` / `Ctrl+K` estilo Linear/Raycast com busca instantânea, setas, `layoutId` e `<kbd>`. |
| [`MorphingDialog.tsx`](../templates/MorphingDialog.tsx) | Shared Layout | Card/Botão que se expande fisicamente transformando-se no Modal via `layoutId` compartilhado. |
| [`SpringNumberTicker.tsx`](../templates/SpringNumberTicker.tsx) | Micro-Tipografia | Contador numérico interpolado por mola (`useSpring` + `Intl.NumberFormat` + `tabular-nums`) para KPIs/preços. |
| [`StackedToast.tsx`](../templates/StackedToast.tsx) | Feedback / Optimistic | Pilha 3D de notificações estilo Sonner que colapsa em cascata (`scale`, `y`) e expande no hover. |
| [`HoldToConfirmButton.tsx`](../templates/HoldToConfirmButton.tsx) | UX Defensiva | Botão para ações destrutivas ("Segure para excluir" por 1.2s com barra de mola), eliminando `window.confirm`. |
