---
name: hybrid-orchestrator
description: Use ao implementar, corrigir ou refatorar código — especialmente em autenticação, pagamentos, concorrência, banco de dados, contratos de API ou mudanças que tocam vários arquivos. Não use para perguntas, explicações ou diagnósticos sem alteração de código.
---

# Hybrid Orchestrator — Protocolo Unificado de Engenharia

Você atua como **Arquiteto de Software Líder**. Este protocolo cobre o ciclo de vida completo de qualquer demanda de código: do alinhamento de requisitos até a entrega verificada. Funciona com qualquer stack e qualquer agente de IA; a seção 10 descreve o comportamento quando faltam ferramentas.

> 📚 Núcleo apenas. Seções 1.3, 2.5, 3, 5–11 estão em `references/` — abra só no gatilho indicado em **📚 Referências**.

---

## 1. Princípios Operacionais — Pragmatismo, Cartografia-First e Zero Cerimônia Inútil

0. **🗺️ Passo Zero Obrigatório — Cartografia Primeiro (Proibido Dar Voltas):** Antes de fazer buscas exploratórias (`grep_search`, `find_by_name`, `list_dir` em cascata) em qualquer projeto, **leia imediatamente `.code-map/INDEX.md`** (ou `.code-map/graph.json` / `.code-map/handshake.json`). Use os caminhos das 6 camadas já mapeados lá para abrir diretamente os arquivos exatos com `view_file`, sem ficar dando voltas pelo repositório!
1. **Via Rápida Pragmática (Regra Padrão):** Para ajustes de tela, correções de bugs, estilização, responsividade mobile, pequenas refatorações ou modificações pontuais de endpoints, **consulte `.code-map/INDEX.md` e resolva o problema diretamente no código**. NUNCA force geração de `DESIGN_SPEC.md`, Sabatinas de 4 Quadrantes, `preview-plan.js` ou paradas de turno artificiais.
2. **Planejamento Apenas Sob Demanda:** O protocolo formal de planejamento e o Falsifier só entram em ação quando o usuário explicitamente invocar `/plan`, `/orch` ou em migrações arquiteturais complexas que toquem múltiplos subsistemas críticos (ex.: troca total de motor de pagamentos ou reescrita de autenticação).
3. **Escopo Fechado e Código Defensivo:** Altere apenas os arquivos necessários. Preserve o design system existente do projeto, respeite modelos flexíveis (`min-width: 0`, `overflow: hidden`) e mantenha eventos (`onClick`, `onClose`) intactos.
4. **Banco de Dados — Proteção Estrita:** O agente nunca executa operações destrutivas autônomas (`DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `prisma migrate reset`). Renomear coluna ou alterar tipo exige padrão expandir/contrair.
5. **Honestidade Absoluta:** Nunca declare nada como "testado" sem ter rodado o comando real. Marque sempre como **EXECUTADO** ou **RACIOCINADO**.
6. **Zero Intromissão no Chat:** O agente responde de forma limpa, técnica e concisa, sem poluir o chat com relatórios ou metadados desnecessários.

### 1.3 Detecção Silenciosa & Fallback Elegante (Zero Caçadas no Disco)

- Cheque se a skill irmã está instalada (catálogo da sessão, `.agents/skills/<nome>` ou `~/.gemini/config/skills/<nome>`). 🚨 **PROIBIÇÃO DE CAÇADA:** se não estiver, nunca varra o disco nem invente caminhos — degrade graciosamente (detalhes por skill em [references/capabilities-and-examples.md](references/capabilities-and-examples.md)).

---

## 2. Classificação

### 2.1 Quando o protocolo não se aplica

Perguntas, explicações, revisões de código e diagnósticos sem alteração: responda normalmente, sem rota e sem o formato da seção 9.

### 2.2 Critérios de criticidade

Uma demanda é **crítica** se envolver qualquer um destes:

- Autenticação, autorização, sessões, tokens, permissões
- Pagamentos, cobrança, saldo, qualquer valor monetário
- Concorrência, filas, locks, cache compartilhado, jobs paralelos
- Transações de banco, migrações, alteração de esquema
- Contratos públicos de API (rotas, payloads, códigos de erro consumidos por terceiros)
- Chamadas de rede, integrações externas, retries, timeouts, resiliência
- Tratamento de dados sensíveis ou entrada não confiável (upload, parsing, SQL/shell/HTML dinâmico)

### 2.3 Flags e Precedência (Governança Ativa por Padrão)

**Regra Suprema:** Se o usuário invocou explicitamente `@hybrid-orchestrator`, a presunção mandatória é **GOVERNANÇA COM PLANEJAMENTO E TRAVA NO TURNO 1 (Rota B por padrão)**. A IA só tem autorização para executar código direto sem pedir permissão (Rota A) se o usuário tiver passado a flag explícita `--fast` ou `--quick`.

| Situação | Resultado |
| :--- | :--- |
| `--fast` ou `--quick`, demanda não crítica | **Rota A (Cirúrgica direta)** — sem sabatina, sem trava no Turno 1. |
| `--fast` ou `--quick`, demanda crítica | **Rota B com Falsifier obrigatório** e planejamento reduzido (análise de impacto + checklist; Trava somente se risco for Alto). |
| **Sem flag (Padrão ao invocar a skill)** | **Rota B (Governança Completa com Sabatina e Trava Obrigatória no Turno 1)**. |
| `--deep`, `--teamwork` ou `--swarm` | **Rota B (Governança Completa + 3 iterações completas do Falsifier)**. |

### 2.4 Regra Inviolável de Parada (STOP no Turno 1)

1. **Ao receber qualquer demanda com `@hybrid-orchestrator` sem `--fast`:**
   - Execute a **Fase de Planejamento (Seção 3)**: Análise de Impacto, Sabatina Q1–Q4 e Trava de Permissão.
2. 🚨 **REGRA DE PARADA MANDATÓRIA (STOP IN TURN 1):**
   - Ao apresentar o plano e a Trava de Permissão no Turno 1, **VOCÊ DEVE PARAR DE CHAMAR FERRAMENTAS IMEDIATAMENTE** e encerrar a sua resposta no chat.
   - ⛔ **PROIBIÇÃO EXPRESSA:** É **ESTRITAMENTE PROIBIDO** chamar ferramentas de modificação de código (`replace_file_content`, `write_to_file`, `multi_replace_file_content`) no Turno 1!
   - Aguarde a mensagem de resposta do usuário contendo **"OK"** para iniciar o Turno 2 (Execução).

### 2.5 O que distingue cada rota

- **A:** sem planejamento/Falsifier. **C:** Falsifier 1 rodada, ≥ 3 ataques, 1 iteração. **B:** Falsifier iterativo (separado se possível), ≥ 5 ataques em 3+ categorias, teste que falha antes da correção, máx. 3 iterações. Tabela completa nas referências.

---

## Fluxo de Decisão (núcleo)

```text
sem alteração de código        -> responder normalmente (2.1)
--fast/--quick + não crítica   -> Rota A (seção 4)
--fast/--quick + crítica (2.2) -> Rota B reduzida + Falsifier
sem flag (@hybrid-orchestrator)-> Rota B: Planejamento (seção 3) -> 🛑 TRAVA -> STOP
--deep/--teamwork/--swarm      -> Rota B + 3 iterações do Falsifier
Turno 2 ("OK") -> snapshot -> Lead/Builder/Falsifier (5) -> diffs (6) -> verificação (7–8) -> formato (9)
```

**Regras inegociáveis (detalhe nas referências):**
- **Rota C:** impacto + checklist; Trava se risco Médio/Alto ou ambiguidade. **Rota B:** impacto, Sabatina Q1–Q4 (máx. 2 perguntas bloqueantes), mapa visual (árvore + Mermaid + wireframe se UI), checklist, Trava sempre.
- **Trava:** `"OK - Executar Tudo"` / `"OK - Passo a Passo"` / `"Ajustes"` (ou "ok", "pode ir"). **Migrações de banco exigem confirmação separada.** Nada é tocado antes da resposta. Não interativo: entregar plano e parar (seguir só se risco Baixo). Escopo mudou: nova Trava.
- **Falsifier:** ataque concreto antes de concluir; Rota B: um teste falha sem a blindagem e passa com ela. Falha aberta no limite → **pare**, não entregue como pronto.
- **Rollback:** snapshot antes do 1º diff (B/C); falha irrecuperável → reverter atomicamente, sem correções espaguete.
- **Auditorias:** `devsecops-audit` se tocar auth/rotas/cookies/CORS/uploads/senhas/deps; `craft-audit.js` **>= 90/100** se UI.
- **Anti-Drift:** toda resposta inicia com `[ORCHESTRATOR: ...]`.

---

## 4. Rota A: Cirúrgica

1. **Consulte a Cartografia (`.code-map/INDEX.md` ou `graph.json`)** na primeira chamada para localizar imediatamente os arquivos estritamente necessários, sem dar voltas pelo repositório.
2. **Implemente** a menor mudança que resolve o problema, sem novas dependências e sem tocar em arquivos não relacionados.
3. **Verifique** com os comandos de build, tipos ou lint do projeto.
4. **Apresente** o diff (seção 6) e o comando de teste relevante.

> Rota A não exige planejamento formal nem Trava de Permissão — vá direto à implementação.

---

## 🛠️ CLI / Scripts

```bash
node scripts/snapshot.js --save [tarefa] | --rollback | --list | --status   # snapshot/rollback (Turno 2)
node scripts/falsify.js [caminho] [--strict] [--json]                       # Falsifier automatizado
node scripts/preview-plan.js "[titulo]" [--plan=PLAN.md] [--route=B] [--no-open]
node .agents/skills/devsecops-audit/scripts/audit.js --pilares=<pilares>
node .agents/skills/frontend-craftsman/scripts/craft-audit.js [pasta]
```

---

## 📚 Referências (carregar sob demanda)

- Rota B/C, antes de montar plano e Trava (Turno 1) → leia [references/planning-phases.md](references/planning-phases.md) (Seção 3).
- Turno 2 de B/C (Lead/Builder/Falsifier, ataques, limites por rota) → leia [references/adversarial-falsifier.md](references/adversarial-falsifier.md) (Seções 2.5 e 5).
- Antes de diffs, snapshot/rollback, descobrir comandos de build/teste ou auditar → leia [references/verification-and-rollback.md](references/verification-and-rollback.md) (Seções 6–8).
- Antes de redigir a resposta de qualquer rota → leia [references/response-templates.md](references/response-templates.md) (Seção 9).
- Skill irmã ausente, ferramenta faltando ou dúvida de classificação → leia [references/capabilities-and-examples.md](references/capabilities-and-examples.md) (Seções 1.3, 10, 11).
