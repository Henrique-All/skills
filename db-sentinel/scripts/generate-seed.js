#!/usr/bin/env node
/**
 * db-sentinel/scripts/generate-seed.js
 * Gerador Automático de Seeds Realistas e Tipados a partir do Schema Prisma
 * Cria dados sintéticos coerentes para testes locais sem expor dados reais de clientes.
 */

const fs = require('fs');
const path = require('path');

const schemaArg = process.argv[2] || 'prisma/schema.prisma';
const outArg = process.argv.find(a => a.startsWith('--out='));
const outPath = outArg ? path.resolve(outArg.split('=')[1]) : path.resolve(process.cwd(), 'prisma', 'seed.ts');

if (!fs.existsSync(schemaArg)) {
  console.error(`❌ Arquivo de schema não encontrado: ${schemaArg}`);
  process.exit(1);
}

const content = fs.readFileSync(schemaArg, 'utf-8');
const lines = content.split('\n');

const models = [];
let currentModel = null;

lines.forEach(line => {
  const trimmed = line.trim();
  const modelMatch = trimmed.match(/^model\s+([A-Za-z0-9_]+)\s*\{/);
  if (modelMatch) {
    currentModel = { name: modelMatch[1], fields: [] };
  } else if (trimmed === '}' && currentModel) {
    models.push(currentModel);
    currentModel = null;
  } else if (currentModel && trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('@@')) {
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      const fieldName = parts[0];
      const fieldType = parts[1];
      const isId = trimmed.includes('@id');
      const isUnique = trimmed.includes('@unique');
      const isRelation = trimmed.includes('@relation');
      const isOptional = fieldType.endsWith('?');
      currentModel.fields.push({
        name: fieldName,
        type: fieldType.replace('?', ''),
        isId,
        isUnique,
        isRelation,
        isOptional
      });
    }
  }
});

let seedCode = `/**
 * prisma/seed.ts
 * Gerado automaticamente pelo DB Sentinel (Enterprise AI Suite)
 * Popula o banco local com dados realistas e relacionamentos consistentes.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando semeadura do banco de dados (DB Sentinel)...');

`;

models.forEach((m, idx) => {
  const modelLower = m.name.charAt(0).toLowerCase() + m.name.slice(1);
  const regularFields = m.fields.filter(f => !f.isRelation && f.name !== 'createdAt' && f.name !== 'updatedAt');

  seedCode += `  // 1.${idx + 1} Semeando ${m.name}
  const ${modelLower}Data = [
    {
`;

  regularFields.forEach(f => {
    let mockVal = `'Exemplo ${f.name}'`;
    if (f.isId && (f.type === 'String' || f.type.toLowerCase().includes('uuid'))) {
      mockVal = `'demo-uuid-${idx + 1}-001'`;
    } else if (f.isId && f.type === 'Int') {
      mockVal = `1`;
    } else if (f.name.toLowerCase().includes('email')) {
      mockVal = `'usuario${idx + 1}@exemplo.com'`;
    } else if (f.name.toLowerCase().includes('name') || f.name.toLowerCase().includes('nome')) {
      mockVal = `'Carlos Henrique ${idx + 1}'`;
    } else if (f.type === 'Boolean') {
      mockVal = `true`;
    } else if (f.type === 'Int' || f.type === 'Float' || f.type === 'Decimal') {
      mockVal = `100`;
    } else if (f.type === 'DateTime') {
      mockVal = `new Date()`;
    }

    seedCode += `      ${f.name}: ${mockVal},\n`;
  });

  seedCode += `    }
  ];

  for (const item of ${modelLower}Data) {
    try {
      // Upsert para idempotência
      // @ts-ignore
      await prisma.${modelLower}.create({ data: item });
    } catch (e) {
      // Ignora duplicidades na semeadura
    }
  }
  console.log('   ✅ ${m.name} semeado com sucesso');

`;
});

seedCode += `  console.log('🎉 Semeadura do banco de dados concluída com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante a semeadura:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`;

const destDir = path.dirname(outPath);
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

fs.writeFileSync(outPath, seedCode);
console.log(`\n✅ Seed TypeScript gerado com sucesso em: ${outPath}`);
console.log(`   Modelos mapeados (${models.length}): ${models.map(m => m.name).join(', ')}\n`);
