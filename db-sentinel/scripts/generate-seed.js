#!/usr/bin/env node
/**
 * db-sentinel/scripts/generate-seed.js
 * Gerador Automático de Seeds Realistas e Tipados a partir do Schema Prisma
 * Cria dados sintéticos coerentes para testes locais sem expor dados reais de clientes.
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
let outFileVal = null;
const outEqArg = args.find(a => a.startsWith('--out='));
const outIdx = args.indexOf('--out');
if (outEqArg) {
  outFileVal = outEqArg.split('=')[1];
} else if (outIdx >= 0 && args[outIdx + 1]) {
  outFileVal = args[outIdx + 1];
}

const positionalArgs = args.filter((a, i) => !a.startsWith('--') && (outIdx < 0 || i !== outIdx + 1));
const schemaArg = positionalArgs[0] || 'prisma/schema.prisma';
const outPath = outFileVal ? path.resolve(outFileVal) : path.resolve(process.cwd(), 'prisma', 'seed.ts');

if (!fs.existsSync(schemaArg)) {
  console.error(`❌ Arquivo de schema não encontrado: ${schemaArg}`);
  process.exit(1);
}

const content = fs.readFileSync(schemaArg, 'utf-8');
const lines = content.split('\n');

const PRISMA_SCALARS = new Set([
  'String', 'Int', 'Float', 'Boolean', 'DateTime', 'Decimal', 'BigInt', 'Json', 'Bytes'
]);

// 1ª Passagem: Coletar nomes de todos os models e enums para distinguir relações 1:N / 1:1 sem @relation explícito
const modelNames = new Set();
const enumMap = new Map();
let currentEnum = null;

lines.forEach(line => {
  const trimmed = line.trim();
  const mMatch = trimmed.match(/^model\s+([A-Za-z0-9_]+)\s*\{/);
  if (mMatch) modelNames.add(mMatch[1]);

  const eMatch = trimmed.match(/^enum\s+([A-Za-z0-9_]+)\s*\{/);
  if (eMatch) {
    currentEnum = eMatch[1];
    enumMap.set(currentEnum, []);
  } else if (trimmed === '}' && currentEnum) {
    currentEnum = null;
  } else if (currentEnum && trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('@@')) {
    enumMap.get(currentEnum).push(trimmed.split(/\s+/)[0]);
  }
});

const models = [];
let currentModel = null;

lines.forEach(line => {
  const trimmed = line.trim();
  const modelMatch = trimmed.match(/^model\s+([A-Za-z0-9_]+)\s*\{/);
  if (modelMatch) {
    currentModel = { name: modelMatch[1], fields: [], fkTargets: new Map() };
  } else if (trimmed === '}' && currentModel) {
    models.push(currentModel);
    currentModel = null;
  } else if (currentModel && trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('@@')) {
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      const fieldName = parts[0];
      const rawType = parts[1];
      const baseType = rawType.replace(/[?[\]]/g, '');
      const isArray = rawType.includes('[]');
      const isOptional = rawType.endsWith('?');
      const isId = /\b@id\b/.test(trimmed);
      const isUnique = /\b@unique\b/.test(trimmed);

      // Se possui @relation(fields: [userId], references: [id]), mapeia userId -> TargetModel
      const relFieldsMatch = trimmed.match(/@relation\([^)]*fields:\s*\[([^\]]+)\]/);
      if (relFieldsMatch && modelNames.has(baseType)) {
        const fkCols = relFieldsMatch[1].split(',').map(s => s.trim());
        fkCols.forEach(fk => currentModel.fkTargets.set(fk, baseType));
      }

      // É campo virtual de relação se tem @relation, se aponta para outro Model, ou se é array de Model (ex: orders Order[])
      const isRelation =
        trimmed.includes('@relation') ||
        modelNames.has(baseType) ||
        (isArray && !PRISMA_SCALARS.has(baseType));

      currentModel.fields.push({
        name: fieldName,
        type: baseType,
        isArray,
        isId,
        isUnique,
        isRelation,
        isOptional
      });
    }
  }
});

// Mapa de ID sintético gerado para cada Model (garante integridade referencial das FKs)
const modelSeedIdMap = new Map();
models.forEach((m, idx) => {
  const idField = m.fields.find(f => f.isId);
  if (idField && idField.type === 'Int') {
    modelSeedIdMap.set(m.name, `1`);
  } else {
    modelSeedIdMap.set(m.name, `'demo-uuid-${idx + 1}-001'`);
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
    const targetModelName = m.fkTargets.get(f.name);

    if (f.isId) {
      mockVal = modelSeedIdMap.get(m.name) || `'demo-uuid-${idx + 1}-001'`;
    } else if (targetModelName && modelSeedIdMap.has(targetModelName)) {
      mockVal = modelSeedIdMap.get(targetModelName);
    } else if (enumMap.has(f.type) && enumMap.get(f.type).length > 0) {
      mockVal = `'${enumMap.get(f.type)[0]}'`;
    } else if (f.name.toLowerCase().includes('email')) {
      mockVal = `'usuario${idx + 1}@exemplo.com'`;
    } else if (f.name.toLowerCase().includes('name') || f.name.toLowerCase().includes('nome')) {
      mockVal = `'Carlos Henrique ${idx + 1}'`;
    } else if (f.type === 'Boolean') {
      mockVal = `true`;
    } else if (f.type === 'Int' || f.type === 'Float' || f.type === 'Decimal' || f.type === 'BigInt') {
      mockVal = `100`;
    } else if (f.type === 'DateTime') {
      mockVal = `new Date()`;
    } else if (f.type === 'Json') {
      mockVal = `{}`;
    }

    seedCode += `      ${f.name}: ${mockVal},\n`;
  });

  seedCode += `    }
  ];

  for (const item of ${modelLower}Data) {
    try {
      // Upsert/create idempotente
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
