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

try {
  // Teste db-audit
  execSync(`node "${path.join(skillDir, 'scripts', 'db-audit.js')}" "${tmpSchemaPath}" --json`, { encoding: 'utf-8' });
  console.log('✅ Execução bem-sucedida: scripts/db-audit.js');

  // Teste generate-seed
  const tmpSeedPath = path.join(skillDir, 'test', 'temp_seed.ts');
  execSync(`node "${path.join(skillDir, 'scripts', 'generate-seed.js')}" "${tmpSchemaPath}" --out="${tmpSeedPath}"`, { encoding: 'utf-8' });
  if (fs.existsSync(tmpSeedPath)) {
    console.log('✅ Execução bem-sucedida: scripts/generate-seed.js');
    fs.unlinkSync(tmpSeedPath);
  }
} finally {
  if (fs.existsSync(tmpSchemaPath)) {
    fs.unlinkSync(tmpSchemaPath);
  }
}

console.log('\n🎉 Todos os componentes da skill db-sentinel validados com 100% de integridade!');
