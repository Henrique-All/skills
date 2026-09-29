# 🗄️ DB Sentinel — Engenharia de Banco de Dados & Migrations Seguras

Skill especializada em modelagem relacional, prevenção de locks de tabela, detecção de índices faltantes em chaves estrangeiras e semeadura realista de dados.

## 🚀 Como Usar:
```bash
# Auditar integridade do schema Prisma ou SQL:
node scripts/db-audit.js prisma/schema.prisma

# Gerar seed tipado e consistente:
node scripts/generate-seed.js prisma/schema.prisma --out prisma/seed.ts
```

## 🧪 Testes:
```bash
npm test
```
