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

if (errors > 0) {
  console.error(`\n❌ Falha na validação: ${errors} erro(s) encontrado(s).`);
  process.exit(1);
} else {
  console.log('\n🎉 Todos os componentes validados com 100% de integridade!');
}
