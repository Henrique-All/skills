#!/usr/bin/env node
/**
 * install.js - Instalador Central Unificado (Enterprise AI Suite)
 * Suporte a Plugins e Subagentes no Google Antigravity + Retrocompatibilidade Claude Code e Cursor.
 *
 * Uso:
 *   node install.js                       -> Instala skills e plugin localmente (.agents/)
 *   node install.js --global              -> Instala skills e plugin globalmente (~/.gemini, ~/.claude, ~/.cursor)
 *   node install.js --global --target=all -> Instala tudo em todos os ambientes
 *   node install.js --both                -> Instala local e globalmente
 *   node install.js --plugin-only         -> Instala exclusivamente o Plugin oficial do Antigravity
 *   node install.js --dry-run             -> Simula a instalação sem modificar ou sobrescrever arquivos
 *   node install.js --no-backup           -> Não cria pasta .bak ao atualizar instalação existente
 *   node install.js --version=<tag>       -> Delega para o seletor seguro de versão remota (scripts/switch-version.js)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const rawArgs = process.argv.slice(2);
const hasVersionFlag = rawArgs.some(a => a.startsWith('--version') || a === '--switch');

if (hasVersionFlag) {
  require('./scripts/switch-version.js');
  return;
}

const rootDir = __dirname;
const homeDir = os.homedir();
let suiteVersion = '2.8.0';
try {
  suiteVersion = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8')).version || suiteVersion;
} catch {}

const isGlobal = rawArgs.includes('--global') || rawArgs.includes('-g');
const isBoth = rawArgs.includes('--both') || rawArgs.includes('-b');
const isPluginOnly = rawArgs.includes('--plugin-only');
const isDryRun = rawArgs.includes('--dry-run');
const noBackup = rawArgs.includes('--no-backup');

// Filtra apenas flags reconhecidas para repassar aos instaladores individuais (sem shell interpolation)
const ALLOWED_SKILL_ARGS = new Set([
  '--global',
  '-g',
  '--both',
  '-b',
  '--target=all',
  '--target=gemini',
  '--target=claude',
  '--target=codex',
  '--target=opencode',
  '--target=cursor'
]);
const safeSkillArgs = rawArgs.filter(a => ALLOWED_SKILL_ARGS.has(a));

console.log('===============================================================');
console.log(`🚀 INSTALADOR CENTRAL UNIFICADO — ENTERPRISE AI SUITE v${suiteVersion}`);
console.log('   (Plugin Oficial + 11 Subagentes + Travas Reativas + 10 Skills)');
console.log('===============================================================\n');

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

function backupExistingDirectory(targetDir) {
  if (!fs.existsSync(targetDir) || noBackup || isDryRun) return null;
  const backupDir = `${targetDir}.bak`;
  try {
    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
    copyRecursiveSync(targetDir, backupDir);
    console.log(`   🛡️  Backup da instalação anterior salvo em: ${backupDir}`);
    return backupDir;
  } catch (err) {
    console.warn(`   ⚠️  Não foi possível criar backup de ${targetDir}: ${err.message}`);
    return null;
  }
}

// 1. INSTALAÇÃO DO PLUGIN OFICIAL DO ANTIGRAVITY
function deployAntigravityPlugin(targetDir, label) {
  console.log(`\n📦 Instalando Plugin Oficial do Antigravity em (${label}):`);
  console.log(`   -> ${targetDir}`);

  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const skills = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !['node_modules', 'scripts', 'agents', 'rules', 'adapters', 'bin', 'shared'].includes(e.name))
    .filter((e) => fs.existsSync(path.join(rootDir, e.name, 'SKILL.md')))
    .map((e) => e.name);

  if (isDryRun) {
    console.log(`   🔍 [DRY-RUN] Simulando cópia de plugin.json, hooks.json, agents/, rules/, scripts/, bin/ e ${skills.length} skills para ${targetDir}`);
    return skills;
  }

  try {
    if (fs.existsSync(targetDir)) {
      backupExistingDirectory(targetDir);
    } else {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filesToCopy = ['plugin.json', 'hooks.json'];
    for (const file of filesToCopy) {
      const srcFile = path.join(rootDir, file);
      if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, path.join(targetDir, file));
      }
    }

    const dirsToCopy = ['agents', 'rules', 'scripts', 'bin'];
    for (const dir of dirsToCopy) {
      const srcSub = path.join(rootDir, dir);
      const destSub = path.join(targetDir, dir);
      if (fs.existsSync(srcSub)) {
        if (fs.existsSync(destSub)) fs.rmSync(destSub, { recursive: true, force: true });
        copyRecursiveSync(srcSub, destSub);
      }
    }

    const targetSkillsDir = path.join(targetDir, 'skills');
    if (fs.existsSync(targetSkillsDir)) {
      fs.rmSync(targetSkillsDir, { recursive: true, force: true });
    }
    fs.mkdirSync(targetSkillsDir, { recursive: true });

    for (const skillName of skills) {
      const srcSkill = path.join(rootDir, skillName);
      const destSkill = path.join(targetSkillsDir, skillName);
      copyRecursiveSync(srcSkill, destSkill);
    }

    console.log(`   ✅ Plugin "${label}" instalado com sucesso com ${skills.length} skills e 11 subagentes!`);
    return skills;
  } catch (err) {
    console.error(`   ❌ Falha ao instalar Plugin em ${label}: ${err.message}`);
    return [];
  }
}

function deduplicateAntigravitySkills(baseSkillsDir, skillNames, label) {
  if (!fs.existsSync(baseSkillsDir) || isDryRun) return;
  let removed = 0;
  for (const skillName of skillNames) {
    const dupPath = path.join(baseSkillsDir, skillName);
    if (fs.existsSync(dupPath)) {
      try {
        fs.rmSync(dupPath, { recursive: true, force: true });
        removed++;
      } catch {}
    }
  }
  const legacySec = path.join(baseSkillsDir, 'security-audit');
  if (fs.existsSync(legacySec)) {
    try { fs.rmSync(legacySec, { recursive: true, force: true }); removed++; } catch {}
  }
  if (removed > 0) {
    console.log(`🧹 Desduplicação (${label}): ${removed} cópia(s) avulsa(s) redundante(s) removida(s) (skills servidas pelo Plugin Oficial).`);
  }
}

const targetWorkspace = process.env.TARGET_WORKSPACE || process.cwd();
let installedSkillNames = [];

if (!isGlobal || isBoth) {
  const localPluginDir = path.join(targetWorkspace, '.agents', 'plugins', 'enterprise-ai-suite');
  installedSkillNames = deployAntigravityPlugin(localPluginDir, 'Workspace Local (.agents/plugins/enterprise-ai-suite)');
}

if (isGlobal || isBoth) {
  const globalPluginDir = path.join(homeDir, '.gemini', 'config', 'plugins', 'enterprise-ai-suite');
  installedSkillNames = deployAntigravityPlugin(globalPluginDir, 'Perfil Global (~/.gemini/config/plugins/enterprise-ai-suite)');
  const universalPluginDir = path.join(homeDir, '.agents', 'plugins', 'enterprise-ai-suite');
  deployAntigravityPlugin(universalPluginDir, 'Runtime Universal (~/.agents/plugins/enterprise-ai-suite)');

  if (!isDryRun && !isPluginOnly) {
    // Sincronizar subagentes e instruções globais para OpenCode, ChatGPT Codex e Agent Skills (~/.agents)
    const srcAgentsDir = path.join(rootDir, 'agents');
    if (fs.existsSync(srcAgentsDir)) {
      for (const destAgentsDir of [
        path.join(homeDir, '.agents', 'agents'),
        path.join(homeDir, '.config', 'opencode', 'agents'),
        path.join(homeDir, '.claude', 'agents')
      ]) {
        copyRecursiveSync(srcAgentsDir, destAgentsDir);
      }
    }

    const globalAgentsMd = `# ⚡ Diretrizes Globais — Enterprise AI Suite (v${suiteVersion})

## 1. PASSO ZERO OBRIGATÓRIO: Cartografia Primeiro (Economia de Tokens)
- Antes de executar buscas às cegas no repositório, leia imediatamente \`.code-map/INDEX.md\` (ou \`.code-map/graph.json\`).
- Caso \`.code-map/INDEX.md\` não exista, gere o mapa rodando:
  \`node "$HOME/.agents/plugins/enterprise-ai-suite/skills/repo-cartographer/scripts/cartographer.js" init .\`
- Para executar o pipeline unificado \`/orch\`:
  \`node "$HOME/.agents/plugins/enterprise-ai-suite/bin/orch.js" run "<demanda>"\`

## 2. EXCELÊNCIA PROATIVA (UI Dual-Theme, Mobile Master-Detail, Zero-Trust)
- **Dual-Theme Obrigatório:** Contraste WCAG AA tanto no Modo Claro quanto no Modo Escuro (proibido \`#fff\` hardcoded no tema claro).
- **Mobile Nativo:** Fluxo Master-Detail, \`100dvh\`, Safe Areas e Touch Targets >= 44px.
- **Banco & Segurança:** Índices em todas as FKs, zero N+1, 18 pilares OWASP verificados.
`;
    for (const agentsMdDest of [
      path.join(homeDir, '.codex', 'AGENTS.md'),
      path.join(homeDir, '.config', 'opencode', 'AGENTS.md'),
      path.join(homeDir, 'AGENTS.md')
    ]) {
      try {
        fs.mkdirSync(path.dirname(agentsMdDest), { recursive: true });
        fs.writeFileSync(agentsMdDest, globalAgentsMd, 'utf-8');
      } catch {}
    }

    // Remover stubs legados de 8 linhas do eco-agent-suite que sombreavam as skills reais
    const legacyEcoPlugin = path.join(homeDir, '.gemini', 'config', 'plugins', 'eco-agent-suite');
    if (fs.existsSync(legacyEcoPlugin)) {
      try {
        fs.rmSync(legacyEcoPlugin, { recursive: true, force: true });
        console.log('🧹 Stub legado (~/.gemini/config/plugins/eco-agent-suite) removido para evitar sombreamento das skills.');
      } catch {}
    }
  }
}

// 2. INSTALAÇÃO DAS SKILLS INDIVIDUAIS (Claude Code, ChatGPT Codex, OpenCode e Cursor)
if (!isPluginOnly) {
  console.log('\n---------------------------------------------------------------');
  console.log('🔄 Sincronizando Skills Individuais (Claude Code, Codex, OpenCode & Cursor)...');
  console.log('---------------------------------------------------------------');

  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const skillsToInstall = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !['node_modules', 'scripts', 'agents', 'rules', 'bin', 'shared'].includes(e.name))
    .filter((e) => fs.existsSync(path.join(rootDir, e.name, 'install.js')))
    .map((e) => e.name);

  for (const skillName of skillsToInstall) {
    const skillScript = path.join(rootDir, skillName, 'install.js');
    if (isDryRun) {
      console.log(`🔍 [DRY-RUN] Sincronizaria skill: [${skillName}] com flags [${safeSkillArgs.join(' ')}]`);
      continue;
    }
    console.log(`⚡ Sincronizando skill: [${skillName}]...`);
    try {
      execFileSync(process.execPath, [skillScript, ...safeSkillArgs], { cwd: rootDir, stdio: 'inherit' });
    } catch (err) {
      console.error(`❌ Falha ao instalar [${skillName}]: ${err.message}`);
    }
  }
}

// 3. DESDUPLICAÇÃO NO ANTIGRAVITY GLOBAL (Preservando .agents/skills para Codex e OpenCode)
if (!rawArgs.includes('--keep-duplicates')) {
  if (isGlobal || isBoth) {
    deduplicateAntigravitySkills(path.join(homeDir, '.gemini', 'config', 'skills'), installedSkillNames, '~/.gemini/config/skills');
  }
}

console.log('\n===============================================================');
console.log(isDryRun
  ? '🔍 SIMULAÇÃO (--dry-run) CONCLUÍDA SEM ALTERAR ARQUIVOS!'
  : '🎉 INSTALAÇÃO E SINCRONIZAÇÃO CONCLUÍDAS COM SUCESSO!');
console.log('Ambientes configurados:');
console.log('  1. Google Antigravity: Plugin Oficial + 11 Subagentes + Hooks (Desduplicado)');
console.log('  2. ChatGPT Codex (OpenAI): Skills e Prompts em ~/.codex/skills/, ~/.agents/skills/ e .agents/skills/');
console.log('  3. OpenCode: Skills e Comandos em ~/.config/opencode/skills/, ~/.config/opencode/commands/ e .opencode/skills/');
console.log('  4. Claude Code: Skills e Comandos em ~/.claude/skills/ e ~/.claude/commands/');
console.log('  5. Cursor / Windsurf: Regras sincronizadas em ~/.cursor/rules/');
console.log('===============================================================\n');
