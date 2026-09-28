# 🎨 Frontend Craftsman — Design Engineering de Alta Fidelidade

> **Elimine o "AI Slop UI" (a cara óbvia de IA) e construa interfaces artesanais de elite com Framer Motion, física de molas, Radix UI, Tailwind e micro-interações táteis nível Linear, Apple, Stripe e Raycast.**

[![Status](https://img.shields.io/badge/status-active-emerald.svg)]()
[![Platform](https://img.shields.io/badge/platform-Antigravity%20|%20Claude%20|%20Cursor%20|%20Windsurf-blue.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)]()

---

## 💡 Por Que Esta Skill Existe?

Quando IAs geram código de front-end sem direcionamento de alto padrão, elas geram quase sempre o mesmo padrão genérico e amador:
- Gradientes roxos/índigo (`from-purple-600 to-indigo-600`) em todos os botões e títulos;
- `backdrop-blur-md` e cantos gigantes colocados em tudo sem hierarquia de profundidade;
- Animações lineares duras (`transition-all duration-300`) ou nenhuma micro-interação no clique;
- Textos clichês ("Transform your workflow with Next-Gen AI");
- Spinners genéricos no meio da tela e ausência de navegação acessível por teclado.

O **Frontend Craftsman** estabelece um padrão rigoroso de **Design Engineering** que transforma código de IA em produtos com acabamento de software comercial de primeira linha.

---

## ⚡ Comparativo: AI Slop vs. Crafted Frontend

| Aspecto | ❌ Vício da IA Genérica (AI Slop) | ✅ Padrão Frontend Craftsman |
| :--- | :--- | :--- |
| **Paleta de Cores** | Roxo neon, azul genérico e gradientes arco-íris | Neutros profundos (Zinc 950 / Slate 950) com **1 única cor de destaque** cirúrgica (< 5% da tela) |
| **Superfícies & Iluminação** | Blur embaçado em excesso sem borda definida | Superfícies opacas em camadas com bordas ultrafinas de 1px (`border-white/[0.08]`) e **inner highlight** superior |
| **Animações** | Lineares ou inexistentes (`duration-300 ease-in-out`) | **Física de molas do Framer Motion (Spring Physics)** calibradas por sensação física |
| **Navegação de Abas** | Abas com saltos secos de visualização | Abas deslizantes fluidas com `layoutId="active-pill"` estilo macOS/Linear |
| **Interatividade** | Botão sem efeito de clique ou foco | Compressão tátil expressiva (`whileTap={{ scale: 0.98 }}`), cursor magnético e Spotlight dinâmico |
| **Carregamento** | "Carregando..." ou spinner centralizado | **Content-Aware Skeletons** que preservam o layout e evitam Layout Shift (CLS) |

---

## 🛠️ Ferramentas Inclusas

### 1. Auditoria de Artesanato Visual (`craft-audit.js`)
Varre sua base de código (`.tsx`, `.jsx`, `.vue`, `.html`, `.css`) e detecta anti-patterns de IA, calculando o **Craftsmanship Score (0-100)**:

```bash
node scripts/craft-audit.js src/
```

*Saída detalhada no terminal com linha, penalidade de pontos e sugestão exata de refatoração.*

### 2. Gerador de Tokens de Paleta (`craft-palette.js`)
Gera tokens refinados para Tailwind ou CSS Modules para paletas de alto nível:

```bash
# Paleta Linear Dark (padrão)
node scripts/craft-palette.js linear-dark

# Paleta Supabase Emerald exportada para CSS Variables
node scripts/craft-palette.js supabase-emerald --format=css

# Outras opções: raycast-obsidian, apple-neutral
```

### 3. Templates de Componentes Prontos (`templates/`)
- `AnimatedTabs.tsx`: Seletor de abas com física de mola e indicador deslizante `layoutId`.
- `SpotlightCard.tsx`: Card escuro com iluminação radial reativa à posição do mouse.
- `MagneticButton.tsx`: Botão com atração elástica ao cursor e compressão no clique.
- `SmoothAccordion.tsx`: Sanfona expansível com `AnimatePresence` sem solavancos visuais.

---

## 🚀 Instalação e Compatibilidade

A skill é multiplataforma e pode ser instalada localmente no projeto ou globalmente para todos os agentes:

```bash
# Instalar no projeto atual (.agents/skills/frontend-craftsman)
node install.js

# Instalar globalmente em todos os assistentes (Antigravity, Claude Code, Cursor)
node install.js --global --target=all

# Instalar local E globalmente
node install.js --both
```

---

## 🧪 Validação dos Testes

```bash
npm test
```
