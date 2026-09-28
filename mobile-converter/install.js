#!/usr/bin/env node
/**
 * install.js - Instalador Universal da Skill Mobile Converter
 * Compatível com Windows, macOS e Linux.
 * 
 * Uso:
 *   node install.js                       -> Instala no workspace atual (.agents/skills/mobile-converter)
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
console.log('📱 INSTALADOR - MOBILE CONVERTER SKILL (UNIVERSAL)');
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
    dir: path.join(homeDir, '.gemini', 'config', 'skills', 'mobile-converter'),
    type: 'dir',
  },
  claude: {
    label: 'Claude Code',
    dir: path.join(homeDir, '.claude', 'skills', 'mobile-converter'),
    type: 'dir',
  },
  cursor: {
    label: 'Cursor Rules',
    dir: path.join(homeDir, '.cursor', 'rules'),
    fileTarget: 'mobile-converter.mdc',
    type: 'cursor_rule',
    note: 'Regra instalada em ~/.cursor/rules/mobile-converter.mdc para acionamento contextual no Cursor.',
  },
};

const sourceDir = __dirname;
const skillMdPath = path.join(sourceDir, 'SKILL.md');
const mdcPath = path.join(sourceDir, 'mobile-converter.mdc');

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
      // Ignora erro se não conseguir deletar
    }
  }
  fs.mkdirSync(targetDir, { recursive: true });
}

// 1. Instalação no Workspace Local
if (!isGlobal || isBoth) {
  console.log('📁 MODO: Instalação no Workspace Local');
  const workspaceSkillsDir = path.resolve(process.cwd(), '.agents', 'skills', 'mobile-converter');
  
  try {
    cleanOrPrepare(workspaceSkillsDir);
    copyRecursiveSync(sourceDir, workspaceSkillsDir);
    console.log(`   ✅ Instalado com sucesso em: ${workspaceSkillsDir}\n`);
  } catch (err) {
    console.error(`   ❌ Falha ao instalar no workspace local: ${err.message}\n`);
  }
}

// 2. Instalação no Perfil Global
if (isGlobal || isBoth) {
  console.log('🌐 MODO: Instalação no Perfil Global dos Agentes de IA\n');

  for (const [key, config] of Object.entries(AGENT_TARGETS)) {
    if (!requestedTargets.includes('all') && !requestedTargets.includes(key)) {
      continue;
    }

    if (config.type === 'cursor_rule') {
      console.log(`📁 Instalando Regra Cursor em (Perfil Global — ${config.label}):`);
      console.log(`   -> ${config.dir}`);
      try {
        if (!fs.existsSync(config.dir)) {
          fs.mkdirSync(config.dir, { recursive: true });
        }
        const destFile = path.join(config.dir, config.fileTarget);
        if (fs.existsSync(mdcPath)) {
          fs.copyFileSync(mdcPath, destFile);
          console.log(`   ✅ Regra instalada com sucesso em: ${destFile}`);
          if (config.note) console.log(`   ℹ️  ${config.note}\n`);
        }
      } catch (err) {
        console.error(`   ❌ Falha ao instalar regra no Cursor: ${err.message}\n`);
      }
    } else {
      console.log(`📁 Instalando em (Perfil Global — ${config.label}):`);
      console.log(`   -> ${config.dir}`);
      try {
        cleanOrPrepare(config.dir);
        copyRecursiveSync(sourceDir, config.dir);
        console.log(`   ✅ Instalado com sucesso!\n`);
      } catch (err) {
        console.error(`   ❌ Falha ao instalar em ${config.label}: ${err.message}\n`);
      }
    }
  }
}

console.log('===============================================================');
console.log('🎉 INSTALAÇÃO DA SKILL MOBILE CONVERTER CONCLUÍDA!');
console.log('Como acionar com qualquer Agente de IA:');
console.log('  1. "Adapte este componente para mobile com a skill mobile-converter."');
console.log('  2. "Audite a responsividade desta tela com mobile-audit.js."');
console.log('===============================================================\n');
