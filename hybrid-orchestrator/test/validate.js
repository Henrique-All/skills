const fs = require('fs');
const os = require('os');
const path = require('path');

console.log('🧪 Validando arquivos da skill hybrid-orchestrator...\n');

const rootDir = path.resolve(__dirname, '..');
const filesToCheck = [
  'SKILL.md',
  'install.js',
  'hybrid-orchestrator.mdc',
  'AGENTS.md',
  'README.md',
  'package.json',
  'scripts/snapshot.js',
  'scripts/falsify.js',
  'scripts/preview-plan.js'
];

let errors = 0;

filesToCheck.forEach((file) => {
  const filePath = path.join(rootDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Arquivo ausente: ${file}`);
    errors++;
  } else {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${file} (${stats.size} bytes)`);
  }
});

// Checar frontmatter do SKILL.md
const skillContent = fs.readFileSync(path.join(rootDir, 'SKILL.md'), 'utf8');
if (!skillContent.startsWith('---')) {
  console.error('❌ SKILL.md não possui YAML frontmatter de abertura (---)');
  errors++;
} else if (!skillContent.includes('name: hybrid-orchestrator')) {
  console.error('❌ SKILL.md não possui "name: hybrid-orchestrator" no frontmatter');
  errors++;
} else {
  console.log('✅ SKILL.md: Frontmatter válido e nome correspondente.');
}

// Testar execução dos scripts
const { execSync } = require('child_process');
try {
  execSync(`node "${path.join(rootDir, 'scripts', 'snapshot.js')}" --status`, { stdio: 'ignore' });
  console.log('✅ Execução bem-sucedida: scripts/snapshot.js');
} catch (e) {
  console.error('❌ Erro ao rodar snapshot.js:', e.message);
  errors++;
}

try {
  execSync(`node "${path.join(rootDir, 'scripts', 'preview-plan.js')}" "Test Plan"`, { stdio: 'ignore' });
  console.log('✅ Execução bem-sucedida: scripts/preview-plan.js');
} catch (e) {
  console.error('❌ Erro ao rodar preview-plan.js:', e.message);
  errors++;
}

try {
  execSync(`node "${path.join(rootDir, 'scripts', 'falsify.js')}" "${path.join(rootDir, 'scripts')}" --strict`, { stdio: 'ignore' });
  console.log('✅ Execução bem-sucedida: scripts/falsify.js (--strict sem falsos positivos)');
} catch (e) {
  console.error('❌ Erro ao rodar falsify.js:', e.message);
  errors++;
}

// Testar detecção dos novos Vetores 6, 7 e 8 + saída --json
try {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'falsify-test-'));
  const sampleFile = path.join(tmpDir, 'walletService.tsx');
  fs.writeFileSync(
    sampleFile,
    `
import { useEffect } from 'react';
export async function debitWallet(userId: string, amount: number) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  await prisma.wallet.update({ where: { userId }, data: { balance: wallet.balance - amount } });
  try {
    doSomethingRisky();
  } catch (err) {}
}
export function LeakyWidget() {
  useEffect(() => {
    window.addEventListener('resize', () => {});
  }, []);
  return null;
}
`,
    'utf8'
  );
  const raw = execSync(`node "${path.join(rootDir, 'scripts', 'falsify.js')}" "${tmpDir}" --json`).toString();
  const parsed = JSON.parse(raw);
  const rules = (parsed.findings || []).map((f) => f.rule);
  fs.rmSync(tmpDir, { recursive: true, force: true });

  if (
    !rules.includes('LOST_UPDATE_RACE_CONDITION') ||
    !rules.includes('EFFECT_MEMORY_LEAK') ||
    !rules.includes('SWALLOWED_EXCEPTION')
  ) {
    console.error('❌ falsify.js --json não detectou todos os vetores 6/7/8 esperados:', rules);
    errors++;
  } else {
    console.log('✅ falsify.js --json detectou LOST_UPDATE_RACE_CONDITION, EFFECT_MEMORY_LEAK e SWALLOWED_EXCEPTION!');
  }
} catch (e) {
  console.error('❌ Erro no teste de vetores 6/7/8 do falsify.js:', e.message);
  errors++;
}

// Precisão v2.7.0: escopo POR FUNÇÃO (Vetores 2 e 4), fixture limpa e supressão inline
try {
  const precDir = fs.mkdtempSync(path.join(os.tmpdir(), 'falsify-precision-'));
  // Arquivo com 2 rotas: só a SEM validação deve disparar (antes, um "if (!" em qualquer lugar mascarava tudo)
  fs.writeFileSync(path.join(precDir, 'routes.ts'), [
    "import { z } from 'zod';",
    'const Body = z.object({ name: z.string() });',
    'export async function createUser(req, res) {',
    '  const data = Body.parse(req.body);',
    '  await svc.create(data);',
    '}',
    'export async function updateUser(req, res) {',
    '  await svc.update(req.params.id, req.body);',
    '}',
    // 2 funções com 1 escrita cada: NÃO é operação múltipla
    'export async function a() {',
    '  await prisma.user.create({ data: {} });',
    '}',
    'export async function b() {',
    '  await prisma.order.create({ data: {} });',
    '}'
  ].join('\n'), 'utf8');
  // Fixture limpa: catch que loga e relança, effect com cleanup
  fs.writeFileSync(path.join(precDir, 'clean.tsx'), [
    "import { useEffect } from 'react';",
    'export async function run(id) {',
    '  try { await svc.run(id); } catch (e) { logger.error(e); throw e; }',
    '}',
    'export function Widget() {',
    '  useEffect(() => {',
    "    const onResize = () => {};",
    "    window.addEventListener('resize', onResize);",
    "    return () => window.removeEventListener('resize', onResize);",
    '  }, []);',
    '  return null;',
    '}'
  ].join('\n'), 'utf8');
  // Supressão inline com motivo
  fs.writeFileSync(path.join(precDir, 'suppressed.ts'), [
    'export function legacy() {',
    '  // audit-ignore-next-line SWALLOWED_EXCEPTION: erro de telemetria é opcional por design',
    '  try { telemetry.send(); } catch {}',
    '}'
  ].join('\n'), 'utf8');

  const precRaw = execSync(`node "${path.join(rootDir, 'scripts', 'falsify.js')}" "${precDir}" --json`, { cwd: precDir }).toString();
  const prec = JSON.parse(precRaw);
  fs.rmSync(precDir, { recursive: true, force: true });

  const boundary = prec.findings.filter((f) => f.rule === 'UNVALIDATED_PAYLOAD_BOUNDARY');
  const atomic = prec.findings.filter((f) => f.rule === 'NON_ATOMIC_MULTI_MUTATION');
  const fromClean = prec.findings.filter((f) => f.file.endsWith('clean.tsx'));
  const swallowed = prec.findings.filter((f) => f.rule === 'SWALLOWED_EXCEPTION');

  const problems = [];
  if (boundary.length !== 1 || boundary[0].line !== 8) problems.push(`Vetor 2 por função esperava 1 achado na linha 8, obteve ${JSON.stringify(boundary.map((f) => f.line))}`);
  if (atomic.length !== 0) problems.push('Vetor 4 não deve somar escritas de funções diferentes');
  if (fromClean.length !== 0) problems.push(`Fixture limpa gerou achados: ${fromClean.map((f) => f.rule).join(', ')}`);
  if (swallowed.length !== 0 || prec.suppressed !== 1) problems.push('Supressão inline com motivo não foi aplicada');

  if (problems.length > 0) {
    problems.forEach((p) => console.error(`❌ ${p}`));
    errors++;
  } else {
    console.log('✅ Precisão do falsify.js: escopo por função, fixture limpa com 0 achados e supressão inline com motivo!');
  }
} catch (e) {
  console.error('❌ Erro no teste de precisão do falsify.js:', e.message);
  errors++;
}

if (errors > 0) {
  console.error(`\n❌ Falha na validação: ${errors} erro(s) encontrado(s).`);
  process.exit(1);
} else {
  console.log('\n🎉 Todos os componentes validados com 100% de integridade!');
}
