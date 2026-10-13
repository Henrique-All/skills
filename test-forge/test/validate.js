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
  execSync(`node "${path.join(skillDir, 'scripts', 'forge-api-test.js')}" POST /api/test --out "${tmpApiTest}"`, { encoding: 'utf-8' });
  console.log('✅ Execução bem-sucedida: scripts/forge-api-test.js');

  execSync(`node "${path.join(skillDir, 'scripts', 'forge-e2e.js')}" /test-page --out "${tmpE2eTest}"`, { encoding: 'utf-8' });
  const e2eGenerated = fs.readFileSync(tmpE2eTest, 'utf-8');
  if (!e2eGenerated.includes('defaultBrowserType') || !e2eGenerated.includes('toBeGreaterThanOrEqual(44)')) {
    console.error('❌ forge-e2e.js não desestruturou defaultBrowserType ou não exigiu 44px!');
    process.exit(1);
  }
  console.log('✅ Execução bem-sucedida: scripts/forge-e2e.js (Playwright descriptor & 44px validados)');

  // Teste de auditoria (os testes gerados pelo próprio Test Forge DEVEM atingir score 100/100!)
  const auditRaw = execSync(`node "${path.join(skillDir, 'scripts', 'test-audit.js')}" "${path.join(skillDir, 'test')}" --json`, { encoding: 'utf-8' });
  const auditResult = JSON.parse(auditRaw);
  if (auditResult.score !== 100 || auditResult.findings.length > 0) {
    console.error(`❌ Os arquivos gerados pelo Test Forge não atingiram 100/100 no test-audit.js! Score: ${auditResult.score}`);
    process.exit(1);
  }
  console.log('✅ Execução bem-sucedida: scripts/test-audit.js (Score 100/100 nos arquivos gerados)');
} finally {
  if (fs.existsSync(tmpApiTest)) fs.unlinkSync(tmpApiTest);
  if (fs.existsSync(tmpE2eTest)) fs.unlinkSync(tmpE2eTest);
}

console.log('\n🎉 Todos os componentes da skill test-forge validados com 100% de integridade!');
