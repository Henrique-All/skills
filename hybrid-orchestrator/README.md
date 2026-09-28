# ⚡ Hybrid Orchestrator — Protocolo Unificado de Engenharia

> Protocolo único que cobre o ciclo completo de qualquer demanda de código:
> **Alinhamento de requisitos → Aprovação → Execução cirúrgica ou adversária → Verificação.**
>
> Absorveu o melhor do **Fullstack Planner** (sabatina em 4 quadrantes, wireframes ASCII, trava de permissão, banco aditivo) e do padrão adversarial **Teamwork** (Lead/Builder/Falsifier, honestidade operacional, degradação graciosa).
> Compatível com qualquer stack e qualquer agente de IA.

---

## Por que um protocolo único?

Ter dois protocolos separados (planejamento e execução) cria fricção: o desenvolvedor precisa decidir quando acionar cada um. O **Hybrid Orchestrator** elimina essa decisão — ele classifica, planeja, valida e executa em sequência, adaptando o rigor ao risco real da demanda.

---

## Princípios

| # | Princípio | Consequência prática |
|:--|:----------|:--------------------|
| 1 | Classifique antes de editar | A rota (A/B/C) é definida antes de qualquer alteração |
| 2 | Alinhe antes do código (B e C) | Sabatina de requisitos e wireframe aprovados antes de escrever |
| 3 | Banco apenas aditivo | Nenhum `DROP`, `TRUNCATE` ou reset destrutivo é gerado |
| 4 | Criticidade sobrescreve velocidade | Auth, pagamentos, concorrência forçam Rota B mesmo com `--fast` |
| 5 | Honestidade operacional | `EXECUTADO` (com saída real) ou `RACIOCINADO` (análise teórica) — nunca "testei e passou" sem evidência |
| 6 | Degradação graciosa | Sem terminal, sem escrita, sem subagentes: o protocolo adapta, nunca silencia |

---

## Estrutura do Repositório

```
hybrid-orchestrator/
├── SKILL.md                 # Especificação para Antigravity e Claude Code
├── hybrid-orchestrator.mdc  # Regra contextual para Cursor e Windsurf
├── AGENTS.md                # Diretrizes para Copilot, Roo Code, Cline, Aider
├── install.js               # Instalador multiplataforma
├── README.md                # Este arquivo
├── package.json             # Metadados e scripts de instalação
├── scripts/
│   ├── snapshot.js          # Gestor de snapshots atômicos e rollback seguro
│   ├── falsify.js           # Runner de estresse adversário (N+1, timeouts, transações)
│   └── preview-plan.js      # Painel visual dos 4 Quadrantes e Trava de Permissão
├── LICENSE                  # MIT
└── test/validate.js         # Validador de integridade
```

---

## 🛠️ Ferramentas de Linha de Comando (CLI)

```bash
# 1. Criar snapshot atômico antes de autorizar modificações:
node scripts/snapshot.js --save "feature-cobranca"

# 2. Executar rollback seguro restaurando o repositório limpo:
node scripts/snapshot.js --rollback

# 3. Rodar o Falsifier adversário contra 5 vetores de estresse (N+1, timeouts, transações):
node scripts/falsify.js src/

# 4. Visualizar os 4 Quadrantes e a Trava de Permissão do Turno 1:
node scripts/preview-plan.js "Central de Cobranças"

# 5. Testar a integridade da skill:
npm test
```

---

## Instalação

### Global (todos os agentes na sua máquina)
```bash
node install.js --global --target=all
```

### Agente específico
```bash
node install.js --global --target=gemini    # Antigravity / Gemini CLI
node install.js --global --target=claude    # Claude Code
node install.js --global --target=cursor    # Cursor / Windsurf
```

### Workspace de um projeto (para versionar com o time)
```bash
node install.js
```

---

## Ciclo de Vida Completo

```
Solicitação
    │
    ▼
[Classificação: A, B ou C]
    │
    ├── Rota A ──────────────────────────────► Diff atômico + Verificação
    │
    └── Rota B / C
           │
           ▼
    [Fases de Planejamento]
    - Análise de Impacto (arquivos, dependências, risco)
    - Sabatina Q1-Q4 (contratos, dados, UI, segurança)
    - Mapa Visual (árvore, Mermaid, wireframe ASCII)
    - Checklist de tarefas
           │
           ▼
    🛑 TRAVA DE PERMISSÃO
    "OK - Executar Tudo" / "OK - Passo a Passo" / "Ajustes"
           │
           ▼
    [Execução Adversária]
    Lead → Builder → Falsifier → Refinamento
           │
           ▼
    Diff consolidado + Relatório de Falsificação + Comandos de Verificação
```

---

## Flags

| Flag | Rota Forçada |
| :--- | :--- |
| `--fast` / `--quick` | Rota A (se não crítica) ou Rota B com aviso (se crítica) |
| `--deep` / `--teamwork` / `--swarm` | Rota B |
| Sem flag | Heurística automática |

---

## Exemplos de Ativação

```text
# Rota A — cirúrgico, sem planejamento
"Corrija o erro de tipo em utils/date.ts"
"Ajuste a cor do botão e o label --fast"

# Rota C — híbrido, planejamento simplificado
"Aplique desconto por cupom no carrinho (2 arquivos)"
"Renomeie userId para accountId em todo o projeto"

# Rota B — adversário, planejamento completo + Falsifier
"Implemente login --fast"          → aviso: crítico, usa Rota B
"Implemente JWT com refresh token"
"Adicione campo telefone (form, tipo, API e migration)"
"Resolva o bug de concorrência no checkout --deep"
```
