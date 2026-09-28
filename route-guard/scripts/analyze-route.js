#!/usr/bin/env node
/**
 * scripts/analyze-route.js - Analisador Universal de Rotas, Impacto e Contratos
 * 
 * Localiza declaração de rotas no backend, mapeia consumidores no frontend/serviços
 * e calcula nível de risco de quebra de contrato.
 * Zero dependências externas obrigatórias.
 * 
 * Uso:
 *   node analyze-route.js <METHOD> <ENDPOINT> [projectDir]
 *   node analyze-route.js POST /orders
 *   node analyze-route.js GET /users/:id --json
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const isJson = args.includes('--json');
const cleanArgs = args.filter((a) => !a.startsWith('--'));

if (cleanArgs.length === 0) {
  console.log('Uso: node analyze-route.js <METHOD> <ENDPOINT> [diretório]');
  console.log('Exemplo: node analyze-route.js POST /api/orders');
  process.exit(1);
}

let inputMethod = 'ALL';
let inputEndpoint = '';

if (cleanArgs.length === 1) {
  inputEndpoint = cleanArgs[0];
} else {
  inputMethod = cleanArgs[0].toUpperCase();
  inputEndpoint = cleanArgs[1];
}

const targetDir = cleanArgs[2] || process.cwd();

// Normalização do endpoint
inputEndpoint = inputEndpoint.split('?')[0];
if (!inputEndpoint.startsWith('/')) inputEndpoint = '/' + inputEndpoint;

function getProjectFiles(dir, ignores = ['node_modules', '.git', 'dist', 'build', '.code-map']) {
  let results = [];
  try {
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of list) {
      if (ignores.includes(item.name)) continue;
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        results = results.concat(getProjectFiles(fullPath, ignores));
      } else {
        results.push(fullPath);
      }
    }
  } catch (e) {}
  return results;
}

const allFiles = getProjectFiles(targetDir);
const codeFiles = allFiles.filter((f) => /\.(ts|tsx|js|jsx)$/.test(f));

// 1. Procurar onde a rota está declarada no backend
const backendMatches = [];
const routeDeclRegex = /(?:router|app)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi;

for (const file of codeFiles) {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    let match;
    const lines = content.split('\n');

    while ((match = routeDeclRegex.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const endpoint = match[2];

      const isMatch = (inputMethod === 'ALL' || inputMethod === method) &&
        (inputEndpoint === endpoint || endpoint.endsWith(inputEndpoint) || inputEndpoint.endsWith(endpoint));

      if (isMatch) {
        // Encontra número da linha
        const offset = match.index;
        const lineNum = content.slice(0, offset).split('\n').length;
        const lineContent = lines[lineNum - 1] || '';

        const hasAuth = /verifyToken|auth|requireAuth|authenticate/i.test(lineContent) || /router\.use\s*\(\s*(?:verifyToken|auth)/i.test(content);

        backendMatches.push({
          file: path.relative(targetDir, file).replace(/\\/g, '/'),
          line: lineNum,
          method,
          endpoint,
          hasAuth
        });
      }
    }
  } catch (e) {}
}

// 2. Procurar consumidores no Frontend / Clientes HTTP
const callers = [];
const cleanPattern = inputEndpoint.replace(/^\/api/, '').replace(/:[a-zA-Z0-9_]+/g, '');

for (const file of codeFiles) {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    if (content.includes(inputEndpoint) || (cleanPattern.length > 3 && content.includes(cleanPattern))) {
      // Ignora se for o próprio arquivo onde a rota foi declarada
      if (backendMatches.some((m) => file.replace(/\\/g, '/').endsWith(m.file))) continue;

      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes(inputEndpoint) || (cleanPattern.length > 3 && line.includes(cleanPattern))) {
          callers.push({
            file: path.relative(targetDir, file).replace(/\\/g, '/'),
            line: idx + 1,
            snippet: line.trim()
          });
        }
      });
    }
  } catch (e) {}
}

// 3. Avaliação de Risco e Status
const exists = backendMatches.length > 0;
let riskLevel = 'BAIXO';
if (exists) {
  riskLevel = callers.length > 2 ? 'ALTO' : (callers.length > 0 ? 'MÉDIO' : 'BAIXO');
}

const report = {
  method: inputMethod,
  endpoint: inputEndpoint,
  status: exists ? 'ROTA_EXISTENTE' : 'ROTA_NOVA',
  riskLevel,
  declarations: backendMatches,
  consumersCount: callers.length,
  consumers: callers
};

if (isJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('===============================================================');
  console.log('🛡️  ROUTE GUARD — ANÁLISE DE IMPACTO E CONTRATO DE ROTA');
  console.log('===============================================================\n');

  console.log(`🎯 Alvo: [${inputMethod}] ${inputEndpoint}`);
  console.log(`📊 Status da Rota: ${exists ? '⚠️  ROTA EXISTENTE NO BACKEND' : '✨ ROTA NOVA (SEM CONFLITO)'}`);
  console.log(`🚨 Nível de Risco de Quebra: [${riskLevel}]`);
  console.log(`👥 Consumidores Detectados no Projeto: ${callers.length} arquivo(s)\n`);

  if (exists) {
    console.log('---------------------------------------------------------------');
    console.log('📍 DECLARAÇÃO NO BACKEND:');
    console.log('---------------------------------------------------------------');
    backendMatches.forEach((m) => {
      console.log(`   - [${m.method}] ${m.endpoint}`);
      console.log(`     Arquivo: ${m.file}:${m.line}`);
      console.log(`     Protegido com Autenticação: ${m.hasAuth ? '✅ SIM' : '❌ NÃO / PÚBLICO'}`);
    });
    console.log('');
  }

  if (callers.length > 0) {
    console.log('---------------------------------------------------------------');
    console.log('⚠️  CONSUMIDORES QUE PODEM QUEBRAR (BLAST RADIUS):');
    console.log('---------------------------------------------------------------');
    callers.forEach((c) => {
      console.log(`   - ${c.file}:${c.line}`);
      console.log(`     Snippet: "${c.snippet}"`);
    });
    console.log('');
  }

  if (exists && callers.length > 0) {
    console.log('🛑 AVISO DE CONTRATO: Esta rota já alimenta telas existentes.');
    console.log('   Qualquer alteração no payload de entrada (body/query) ou na resposta (JSON)');
    console.log('   exige a Trava de Permissão e garantia de retrocompatibilidade.');
  }

  console.log('\n===============================================================\n');
}
