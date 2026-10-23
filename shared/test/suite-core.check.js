#!/usr/bin/env node
/**
 * shared/test/suite-core.check.js — Testes diretos do núcleo comum (v2.7.0)
 *
 *  1. --update-baseline: achados protegidos (neverSuppress, ex.: segredos do Pilar 16)
 *     ficam fora do baseline e continuam no retorno
 *  2. --baseline: achados protegidos nunca são ocultados; achados conhecidos somem
 *  3. fingerprintKey: achados sem linha própria (lockfile, tsconfig) usam uma chave estável;
 *     um achado novo na mesma linha não é escondido pelo baseline
 *
 * Sem dependências externas. Exit 1 se algum caso falhar.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const core = require('../suite-core');

let failures = 0;
const tempDirs = [];

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`   ✅ [PASS] ${label}`);
  } else {
    console.error(`   ❌ [FAIL] ${label}${detail ? ` -> ${detail}` : ''}`);
    failures++;
  }
}

function makeTempDir(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function readBaselineFingerprints(dir) {
  const baselinePath = path.join(dir, '.audit-baseline.json');
  if (!fs.existsSync(baselinePath)) return null;
  return JSON.parse(fs.readFileSync(baselinePath, 'utf-8')).fingerprints || [];
}

console.log('🧩 Testes do núcleo compartilhado (shared/suite-core.js)...\n');

try {
  // -------------------------------------------------------------------------
  // 1 e 2. Baseline com achado protegido (segredo do Pilar 16)
  // -------------------------------------------------------------------------
  const dir = makeTempDir('suite-core-baseline-');
  fs.writeFileSync(path.join(dir, 'a.ts'), `export const key = "${'AKIA' + '1234567890ABCDEF'}";\n`);
  fs.writeFileSync(path.join(dir, 'b.ts'), "res.cookie('sid', token);\n");

  const secret = { id: 'HARDCODED_SECRET_DETECTED', pilar: 16, severity: 'CRITICAL', file: 'a.ts', line: 1, message: 'segredo' };
  const cookie = { id: 'COOKIE_INSECURE_FLAGS', pilar: 4, severity: 'MEDIUM', file: 'b.ts', line: 1, message: 'cookie' };
  const neverSuppress = (f) => f.pilar === 16;

  const updated = core.postProcess([secret, cookie], {
    projectDir: dir,
    toolName: 'test-tool',
    argv: ['--update-baseline'],
    neverSuppress
  });
  const updatedIds = updated.findings.map((f) => f.id);
  check('--update-baseline mantém o segredo (Pilar 16) no retorno',
    updatedIds.length === 1 && updatedIds[0] === 'HARDCODED_SECRET_DETECTED',
    JSON.stringify(updatedIds));
  check('--update-baseline conta em meta.baselined só os achados gravados',
    updated.meta.baselined === 1,
    String(updated.meta.baselined));

  const fps = readBaselineFingerprints(dir);
  check('--update-baseline grava o arquivo .audit-baseline.json', Array.isArray(fps));
  check('--update-baseline grava o achado comum no baseline',
    Array.isArray(fps) && fps.includes(core.fingerprint(cookie, dir)));
  check('--update-baseline NÃO grava o segredo no baseline',
    Array.isArray(fps) && !fps.includes(core.fingerprint(secret, dir)));

  const filtered = core.postProcess([secret, cookie], {
    projectDir: dir,
    toolName: 'test-tool',
    argv: ['--baseline'],
    neverSuppress
  });
  const filteredIds = filtered.findings.map((f) => f.id);
  check('--baseline nunca oculta o segredo', filteredIds.includes('HARDCODED_SECRET_DETECTED'), JSON.stringify(filteredIds));
  check('--baseline oculta o achado conhecido', !filteredIds.includes('COOKIE_INSECURE_FLAGS'), JSON.stringify(filteredIds));

  // -------------------------------------------------------------------------
  // 3. fingerprintKey (achados na linha 1 de um lockfile, por exemplo)
  // -------------------------------------------------------------------------
  // Duas pastas com o mesmo arquivo relativo e conteúdos diferentes (o núcleo guarda as linhas
  // de cada arquivo em cache, então reescrever o mesmo arquivo não serviria para o teste).
  const dirA = makeTempDir('suite-core-fp-a-');
  const dirB = makeTempDir('suite-core-fp-b-');
  fs.writeFileSync(path.join(dirA, 'x.ts'), '{\n  "a": 1\n}\n');
  fs.writeFileSync(path.join(dirB, 'x.ts'), '[\n  1\n]\n');

  const base = { id: 'SUPPLY_CHAIN_NPM_AUDIT_CVE', pilar: 13, severity: 'HIGH', file: 'x.ts', line: 1, message: 'cve' };
  const withKeyA = { ...base, fingerprintKey: 'npm-audit:semver@<7.5.2|GHSA-a' };
  const withKeyB = { ...base, fingerprintKey: 'npm-audit:undici@<5.28.4|GHSA-b' };

  check('Chaves diferentes na mesma linha geram fingerprints diferentes',
    core.fingerprint(withKeyA, dirA) !== core.fingerprint(withKeyB, dirA));
  check('Mesma chave gera o mesmo fingerprint',
    core.fingerprint(withKeyA, dirA) === core.fingerprint({ ...withKeyA }, dirA));
  check('Sem chave, o texto da linha entra no fingerprint',
    core.fingerprint(base, dirA) !== core.fingerprint(base, dirB));
  check('Com chave, o texto da linha não entra no fingerprint',
    core.fingerprint(withKeyA, dirA) === core.fingerprint(withKeyA, dirB));

  const dirC = makeTempDir('suite-core-fp-c-');
  fs.writeFileSync(path.join(dirC, 'x.ts'), '{\n}\n');
  const known = { ...base, fingerprintKey: 'a' };
  const fresh = { ...base, fingerprintKey: 'b' };
  core.postProcess([known], { projectDir: dirC, toolName: 'test-tool', argv: ['--update-baseline'] });
  const afterBaseline = core.postProcess([known, fresh], { projectDir: dirC, toolName: 'test-tool', argv: ['--baseline'] });
  const keys = afterBaseline.findings.map((f) => f.fingerprintKey);
  check('Baseline com chave: achado novo na mesma linha aparece', keys.includes('b'), JSON.stringify(keys));
  check('Baseline com chave: achado conhecido some', !keys.includes('a'), JSON.stringify(keys));
} catch (e) {
  check('Execução sem exceções', false, e && e.stack ? e.stack : String(e));
} finally {
  for (const dir of tempDirs) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

if (failures > 0) {
  console.error(`\n❌ ${failures} teste(s) do núcleo compartilhado falharam.`);
  process.exit(1);
}
console.log('\n🎉 Núcleo compartilhado validado: baseline nunca guarda nem oculta achados protegidos e respeita fingerprintKey.');
