/**
 * test/precision.test.js — Precisão do test-forge/test-audit (v2.7.0)
 * Teste limpo -> 0 achados · supressão inline com motivo · baseline · SARIF válido.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const auditScript = path.join(__dirname, '..', 'scripts', 'test-audit.js');
let failures = 0;
const check = (label, ok, detail = '') => {
  if (ok) console.log(`   ✅ [PASS] ${label}`);
  else { console.error(`   ❌ [FAIL] ${label}${detail ? ` -> ${detail}` : ''}`); failures++; }
};
const run = (dir, extra = '') => {
  try { return execSync(`node "${auditScript}" "${dir}" ${extra}`, { encoding: 'utf-8' }); }
  catch (e) { return e.stdout ? e.stdout.toString() : ''; }
};

console.log('🎯 Testes de Precisão do test-forge...\n');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'testforge-precision-'));
fs.writeFileSync(path.join(dir, 'sum.test.ts'), [
  "import { sum } from './sum';",
  "describe('sum', () => {",
  "  it('soma dois números', () => {",
  '    expect(sum(2, 3)).toBe(5);',
  '  });',
  '});'
].join('\n'));

const clean = JSON.parse(run(dir, '--json'));
check('Teste limpo (asserção real) gera 0 achados e score 100', clean.findings.length === 0 && clean.score === 100, JSON.stringify(clean.findings));

fs.writeFileSync(path.join(dir, 'debug.test.ts'), [
  "describe('debug', () => {",
  '  // audit-ignore-next-line FOCUSED_TEST_ONLY: arquivo de reprodução local, excluído do CI via testPathIgnorePatterns',
  "  it.only('reproduz bug', () => { expect(1 + 1).toBe(2); });",
  "  it.only('esquecido', () => { expect(2 + 2).toBe(4); });",
  '});'
].join('\n'));
const sup = JSON.parse(run(dir, '--json'));
const onlyLines = sup.findings.filter((f) => f.rule === 'FOCUSED_TEST_ONLY').map((f) => f.line);
check('.only com motivo é suprimido; .only sem motivo continua (linha 4)', !onlyLines.includes(3) && onlyLines.includes(4), JSON.stringify(onlyLines));

const updated = JSON.parse(run(dir, '--json --update-baseline'));
const afterBaseline = JSON.parse(run(dir, '--json --baseline'));
check('--update-baseline + --baseline zera achados conhecidos', updated.findings.length === 0 && afterBaseline.findings.length === 0);

const sarif = JSON.parse(run(dir, '--sarif'));
check('--sarif emite SARIF 2.1.0', sarif.version === '2.1.0' && Array.isArray(sarif.runs[0].results));

fs.rmSync(dir, { recursive: true, force: true });

if (failures > 0) { console.error(`\n❌ ${failures} teste(s) de precisão falharam.`); process.exit(1); }
console.log('\n🎉 Precisão do test-forge validada!');
