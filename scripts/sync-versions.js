#!/usr/bin/env node
/**
 * scripts/sync-versions.js — Unifica a versão em todo o monorepo a partir de package.json (fonte única)
 *
 * Alvos sincronizados e verificados:
 *   - package.json (fonte canônica)
 *   - plugin.json
 *   - <skill>/package.json (todas as 10 skills)
 *   - README.md (cabeçalho, seção de economia de tokens e árvore de arquitetura)
 *
 * Uso:
 *   node scripts/sync-versions.js          -> propaga a versão do package.json raiz para todos os alvos
 *   node scripts/sync-versions.js --check  -> falha (exit 1) se houver divergência em qualquer alvo
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const isCheck = process.argv.includes('--check');

const rootPkgPath = path.join(rootDir, 'package.json');
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'));
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
  let json = {};
  try {
    json = JSON.parse(raw);
  } catch {
    continue;
  }
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

// Verifica e sincroniza referências de versão da suíte no README.md
const readmePath = path.join(rootDir, 'README.md');
if (fs.existsSync(readmePath)) {
  const readmeRaw = fs.readFileSync(readmePath, 'utf-8');
  const lines = readmeRaw.split('\n');
  const mismatches = [];
  const updatedLines = lines.map((line, idx) => {
    // Ignora exemplos históricos explícitos de rollback (switch-version.js / orch switch) e especificação SARIF v2.1.0
    if (line.includes('switch-version.js') || line.includes('orch.js switch') || line.includes('SARIF v2.1.0')) return line;
    return line.replace(/\bv(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\b/g, (full, ver) => {
      if (ver !== targetVersion) {
        mismatches.push(`L${idx + 1}: ${full}`);
        return `v${targetVersion}`;
      }
      return full;
    });
  });

  if (!readmeRaw.includes(`Enterprise AI Suite (v${targetVersion})`)) {
    mismatches.push('Cabeçalho sem Enterprise AI Suite (v' + targetVersion + ')');
  }

  if (mismatches.length > 0) {
    if (isCheck) {
      console.error(`❌ Versão divergente no README.md: encontrado [${mismatches.join(', ')}] (esperado v${targetVersion})`);
      divergent++;
    } else {
      fs.writeFileSync(readmePath, updatedLines.join('\n'), 'utf-8');
      console.log(`🔄 README.md sincronizado para v${targetVersion} (${mismatches.length} ocorrência(s) atualizada(s))`);
    }
  }
}

if (isCheck) {
  if (divergent > 0) {
    console.error(`\n❌ ${divergent} arquivo(s) divergem da versão ${targetVersion} (package.json). Rode: node scripts/sync-versions.js`);
    process.exit(1);
  }
  console.log(`✅ Versão unificada (${targetVersion}) validada em package.json, plugin.json, ${skillManifests.length} skills e README.md.`);
}
