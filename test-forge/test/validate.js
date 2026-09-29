#!/usr/bin/env node
/**
 * test-forge/test/validate.js
 * Teste automatizado de integridade da skill test-forge.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const skillDir = path.resolve(__dirname, '..');
const requiredFiles = [
  'SKILL.md',
  'install.js',
  'test-forge.mdc',
  'AGENTS.md',
  'README.md',
  'package.json',
  'scripts/forge-api-test.js',
  'scripts/forge-e2e.js',
  'scripts/test-audit.js'
];

console.log('🧪 Validando arquivos da skill test-forge...\n');

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
if (!skillMd.startsWith('---') || !skillMd.includes('name: test-forge')) {
  console.error('❌ Frontmatter inválido no SKILL.md');
  process.exit(1);
}
console.log('✅ SKILL.md: Frontmatter válido e nome correspondente.');

// Teste de execução dos geradores
const tmpApiTest = path.join(skillDir, 'test', 'temp.api.test.ts');
const tmpE2eTest = path.join(skillDir, 'test', 'temp.e2e.spec.ts');

try {
  execSync(`node "${path.join(skillDir, 'scripts', 'forge-api-test.js')}" POST /api/test --out="${tmpApiTest}"`, { encoding: 'utf-8' });
  console.log('✅ Execução bem-sucedida: scripts/forge-api-test.js');

  execSync(`node "${path.join(skillDir, 'scripts', 'forge-e2e.js')}" /test-page --out="${tmpE2eTest}"`, { encoding: 'utf-8' });
  console.log('✅ Execução bem-sucedida: scripts/forge-e2e.js');

  // Teste de auditoria
  execSync(`node "${path.join(skillDir, 'scripts', 'test-audit.js')}" "${path.join(skillDir, 'test')}" --json`, { encoding: 'utf-8' });
  console.log('✅ Execução bem-sucedida: scripts/test-audit.js');
} finally {
  if (fs.existsSync(tmpApiTest)) fs.unlinkSync(tmpApiTest);
  if (fs.existsSync(tmpE2eTest)) fs.unlinkSync(tmpE2eTest);
}

console.log('\n🎉 Todos os componentes da skill test-forge validados com 100% de integridade!');
