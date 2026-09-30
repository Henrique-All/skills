#!/usr/bin/env node
/**
 * install.js - Instalador Universal da Skill /orch (Master Command)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const args = process.argv.slice(2);
const isGlobal = args.includes('--global') || args.includes('-g');
const isBoth = args.includes('--both') || args.includes('-b');

const homeDir = os.homedir();
const sourceDir = __dirname;
const skillMdPath = path.join(sourceDir, 'SKILL.md');
const mdcPath = path.join(sourceDir, 'orch.mdc');

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

// 1. Instalação Local no Workspace
if (!isGlobal || isBoth) {
  copyRecursiveSync(sourceDir, path.join(process.cwd(), '.agents', 'skills', 'orch'));
  copyRecursiveSync(sourceDir, path.join(process.cwd(), '.claude', 'skills', 'orch'));
  const cursorDir = path.join(process.cwd(), '.cursor', 'rules');
  if (!fs.existsSync(cursorDir)) fs.mkdirSync(cursorDir, { recursive: true });
  if (fs.existsSync(mdcPath)) fs.copyFileSync(mdcPath, path.join(cursorDir, 'orch.mdc'));
}

// 2. Instalação Global
if (isGlobal || isBoth) {
  copyRecursiveSync(sourceDir, path.join(homeDir, '.gemini', 'config', 'skills', 'orch'));
  copyRecursiveSync(sourceDir, path.join(homeDir, '.claude', 'skills', 'orch'));
  const globalCursorDir = path.join(homeDir, '.cursor', 'rules');
  if (!fs.existsSync(globalCursorDir)) fs.mkdirSync(globalCursorDir, { recursive: true });
  if (fs.existsSync(mdcPath)) fs.copyFileSync(mdcPath, path.join(globalCursorDir, 'orch.mdc'));
}

console.log('✅ Skill /orch instalada com sucesso!');
