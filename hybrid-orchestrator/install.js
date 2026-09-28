#!/usr/bin/env node
/**
 * install.js - Instalador Universal da Skill Hybrid Orchestrator
 * Compatível com Windows, macOS e Linux.
 * 
 * Uso:
 *   node install.js                       -> Instala no workspace atual (.agents/skills/hybrid-orchestrator)
 *   node install.js --global              -> Instala no perfil global de todos os agentes detectados (Gemini, Claude, Cursor)
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
console.log('⚡ INSTALADOR - HYBRID ORCHESTRATOR SKILL (UNIVERSAL)');
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
    dir: path.join(homeDir, '.gemini', 'config', 'skills', 'hybrid-orchestrator'),
    type: 'dir',
  },
  claude: {
    label: 'Claude Code',
    dir: path.join(homeDir, '.claude', 'skills', 'hybrid-orchestrator'),
    type: 'dir',
  },
  cursor: {
    label: 'Cursor Rules',
    dir: path.join(homeDir, '.cursor', 'rules'),
    fileTarget: 'hybrid-orchestrator.mdc',
    type: 'cursor_rule',
    note: 'Regra instalada em ~/.cursor/rules/hybrid-orchestrator.mdc para acionamento contextual no Cursor.',
  },
};

const sourceDir = __dirname;
const skillMdPath = path.join(sourceDir, 'SKILL.md');
const mdcPath = path.join(sourceDir, 'hybrid-orchestrator.mdc');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      // Ignorar node_modules, .git e arquivos temporários
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
      // Se não puder apagar por lock, sobrescreverá na cópia
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
    const destFile = path.join(targetDir, 'hybrid-orchestrator.mdc');
    if (fs.existsSync(mdcPath)) {
      fs.copyFileSync(mdcPath, destFile);
    } else if (fs.existsSync(skillMdPath)) {
      fs.copyFileSync(skillMdPath, destFile);
    }
    console.log('   ✅ Regra instalada com sucesso em: ' + destFile);
    if (note) console.log(`   ℹ️  ${note}`);
  } catch (err) {
    console.error(`   ❌ Falha ao instalar regra no Cursor: ${err.message}`);
  }
}

// 1. Instalação no Workspace atual
if (!isGlobal || isBoth) {
  const targetWorkspace = path.join(process.cwd(), '.agents', 'skills', 'hybrid-orchestrator');
  installDirectory(targetWorkspace, 'Workspace Local (.agents/skills)');

  // Se houver pasta .claude no projeto ou para Claude Code
  const targetClaudeWorkspace = path.join(process.cwd(), '.claude', 'skills', 'hybrid-orchestrator');
  installDirectory(targetClaudeWorkspace, 'Workspace Local Claude (.claude/skills)');

  // Se houver pasta .cursor no projeto
  const targetCursorWorkspace = path.join(process.cwd(), '.cursor', 'rules');
  installCursorRule(targetCursorWorkspace, 'Workspace Local Cursor (.cursor/rules)');
}

// 2. Instalação Global nos perfis dos agentes escolhidos
if (isGlobal || isBoth) {
  const targets = requestedTargets.includes('all') ? Object.keys(AGENT_TARGETS) : requestedTargets;
  targets.forEach((key) => {
    const agent = AGENT_TARGETS[key];
    if (!agent) {
      console.error(`\n⚠️  Agente-alvo desconhecido: "${key}". Opções válidas: ${Object.keys(AGENT_TARGETS).join(', ')}, all.`);
      return;
    }
    if (agent.type === 'cursor_rule') {
      installCursorRule(agent.dir, `Perfil Global — ${agent.label}`, agent.note);
    } else {
      installDirectory(agent.dir, `Perfil Global — ${agent.label}`, agent.note);
    }
  });
}

console.log('\n===============================================================');
console.log('🎉 INSTALAÇÃO CONCLUÍDA!');
console.log('Como acionar com qualquer Agente de IA:');
console.log('  1. Antigravity / Gemini:');
console.log('     "Ative a skill hybrid-orchestrator para resolver esta demanda."');
console.log('  2. Com Flags de Rotação:');
console.log('     --fast / --quick  -> Execução Cirúrgica com Diffs Atômicos');
console.log('     --deep / --swarm  -> Validação Enxame/Adversária com Testes de Estresse');
console.log('  3. Claude Code:');
console.log('     Carregado automaticamente via ~/.claude/skills/hybrid-orchestrator');
console.log('  4. Cursor / Windsurf:');
console.log('     Carregado via regras contextuais (.cursor/rules)');
console.log('===============================================================');
