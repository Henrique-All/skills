# Formato de Resposta — Templates das Rotas A, B e C (Turno 1 e Turno 2)

> Referência carregada sob demanda pelo `SKILL.md` do Hybrid Orchestrator (Seção 9 original, movida na íntegra).

## 9. Formato de resposta

### Rota A

```markdown
[ORCHESTRATOR: ROTA A | EXECUÇÃO DIRETA CIRÚRGICA]
⚡ **Decisão de Rota:** Rota A (Ajuste cirúrgico pontual ou `--fast` em demanda não crítica)
🔨 **Papel Ativo:** [ROLE: BUILDER CIRÚRGICO]
> "Aplicando modificação atômica diretamente sem burocracia de planejamento formal..."

**Arquivos:** [lista]

[diff]

**Verificar:** `[comando]`
```

### Rotas B e C

O template é dividido em **dois turnos**. O primeiro termina na Trava; o segundo só começa após a aprovação.

> 💡 **Âncora de Estado Anti-Drift:** Toda resposta DEVE iniciar com o selo de estado `[ORCHESTRATOR: ...]`. Isso fixa os pesos de atenção do modelo no protocolo exato, eliminando o esquecimento da trava em conversas longas.

````markdown
<!-- TURNO 1 — enviado antes de qualquer código -->
[ORCHESTRATOR: ROTA B | TURNO 1 - TRAVA OBRIGATÓRIA]

### 🎭 Papel Ativo: [ROLE: LEAD — Arquiteto de Software]
> "Mapeando o ecossistema, analisando impacto transversal e estruturando a governança..."

### Estratégia
- **Rota:** [B ou C] | **Justificativa:** [flag, criticidade ou nº de arquivos]

### Análise de Impacto
- Arquivos: [lista com CRIAR / EDITAR / LER]
- Dependências: [consumidor — encontrado por busca / suposição]
- Risco: 🟢 Baixo / 🟡 Médio / 🔴 Alto — [justificativa]
- Plano de reversão: [obrigatório se risco Alto]

### Sabatina *(Rota B)* / Checklist *(Rota C)*
*(Rota B)* Suposições declaradas por quadrante; perguntas bloqueantes se houver (máx. 2):
- Q1 Contratos: [...]
- Q2 Dados: [...]
- Q3 UI: [não aplicável / ...]
- Q4 Segurança: [...]

*(Rota C)* Apenas checklist de tarefas:
[ ] Tarefa 1: [camada] descrição
[ ] Tarefa N: Verificação final (seção 7)

### Mapa Visual *(Rota B)*
[árvore de arquivos + mermaid + wireframe se houver UI]

### Previews Visuais Interativos Gerados (Abra no Navegador):
- 🌐 [Abrir Grafo de Arquitetura 360°](file:///[caminho-absoluto-do-projeto]/.code-map/graph.html) *(Repo Cartographer)*
- 🎨 [Abrir Preview Visual da Interface](file:///[caminho-absoluto-do-projeto]/.craft/preview.html) *(Frontend Craftsman)*
- ⚡ [Abrir Painel de Governança](file:///[caminho-absoluto-do-projeto]/.plan/plan.html) *(Hybrid Orchestrator)*

🛑 TRAVA: O plano acima atende? Responda "OK - Executar Tudo", "OK - Passo a Passo" ou "Ajustes".
     Lembrete: migrações de banco exigem confirmação separada, mesmo após "OK - Executar Tudo".

<!-- TURNO 2 — somente após aprovação da Trava -->
[ORCHESTRATOR: ROTA B | TURNO 2 - EXECUÇÃO AUTORIZADA]

---
### 🎭 FASE 1: [ROLE: LEAD — Arquiteto de Software]
> "Congelando escopo, critérios de aceite mensuráveis e snapshot de segurança..."
- **Critérios de Aceite:** [critérios mensuráveis]
- **Suposições Confirmadas:** [suposições aprovadas pelo usuário]
- **Snapshot Git:** `node scripts/snapshot.js --save "demanda"` [EXECUTADO]

---
### 🔨 FASE 2: [ROLE: BUILDER — Engenheiro de Implementação]
> "Escrevendo código limpo, tipos estritos e implementação do caminho feliz..."
- **Arquivos Implementados:** [lista]
- **Diff Cirúrgico:**
```diff
[git diff ou patch]
```

---
### ⚔️ FASE 3: [ROLE: FALSIFIER — Engenheiro Adversário & QA de Estresse]
> "Atacando ativamente a solução do Builder para encontrar falhas antes da produção..."
| # | Categoria | Ataque Concreto Tentado | Status | Resultado |
| :- | :-------- | :---------------------- | :----- | :-------- |
| 1 | Concorrência | [ataque de race condition/duplo envio] | EXECUTADO / RACIOCINADO | [mitigado via Idempotency-Key] |
| 2 | Dependência | [falha de timeout / rede] | EXECUTADO / RACIOCINADO | [fallback seguro implementado] |
| 3 | Input Hostil | [payload vazio / malformado] | EXECUTADO / RACIOCINADO | [rejeitado por Zod schema] |

- **Blindagens Aplicadas:** [...]
- **Riscos Residuais:** [...]

---
### 🏆 FASE 4: [ROLE: AUDITOR — Portão DevSecOps Pós-Execução]
> "Verificação automatizada do ecossistema e integridade..."
- **Auditoria DevSecOps:** `node scripts/audit.js --pilares=...` ➔ Exit Code 0 ✅
- **Auditoria de UI (se aplicável):** `node scripts/craft-audit.js` ➔ Score ≥ 90/100 ✅
- **Build & Tipos:** `npx tsc --noEmit` & testes do projeto ✅
````
