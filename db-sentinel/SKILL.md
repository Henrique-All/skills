---
name: db-sentinel
description: Engenharia de Banco de Dados de Alta Performance, Migrations Seguras (Zero-Downtime), Detecção de Índices Faltantes e Prevenção de Perda de Dados (Prisma, Drizzle, SQL).
---

# 🗄️ DB Sentinel — Engenharia de Banco de Dados & Migrations Seguras (Nota: 10.0/10)

O **DB Sentinel** é a autoridade máxima em integridade de banco de dados, evolução de schemas e prevenção de desastres em produção. Ele impede a IA de criar migrations destrutivas, locks de tabela que derrubam o sistema e consultas sem índices que causam lentidão extrema.

---

## 🛑 Os 5 Pecados Capitais de Banco de Dados Cometidos por IAs:
1. **Adição de coluna `NOT NULL` sem valor `DEFAULT`:** Trava a tabela inteira e falha na migração se já houver registros existentes.
2. **Remoção ou Renomeação Direta de Colunas (`DROP` / `RENAME`):** Causa indisponibilidade imediata (Downtime) porque o código em produção antigo ainda tenta ler a coluna antiga.
3. **Chaves Estrangeiras (`Foreign Keys`) sem Índices:** Relações 1:N e N:N sem `@index` ou `@@index` forçam a base de dados a fazer *Sequential Scans* (Full Table Scans), destruindo a performance em tabelas com milhares de registros.
4. **Locks Exclusivos de Tabela em Produção:** Criação de índices em tabelas massivas sem utilizar modos não-bloqueantes (`CONCURRENTLY` no PostgreSQL).
5. **Queries ORM em Loops Assíncronos (Problema N+1):** Executar `findUnique` ou `query` dentro de um `map()` ou `for`, multiplicando chamadas ao banco por 100x.

---

## 💡 Como o DB Sentinel Opera:

### 1. Padrão de Evolução de Schema em 3 Passos (Zero-Downtime Migration):
Quando uma coluna `NOT NULL` ou renomeação for necessária, a IA é compulsoriamente instruída a seguir a esteira segura:
- **Passo 1 (Deploy 1):** Criar a nova coluna como `NULLABLE` (ou com `DEFAULT` seguro). O backend passa a escrever em ambas as colunas.
- **Passo 2 (Backfill):** Executar script de preenchimento em lotes (batch backfill) dos dados antigos sem travar a tabela.
- **Passo 3 (Deploy 2):** Aplicar a restrição `NOT NULL` e remover referências da coluna legada.

### 2. Validador Determinístico de Schemas (`scripts/db-audit.js`):
Analisa `schema.prisma`, arquivos `drizzle/` ou arquivos SQL e calcula o **Database Health Score (0–100)**:
- Valida presença de índices em todos os `@relation` / `foreignKey`;
- Detecta campos de busca textual ou filtros frequentes (`status`, `createdAt`, `tenantId`) sem indexação;
- Alerta contra tipos de dados ineficientes (ex: `String` para UUID ou enums fixos).

### 3. Gerador de Seeds Realistas (`scripts/generate-seed.js`):
Cria dados sintéticos tipados com coerência relacional para testes locais imediatos (evitando o uso de dados reais de clientes em desenvolvimento).

---

## 💻 Comandos e Ferramentas (CLI):
```bash
# 1. Auditar integridade do schema e migrations (Prisma, Drizzle ou SQL):
node db-sentinel/scripts/db-audit.js prisma/schema.prisma

# 2. Gerar seed realista e tipado a partir do schema:
node db-sentinel/scripts/generate-seed.js prisma/schema.prisma --out prisma/seed.ts

# 3. Testar integridade da skill:
cd db-sentinel && npm test
```
