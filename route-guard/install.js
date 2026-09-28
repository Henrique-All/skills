#!/usr/bin/env node
/**
 * install.js - Instalador Universal da Skill Route Guard
 * Compatível com Windows, macOS e Linux.
 * 
 * Uso:
 *   node install.js                       -> Instala no workspace atual (.agents/skills/route-guard)
 *   node install.js --global              -> Instala no perfil global de todos os agentes detectados
 *   node install.js --global --target=gemini   -> Instala no perfil global do Antigravity/Gemini
 *   node install.js --global --target=claude   -> Instala no perfil global do Claude Code
 *   node install.js --global --target=cursor   -> Instala no perfil global do Cursor
 *   node install.js --global --target=all      -> Instala no perfil global de todos os agentes suportados
 *   node install.js --both                     -> Instala no workspace atual E no perfil global
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('===============================================================');
console.log('🛡️  INSTALADOR - ROUTE GUARD SKILL (UNIVERSAL)');
console.log('===============================================================\n');

const args = process.argv.slice(2);
const isGlobal = args.includes('--global') || args.includes('-g');
const isBoth = args.includes('--both') || args.includes('-b');
const targetArg = args.find((a) => a.startsWith('--target='));
const requestedTargets = targetArg ? targetArg.split('=')[1].split(',') : ['all'];

const homeDir = os.homedir();

const AGENT_TARGETS = {
  gemini: {
    label: 'Google Antigravity / Gemini CLI',
    dir: path.join(homeDir, '.gemini', 'config', 'skills', 'route-guard'),
    type: 'dir',
  },
  claude: {
    label: 'Claude Code',
    dir: path.join(homeDir, '.claude', 'skills', 'route-guard'),
    type: 'dir',
  },
  cursor: {
    label: 'Cursor Rules',
    dir: path.join(homeDir, '.cursor', 'rules'),
    fileTarget: 'route-guard.mdc',
    type: 'cursor_rule',
    note: 'Regra instalada em ~/.cursor/rules/route-guard.mdc para acionamento contextual no Cursor.',
  },
};

const sourceDir = __dirname;
const skillMdPath = path.join(sourceDir, 'SKILL.md');
const mdcPath = path.join(sourceDir, 'route-guard.mdc');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      if (childItemName === 'node_modules' || childItemName === '.git') return;
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function cleanOrPrepare(targetDir) {
  if (fs.existsSync(targetDir)) {
    try {
      fs.rmSync(targetDir, { recursive: true, force: true });
    } catch (e) {
      // Ignora erro se houver
    }
  }
}

function installDirectory(targetDir, label, note) {
  console.log(`\n📁 Instalando em (${label}):`);
  console.log(`   -> ${targetDir}`);
  try {
    cleanOrPrepare(targetDir);
    copyRecursiveSync(sourceDir, targetDir);
    console.log('   ✅ Instalado com sucesso!');
    if (note) console.log(`   ℹ️  ${note}`);
  } catch (err) {
    console.error(`   ❌ Falha ao instalar em ${label}: ${err.message}`);
  }
}

function installCursorRule(targetDir, label, note) {
  console.log(`\n📁 Instalando Regra Cursor em (${label}):`);
  console.log(`   -> ${targetDir}`);
  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const destFile = path.join(targetDir, 'route-guard.mdc');
    if (fs.existsSync(mdcPath)) {
      fs.copyFileSync(mdcPath, destFile);
      console.log(`   ✅ Regra instalada com sucesso em: ${destFile}`);
      if (note) console.log(`   ℹ️  ${note}`);
    } else {
      console.error(`   ⚠️ Arquivo route-guard.mdc não encontrado em ${sourceDir}`);
    }
  } catch (err) {
    console.error(`   ❌ Falha ao instalar regra no Cursor: ${err.message}`);
  }
}

// 1. Instalação Local (no Workspace)
if (!isGlobal || isBoth) {
  const localTarget = path.resolve(process.cwd(), '.agents', 'skills', 'route-guard');
  console.log('📍 MODO: Instalação no Workspace Local (.agents/skills/route-guard)');
  installDirectory(localTarget, 'Workspace Local (.agents)', 'Disponível imediatamente para este repositório.');
}

// 2. Instalação Global (Perfis dos Agentes)
if (isGlobal || isBoth) {
  console.log('\n🌐 MODO: Instalação no Perfil Global dos Agentes de IA');

  const targetsToInstall = requestedTargets.includes('all')
    ? Object.keys(AGENT_TARGETS)
    : requestedTargets;

  targetsToInstall.forEach((targetKey) => {
    const target = AGENT_TARGETS[targetKey];
    if (!target) {
      console.warn(`\n⚠️  Alvo desconhecido: "${targetKey}". Opções: gemini, claude, cursor, all.`);
      return;
    }

    if (target.type === 'cursor_rule') {
      installCursorRule(target.dir, `Perfil Global — ${target.label}`, target.note);
    } else {
      installDirectory(target.dir, `Perfil Global — ${target.label}`, target.note);
    }
  });
}

console.log('\n===============================================================');
console.log('🎉 INSTALAÇÃO DO ROUTE GUARD CONCLUÍDA!');
console.log('Como acionar com qualquer Agente de IA:');
console.log('  1. Analisar Rota:');
console.log('     "Analise o impacto e os contratos da rota POST /pedidos com a route-guard."');
console.log('===============================================================\n');
