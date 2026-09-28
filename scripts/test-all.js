#!/usr/bin/env node
/**
 * scripts/test-all.js - Validador Universal do Monorepo de Skills
 * Executa os testes de integridade de todas as skills detectadas na raiz.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('===============================================================');
console.log('🧪 MONOREPO CI — VALIDANDO TODAS AS SKILLS');
console.log('===============================================================\n');

const rootDir = path.resolve(__dirname, '..');
const entries = fs.readdirSync(rootDir, { withFileTypes: true });

const skillDirs = entries
  .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'scripts')
  .filter((e) => fs.existsSync(path.join(rootDir, e.name, 'SKILL.md')))
  .map((e) => e.name);

console.log(`🔍 Skills detectadas (${skillDirs.length}): ${skillDirs.join(', ')}\n`);

let hasFailures = false;

for (const skillName of skillDirs) {
  const skillPath = path.join(rootDir, skillName);
  console.log(`▶️  Testando skill: [${skillName}]...`);
  
  try {
    execSync('npm test', { cwd: skillPath, stdio: 'inherit' });
    console.log(`✅ [${skillName}] aprovado!\n`);
  } catch (err) {
    console.error(`❌ [${skillName}] falhou nos testes!\n`);
    hasFailures = true;
  }
}

if (hasFailures) {
  console.error('💥 Erros encontrados no pipeline de testes do monorepo.');
  process.exit(1);
} else {
  console.log('===============================================================');
  console.log('🎉 100% DAS SKILLS VALIDADAS COM SUCESSO!');
  console.log('===============================================================\n');
}
