---
name: db-sentinel
description: Engenharia de Banco de Dados de Alta Performance, Migrations Seguras (Zero-Downtime), Detecção de Índices Faltantes, Queries N+1 em Loops, Paginação Obrigatória e Precisão Monetária (Prisma, Drizzle, SQL).
---

# 🗄️ DB Sentinel v2.0 — Engenharia de Banco de Dados & Migrations Seguras (Nota: 10.0/10)

O **DB Sentinel** é a autoridade máxima em integridade de banco de dados, evolução de schemas, performance de queries ORM e prevenção de desastres em produção. Ele impede a IA de criar migrations destrutivas, locks de tabela que derrubam o sistema, consultas sem índices, **queries N+1 em loops** e uso de **Float em valores monetários**.

---

## 🛑 Os 7 Pecados Capitais de Banco de Dados Cometidos por IAs:
1. **Adição de coluna `NOT NULL` sem valor `DEFAULT`:** Trava a tabela inteira e falha na migração se já houver registros existentes.
2. **Remoção ou Renomeação Direta de Colunas (`DROP` / `RENAME`):** Causa indisponibilidade imediata (Downtime) porque o código em produção antigo ainda tenta ler a coluna antiga.
3. **Chaves Estrangeiras (`Foreign Keys`) sem Índices:** Relações 1:N e N:N sem `@index` ou `@@index` forçam a base de dados a fazer *Sequential Scans* (Full Table Scans).
4. **Queries ORM em Loops Assíncronos (`N_PLUS_ONE_LOOP_QUERY`):** Executar `await prisma.x.findUnique` ou `update` dentro de `for (...)` ou `.map(async ...)`, multiplicando chamadas ao banco por 100x.
5. **Consultas sem Limite de Paginação (`UNBOUNDED_FIND_MANY`):** Chamar `.findMany()` sem `take` ou `cursor`, arriscando despejar milhões de linhas na memória RAM (OOM).
6. **Ponto Flutuante para Dinheiro (`FLOAT_FOR_MONEY`):** Usar `Float` / `real` / `doublePrecision` em colunas `price`, `amount`, `total`, `balance` (causando erros de arredondamento IEEE 754 como `0.1 + 0.2 = 0.30000000000000004`). Obrigatório `Decimal` (`@db.Decimal(10, 2)`) ou `Int` em centavos.
7. **Locks Exclusivos de Tabela em Produção:** Criação de índices em tabelas massivas sem modos não-bloqueantes (`CONCURRENTLY` no PostgreSQL).

---

## 💡 Como o DB Sentinel Opera:

### 1. Padrão de Evolução de Schema em 3 Passos (Zero-Downtime Migration):
Quando uma coluna `NOT NULL` ou renomeação for necessária, siga a esteira Expand & Contract:
- **Passo 1 (Deploy 1):** Criar a nova coluna como `NULLABLE` (ou com `DEFAULT` seguro). O backend passa a escrever em ambas as colunas.
- **Passo 2 (Backfill):** Executar script de preenchimento em lotes (batch backfill) dos dados antigos sem travar a tabela.
- **Passo 3 (Deploy 2):** Aplicar a restrição `NOT NULL` e remover referências da coluna legada.

### 2. Validador Determinístico de Schemas e Queries (`scripts/db-audit.js v2.0`):
Analisa `schema.prisma`, arquivos `drizzle/`, `.sql` e código de serviço (`.ts`/`.js`) calculando o **Database Health Score (0–100)**:
- `MISSING_FOREIGN_KEY_INDEX`: Valida presença de índices em todos os `@relation` / `.references()`;
- `N_PLUS_ONE_LOOP_QUERY`: Detecta chamadas `await prisma/db/tx` dentro de loops `for`/`map`/`forEach`;
- `UNBOUNDED_FIND_MANY`: Detecta `.findMany()` sem `take` ou `cursor`;
- `FLOAT_FOR_MONEY`: Barra uso de `Float`/`real` em campos financeiros;
- `NOT_NULL_WITHOUT_DEFAULT` & `DESTRUCTIVE_DDL`: Bloqueia migrations perigosas.

### 3. Gerador de Seeds Realistas (`scripts/generate-seed.js`):
Cria dados sintéticos tipados com coerência relacional para testes locais imediatos.

---

## 💻 Comandos e Ferramentas (CLI):
```bash
# 1. Auditar integridade do schema, migrations e código ORM (Prisma, Drizzle, SQL, TS):
node db-sentinel/scripts/db-audit.js prisma/schema.prisma

# 2. Gerar seed realista e tipado a partir do schema:
node db-sentinel/scripts/generate-seed.js prisma/schema.prisma --out prisma/seed.ts

# 3. Testar integridade da skill:
cd db-sentinel && npm test
```
