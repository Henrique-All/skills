#!/usr/bin/env node
/**
 * scripts/sync-versions.js — Alinha a versão de todas as skills com o package.json raiz (v2.7.0)
 *
 * Uso:
 *   node scripts/sync-versions.js          -> grava a versão raiz nos package.json das skills
 *   node scripts/sync-versions.js --check  -> falha (exit 1) se alguma versão divergir
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const isCheck = process.argv.includes('--check');

const rootPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
const targetVersion = rootPkg.version;

const extraManifests = ['plugin.json'];
const skillManifests = fs
  .readdirSync(rootDir, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
  .filter((e) => fs.existsSync(path.join(rootDir, e.name, 'SKILL.md')) && fs.existsSync(path.join(rootDir, e.name, 'package.json')))
  .map((e) => path.join(e.name, 'package.json'));

let divergent = 0;
for (const rel of [...extraManifests, ...skillManifests]) {
  const abs = path.join(rootDir, rel);
  if (!fs.existsSync(abs)) continue;
  const raw = fs.readFileSync(abs, 'utf-8');
  const json = JSON.parse(raw);
  if (json.version === targetVersion) continue;

  if (isCheck) {
    console.error(`❌ Versão divergente em ${rel}: ${json.version} (esperado ${targetVersion})`);
    divergent++;
  } else {
    const updated = raw.replace(/("version"\s*:\s*")[^"]+(")/, `$1${targetVersion}$2`);
    fs.writeFileSync(abs, updated, 'utf-8');
    console.log(`🔄 ${rel}: ${json.version} -> ${targetVersion}`);
  }
}

if (isCheck) {
  if (divergent > 0) {
    console.error(`\n❌ ${divergent} manifesto(s) fora da versão ${targetVersion}. Rode: node scripts/sync-versions.js`);
    process.exit(1);
  }
  console.log(`✅ Todas as skills e o plugin estão na versão ${targetVersion}.`);
}
