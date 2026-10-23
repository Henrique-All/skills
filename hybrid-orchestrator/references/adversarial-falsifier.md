# Rotas B e C — Execução Adversária (Lead / Builder / Falsifier)

> Referência carregada sob demanda pelo `SKILL.md` do Hybrid Orchestrator (Seções 2.5 e 5 originais, movidas na íntegra).

## 2.5 O que distingue cada rota

| | Rota A | Rota C | Rota B |
| :--- | :--- | :--- | :--- |
| Planejamento | Nenhum | Análise de impacto + checklist; Trava se risco Médio/Alto ou ambiguidade | Completo (análise de impacto, sabatina Q1–Q4, mapa visual, checklist); Trava sempre |
| Falsifier | Não | Sim, 1 rodada | Sim, com iteração |
| Cenários mínimos de ataque | n/a | 3 | 5, em 3+ categorias da seção 5.3 |
| Teste que falha antes da correção | Não | Recomendado | Obrigatório quando há framework de testes |
| Falsifier separado | Não | Não | Sim, se disponível |
| Iterações máximas de refinamento | n/a | 1 | 3 |

---

## 5. Rotas B e C: Adversária

### 5.1 Papéis

- **Lead:** congela o escopo, escreve critérios de aceite mensuráveis e plano curto de execução.
- **Builder:** implementa a regra de negócio, tipos e testes do caminho feliz. Sem warnings novos, sem tipagem frouxa.
- **Falsifier:** tenta ativamente quebrar a solução. Não é revisor cortês: seu objetivo é encontrar uma falha real.

### 5.2 Como o Falsifier trabalha

- **Separação real quando possível.** Se o agente permite subagentes ou nova sessão, rode o Falsifier separado com apenas o código, os critérios e o histórico mínimo. Sem isso, o mesmo modelo tende a concordar consigo mesmo.
- **Sem separação:** o Falsifier percorre a checklist da seção 5.3 item a item, escrevendo o ataque concreto (entrada, sequência de eventos ou falha injetada) antes de concluir que a solução resiste.
- **Evidência:** sempre que houver ambiente de execução, transforme o cenário em teste e rode. Na Rota B, ao menos um teste deve falhar sem a blindagem e passar com ela.
- **Sem execução:** marque o cenário como RACIOCINADO e indique o comando para o usuário confirmar.

### 5.3 Categorias de ataque

1. **Concorrência:** requisições simultâneas, race conditions, duplo envio, idempotência, ordem de eventos.
2. **Falha de dependência:** timeout, banco ou cache offline, 5xx de terceiros, resposta parcial, retry sem backoff.
3. **Entrada hostil ou malformada:** null/undefined, tipos errados, strings enormes, encoding, injeção, campos extras.
4. **Casos de borda numéricos e de dados:** zero, negativos, overflow, precisão decimal, fuso horário, listas vazias, paginação no limite.
5. **Recursos:** vazamento de conexões, handles abertos, memória crescente, transações não encerradas.
6. **Segurança e permissão:** acesso a recurso de outro usuário, escalonamento, vazamento de dado em log ou erro.

### 5.4 Refinamento

- Se o Falsifier encontrar uma falha, o Builder corrige e o Falsifier repete o ataque que falhou.
- Respeite o limite de iterações (seção 2.5). Se ao final ainda houver falha aberta, **pare**, informe o que não foi resolvido e por quê. Não entregue como pronto.
