#!/usr/bin/env node
/**
 * install.js - Instalador Central Unificado (Enterprise AI Suite v2.2.0)
 * Suporte a Plugins e Subagentes no Google Antigravity + Retrocompatibilidade Claude Code e Cursor.
 * 
 * Uso:
 *   node install.js                       -> Instala skills e plugin localmente (.agents/)
 *   node install.js --global              -> Instala skills e plugin globalmente (~/.gemini, ~/.claude, ~/.cursor)
 *   node install.js --global --target=all -> Instala tudo em todos os ambientes
 *   node install.js --both                -> Instala local e globalmente
 *   node install.js --plugin-only         -> Instala exclusivamente o Plugin oficial do Antigravity
 *   node install.js --version             -> Abre menu interativo para escolher e instalar versão do GitHub
 *   node install.js --version=<tag>       -> Baixa e instala uma versão específica do GitHub (sem git clone)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const rawArgs = process.argv.slice(2);
const hasVersionFlag = rawArgs.some(a => a.startsWith('--version') || a === '--switch');

if (hasVersionFlag) {
  // Delega diretamente para o seletor de versão remota
  require('./scripts/switch-version.js');
  return;
}

console.log('===============================================================');
console.log('🚀 INSTALADOR CENTRAL UNIFICADO — ENTERPRISE AI SUITE v2.2.0');
console.log('   (Plugin Oficial + Subagentes + Travas Reativas + Skills)');
console.log('===============================================================\n');

const rootDir = __dirname;
const homeDir = os.homedir();
const args = rawArgs.join(' ');
const isGlobal = rawArgs.includes('--global') || rawArgs.includes('-g');
const isBoth = rawArgs.includes('--both') || rawArgs.includes('-b');
const isPluginOnly = rawArgs.includes('--plugin-only');

// Função auxiliar de cópia recursiva ignorando lixo
function copyRecursiveSync(src, dest, ignoreList = ['node_modules', '.git', '.DS_Store']) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      if (ignoreList.includes(child)) continue;
      copyRecursiveSync(path.join(src, child), path.join(dest, child), ignoreList);
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

// 1. INSTALAÇÃO DO PLUGIN OFICIAL DO ANTIGRAVITY
function deployAntigravityPlugin(targetDir, label) {
  console.log(`\n📦 Instalando Plugin Oficial do Antigravity em (${label}):`);
  console.log(`   -> ${targetDir}`);

  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Copia manifestos e regras
    const filesToCopy = ['plugin.json', 'hooks.json'];
    for (const file of filesToCopy) {
      const srcFile = path.join(rootDir, file);
      if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, path.join(targetDir, file));
      }
    }

    // Copia pastas essenciais do plugin
    const dirsToCopy = ['agents', 'rules', 'scripts'];
    for (const dir of dirsToCopy) {
      const srcSub = path.join(rootDir, dir);
      if (fs.existsSync(srcSub)) {
        copyRecursiveSync(srcSub, path.join(targetDir, dir));
      }
    }

    // Empacota as skills dentro de <targetDir>/skills/
    const targetSkillsDir = path.join(targetDir, 'skills');
    if (!fs.existsSync(targetSkillsDir)) {
      fs.mkdirSync(targetSkillsDir, { recursive: true });
    }

    const entries = fs.readdirSync(rootDir, { withFileTypes: true });
    const skills = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'scripts' && e.name !== 'agents' && e.name !== 'rules' && e.name !== 'adapters')
      .filter((e) => fs.existsSync(path.join(rootDir, e.name, 'SKILL.md')))
      .map((e) => e.name);

    for (const skillName of skills) {
      const srcSkill = path.join(rootDir, skillName);
      const destSkill = path.join(targetSkillsDir, skillName);
      copyRecursiveSync(srcSkill, destSkill);
    }

    console.log(`   ✅ Plugin "${label}" instalado com sucesso com ${skills.length} skills e subagentes!`);
  } catch (err) {
    console.error(`   ❌ Falha ao instalar Plugin em ${label}: ${err.message}`);
  }
}

// 1. INSTALAÇÃO DO PLUGIN OFICIAL DO ANTIGRAVITY
const targetWorkspace = process.env.TARGET_WORKSPACE || process.cwd();

if (!isGlobal || isBoth) {
  const localPluginDir = path.join(targetWorkspace, '.agents', 'plugins', 'enterprise-ai-suite');
  deployAntigravityPlugin(localPluginDir, 'Workspace Local (.agents/plugins/enterprise-ai-suite)');
}

if (isGlobal || isBoth) {
  const globalPluginDir = path.join(homeDir, '.gemini', 'config', 'plugins', 'enterprise-ai-suite');
  deployAntigravityPlugin(globalPluginDir, 'Perfil Global (~/.gemini/config/plugins/enterprise-ai-suite)');
}

// 2. INSTALAÇÃO DAS SKILLS INDIVIDUAIS (Retrocompatibilidade Claude Code, Cursor e Skills isoladas)
if (!isPluginOnly) {
  console.log('\n---------------------------------------------------------------');
  console.log('🔄 Sincronizando Skills Individuais (Antigravity, Claude, Cursor)...');
  console.log('---------------------------------------------------------------');

  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const skillsToInstall = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'scripts' && e.name !== 'agents' && e.name !== 'rules')
    .filter((e) => fs.existsSync(path.join(rootDir, e.name, 'install.js')))
    .map((e) => e.name);

  for (const skillName of skillsToInstall) {
    const skillScript = path.join(rootDir, skillName, 'install.js');
    console.log(`⚡ Sincronizando skill: [${skillName}]...`);
    try {
      execSync(`node "${skillScript}" ${args}`, { cwd: rootDir, stdio: 'inherit' });
    } catch (err) {
      console.error(`❌ Falha ao instalar [${skillName}]: ${err.message}`);
    }
  }
}

console.log('\n===============================================================');
console.log('🎉 INSTALAÇÃO E SINCRONIZAÇÃO CONCLUÍDAS COM SUCESSO!');
console.log('Ambientes configurados:');
console.log('  1. Google Antigravity: Plugin Oficial + Subagentes + Hooks');
console.log('  2. Claude Code: Skills sincronizadas em ~/.claude/skills/');
console.log('  3. Cursor / Windsurf: Regras sincronizadas em ~/.cursor/rules/');
console.log('===============================================================\n');
