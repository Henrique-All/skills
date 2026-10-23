/**
 * test/precision.test.js — Precisão do db-sentinel (v2.7.0)
 * Fixture limpa -> 0 achados · supressão inline com motivo · SARIF válido.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const auditScript = path.join(__dirname, '..', 'scripts', 'db-audit.js');
let failures = 0;
const check = (label, ok, detail = '') => {
  if (ok) console.log(`   ✅ [PASS] ${label}`);
  else { console.error(`   ❌ [FAIL] ${label}${detail ? ` -> ${detail}` : ''}`); failures++; }
};
const run = (dir, extra = '') => {
  try { return execSync(`node "${auditScript}" "${dir}" ${extra}`, { encoding: 'utf-8' }); }
  catch (e) { return e.stdout ? e.stdout.toString() : ''; }
};

console.log('🎯 Testes de Precisão do db-sentinel...\n');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'db-precision-'));
fs.mkdirSync(path.join(dir, 'prisma'));
fs.writeFileSync(path.join(dir, 'prisma', 'schema.prisma'), [
  'model User {',
  '  id     String  @id @default(uuid())',
  '  orders Order[]',
  '}',
  '',
  'model Order {',
  '  id     String  @id @default(uuid())',
  '  total  Decimal @db.Decimal(10, 2)',
  '  userId String',
  '  user   User    @relation(fields: [userId], references: [id])',
  '',
  '  @@index([userId])',
  '}'
].join('\n'));

const clean = JSON.parse(run(dir, '--json'));
check('Schema limpo (Decimal em dinheiro + FK indexada) gera 0 achados', clean.findings.length === 0, clean.findings.map((f) => f.rule).join(', '));

// Supressão inline com motivo
fs.writeFileSync(path.join(dir, 'prisma', 'schema.prisma'), [
  'model Product {',
  '  id    String @id @default(uuid())',
  '  // audit-ignore-next-line FLOAT_FOR_MONEY: preço de referência externa, nunca usado em cálculo financeiro',
  '  price Float',
  '}'
].join('\n'));
const suppressed = JSON.parse(run(dir, '--json'));
check('Supressão inline com motivo remove FLOAT_FOR_MONEY', !suppressed.findings.some((f) => f.rule === 'FLOAT_FOR_MONEY') && suppressed.suppressed === 1,
  JSON.stringify(suppressed.findings.map((f) => `${f.rule}:${f.line}`)));

// SARIF
fs.writeFileSync(path.join(dir, 'prisma', 'schema.prisma'), 'model Product {\n  id    String @id\n  price Float\n}\n');
const sarif = JSON.parse(run(dir, '--sarif'));
check('--sarif emite SARIF 2.1.0 com o achado FLOAT_FOR_MONEY', sarif.version === '2.1.0' && sarif.runs[0].results.some((r) => r.ruleId === 'FLOAT_FOR_MONEY'));

fs.rmSync(dir, { recursive: true, force: true });

if (failures > 0) { console.error(`\n❌ ${failures} teste(s) de precisão falharam.`); process.exit(1); }
console.log('\n🎉 Precisão do db-sentinel validada!');
