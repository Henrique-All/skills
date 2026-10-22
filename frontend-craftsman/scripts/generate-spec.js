#!/usr/bin/env node
/**
 * scripts/generate-spec.js - Gerador de Especificação Visual de Alta Fidelidade (DESIGN_SPEC.md)
 * Cria o documento visual padronizado para validação do usuário antes da execução técnica.
 * 
 * Uso:
 *   node scripts/generate-spec.js "Nome da Tela / Funcionalidade" [--preset=linear-dark] [--output=DESIGN_SPEC.md]
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const titleArg = args.find((a) => !a.startsWith('--')) || 'Nova Interface Artesanal';
const presetArg = args.find((a) => a.startsWith('--preset='));
const outputArg = args.find((a) => a.startsWith('--output='));

const presetName = presetArg ? presetArg.split('=')[1] : 'linear-dark';
const outputFile = outputArg ? outputArg.split('=')[1] : 'DESIGN_SPEC.md';

const PRESETS = {
  'linear-dark': {
    name: 'Linear Dark (Zinc Profundo + Amber Accent)',
    bgCanvas: '#09090b',
    bgSurface: '#121215',
    bgElevated: '#18181b',
    borderSubtle: 'rgba(255, 255, 255, 0.08)',
    borderHover: 'rgba(255, 255, 255, 0.16)',
    textPrimary: '#f4f4f5',
    textSecondary: '#a1a1aa',
    textMuted: '#71717a',
    accent: '#f59e0b',
    accentName: 'Amber Warm (#f59e0b)',
    innerHighlight: 'rgba(255, 255, 255, 0.06)',
    fontFamily: 'Inter / Geist Sans',
  },
  'supabase-emerald': {
    name: 'Supabase Emerald (Grafite Escuro + Esmeralda Energética)',
    bgCanvas: '#0c0e12',
    bgSurface: '#15181e',
    bgElevated: '#1c2028',
    borderSubtle: 'rgba(255, 255, 255, 0.07)',
    borderHover: 'rgba(255, 255, 255, 0.14)',
    textPrimary: '#ededed',
    textSecondary: '#9ba1a6',
    textMuted: '#687076',
    accent: '#10b981',
    accentName: 'Emerald Pure (#10b981)',
    innerHighlight: 'rgba(255, 255, 255, 0.05)',
    fontFamily: 'Geist Sans / Inter',
  },
  'raycast-obsidian': {
    name: 'Raycast Obsidian (Preto Técnico + Crimson Accent)',
    bgCanvas: '#0a0a0c',
    bgSurface: '#141418',
    bgElevated: '#1d1d23',
    borderSubtle: 'rgba(255, 255, 255, 0.08)',
    borderHover: 'rgba(255, 255, 255, 0.18)',
    textPrimary: '#ffffff',
    textSecondary: '#a0a0aa',
    textMuted: '#52525b',
    accent: '#f43f5e',
    accentName: 'Rose Crimson (#f43f5e)',
    innerHighlight: 'rgba(255, 255, 255, 0.07)',
    fontFamily: 'Plus Jakarta Sans / JetBrains Mono',
  },
  'apple-neutral': {
    name: 'Apple Neutral (Cinza Espacial Mínimo + Azul Cirúrgico)',
    bgCanvas: '#000000',
    bgSurface: '#161618',
    bgElevated: '#212124',
    borderSubtle: 'rgba(255, 255, 255, 0.10)',
    borderHover: 'rgba(255, 255, 255, 0.22)',
    textPrimary: '#f5f5f7',
    textSecondary: '#86868b',
    textMuted: '#6e6e73',
    accent: '#2997ff',
    accentName: 'Electric Blue (#2997ff)',
    innerHighlight: 'rgba(255, 255, 255, 0.12)',
    fontFamily: 'SF Pro / Inter',
  },
  'stripe-clean-light': {
    name: 'Stripe Clean Light (Canvas Off-White + Azul Royal Crisp)',
    bgCanvas: '#f8fafc',
    bgSurface: '#ffffff',
    bgElevated: '#ffffff',
    borderSubtle: 'rgba(0, 0, 0, 0.08)',
    borderHover: 'rgba(0, 0, 0, 0.16)',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    accent: '#0048e5',
    accentName: 'Stripe Royal Blue (#0048e5)',
    innerHighlight: 'rgba(0, 0, 0, 0.03)',
    fontFamily: 'Inter / system-ui',
  },
  'apple-pure-light': {
    name: 'Apple Pure Light (Cinza Cerâmica + Azul Apple Tátil)',
    bgCanvas: '#f5f5f7',
    bgSurface: '#ffffff',
    bgElevated: '#ffffff',
    borderSubtle: 'rgba(0, 0, 0, 0.06)',
    borderHover: 'rgba(0, 0, 0, 0.14)',
    textPrimary: '#1d1d1f',
    textSecondary: '#6e6e73',
    textMuted: '#86868b',
    accent: '#0071e3',
    accentName: 'Apple Pure Blue (#0071e3)',
    innerHighlight: 'rgba(0, 0, 0, 0.02)',
    fontFamily: 'SF Pro / Inter',
  }
};

const p = PRESETS[presetName] || PRESETS['linear-dark'];

const specContent = `# 🎨 Especificação de Design — ${titleArg}

> **Documento gerado por Frontend Craftsman para validação visual prévia.**  
> *Aprovando este design, o Hybrid Orchestrator assume a execução com rigor técnico.*

---

## 💎 1. Identidade Visual & Paleta Deliberada

- **Preset Selecionado:** \`${p.name}\`
- **Cor de Acento (Cirúrgica, < 5% da UI):** \`${p.accentName}\`
- **Iluminação & Superfícies:** Sem blur exagerado; camadas opacas com contraste de 1px e inner highlight superior de chanfro de hardware.

| Token Semântico | Valor Hex / RGBA | Papel na Interface |
| :--- | :--- | :--- |
| **Canvas de Fundo** | \`${p.bgCanvas}\` | Base profunda da aplicação (sem preto puro absoluto) |
| **Superfície (Card)** | \`${p.bgSurface}\` | Cards e painéis com elevação primária |
| **Superfície Elevada** | \`${p.bgElevated}\` | Popovers, dropdowns e menus de contexto |
| **Borda Sutil (1px)** | \`${p.borderSubtle}\` | Divisórias e contornos ultrafinos |
| **Inner Highlight** | \`${p.innerHighlight}\` | Realce superior simulando chanfro de hardware |
| **Texto Primário** | \`${p.textPrimary}\` | Títulos e dados principais em alto contraste |
| **Texto Secundário** | \`${p.textSecondary}\` | Labels, legendas e descrições de apoio |
| **Accent Primário** | \`${p.accent}\` | **APENAS** botões primários de CTA e status de destaque |

---

## 🔤 2. Tipografia & Ritmo Espacial

- **Família Tipográfica:** \`${p.fontFamily}\` (Fallback: \`system-ui, sans-serif\`)
- **Escala de Headings:**
  - Título Principal: \`text-xl\` a \`text-2xl\` (\`font-semibold\`, \`tracking-tight\`)
  - Subtítulos: \`text-sm\` (\`font-medium\`, \`text-zinc-400\`)
  - Labels Técnicas / Metadados: \`text-xs\` (\`font-medium\`, \`text-zinc-500\`)
- **Grade Espacial:** Sistema modular baseado em 4px / 8px (\`gap-2\`, \`gap-4\`, \`p-4\`, \`p-6\`).

---

## 📦 3. Pilha de Bibliotecas & Matriz Multi-Engine de Animações

| Engine / Biblioteca | Padrão / Primitivo | Quando Usar |
| :--- | :--- | :--- |
| **Motion (\`framer-motion\` v12)** | \`SPRINGS\`, \`layoutId\`, \`AnimatePresence\` | Micro-interações, abas deslizantes, Morphing Dialogs e Toasts |
| **Motion GPU Tracking** | \`useMotionValue\` + \`useMotionTemplate\` | Spotlight Cards, Magnetic Buttons e cursores (**0 re-renders no React**) |
| **AutoAnimate (\`@formkit/auto-animate\`)** | \`const [parent] = useAutoAnimate()\` | Listas CRUD, filtros em tempo real, tags e inserção/remoção em 1 linha |
| **GSAP (\`gsap\` + \`@gsap/react\`)** | \`useGSAP()\`, \`Flip\`, \`ScrollTrigger\` | Timelines coreografadas multi-etapa e mudanças estruturais de CSS Grid |
| **View Transitions API & CSS** | \`document.startViewTransition\`, \`@starting-style\` | Alternância de tema Dark/Light com reveal circular e popovers nativos |
| **radix-ui / tailwindcss** | Primitivos WAI-ARIA + Tokens | Acessibilidade por teclado (\`⌘K\`), foco gerenciado e \`tabular-nums\` |

---

## ⚡ 4. Dinâmica de Movimento (120fps / Zero Re-renders) & Psicologia de UX

- **Micro-interações (Cliques & Toggles):** \`{ type: 'spring', stiffness: 450, damping: 30 }\` com \`whileTap={{ scale: 0.98 }}\`.
- **Zero Re-render no Ponteiro:** Proibido \`useState\` em \`onMouseMove\`/\`onScroll\`. Obrigatório \`useMotionValue\`.
- **Proibido \`transition-all\`:** Restrinja transições CSS a \`transition-colors\`, \`transition-transform\` ou \`transition-opacity\`.
- **Arquitetura Obrigatória dos 5 Estados de UX:**
  1. *Loading:* Content-Aware Skeletons (\`ContentSkeleton.tsx\`, zero CLS).
  2. *Empty State:* \`EmptyStateCard\` com CTA primário imediato.
  3. *Filtered Empty State:* Estado "Nenhum resultado" com botão **"Limpar filtros"**.
  4. *Error State:* Banner inline com botão **"Tentar novamente"**.
  5. *Populated State:* Densidade calibrada com \`tabular-nums\` em métricas/preços (\`SpringNumberTicker.tsx\`).
- **UX Defensiva:** Proibido \`window.alert\`/\`confirm\`. Ações destrutivas usam \`HoldToConfirmButton.tsx\` (segurar por 1.2s).

---

## 📐 5. Wireframe Estrutural (ASCII / Layout)

\`\`\`text
+-----------------------------------------------------------------------------------+
|  [Logo / Nome da Tela]               [Tabs: Visão Geral | Detalhes | Métricas]    |
+-----------------------------------------------------------------------------------+
|  +-----------------------------+  +--------------------------------------------+  |
|  | [Card 1: Resumo Métrico]    |  | [Card 2: Spotlight Interativo com Mouse]   |  |
|  | - Valor de Destaque         |  | - Área de Gráfico / Ação Principal         |  |
|  | - Badge de Status (Accent)  |  | - Inner Highlight + 1px border             |  |
|  +-----------------------------+  +--------------------------------------------+  |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | [Lista / Tabela de Dados com Content-Aware Skeletons no Carregamento]       |  |
|  | Item 1 .................................................. [Botão Tátil CTA] |  |
|  | Item 2 .................................................. [Botão Tátil CTA] |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
\`\`\`

---

## 🛑 6. Trava de Aprovação Visual

> [!IMPORTANT]
> **Você aprova as cores, fontes, bibliotecas e estrutura acima?**
> - **[SIM / OK]:** Se a skill \`hybrid-orchestrator\` estiver ativa, ela assume a execução com snapshot de git, planejamento dos 4 quadrantes e testes.
> - **[AJUSTAR]:** Informe os ajustes necessários (ex: alterar cor de acento para esmeralda, mudar densidade dos cards) antes de codificar.
`;

const destPath = path.resolve(process.cwd(), outputFile);
fs.writeFileSync(destPath, specContent, 'utf-8');

console.log('===============================================================');
console.log('🎨 FRONTEND CRAFTSMAN — ESPECIFICAÇÃO DE DESIGN GERADA!');
console.log('===============================================================\n');
console.log(`📄 Arquivo criado: ${destPath}`);
console.log(`💎 Preset aplicado: ${p.name}`);
console.log(`🎯 Cor de Acento: ${p.accentName}`);
console.log('\n✨ Apresente este documento ao usuário para obter aprovação visual prévia.');
console.log('===============================================================\n');
