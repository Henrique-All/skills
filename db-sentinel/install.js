#!/usr/bin/env node
/**
 * install.js - Instalador Universal da Skill DB Sentinel
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const args = process.argv.slice(2);
const isGlobal = args.includes('--global') || args.includes('-g');
const isBoth = args.includes('--both') || args.includes('-b');

const homeDir = os.homedir();
const sourceDir = __dirname;
const mdcPath = path.join(sourceDir, 'db-sentinel.mdc');

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
  copyRecursiveSync(sourceDir, path.join(process.cwd(), '.agents', 'skills', 'db-sentinel'));
  copyRecursiveSync(sourceDir, path.join(process.cwd(), '.claude', 'skills', 'db-sentinel'));
  const cursorDir = path.join(process.cwd(), '.cursor', 'rules');
  if (!fs.existsSync(cursorDir)) fs.mkdirSync(cursorDir, { recursive: true });
  if (fs.existsSync(mdcPath)) fs.copyFileSync(mdcPath, path.join(cursorDir, 'db-sentinel.mdc'));
}

// 2. Instalação Global
if (isGlobal || isBoth) {
  copyRecursiveSync(sourceDir, path.join(homeDir, '.gemini', 'config', 'skills', 'db-sentinel'));
  copyRecursiveSync(sourceDir, path.join(homeDir, '.claude', 'skills', 'db-sentinel'));
  const globalCursorDir = path.join(homeDir, '.cursor', 'rules');
  if (!fs.existsSync(globalCursorDir)) fs.mkdirSync(globalCursorDir, { recursive: true });
  if (fs.existsSync(mdcPath)) fs.copyFileSync(mdcPath, path.join(globalCursorDir, 'db-sentinel.mdc'));
}

console.log('✅ Skill db-sentinel instalada com sucesso!');
