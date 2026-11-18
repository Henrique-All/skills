#!/usr/bin/env node
/**
 * install.js - Instalador Universal da Skill Audit Code Full
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const args = process.argv.slice(2);
const isGlobal = args.includes('--global') || args.includes('-g');
const isBoth = args.includes('--both') || args.includes('-b');

const homeDir = os.homedir();
const sourceDir = __dirname;
const mdcPath = path.join(sourceDir, 'audit-code-full.mdc');

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      if (child === 'node_modules' || child === '.git') continue;
      copyRecursiveSync(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

// 1. Instalação Local no Workspace (Antigravity, Codex, OpenCode, Claude Code, Cursor)
if (!isGlobal || isBoth) {
  copyRecursiveSync(sourceDir, path.join(process.cwd(), '.agents', 'skills', 'audit-code-full'));
  copyRecursiveSync(sourceDir, path.join(process.cwd(), '.opencode', 'skills', 'audit-code-full'));
  copyRecursiveSync(sourceDir, path.join(process.cwd(), '.claude', 'skills', 'audit-code-full'));
  const cursorDir = path.join(process.cwd(), '.cursor', 'rules');
  if (!fs.existsSync(cursorDir)) fs.mkdirSync(cursorDir, { recursive: true });
  if (fs.existsSync(mdcPath)) fs.copyFileSync(mdcPath, path.join(cursorDir, 'audit-code-full.mdc'));
}

// 2. Instalação Global (Antigravity, Claude Code, ChatGPT Codex, OpenCode, Cursor)
if (isGlobal || isBoth) {
  const skillMdPath = path.join(sourceDir, 'SKILL.md');
  copyRecursiveSync(sourceDir, path.join(homeDir, '.gemini', 'config', 'skills', 'audit-code-full'));
  copyRecursiveSync(sourceDir, path.join(homeDir, '.claude', 'skills', 'audit-code-full'));
  copyRecursiveSync(sourceDir, path.join(homeDir, '.codex', 'skills', 'audit-code-full'));
  copyRecursiveSync(sourceDir, path.join(homeDir, '.agents', 'skills', 'audit-code-full'));
  copyRecursiveSync(sourceDir, path.join(homeDir, '.config', 'opencode', 'skills', 'audit-code-full'));
  copyRecursiveSync(sourceDir, path.join(homeDir, '.opencode', 'skills', 'audit-code-full'));
  if (fs.existsSync(skillMdPath)) {
    for (const cmdDir of [
      path.join(homeDir, '.codex', 'prompts'),
      path.join(homeDir, '.config', 'opencode', 'commands'),
      path.join(homeDir, '.config', 'opencode', 'command'),
      path.join(homeDir, '.claude', 'commands')
    ]) {
      fs.mkdirSync(cmdDir, { recursive: true });
      fs.copyFileSync(skillMdPath, path.join(cmdDir, 'audit-code-full.md'));
    }
  }
  const globalCursorDir = path.join(homeDir, '.cursor', 'rules');
  if (!fs.existsSync(globalCursorDir)) fs.mkdirSync(globalCursorDir, { recursive: true });
  if (fs.existsSync(mdcPath)) fs.copyFileSync(mdcPath, path.join(globalCursorDir, 'audit-code-full.mdc'));
}

console.log('✅ Skill audit-code-full instalada com sucesso!');

