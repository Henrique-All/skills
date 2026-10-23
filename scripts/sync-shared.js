#!/usr/bin/env node
/**
 * scripts/sync-shared.js — Distribui o núcleo comum (shared/) para as skills (v2.7.0)
 *
 * Cada skill é instalada de forma avulsa no Claude Code / Cursor, então o código comum
 * é COPIADO (não importado) para dentro de cada skill. A fonte única é a pasta shared/.
 *
 * Uso:
 *   node scripts/sync-shared.js          -> copia shared/* para as skills
 *   node scripts/sync-shared.js --check  -> falha (exit 1) se alguma cópia divergir
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const isCheck = process.argv.includes('--check');

const SYNC_MAP = {
  'suite-core.js': [
    'devsecops-audit/scripts/lib/suite-core.js',
    'frontend-craftsman/scripts/lib/suite-core.js',
    'mobile-converter/scripts/lib/suite-core.js',
    'db-sentinel/scripts/lib/suite-core.js',
    'hybrid-orchestrator/scripts/lib/suite-core.js',
    'test-forge/scripts/lib/suite-core.js'
  ],
  'style-blocks.js': [
    'frontend-craftsman/scripts/lib/style-blocks.js',
    'mobile-converter/scripts/lib/style-blocks.js'
  ],
  'visual-check.js': [
    'frontend-craftsman/scripts/visual-check.js',
    'mobile-converter/scripts/visual-check.js'
  ]
};

const normalize = (s) => s.replace(/\r\n/g, '\n');
let divergent = 0;
let written = 0;

for (const [sourceName, targets] of Object.entries(SYNC_MAP)) {
  const sourcePath = path.join(rootDir, 'shared', sourceName);
  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ Fonte ausente: shared/${sourceName}`);
    process.exit(1);
  }
  const source = normalize(fs.readFileSync(sourcePath, 'utf-8'));

  for (const rel of targets) {
    const targetPath = path.join(rootDir, rel);
    const current = fs.existsSync(targetPath) ? normalize(fs.readFileSync(targetPath, 'utf-8')) : null;
    if (current === source) continue;

    if (isCheck) {
      console.error(`❌ Cópia divergente de shared/${sourceName}: ${rel}`);
      divergent++;
    } else {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, source, 'utf-8');
      console.log(`🔄 Sincronizado: shared/${sourceName} -> ${rel}`);
      written++;
    }
  }
}

if (isCheck) {
  if (divergent > 0) {
    console.error(`\n❌ ${divergent} cópia(s) divergente(s). Rode: node scripts/sync-shared.js`);
    process.exit(1);
  }
  console.log('✅ Núcleo compartilhado (shared/) idêntico em todas as skills.');
} else {
  console.log(written > 0 ? `\n✅ ${written} arquivo(s) sincronizado(s).` : '✅ Tudo já estava sincronizado.');
}
