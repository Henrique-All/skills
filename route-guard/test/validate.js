/**
 * test/validate.js - Validador de Integridade da Skill Route Guard v2.0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧪 Validando arquivos da skill route-guard...\n');

const rootDir = path.resolve(__dirname, '..');
const requiredFiles = [
  'SKILL.md',
  'install.js',
  'route-guard.mdc',
  'AGENTS.md',
  'README.md',
  'package.json',
  'route-guard.config.example.json',
  'scripts/analyze-route.js',
  'scripts/generate-contract.js',
  'scripts/mock-route.js'
];

let hasErrors = false;

requiredFiles.forEach((file) => {
  const fullPath = path.join(rootDir, file);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Arquivo obrigatório não encontrado: ${file}`);
    hasErrors = true;
  } else {
    const stats = fs.statSync(fullPath);
    if (stats.size === 0) {
      console.error(`❌ Arquivo vazio: ${file}`);
      hasErrors = true;
    } else {
      console.log(`✅ ${file} (${stats.size} bytes)`);
    }
  }
});

const jsonFiles = ['package.json', 'route-guard.config.example.json'];
jsonFiles.forEach((file) => {
  try {
    const content = fs.readFileSync(path.join(rootDir, file), 'utf-8');
    JSON.parse(content);
    console.log(`✅ JSON válido: ${file}`);
  } catch (err) {
    console.error(`❌ JSON inválido em ${file}: ${err.message}`);
    hasErrors = true;
  }
});

try {
  const skillContent = fs.readFileSync(path.join(rootDir, 'SKILL.md'), 'utf-8');
  if (!skillContent.startsWith('---') || !skillContent.includes('name: route-guard')) {
    console.error('❌ SKILL.md: Frontmatter inválido.');
    hasErrors = true;
  } else {
    console.log('✅ SKILL.md: Frontmatter válido e nome correspondente.');
  }
} catch (e) {
  console.error(`❌ Erro ao validar SKILL.md: ${e.message}`);
  hasErrors = true;
}

const tmpNextDir = path.join(rootDir, 'test', 'tmp_next_proj');
try {
  const output = execSync('node scripts/analyze-route.js GET /api/test-route', { cwd: rootDir, encoding: 'utf-8' });
  if (output.includes('ROUTE GUARD') && output.includes('ROTA NOVA')) {
    console.log('✅ analyze-route.js: Análise de rota nova executada com sucesso.');
  } else {
    console.error('❌ analyze-route.js: Saída inesperada.');
    hasErrors = true;
  }

  const routeFile = path.join(tmpNextDir, 'app', 'api', 'orders', '[id]', 'route.ts');
  const actionFile = path.join(tmpNextDir, 'app', 'actions', 'order.actions.ts');
  const clientFile = path.join(tmpNextDir, 'src', 'OrderView.tsx');
  fs.mkdirSync(path.dirname(routeFile), { recursive: true });
  fs.mkdirSync(path.dirname(actionFile), { recursive: true });
  fs.mkdirSync(path.dirname(clientFile), { recursive: true });

  fs.writeFileSync(routeFile, 'export async function GET(req: Request) { return Response.json({ ok: true }); }\n');
  fs.writeFileSync(actionFile, "'use server';\nexport async function createOrder(data: any) { return { ok: true }; }\n");
  fs.writeFileSync(clientFile, 'export async function loadOrder(orderId: string) { await createOrder({}); return fetch(`/api/orders/${orderId}`); }\n');

  const jsonOut = execSync(`node scripts/analyze-route.js GET /api/orders/:id "${tmpNextDir}" --json`, { cwd: rootDir, encoding: 'utf-8' });
  const parsed = JSON.parse(jsonOut);
  if (parsed.status === 'ROTA_EXISTENTE' && parsed.declarations.length === 1 && parsed.consumersCount === 1) {
    console.log('✅ analyze-route.js: Detecção de Next.js App Router ([id]/route.ts) e consumidor dinâmico validada.');
  } else {
    console.error('❌ analyze-route.js falhou ao mapear Next.js App Router ou consumidor dinâmico:', jsonOut);
    hasErrors = true;
  }

  const actionJsonOut = execSync(`node scripts/analyze-route.js POST /actions/createOrder "${tmpNextDir}" --json`, { cwd: rootDir, encoding: 'utf-8' });
  const parsedAction = JSON.parse(actionJsonOut);
  if (
    parsedAction.status === 'ROTA_EXISTENTE' &&
    parsedAction.declarations.some((d) => d.kind === 'SERVER_ACTION') &&
    parsedAction.securityAdvisories.some((a) => a.includes('MISSING_IDEMPOTENCY_KEY'))
  ) {
    console.log('✅ analyze-route.js: Detecção de Next.js Server Action ("use server") e Idempotency-Key advisory validada.');
  } else {
    console.error('❌ analyze-route.js falhou ao mapear Server Action:', actionJsonOut);
    hasErrors = true;
  }
} catch (e) {
  console.error(`❌ Falha ao rodar analyze-route.js: ${e.message}`);
  hasErrors = true;
} finally {
  if (fs.existsSync(tmpNextDir)) {
    fs.rmSync(tmpNextDir, { recursive: true, force: true });
  }
}

try {
  const contractOut = execSync('node scripts/generate-contract.js POST /api/orders --fields "amount:number,item:string"', { cwd: rootDir, encoding: 'utf-8' });
  if (contractOut.includes('CreateOrderSchema') && contractOut.includes('OrderResponseSchema') && contractOut.includes('OrderContract')) {
    console.log('✅ generate-contract.js: Contrato Zod & DTOs TypeScript gerados com sucesso.');
  } else {
    console.error('❌ generate-contract.js: Saída inesperada.');
    hasErrors = true;
  }
} catch (e) {
  console.error(`❌ Falha ao rodar generate-contract.js: ${e.message}`);
  hasErrors = true;
}

if (hasErrors) {
  console.error('\n❌ Falha na validação dos componentes!');
  process.exit(1);
} else {
  console.log('\n🎉 Todos os componentes validados com 100% de integridade!');
}
