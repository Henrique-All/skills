# Comportamento por Capacidade do Agente e Exemplos de Ativação

> Referência carregada sob demanda pelo `SKILL.md` do Hybrid Orchestrator (Seções 1.3, 10 e 11 originais, movidas na íntegra).

## 1.3 Detecção Silenciosa & Fallback Elegante (Zero Caçadas no Disco)

O agente deve ser cirúrgico e consciente de quais skills estão instaladas antes de disparar ferramentas:

1. **Checagem Imediata (Fast Check):** O agente verifica se a skill irmã está no catálogo ativo de skills da sessão ou nos diretórios padrão (`.agents/skills/<nome>` ou `~/.gemini/config/skills/<nome>`).
2. 🚨 **PROIBIÇÃO DE CAÇADA:** Se uma skill NÃO estiver instalada, é **terminantemente proibido** ficar varrendo o disco procurando scripts inexistentes ou inventando caminhos.
3. **Degradação Graciosa Nativa:** O Orchestrator supre a ausência executando a lógica diretamente através de suas capacidades cognitivas nativas:
   - **Sem `repo-cartographer`:** Rastreia dependências via busca textual pontual (`grep_search`), sem gerar `.code-map/`.
   - **Sem `route-guard`:** Mapeia consumidores da rota manualmente e declara no Q1 da Sabatina.
   - **Sem `frontend-craftsman`:** Aplica boas práticas de interface diretamente no código sem gerar `preview.html`.
   - **Sem `devsecops-audit`:** Faz a revisão dos pilares de segurança semanticamente como `RACIOCINADO` no Turno 2.
   *O agente nunca trava, nunca alucina caminhos inexistentes e nunca entra em loops de busca inútil.*

---

## 10. Comportamento por capacidade do agente

| Capacidade ausente | Adaptação |
| :--- | :--- |
| Sem execução de comandos | Marque tudo como RACIOCINADO; entregue os comandos para o usuário rodar |
| Sem escrita em arquivos | Entregue patches unificados |
| Sem subagentes | Falsifier na mesma sessão, com a checklist da seção 5.3 |
| Sem acesso ao repositório completo | Peça os arquivos necessários ou declare a limitação antes de classificar |
| Ambiente sem framework de testes | Proponha e escreva o teste mínimo junto com o código; marque validação como RACIOCINADA |

---

## 11. Exemplos de ativação

| Pedido | Rota | Motivo |
| :--- | :--- | :--- |
| "Ajuste a cor do botão e o label do card `--fast`" | A | Cosmético, 1–2 arquivos |
| "Corrija o erro de tipo em `utils/date.ts`" | A | Local e isolado |
| "Aplique desconto por cupom no carrinho (2 arquivos)" | C | Regra de negócio interdependente, sem critério crítico |
| "Renomeie `userId` para `accountId` em todo o projeto" | C | 4+ arquivos, mudança mecânica |
| "Implemente login `--fast`" | B | Autenticação é crítica; aviso + planejamento reduzido |
| "Resolva o problema no checkout `--deep`" | B | Flag explícita |
| "Implemente autenticação JWT com refresh token" | B | Critério de criticidade |
| "Adicione o campo de telefone (formulário, tipo, API e migration)" | B | 4 arquivos com lógica, esquema de banco e contrato de API |

### Exemplo: Rota B — Turno 1 (Planejamento + Trava)

> **Pedido:** "Implemente autenticação JWT com refresh token."

```markdown
### Estratégia
- Rota: B | Justificativa: autenticação — critério de criticidade

### Análise de Impacto
- `auth/jwt.ts` [CRIAR] — encontrado por busca: nenhum arquivo equivalente existe
- `routes/auth.ts` [EDITAR] — encontrado por busca: referenciado em `server.ts`
- `middleware/verifyToken.ts` [EDITAR] — suposição: provável consumidor, não verificado
- Risco: 🔴 Alto — múltiplas rotas consomem `verifyToken`
- Plano de reversão: reverter `routes/auth.ts` ao commit anterior; `jwt.ts` pode ser simplesmente removido

### Sabatina (Q1–Q4)
- Q1: Suposição — payload `{ accessToken, refreshToken }`, status 200/401/403. **Pergunta (1/2): o refresh token deve ser armazenado em cookie HttpOnly ou retornado no body?**
- Q2: Suposição — transação não necessária; tokens em tabela `refresh_tokens`, idempotência por `jti`.
- Q3: Não aplicável — backend-only.
- Q4: Rotas `/auth/login` e `/auth/refresh` públicas; demais protegidas por `verifyToken`. **Pergunta (2/2): existe alguma rota que deve permanecer pública além de login/refresh?**

### Mapa Visual
[árvore + mermaid JWT flow]

[ ] 1. [Backend] Criar `auth/jwt.ts` com sign/verify/refresh
[ ] 2. [Backend] Editar `routes/auth.ts` com `/login` e `/refresh`
[ ] 3. [Backend] Atualizar `middleware/verifyToken.ts`
[ ] 4. [Verificação] Build + testes + `devsecops-audit --pilares zero-trust,cookies`

🛑 TRAVA: O plano atende? Responda "OK - Executar Tudo", "OK - Passo a Passo" ou "Ajustes".
     Lembrete: qualquer migração de banco exige confirmação separada.
```

> **Usuário responde:** "pode ir"
>
> → Turno 2 começa: critérios de aceite, Falsifier, diff e verificação.
