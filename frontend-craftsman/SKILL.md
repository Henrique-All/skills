---
name: frontend-craftsman
description: Engenharia de Front-end de Alta Fidelidade (Design Engineer). Elimina a 'cara de IA' (gradientes roxos genéricos, blur sem critério, layouts clichês) e produz interfaces artesanais com Framer Motion (física de molas, layoutId), Radix/Tailwind, tipografia refinada, micro-interações táteis e acabamento nível Stripe/Linear/Apple.
---

# 🎨 Frontend Craftsman — Protocolo de Engenharia de Interface Artesanal

O **Frontend Craftsman** é o protocolo de engenharia de design (*Design Engineering*) projetado para erradicar o **"AI Slop UI"** (interfaces com cara de template gerado por IA). Ele estabelece regras rígidas para criar aplicações web que pareçam construídas manualmente por equipes de elite de design de produto (como **Linear, Apple, Stripe, Raycast e Vercel**).

---

## 🛑 O Diagnóstico: O Que é a "Cara de IA" (*AI Slop UI*)?

Quando IAs geram código de front-end sem diretrizes de artesanato, elas caem invariavelmente nos mesmos 7 vícios:

| Vício da IA Genérica | O Que a IA Faz | Padrão Frontend Craftsman |
| :--- | :--- | :--- |
| **1. Síndrome do Roxo Neon** | `from-purple-600 to-indigo-600` em tudo (botões, títulos, bordas). | Paleta monocromática profunda (Zinc/Slate) com **1 única cor de destaque** cirúrgica (< 5% da área visual). |
| **2. Glassmorphism Sem Critério** | `backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl` em todos os cards sem hierarquia. | Superfícies opacas em camadas (`elevation-1`, `elevation-2`), bordas ultrafinas de 1px com opacidade precisa e **inner-highlights** simulando chanfro de hardware real. |
| **3. Animações Duras / Ausentes** | `transition-all duration-300` linear ou ausência de micro-interações. | **Framer Motion com física de molas (Spring Physics)** realistas, `layoutId` para transições fluidas e respeito a `prefers-reduced-motion`. |
| **4. Layout de Hero Clichê** | Título centralizado "Transform your workflow with Next-Gen AI", 2 botões idênticos e 3 cards flutuantes. | Layouts assimétricos, Bento Grids estruturados, tipografia com `tracking-tight` e dashboards interativos reais em vez de ilustrações genéricas. |
| **5. Ausência de Feedback Tátil** | Botões sem estado de press (`:active` ou `whileTap`), sem anel de foco acessível. | Compressão tátil expressiva (`whileTap={{ scale: 0.98 }}`), efeitos de cursor magnético ou iluminação reativa (*Spotlight Cards*). |
| **6. Componentes Frágeis na Mão** | Modais e dropdowns feitos com `useState(isOpen)` que quebram acessibilidade, foco e tecla ESC. | Primitivos acessíveis baseados em **Radix UI / Headless UI**, com foco gerenciado, WAI-ARIA e retenção de foco. |
| **7. Estados de Espera Preguiçosos** | Spinner giratório solitário ou texto "Carregando...". | **Content-Aware Skeletons** que espelham exatamente a anatomia da interface final e evitam Layout Shift (CLS). |

---

## 🎯 Quando Acionar Esta Skill

Ative o protocolo sempre que:
1. For criar **novas telas, componentes ou páginas** de frontend (React, Next.js, Vue, Svelte, HTML/CSS).
2. O usuário pedir para a interface ficar **"mais profissional"**, **"com cara de produto real"**, **"estilo Linear/Stripe/Apple"** ou **"sem cara de IA"**.
3. For implementar **animações, transições de abas, modais, gavetas (drawers) ou micro-interações**.
4. For refatorar um frontend existente que está visualmente poluído ou com baixa qualidade de acabamento.
5. Antes de entregar código de UI para o usuário final.

---

## 📐 Os 5 Pilares de Execução do Craftsman

```mermaid
flowchart TD
    A["🎯 Requisito de UI"] --> B["1. Estrutura & Tipografia<br/>Grid 4px/8px • Tracking-Tight"]
    B --> C["2. Superfícies & Profundidade<br/>Camadas • Borda 1px • Inner Shadow"]
    C --> D["3. Paleta Deliberada<br/>Monocromático • 1 Accent Cirúrgico"]
    D --> E["4. Dinâmica Framer Motion<br/>Física de Molas • layoutId"]
    E --> F["5. Micro-Interações & A11y<br/>whileTap • Radix UI • Skeletons"]
    F --> G["🏆 craft-audit.js<br/>Score ≥ 90 Aprovado"]
```

---

## ⚡ 1. Guia de Molas do Framer Motion (Spring Physics)

**NUNCA** use transições lineares ou `ease-in-out` em botões e micro-interações. Use molas calibradas:

### Presets Oficiais de Mola:

```typescript
// Configurações de Mola Padronizadas
export const SPRINGS = {
  // Micro-interações táteis: cliques em botões, toggles, badges
  snappy: { type: 'spring', stiffness: 450, damping: 30, mass: 0.8 },

  // Elementos estruturais: modais, drawers, popovers, dropdowns
  gentle: { type: 'spring', stiffness: 300, damping: 28 },

  // Transições de layout compartilhado: abas deslizantes, cards expansíveis
  layout: { type: 'spring', stiffness: 350, damping: 32 },

  // Movimentos orgânicos longos: notificações flutuantes, toasts
  float: { type: 'spring', stiffness: 200, damping: 22 },
};
```

### Regras de Ouro de Animação:
1. **Tabs e Pílulas de Seleção:** Use sempre `layoutId="active-pill"` dentro de um elemento filho `motion.div` com `position: absolute`. Isso garante o deslizamento contínuo estilo macOS.
2. **Saída de Elementos:** Todo modal, tooltip ou notificação condicional deve estar encapsulado em `<AnimatePresence mode="wait">` ou `popLayout`.
3. **Respeito à Acessibilidade:** Sempre consulte `useReducedMotion()`. Se ativado, substitua movimento de translação (`x`, `y`) por transição instantânea de opacidade (`opacity: 1`).

---

## 💎 2. Superfícies, Iluminação e Profundidade (Adeus ao Blur Poluído)

Para dar acabamento de hardware físico (estilo Apple e Linear):

### Anatomia de um Card de Alta Fidelidade (Tailwind):

```tsx
<motion.div
  whileHover={{ y: -2 }}
  transition={SPRINGS.snappy}
  className="
    relative rounded-xl p-5
    bg-zinc-900/80 
    border border-white/[0.08]
    shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]
    hover:border-white/[0.16] hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.1)]
    transition-colors duration-200
  "
>
  {/* Conteúdo */}
</motion.div>
```

- **`border-white/[0.08]`**: Borda cirúrgica de 1px com 8% de opacidade (evita bordas cinzas grossas).
- **`shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]`**: O "inner highlight" superior que simula luz incidindo no chanfro superior da placa.
- **Fundo**: `#09090b` ou `zinc-900/80` em vez de preto puro `#000000` (que destrói o contraste de sombras).

---

## 🎨 3. Paletas de Cores de Elite (Regra 60-30-10)

1. **60% (Canvas Base):**
   - **Dark Mode:** Zinc escuro (`bg-[#09090b]`) ou Obsidian (`bg-[#0a0a0c]`). Nunca use preto puro `#000000` (que quebra sombras de elevação).
   - **Light Mode:** Canvas cerâmico/off-white (`bg-[#f8fafc]` ou `bg-[#f5f5f7]`). Evite branco puro no canvas para permitir destaque aos cards.
2. **30% (Superfícies & Estrutura):** Tons neutros com passos graduais (`zinc-900`, `zinc-800`, bordas `white/[0.08]` em dark; `bg-white`, bordas `black/[0.06]` em light).
3. **10% (Tipografia & Alto Contraste):** Títulos em `text-zinc-100` (dark) ou `text-slate-900` (light), textos de apoio em `text-zinc-400` / `text-slate-600`.
4. **< 5% (Cor de Acento - Escolha APENAS UMA):**
   - **Amber Linear:** `amber-500` / `amber-400`
   - **Emerald FinTech:** `emerald-500` / `emerald-400`
   - **Electric Cobalt:** `blue-500` / `blue-400`
   - **Crimson Pro:** `rose-500` / `rose-400`
   - **Stripe Royal Blue (Light):** `#0048e5` (contraste perfeito sobre branco)
   - **Apple Pure Blue (Light):** `#0071e3`

> ⚠️ **PROIBIDO:** Usar gradientes arco-íris ou combinar roxo com rosa neon sem justificativa formal de marca.

---

## 🤝 O Elo Simbiótico: Frontend Craftsman ⟷ Hybrid Orchestrator

Quando ambas as skills estão presentes no repositório ou no perfil global do usuário (`hybrid-orchestrator` + `frontend-craftsman`), elas estabelecem um **elo simbiótico automático**:

### 🎨 Fluxo 1: Design-First (Iniciado no Craftsman)
> Quando o desenvolvedor ou usuário solicita uma alteração visual, nova tela ou refinamento estético:

```mermaid
flowchart TD
    D1["👤 Usuário solicita Front-end / UI"] --> D2["🎨 Craftsman gera DESIGN_SPEC.md<br/>• Paleta, fontes e molas"]
    D2 --> D3["🖥️ Preview Instantâneo local<br/>(node scripts/preview-spec.js)"]
    D3 --> D4{"Usuário aprova<br/>o Design?"}
    
    D4 -- NÃO --> D5["✏️ Ajustar Paleta,<br/>Fontes ou Wireframe"]
    D5 --> D2
    
    D4 -- SIM (OK) --> D6{"hybrid-orchestrator<br/>está presente?"}
    
    D6 -- SIM --> D7["🤝 Handoff para Hybrid (Rota B/C)<br/>• Snapshot de segurança git stash<br/>• Sabatina Q1-Q4 (Q3 preenchido)"]
    D7 --> D8["⚡ Execução Cirúrgica & Falsifier<br/>• Física de molas real<br/>• Pipeline craft-audit.js (Score ≥ 90)"]
    
    D6 -- NÃO --> D9["🎨 Craftsman implementa diretamente<br/>com componentes de alta fidelidade"]
```

### ⚡ Fluxo 2: Engineering-First (Iniciado no Hybrid)
> Quando a solicitação começa pela orquestração técnica, bug ou feature de ponta a ponta:

```mermaid
flowchart TD
    H1["👤 Usuário solicita feature<br/>no Hybrid Orchestrator"] --> H2{"Demanda toca em<br/>UI / Telas / Componentes?"}

    H2 -- NÃO --> H10["⚙️ Hybrid segue fluxo<br/>backend / regras puras"]

    H2 -- SIM --> H3{"frontend-craftsman<br/>está presente?"}

    H3 -- NÃO --> H9["⚡ Hybrid implementa sem<br/>especificação visual prévia"]

    H3 -- SIM --> H4["🎨 Hybrid invoca Craftsman<br/>para gerar DESIGN_SPEC.md"]
    H4 --> H5["🛑 Turno 1 (Trava Obrigatória)<br/>DESIGN_SPEC.md anexado ao plano"]
    
    H5 --> H6{"Usuário aprova<br/>o Turno 1?"}

    H6 -- SIM --> H7["⚡ Turno 2: Implementação<br/>• Física de Molas & Radix<br/>• Testes & Ataque Falsifier"]
    H7 --> H8["🏆 Pipeline 7.2: craft-audit.js<br/>Score ≥ 90 Obrigatório"]
```

### 🛑 Regras Rígidas do Acordo Simbiótico (Trava Obrigatória de Turno):

1. **Detecção Silenciosa & Sem Atrito:**
## ☀️ 6. Coerência Estrita Dual-Theme (Light Mode Coherence)

O erro mais comum em IAs é desenvolver com foco exclusivo no Dark Mode e quebrar totalmente o Light Mode.
**Regras Inegociáveis de Coerência Dual-Theme:**

1. **PROIBIDO Texto Branco Fixo (`color: #fff`, `color: white`, `text-white`):**
   - Nunca use texto branco fixo sobre superfícies que mudam com o tema. No tema claro, o fundo vira branco ou cinza-claro e o texto fica invisível (branco no branco).
   - Use tokens semânticos (`theme.colors.text`) ou ternárias: `isLight(theme) ? '#0f172a' : '#f8fafc'`. Em Tailwind: `text-zinc-900 dark:text-white`.

2. **PROIBIDO Superfícies Fantasma (`bg-white/5`, `rgba(255, 255, 255, 0.05)`):**
   - Branco translúcido é excelente no dark mode para criar relevo sutil. No tema claro, ele desaparece completamente sobre fundos brancos/claros, deixando cards e botões sem borda nem contorno.
   - Use ternárias: `isLight(theme) ? '#ffffff' : 'rgba(255, 255, 255, 0.04)'` e bordas `isLight(theme) ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'`. Em Tailwind: `bg-white dark:bg-white/5 border-zinc-200 dark:border-white/10`.

3. **Contraste WCAG AA Obrigatório nos Dois Modos:**
   - Todo texto deve alcançar contraste mínimo de 4.5:1 (ou 3:1 para títulos grandes) tanto no tema escuro quanto no tema claro.
   - `craft-audit.js` e `visual-check.js` validam matematicamente a luminância relativa e barram contrastes insuficientes.

---

## 🔄 Fluxo de Trabalho & Resolução Autônoma

O agente atua com governança completa e proativa, sem exigir comandos avulsos (`/front`, `/orch`):

1. **Ajustes Rápidos, Bugs de UI e Manutenção:**
   - Identifique os arquivos de estilo afetados.
   - Aplique as correções diretamente no código preservando coerência dual-theme e ergonomia.
   - Execute `node scripts/craft-audit.js <caminho>` para garantir Score ≥ 85 sem violações de Light Mode.
   - Execute `node scripts/visual-check.js <url_ou_html>` para medição visual com Playwright quando um servidor ou preview estiver ativo.

2. **Novas Telas ou Redesigns Estruturais:**
   - Pode-se gerar um `DESIGN_SPEC.md` com `node scripts/generate-spec.js` para alinhar paleta, tipografia e componentes com o usuário.
   - Gere o preview visual instantâneo com `node scripts/preview-spec.js`.
   - Proceda com a implementação refinada, garantindo molas Framer Motion e dual-theme.

---

## 🛠️ Ferramentas da Skill

### 1. Auditoria Estática Dual-Theme (`craft-audit.js v3.0.0`)
Audita arquivos CSS, Styled-Components e Tailwind contra vícios de IA, texto branco no claro e superfícies fantasma:
```bash
node frontend-craftsman/scripts/craft-audit.js src/ --json
```

### 2. Verificação Visual Headless (`visual-check.js v1.0.0`)
Executa o Playwright em modo headless para auditar a interface renderizada real em 4 combinações (Desktop/Mobile × Light/Dark):
- Mede o contraste WCAG real computado pelo browser em todos os elementos de texto.
- Detecta sobreposição física de elementos via `document.elementFromPoint`.
- Detecta estouro horizontal de viewport (scroll indesejado).
- Valida se os touch targets atendem ao mínimo de 44×44px no mobile.
```bash
# Auditar arquivo HTML local:
node frontend-craftsman/scripts/visual-check.js .craft/preview.html

# Auditar servidor de desenvolvimento local:
node frontend-craftsman/scripts/visual-check.js http://localhost:3000 --json
```

### 3. Preview Visual Instantâneo (`preview-spec.js`)
Gera e abre no navegador uma página HTML interativa com botões táteis, cards e paletas reais:
```bash
node frontend-craftsman/scripts/preview-spec.js DESIGN_SPEC.md
```

### 4. Gerador de Especificação Visual (`generate-spec.js`)
Gera a especificação formal de design:
```bash
node frontend-craftsman/scripts/generate-spec.js "Nome da Tela" --preset=linear-dark
```

### 5. Gerador de Tokens de Paleta (`craft-palette.js`)
Exporta tokens refinados para Tailwind v3, Tailwind v4 (@theme) ou CSS Variables:
```bash
# Tailwind v3
node frontend-craftsman/scripts/craft-palette.js linear-dark

# Tailwind v4 (@theme CSS-First)
node frontend-craftsman/scripts/craft-palette.js stripe-clean-light --format=tailwind-v4

# CSS Custom Properties (:root)
node frontend-craftsman/scripts/craft-palette.js supabase-emerald --format=css
```

### 6. Catálogo de Componentes Artesanais (`templates/`)
A skill inclui templates prontos para copiar e colar:
- `AnimatedTabs.tsx`: Navegação com pílula deslizante `layoutId`.
- `SpotlightCard.tsx`: Card escuro com iluminação radial sensível ao ponteiro.
- `MagneticButton.tsx`: Botão com atração elástica e clique tátil.
- `SmoothAccordion.tsx`: Sanfona sem saltos de altura usando Framer Motion.
- `ContentSkeleton.tsx`: Skeletons content-aware com shimmer fluido (zero layout shift).

---

## 📋 Checklist de Validação Final (Critérios de Aceite)

Antes de considerar qualquer tela ou ajuste pronto:
- [ ] **Coerência Dual-Theme:** Nenhum texto branco sobre fundo claro; nenhuma superfície/borda fantasma translúcida invisível no modo claro; contraste WCAG AA 4.5:1 em ambos os temas.
- [ ] Nenhum gradiente roxo-neon/índigo genérico usado sem aprovação expressa.
- [ ] Todos os botões possuem feedback tátil no clique (`whileTap={{ scale: 0.98 }}` ou `:active:scale-95`).
- [ ] Abas e seletores de visualização utilizam `layoutId` para movimento contínuo.
- [ ] Cards possuem bordas sutis de 1px com opacidade precisa e inner highlight superior.
- [ ] Textos de títulos utilizam `tracking-tight` com peso tipográfico ponderado.
- [ ] Estados vazios e de carregamento possuem layouts dedicados (Skeletons content-aware com `ContentSkeleton.tsx`).
- [ ] `craft-audit.js` executado com score **>= 85/100** e zero erros.
- [ ] `visual-check.js` executado sem sobreposição de elementos ou quebras de contraste quando houver servidor/preview.
