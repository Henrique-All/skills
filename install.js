#!/usr/bin/env node
/**
 * install.js - Instalador Central Unificado do Monorepo de Skills
 * Detecta todas as skills no repositório e instala todas de uma única vez.
 * 
 * Uso:
 *   node install.js                       -> Instala todas no workspace atual (.agents/skills/*)
 *   node install.js --global              -> Instala todas no perfil global (Gemini, Claude, Cursor)
 *   node install.js --global --target=all -> Instala todas em todos os agentes suportados
 *   node install.js --both                -> Instala local e globalmente
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('===============================================================');
console.log('🚀 INSTALADOR CENTRAL UNIFICADO — HENRIQUE SKILLS MONOREPO');
console.log('===============================================================\n');

const rootDir = __dirname;
const args = process.argv.slice(2).join(' ');

const entries = fs.readdirSync(rootDir, { withFileTypes: true });

const skillsToInstall = entries
  .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'scripts')
  .filter((e) => fs.existsSync(path.join(rootDir, e.name, 'install.js')))
  .map((e) => e.name);

console.log(`📦 Skills encontradas para instalação (${skillsToInstall.length}):`);
skillsToInstall.forEach((s) => console.log(`   - ${s}`));
console.log(`\n⚙️  Flags de instalação: ${args || '(instalação local padrão)'}\n`);

for (const skillName of skillsToInstall) {
  const skillDir = path.join(rootDir, skillName);
  console.log(`---------------------------------------------------------------`);
  console.log(`⚡ Instalando: [${skillName}]...`);
  console.log(`---------------------------------------------------------------`);
  try {
    execSync(`node install.js ${args}`, { cwd: skillDir, stdio: 'inherit' });
  } catch (err) {
    console.error(`❌ Falha ao instalar [${skillName}]: ${err.message}`);
  }
}

console.log('\n===============================================================');
console.log('🎉 TODAS AS SKILLS FORAM INSTALADAS COM SUCESSO!');
console.log('===============================================================\n');
