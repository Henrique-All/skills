---
name: frontend-craftsman
description: Engenharia de Front-end, UX de Produto e Orquestração Multi-Engine de Animações (Design Engineer). Elimina a 'cara de IA' e produz interfaces artesanais 120fps/0-rerender com Motion (Framer Motion v12), GSAP (useGSAP/Flip/ScrollTrigger), AutoAnimate, View Transitions API, Radix/Tailwind, Psicologia de UX e Dual-Theme nível Linear/Stripe/Apple/Raycast.
---

# 🎨 Frontend Craftsman — Protocolo de Design Engineering, UX & Motion (v4.0)

O **Frontend Craftsman** é o protocolo de engenharia de interface (*Design Engineering*), psicologia de UX e animação de alta performance projetado para erradicar o **"AI Slop UI & UX"** (interfaces genéricas, lentas, sem alma e com usabilidade amadora). Ele estabelece regras determinísticas para construir aplicações web que pareçam esculpidas manualmente por equipes de elite (**Linear, Apple, Stripe, Raycast, Vercel e Emil Kowalski / Rauno Freiberg**).

---

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

---

## ⚡ 1. Matriz Multi-Engine de Animação (120fps / 0 Re-renders)

Uma única biblioteca não resolve todos os problemas de movimento. O Design Engineer escolhe a **engine certa para a física certa**:

| Cenário de Interface | Engine Recomendada | Primitivo / API Chave | Por quê? |
| :--- | :--- | :--- | :--- |
| **Micro-interações, Botões, Abas, Modais e Morphing** | **Motion** (`framer-motion` / `motion/react`) | `whileTap`, `layoutId`, `AnimatePresence`, `useSpring` | Física de mola interrompível real (conserva velocidade se o usuário mudar de direção no meio). |
| **Tracking de Mouse, Spotlight, Tilt 3D, Cursores** | **Motion GPU Values** | `useMotionValue` + `useMotionTemplate` | **0 re-renders do React.** Atualiza variáveis CSS/estilos diretamente no compositor a 120fps. |
| **Listas CRUD, Filtros de Tabela, Tags, Formulários** | **AutoAnimate** (`@formkit/auto-animate`) | `const [parent] = useAutoAnimate()` | **1 linha de código**, zero configuração, anima inserção, remoção e reordenação automaticamente. |
| **Timelines Multi-Etapas, Scroll Scrubbing, Grid FLIP** | **GSAP** (`gsap` + `@gsap/react`) | `useGSAP()`, `gsap.timeline()`, `ScrollTrigger`, `Flip` | Controle cirúrgico de tempo, pinning de seções e transição FLIP de grids complexos. |
| **Rolagem Suave de Página (Marketing / Dashboards)** | **Lenis** (`lenis/react`) | `<ReactLenis root>` + `data-lenis-prevent` | Inércia sedosa sincronizada com `requestAnimationFrame` sem sequestrar barras de scroll nativas. |
| **Troca de Tema Dark/Light, Popovers Nativos, Entrada CSS** | **CSS Moderno & Web APIs** | `document.startViewTransition`, `@starting-style` | Zero bundle JS adicional, executado 100% na thread do compositor do navegador. |

---

### 1.1 Motion (`framer-motion` / `motion/react`) — Molas & Zero Re-renders

**NUNCA** use curvas lineares ou `transition-all` em interações táteis. Utilize os presets calibrados:

```typescript
export const SPRINGS = {
  // Cliques em botões, switches, checkboxes, hover magnético
  snappy: { type: 'spring' as const, stiffness: 450, damping: 30, mass: 0.8 },
  // Modais, drawers, command palettes, popovers
  gentle: { type: 'spring' as const, stiffness: 320, damping: 28, mass: 0.9 },
  // Abas deslizantes (layoutId), Morphing Dialogs, expansão de cards
  layout: { type: 'spring' as const, stiffness: 380, damping: 32 },
  // Toasts empilhados, elementos flutuantes
  float:  { type: 'spring' as const, stiffness: 220, damping: 24 },
};
```

#### 🚨 Regra de Ouro de Performance: Proibido `useState` em `onMouseMove` / `onScroll`
Atualizar estado do React em eventos que disparam 60–120 vezes por segundo destrói o frame budget. Use sempre `useMotionValue` + `useMotionTemplate`:

```tsx
// ❌ PROIBIDO (60 re-renders por segundo da árvore React):
const [pos, setPos] = useState({ x: 0, y: 0 });
onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}

// ✅ OBRIGATÓRIO (0 re-renders — direto na GPU):
const mouseX = useMotionValue(0);
const mouseY = useMotionValue(0);
const background = useMotionTemplate`radial-gradient(380px circle at ${mouseX}px ${mouseY}px, var(--spotlight), transparent 75%)`;
```

#### Morphing de Elementos Compartilhados (`layoutId`)
- Para fazer um **botão/card se expandir e virar um modal** (veja `templates/MorphingDialog.tsx`), dê o mesmo `layoutId="dialog-card"` para o gatilho e para o container do modal dentro de `<AnimatePresence>`.
- Para **abas e listas de comando** (`templates/AnimatedTabs.tsx` e `templates/CommandPalette.tsx`), use uma pílula absoluta com `layoutId` e `transition={SPRINGS.layout}`.

---

### 1.2 AutoAnimate (`@formkit/auto-animate`) — Listas Vivas com 1 Linha

Em qualquer lista onde itens são adicionados, filtrados, ordenados ou excluídos (tarefas, linhas de tabela, anexos, filtros ativos):

```tsx
import { useAutoAnimate } from '@formkit/auto-animate/react';

export function TaskList({ items }: { items: Item[] }) {
  const [listRef] = useAutoAnimate<HTMLUListElement>({ duration: 220 });
  return (
    <ul ref={listRef} className="divide-y divide-zinc-200 dark:divide-white/[0.06]">
      {items.map((item) => <li key={item.id}>{item.title}</li>)}
    </ul>
  );
}
```

---

### 1.3 GSAP (`gsap` + `@gsap/react`) — Timelines, `Flip` e `ScrollTrigger`

Quando houver sequência coreografada multi-elemento, mudança abrupta de layout CSS Grid (ex: alternar visualização Lista ➔ Kanban) ou narrativa de scroll:

```tsx
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(Flip);

export function ViewSwitcherGrid({ viewMode }: { viewMode: 'grid' | 'list' }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { contextSafe } = useGSAP({ scope: containerRef });

  const toggleLayout = contextSafe((nextChange: () => void) => {
    const state = Flip.getState('.grid-card');
    nextChange(); // Altera estado/DOM
    requestAnimationFrame(() => {
      Flip.from(state, {
        duration: 0.45,
        ease: 'power3.out',
        stagger: 0.02,
        absolute: true,
      });
    });
  });

  return <div ref={containerRef}>...</div>;
}
```

> ⚠️ **Regra Lenis + Scroll Interno:** Se usar `<ReactLenis root>`, adicione **sempre** o atributo `data-lenis-prevent` em qualquer modal, `<CommandPalette>`, tabela com scroll próprio ou janela de mensagens de chat, para que o scroll da roda do mouse funcione nativamente dentro do componente.

---

### 1.4 CSS Nativo Moderno (View Transitions API & `@starting-style`)

1. **Alternância de Tema (Light ⇄ Dark) com Reveal Circular:**
   ```typescript
   export function toggleThemeWithReveal(event: React.MouseEvent, applyTheme: () => void) {
     if (!('startViewTransition' in document) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
       applyTheme();
       return;
     }
     const x = event.clientX;
     const y = event.clientY;
     const endRadius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
     const transition = (document as any).startViewTransition(() => applyTheme());
     transition.ready.then(() => {
       document.documentElement.animate(
         { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] },
         { duration: 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', pseudoElement: '::view-transition-new(root)' }
       );
     });
   }
   ```
2. **Animação de Entrada em CSS Puro (`@starting-style`):**
   Para elementos nativos `<dialog>` ou `[popover]` sem depender de JS:
   ```css
   dialog[open] {
     opacity: 1;
     transform: scale(1) translateY(0);
     transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                 overlay 0.2s allow-discrete, display 0.2s allow-discrete;
     @starting-style {
       opacity: 0;
       transform: scale(0.96) translateY(6px);
     }
   }
   ```

---

## 🧠 2. Engenharia de UX & Psicologia de Produto (Nível Linear / Stripe)

Uma interface bonita que trava o fluxo do usuário ou esconde estados críticos é um fracasso de engenharia. Aplique estas **5 Leis de UX de Produto**:

### Lei 2.1 — Arquitetura Obrigatória dos 5 Estados de Tela
Nenhuma listagem, dashboard ou visão de dados pode ser entregue apenas com o estado "cheio". Você **DEVE** implementar:
1. **Loading (`Content-Aware Skeleton`):** Usa `ContentSkeleton.tsx` imitando a geometria exata da tela final (CLS = 0). **Proibido** spinner centralizado solto.
2. **Empty State Primário (Zero Dados na Conta):** Card limpo (`EmptyStateCard`) explicando o valor da funcionalidade com um botão CTA primário imediato (ex.: *"+ Criar primeiro projeto"*).
3. **Filtered Empty State (Busca/Filtro sem resultados):** Quando `items.length > 0` mas `filteredItems.length === 0`, mostre *"Nenhum resultado para 'X'"* acompanhado do botão tátil **`Limpar filtros`**.
4. **Error State Recuperável:** Banner inline com a causa legível, botão **`Tentar novamente`** e preservação total do que o usuário já digitou.
5. **Populated State (Densidade Calibrada):** Hierarquia visual onde o olho identifica título, status e ação primária em menos de 2 segundos.

### Lei 2.2 — Limiar de Doherty (< 400ms) & Optimistic UI
- Ações frequentes (marcar tarefa, favoritar, arquivar, curtir, alterar coluna de Kanban, enviar mensagem no chat) devem refletir na interface em **menos de 16ms (Optimistic Update)**, sem bloquear o botão com spinner.
- Se a requisição falhar em background, reverta o estado com mola suave e dispare um `StackedToast` de erro com opção de *Desfazer / Tentar novamente*.

### Lei 2.3 — UX Defensiva: Fim dos Modais de Confirmação Irritantes
- **TERMINANTEMENTE PROIBIDO** usar `window.alert()`, `window.confirm()` ou `window.prompt()`.
- Para ações destrutivas rápidas (excluir item, revogar token, limpar fila), substitua o modal bloqueante pelo padrão **`HoldToConfirmButton.tsx`** (o usuário mantém pressionado por `1.2s` enquanto uma barra de progresso preenche o botão; se soltar antes, cancela sem atrito).
- Para exclusões críticas de conta/repositório, use `MorphingDialog.tsx`.

### Lei 2.4 — Ergonomia Keyboard-First (`⌘K`)
- Aplicações ricas devem oferecer busca e ações rápidas via `⌘K` / `Ctrl+K` (`CommandPalette.tsx`).
- Botões de ação importantes exibem dicas sutis de atalho em tags `<kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">⌘K</kbd>`.
- Todo controle interativo possui anel de foco acessível (`focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2`).

### Lei 2.5 — Micro-Tipografia Funcional (`tabular-nums` & `text-wrap`)
- **Números Tabulares Obrigatórios (`tabular-nums`):** Qualquer preço (`R$ 1.290,00`), KPI, porcentagem, contador regressivo ou coluna numérica de tabela **DEVE** ter a classe `tabular-nums` (`font-variant-numeric: tabular-nums`) para evitar tremedeira horizontal durante atualizações ou animações (`SpringNumberTicker.tsx`).
- **Equilíbrio Óptico de Texto:**
  - Títulos (`h1`, `h2`, `h3`): `tracking-tight text-balance` (`text-wrap: balance`) para evitar linhas órfãs com 1 palavra.
  - Parágrafos e descrições: `text-pretty leading-relaxed max-w-[65ch]`.

---

## 💎 3. Superfícies, Profundidade & Coerência Dual-Theme (Light + Dark)

Para alcançar acabamento de hardware físico (Apple / Linear / Stripe) nos **dois temas**:

### Anatomia de um Card Dual-Theme de Alta Fidelidade:
```tsx
<motion.div
  whileHover={{ y: -2 }}
  transition={SPRINGS.snappy}
  className="
    relative rounded-xl p-5
    bg-white dark:bg-zinc-900/90
    text-zinc-900 dark:text-zinc-100
    border border-zinc-200/80 dark:border-white/[0.08]
    shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.8)]
    dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]
    hover:border-zinc-300 dark:hover:border-white/[0.16]
    transition-colors duration-200
  "
>
  {/* Conteúdo */}
</motion.div>
```

### Regras Inegociáveis de Coerência Dual-Theme:
1. **PROIBIDO Texto Branco Fixo (`color: #fff`, `text-white` sem `dark:`):** No modo claro, o fundo vira claro e o texto some. Use `text-zinc-900 dark:text-zinc-100` ou `isLight(theme) ? '#0f172a' : '#f8fafc'`. (Exceção única: texto sobre botão de acento sólido escuro em ambos os temas).
2. **PROIBIDO Superfícies Fantasma (`bg-white/5`, `border-white/10` sem `dark:`):** Branco translúcido desaparece sobre fundo claro. Use `bg-white dark:bg-zinc-900/90` e `border-zinc-200/80 dark:border-white/[0.08]`.
3. **Regra 60-30-10 de Paleta:**
   - **60% Canvas:** `#f8fafc` (Light) / `#09090b` (Dark — nunca `#000000` puro).
   - **30% Superfícies:** `#ffffff` (Light) / `#121215` (Dark).
   - **10% Tipografia:** Alto contraste (`#0f172a` / `#f4f4f5`) e apoio (`#475569` / `#a1a1aa`).
   - **< 5% Cor de Acento Cirúrgica (Apenas 1):** Amber (`#f59e0b`), Emerald (`#10b981`), Stripe Royal (`#0048e5`), Apple Blue (`#0071e3`) ou Rose Crimson (`#f43f5e`).

---

## 🧩 4. Catálogo de 10 Templates Artesanais (`templates/`)

Todos os templates são **100% Dual-Theme (Light + Dark)**, possuem **Zero Re-renders em tracking de ponteiro**, acessibilidade **WAI-ARIA** e respeito a **`useReducedMotion()`**:

| Template | Categoria | O Que Resolve |
| :--- | :--- | :--- |
| [`SpotlightCard.tsx`](templates/SpotlightCard.tsx) | Superfície GPU | Iluminação radial reativa ao cursor via `useMotionValue` + `useMotionTemplate` (**0 re-renders**). |
| [`MagneticButton.tsx`](templates/MagneticButton.tsx) | Micro-interação | Atração magnética ao cursor via `useSpring` (120fps) com variantes `primary`, `secondary`, `ghost`. |
| [`AnimatedTabs.tsx`](templates/AnimatedTabs.tsx) | Navegação | Abas deslizantes com `layoutId`, setas do teclado (`ArrowLeft`/`Right`), contadores e `startViewTransition`. |
| [`SmoothAccordion.tsx`](templates/SmoothAccordion.tsx) | Layout Fluido | Sanfona com altura animada por mola, ícone vetorial rotativo e `aria-expanded`. |
| [`ContentSkeleton.tsx`](templates/ContentSkeleton.tsx) | Estados de UX | `ShimmerBlock`, `CardSkeleton`, `TableRowSkeleton` e `EmptyStateCard` acionável (Zero CLS). |
| [`CommandPalette.tsx`](templates/CommandPalette.tsx) | UX Keyboard-First | Paleta `⌘K` / `Ctrl+K` estilo Linear/Raycast com busca instantânea, setas, `layoutId` e `<kbd>`. |
| [`MorphingDialog.tsx`](templates/MorphingDialog.tsx) | Shared Layout | Card/Botão que se expande fisicamente transformando-se no Modal via `layoutId` compartilhado. |
| [`SpringNumberTicker.tsx`](templates/SpringNumberTicker.tsx) | Micro-Tipografia | Contador numérico interpolado por mola (`useSpring` + `Intl.NumberFormat` + `tabular-nums`) para KPIs/preços. |
| [`StackedToast.tsx`](templates/StackedToast.tsx) | Feedback / Optimistic | Pilha 3D de notificações estilo Sonner que colapsa em cascata (`scale`, `y`) e expande no hover. |
| [`HoldToConfirmButton.tsx`](templates/HoldToConfirmButton.tsx) | UX Defensiva | Botão para ações destrutivas ("Segure para excluir" por 1.2s com barra de mola), eliminando `window.confirm`. |

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
