#!/usr/bin/env node
/**
 * scripts/benchmark-tokens.js
 * Benchmark reproduzível de economia de contexto (tokens) da Enterprise AI Suite.
 *
 * Metodologia:
 * Compara o custo em bytes e tokens estimados (1 token ≈ 4 bytes UTF-8, padrão BPE/cl100k)
 * entre dois fluxos reais executados sobre os arquivos deste próprio repositório:
 *   1. Fluxo Tradicional (Sem Suíte): leitura bruta dos arquivos-fonte (.js) e SKILL.md
 *      das skills e scripts para mapear arquitetura e auditar código no contexto do LLM.
 *   2. Fluxo Enterprise AI Suite: leitura do índice cartográfico (.code-map/INDEX.md +
 *      .code-map/handshake.json) combinada aos resumos JSON compactos (--compact) dos
 *      motores determinísticos locais.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const isJson = process.argv.includes('--json');

const SKILL_DIRS = [
  'audit-code-full',
  'db-sentinel',
  'devsecops-audit',
  'frontend-craftsman',
  'hybrid-orchestrator',
  'mobile-converter',
  'orch',
  'repo-cartographer',
  'route-guard',
  'test-forge'
];

function estimateTokens(textOrBytes) {
  const bytes = typeof textOrBytes === 'number'
    ? textOrBytes
    : Buffer.byteLength(String(textOrBytes), 'utf8');
  return Math.ceil(bytes / 4);
}

function collectFiles(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.code-map', '.agents', '.kiro'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, exts, out);
    } else if (exts.some(ext => entry.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

// Cenário 1: Leitura tradicional de exploração de código + docs das skills
const sourceFiles = [
  ...collectFiles(path.join(rootDir, 'scripts'), ['.js']),
  ...collectFiles(path.join(rootDir, 'shared'), ['.js']),
  ...collectFiles(path.join(rootDir, 'bin'), ['.js']),
  ...SKILL_DIRS.flatMap(sk => collectFiles(path.join(rootDir, sk), ['.js', '.md']))
];

let rawTotalBytes = 0;
for (const file of sourceFiles) {
  rawTotalBytes += fs.statSync(file).size;
}
const rawTotalTokens = estimateTokens(rawTotalBytes);

// Cenário 2: Cartografia (.code-map/INDEX.md + handshake.json) + Resumos Compactos
const indexMdPath = path.join(rootDir, '.code-map', 'INDEX.md');
const handshakePath = path.join(rootDir, '.code-map', 'handshake.json');

if (!fs.existsSync(indexMdPath) || !fs.existsSync(handshakePath)) {
  execFileSync(process.execPath, [path.join(rootDir, 'repo-cartographer', 'scripts', 'cartographer.js'), 'init', '.'], {
    cwd: rootDir,
    stdio: 'ignore'
  });
}

const indexBytes = fs.existsSync(indexMdPath) ? fs.statSync(indexMdPath).size : 0;
const handshakeBytes = fs.existsSync(handshakePath) ? fs.statSync(handshakePath).size : 0;

let compactAuditOut = '';
try {
  compactAuditOut = execFileSync(
    process.execPath,
    [path.join(rootDir, 'devsecops-audit', 'scripts', 'audit.js'), '.', '--compact', '--no-npm-audit'],
    { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  );
} catch (err) {
  compactAuditOut = (err.stdout || '').toString();
}

let compactDbOut = '';
try {
  compactDbOut = execFileSync(
    process.execPath,
    [path.join(rootDir, 'db-sentinel', 'scripts', 'db-audit.js'), '.', '--compact'],
    { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  );
} catch (err) {
  compactDbOut = (err.stdout || '').toString();
}

const compactBytes = indexBytes + handshakeBytes + Buffer.byteLength(compactAuditOut, 'utf8') + Buffer.byteLength(compactDbOut, 'utf8');
const compactTokens = estimateTokens(compactBytes);

const savedTokens = rawTotalTokens - compactTokens;
const reductionPct = Number(((savedTokens / rawTotalTokens) * 100).toFixed(1));

const result = {
  methodology: '1 token ~= 4 UTF-8 bytes (BPE approximation on real repository files)',
  filesAnalyzed: sourceFiles.length,
  traditionalRawRead: {
    bytes: rawTotalBytes,
    estimatedTokens: rawTotalTokens
  },
  suiteCompactWorkflow: {
    indexMdBytes: indexBytes,
    handshakeJsonBytes: handshakeBytes,
    compactAuditsBytes: Buffer.byteLength(compactAuditOut, 'utf8') + Buffer.byteLength(compactDbOut, 'utf8'),
    totalBytes: compactBytes,
    estimatedTokens: compactTokens
  },
  savings: {
    tokensSaved: savedTokens,
    reductionPercent: reductionPct
  }
};

if (isJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log('===================================================================');
  console.log('📊 BENCHMARK REPRODUZÍVEL DE TOKENS — ENTERPRISE AI SUITE');
  console.log('===================================================================');
  console.log(`Arquivos analisados no monorepo: ${result.filesAnalyzed}`);
  console.log(`Metodologia: ${result.methodology}\n`);
  console.log(`1. Leitura Bruta Tradicional (código + SKILL.md):`);
  console.log(`   - Bytes totais:     ${rawTotalBytes.toLocaleString('en-US')} B`);
  console.log(`   - Tokens estimados: ~${rawTotalTokens.toLocaleString('en-US')} tokens\n`);
  console.log(`2. Fluxo Cartografia + Motores Compactos (--compact):`);
  console.log(`   - .code-map/INDEX.md:      ${indexBytes.toLocaleString('en-US')} B (~${estimateTokens(indexBytes)} tokens)`);
  console.log(`   - .code-map/handshake.json: ${handshakeBytes.toLocaleString('en-US')} B (~${estimateTokens(handshakeBytes)} tokens)`);
  console.log(`   - Saídas CLI --compact:     ${result.suiteCompactWorkflow.compactAuditsBytes.toLocaleString('en-US')} B (~${estimateTokens(result.suiteCompactWorkflow.compactAuditsBytes)} tokens)`);
  console.log(`   - Total no contexto:        ${compactBytes.toLocaleString('en-US')} B (~${compactTokens.toLocaleString('en-US')} tokens)\n`);
  console.log(`✅ Economia medida neste repositório: ~${savedTokens.toLocaleString('en-US')} tokens (${reductionPct}% de redução)`);
  console.log('===================================================================');
}
