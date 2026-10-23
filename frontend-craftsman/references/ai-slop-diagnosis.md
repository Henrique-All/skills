# Diagnóstico: Os 10 Vícios do "AI Slop UI & UX"

> Referência carregada sob demanda pelo `SKILL.md` do Frontend Craftsman (seção "🛑 O Diagnóstico" original, movida na íntegra).

## 🛑 O Diagnóstico: Os 10 Vícios do "AI Slop UI & UX"

Quando IAs geram front-end sem governança de Design Engineering, elas cometem invariavelmente estes 10 erros:

| # | Vício da IA Genérica | O Que a IA Faz | Padrão Frontend Craftsman |
| :- | :--- | :--- | :--- |
| **1** | **Síndrome do Roxo Neon** | `from-purple-600 to-indigo-600` em botões, títulos e bordas. | Paleta monocromática profunda (Zinc/Slate) com **1 única cor de destaque** cirúrgica (< 5% da área visual). |
| **2** | **Glassmorphism Sem Critério** | `backdrop-blur-md bg-white/5 rounded-3xl` em tudo sem hierarquia. | Superfícies em camadas com bordas de 1px (`border-zinc-200/80 dark:border-white/[0.08]`) e **inner highlight** de chanfro físico. |
| **3** | **Light Mode Quebrado** | Texto `text-white` fixo e card `bg-white/5` que ficam invisíveis no modo claro. | **Coerência Estrita Dual-Theme:** Contraste WCAG AA (4.5:1) garantido tanto no Light quanto no Dark Mode. |
| **4** | **Animações CPU-Bound (`transition-all`)** | `transition-all duration-300 ease-in-out` causando engasgos de layout. | **Multi-Engine 120fps:** Molas físicas calibradas, `transition-colors`/`transition-transform` e animações restritas à GPU (`transform`, `opacity`). |
| **5** | **Re-render Thrashing no Mouse** | `useState({ x, y })` dentro de `onMouseMove` ou `onScroll` (60 re-renders/s). | **Zero Re-renders:** Uso obrigatório de `useMotionValue`, `useSpring` e `useMotionTemplate` (atualização direta no DOM/GPU). |
| **6** | **Listas Secas Sem Fluidez** | Itens aparecem/somem em listas CRUD com corte seco no DOM. | **AutoAnimate (`useAutoAnimate`)** em listas de 1 linha ou `<AnimatePresence mode="popLayout">` + `layout`. |
| **7** | **Diálogos Nativos Amadores** | Uso de `window.alert()` ou `window.confirm('Deseja excluir?')`. | **UX Tátil Defensiva:** `HoldToConfirmButton` (segurar por 1.2s), `MorphingDialog` (`layoutId`) ou `StackedToast` 3D. |
| **8** | **Esquecimento dos 5 Estados de UX** | Só codifica o "caminho feliz" e um `"Carregando..."` em texto puro. | **Arquitetura Completa de 5 Estados:** Skeleton content-aware, Empty State com CTA, Filtered Empty State, Error Retry e Populated State. |
| **9** | **Números Dançantes em Tabelas/KPIs** | Preços, contadores e tabelas sem alinhamento numérico monoespaçado. | **Micro-Tipografia Funcional:** `tabular-nums` obrigatório em todo dado numérico/financeiro e `SpringNumberTicker` em métricas. |
| **10** | **Falta de Atalhos e Foco (`⌘K`)** | Elementos com `outline-none` sem `focus-visible` e zero suporte a teclado. | **Keyboard-First:** `CommandPalette` (`⌘K`), navegação por setas (`ArrowUp`/`Down`), `Escape` e `focus-visible:ring-2`. |
