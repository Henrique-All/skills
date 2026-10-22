# 🎨 Regra 02: Anti-AI Slop, UX de Produto, Motion 120fps & Arquitetura Mobile

Esta regra governa qualquer geração, refatoração ou modificação de interface gráfica, telas ou componentes no ecossistema.

---

## 🛑 1. Erradicação do "Design de IA" (Proibição de Landing Page / Dribbble Slop)

Aplicações corporativas, painéis administrativos, help desks, chats e CRMs são **ferramentas de trabalho**, não landing pages promocionais.
O agente deve rejeitar o visual artificial gerado por IA genérica:

1. **Densidade de Informação Profissional & Micro-Tipografia:**
   - **Proibido Componentes Inflados:** Não use `rounded-3xl` (`border-radius: 24px+`) nem paddings gigantescos (`p-8`, `p-10`) em cards internos de dados.
   - **Padrão de Produto:** Use cantos moderados (`rounded-lg` / `rounded-xl`, 8px a 12px), paddings compactos (12px a 20px) e hierarquia tipográfica escaneável.
   - **Tipografia Funcional (`tabular-nums`):** Preços, saldos, métricas KPI, contadores e colunas numéricas de tabelas **DEVEM** usar `tabular-nums` (`font-variant-numeric: tabular-nums`) para impedir que os dígitos "dancem" horizontalmente. Títulos devem usar `tracking-tight text-balance`.
2. **Proibição de Efeitos Espalhafatosos:**
   - Proibido o uso indiscriminado de gradientes roxos neon (`from-purple-500 to-indigo-500`), brilhos neon (`box-shadow: 0 0 25px rgba(...)`) ou glassmorphism denso (`backdrop-blur-xl bg-white/5`) sem contraste definido.
   - Paletas sóbrias e refinadas: monocromático equilibrado (Zinc/Slate) com apenas 1 cor de destaque funcional (< 5% da tela).

---

## ⚡ 2. Engenharia de Movimento Multi-Engine (120fps / Zero Re-renders)

1. **Zero Re-render em Tracking de Ponteiro e Scroll:**
   - **PROIBIDO** chamar `setState` (`useState`) dentro de `onMouseMove` ou `onScroll` (causa 60 re-renders/seg no React).
   - Use obrigatoriamente `useMotionValue`, `useSpring` e `useMotionTemplate` (Framer Motion / `motion/react`) ou CSS Custom Properties via `ref`.
2. **Proibido `transition-all`:**
   - Nunca use `transition-all` no Tailwind ou `transition: all` no CSS (anima propriedades de layout na CPU). Especifique `transition-colors`, `transition-transform` ou `transition-opacity`.
3. **Seleção Deliberada de Engine de Animação:**
   - **Motion (`framer-motion`):** Micro-interações (`whileTap={{ scale: 0.98 }}`), pílulas e modais com `layoutId` (`AnimatedTabs`, `MorphingDialog`, `CommandPalette`) e toasts empilhados (`StackedToast`).
   - **AutoAnimate (`@formkit/auto-animate`):** Obrigatório em listas CRUD, filtros de tabelas e tags dinâmicas (`const [parent] = useAutoAnimate()`).
   - **GSAP (`useGSAP`, `Flip`, `ScrollTrigger`):** Para timelines sequenciais e mudanças complexas de layout CSS Grid.
   - **View Transitions API (`document.startViewTransition`) & `@starting-style`:** Para troca de tema Dark/Light sem piscar e animações de entrada nativas.

---

## 🧠 3. Psicologia de UX & Arquitetura dos 5 Estados

1. **Os 5 Estados Obrigatórios de Telas de Dados:**
   - *(1) Loading:* Content-Aware Skeletons (`ContentSkeleton.tsx`) sem layout shift (proibido spinner solto).
   - *(2) Empty State:* Card educativo com botão CTA primário (`EmptyStateCard`).
   - *(3) Filtered Empty State:* Estado "Nenhum resultado para o filtro" com botão imediato `"Limpar filtros"`.
   - *(4) Error State:* Banner inline com mensagem clara e botão `"Tentar novamente"`.
   - *(5) Populated State:* Dados formatados com densidade calibrada.
2. **UX Defensiva & Optimistic UI (< 400ms):**
   - **PROIBIDO** usar `window.alert()`, `window.confirm()` ou `window.prompt()`.
   - Para ações destrutivas rápidas, use **`HoldToConfirmButton`** (segurar por 1.2s com barra de progresso em mola) ou confirmação inline em duas etapas.
   - Mutações frequentes (toggles, favoritos, envio de mensagem) devem atualizar a UI de forma otimista em `< 16ms`.

---

## 🛡️ 4. Defensive CSS & Master-Detail Mobile Obrigatório

1. **Preservação de Flexbox, Grid e Contratos:**
   - NUNCA remova `min-width: 0` de filhos flexíveis que contenham texto dinâmico.
   - NUNCA perca props, callbacks (`onClick`, `onChange`, `onClose`) ou gestão de foco (`focus-visible:ring-2`).
2. **Master-Detail no Mobile:**
   - **PROIBIDO EMPILHAMENTO VERTICAL** em telas multi-coluna (Chat / Atendimento / Inboxes). Exiba apenas a lista no mobile e abra a conversa em tela cheia (`100dvh`) com botão `← Voltar` (>= 44x44px) e detalhes em **Bottom Sheet**.

---

## ☀️ 5. Coerência Estrita Dual-Theme (Light & Dark Mode)

1. **Zero Texto Branco Hardcoded:** Proibido `color: #fff`, `color: white` ou `text-white` estático sobre superfícies dinâmicas. Use `text-zinc-900 dark:text-zinc-100` ou ternárias `isLight(theme) ? '#0f172a' : '#f8fafc'`.
2. **Zero Superfícies Fantasma:** Proibido `bg-white/5` ou `border-white/10` sem variante clara (`bg-white dark:bg-zinc-900/90 border-zinc-200/80 dark:border-white/[0.08]`).
3. **Contraste WCAG AA (4.5:1):** Validado estaticamente via `craft-audit.js` e visualmente via `visual-check.js`.
