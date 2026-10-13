#!/usr/bin/env node
/**
 * db-sentinel/test/validate.js
 * Teste automatizado de integridade da skill db-sentinel.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const skillDir = path.resolve(__dirname, '..');
const requiredFiles = [
  'SKILL.md',
  'install.js',
  'db-sentinel.mdc',
  'AGENTS.md',
  'README.md',
  'package.json',
  'scripts/db-audit.js',
  'scripts/generate-seed.js'
];

console.log('🧪 Validando arquivos da skill db-sentinel...\n');

requiredFiles.forEach(file => {
  const filePath = path.join(skillDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Arquivo obrigatório não encontrado: ${file}`);
    process.exit(1);
  }
  const stats = fs.statSync(filePath);
  console.log(`✅ ${file} (${stats.size} bytes)`);
});

// Valida frontmatter do SKILL.md
const skillMd = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf-8');
if (!skillMd.startsWith('---') || !skillMd.includes('name: db-sentinel')) {
  console.error('❌ Frontmatter inválido no SKILL.md');
  process.exit(1);
}
console.log('✅ SKILL.md: Frontmatter válido e nome correspondente.');

// Testa scripts com schema temporário
const tmpSchemaPath = path.join(skillDir, 'test', 'temp_schema.prisma');
const tmpSchemaContent = `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  orders    Order[]
}

model Order {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  total     Float
  status    String
  createdAt DateTime @default(now())

  @@index([userId])
}
`;

fs.writeFileSync(tmpSchemaPath, tmpSchemaContent);

const tmpDrizzlePath = path.join(skillDir, 'test', 'temp_drizzle.ts');
const tmpDrizzleContent = `import { pgTable, uuid, text } from 'drizzle-orm/pg-core';
export const users = pgTable('users', {
  id: uuid('id').primaryKey()
});
export const posts = pgTable('posts', {
  id: uuid('id').primaryKey(),
  authorId: uuid('author_id').references(() => users.id),
  title: text('title')
});
`;
fs.writeFileSync(tmpDrizzlePath, tmpDrizzleContent);

try {
  // Teste db-audit (Prisma)
  const prismaAuditRaw = execSync(`node "${path.join(skillDir, 'scripts', 'db-audit.js')}" "${tmpSchemaPath}" --json`, { encoding: 'utf-8' });
  const prismaAudit = JSON.parse(prismaAuditRaw);
  if (prismaAudit.findings.some(f => f.rule === 'MISSING_FOREIGN_KEY_INDEX')) {
    console.error('❌ db-audit.js reportou falso positivo de FK em Order (que já possui @@index([userId]))');
    process.exit(1);
  }
  console.log('✅ Execução bem-sucedida: scripts/db-audit.js (Prisma)');

  // Teste db-audit (Drizzle .ts)
  const drizzleAuditRaw = execSync(`node "${path.join(skillDir, 'scripts', 'db-audit.js')}" "${tmpDrizzlePath}" --json`, { encoding: 'utf-8' });
  const drizzleAudit = JSON.parse(drizzleAuditRaw);
  if (!drizzleAudit.findings.some(f => f.rule === 'MISSING_FOREIGN_KEY_INDEX')) {
    console.error('❌ db-audit.js falhou ao detectar FK sem índice em schema Drizzle (.ts)');
    process.exit(1);
  }
  console.log('✅ Execução bem-sucedida: scripts/db-audit.js (Drizzle ORM .ts)');

  // Teste generate-seed (com --out separado por espaço e validação de relação 1:N + FK)
  const tmpSeedPath = path.join(skillDir, 'test', 'temp_seed.ts');
  execSync(`node "${path.join(skillDir, 'scripts', 'generate-seed.js')}" "${tmpSchemaPath}" --out "${tmpSeedPath}"`, { encoding: 'utf-8' });
  if (fs.existsSync(tmpSeedPath)) {
    const seedContent = fs.readFileSync(tmpSeedPath, 'utf-8');
    if (seedContent.includes('orders:')) {
      console.error('❌ generate-seed.js incluiu campo virtual 1:N (orders) nos dados escalares!');
      process.exit(1);
    }
    if (!seedContent.includes("userId: 'demo-uuid-1-001'")) {
      console.error('❌ generate-seed.js não vinculou Order.userId ao ID de User!');
      process.exit(1);
    }
    console.log('✅ Execução bem-sucedida: scripts/generate-seed.js (1:N filtrado e FK consistente)');
    fs.unlinkSync(tmpSeedPath);
  }
} finally {
  if (fs.existsSync(tmpSchemaPath)) fs.unlinkSync(tmpSchemaPath);
  if (fs.existsSync(tmpDrizzlePath)) fs.unlinkSync(tmpDrizzlePath);
}

console.log('\n🎉 Todos os componentes da skill db-sentinel validados com 100% de integridade!');
