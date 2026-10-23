# Matriz Multi-Engine de Animação (120fps / 0 Re-renders)

> Referência carregada sob demanda pelo `SKILL.md` do Frontend Craftsman (Seção 1 original, movida na íntegra).

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
