#!/usr/bin/env node
/**
 * install.js - Instalador Universal da Skill Test Forge
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const args = process.argv.slice(2);
const isGlobal = args.includes('--global') || args.includes('-g');
const isBoth = args.includes('--both') || args.includes('-b');

const homeDir = os.homedir();
const sourceDir = __dirname;
const mdcPath = path.join(sourceDir, 'test-forge.mdc');

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
  copyRecursiveSync(sourceDir, path.join(process.cwd(), '.agents', 'skills', 'test-forge'));
  copyRecursiveSync(sourceDir, path.join(process.cwd(), '.claude', 'skills', 'test-forge'));
  const cursorDir = path.join(process.cwd(), '.cursor', 'rules');
  if (!fs.existsSync(cursorDir)) fs.mkdirSync(cursorDir, { recursive: true });
  if (fs.existsSync(mdcPath)) fs.copyFileSync(mdcPath, path.join(cursorDir, 'test-forge.mdc'));
}

// 2. Instalação Global
if (isGlobal || isBoth) {
  copyRecursiveSync(sourceDir, path.join(homeDir, '.gemini', 'config', 'skills', 'test-forge'));
  copyRecursiveSync(sourceDir, path.join(homeDir, '.claude', 'skills', 'test-forge'));
  const globalCursorDir = path.join(homeDir, '.cursor', 'rules');
  if (!fs.existsSync(globalCursorDir)) fs.mkdirSync(globalCursorDir, { recursive: true });
  if (fs.existsSync(mdcPath)) fs.copyFileSync(mdcPath, path.join(globalCursorDir, 'test-forge.mdc'));
}

console.log('✅ Skill test-forge instalada com sucesso!');
