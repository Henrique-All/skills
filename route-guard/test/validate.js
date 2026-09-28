/**
 * test/validate.js - Validador de Integridade da Skill Route Guard
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

// 1. Validar existência e tamanho dos arquivos
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

// 2. Validar sintaxe dos JSONs
const jsonFiles = [
  'package.json',
  'route-guard.config.example.json'
];

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

// 3. Validar Frontmatter do SKILL.md
try {
  const skillContent = fs.readFileSync(path.join(rootDir, 'SKILL.md'), 'utf-8');
  if (!skillContent.startsWith('---')) {
    console.error('❌ SKILL.md: Frontmatter não inicia com ---');
    hasErrors = true;
  } else {
    const frontmatterEnd = skillContent.indexOf('---', 3);
    const frontmatter = skillContent.slice(3, frontmatterEnd);
    if (!frontmatter.includes('name: route-guard')) {
      console.error('❌ SKILL.md: nome inválido no frontmatter.');
      hasErrors = true;
    } else {
      console.log('✅ SKILL.md: Frontmatter válido e nome correspondente.');
    }
  }
} catch (e) {
  console.error(`❌ Erro ao validar SKILL.md: ${e.message}`);
  hasErrors = true;
}

// 4. Teste Funcional: analyze-route.js
try {
  const output = execSync('node scripts/analyze-route.js GET /api/test-route', { cwd: rootDir, encoding: 'utf-8' });
  if (output.includes('ROUTE GUARD') && output.includes('ROTA NOVA')) {
    console.log('✅ analyze-route.js: Análise de rota executada com sucesso.');
  } else {
    console.error('❌ analyze-route.js: Saída inesperada.');
    hasErrors = true;
  }
} catch (e) {
  console.error(`❌ Falha ao rodar analyze-route.js: ${e.message}`);
  hasErrors = true;
}

// 5. Teste Funcional: generate-contract.js
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
