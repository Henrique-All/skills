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

// Carregar route-guard.config.json (se existir)
let routeConfig = {};
const configPath = path.join(targetDir, 'route-guard.config.json');
if (fs.existsSync(configPath)) {
  try {
    routeConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (e) {}
}

const allFiles = getProjectFiles(targetDir);
const codeFiles = allFiles.filter((f) => /\.(ts|tsx|js|jsx)$/.test(f));

function normalizeRoutePattern(routeStr) {
  return routeStr
    .replace(/\/+/g, '/')
    .replace(/\/$/, '')
    .replace(/\[([^\]]+)\]/g, ':$1') || '/';
}

const normalizedInput = normalizeRoutePattern(inputEndpoint);
const strippedInput = normalizeRoutePattern(inputEndpoint.replace(/^\/api(?:\/v\d+)?/, '') || '/');

function endpointsMatch(declaredEndpoint) {
  const normDecl = normalizeRoutePattern(declaredEndpoint);
  if (normDecl === normalizedInput || normDecl === strippedInput) return true;
  if (normDecl.endsWith(normalizedInput) || normalizedInput.endsWith(normDecl)) return true;
  // Compara convertendo segmentos dinâmicos (:id) em curingas
  const regexStr = '^' + normDecl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$';
  try {
    if (new RegExp(regexStr, 'i').test(normalizedInput)) return true;
  } catch (e) {}
  return false;
}

// 1. Procurar onde a rota está declarada no backend (Express/Fastify, Next.js App Router, NestJS)
const backendMatches = [];
const routeDeclRegex = /(?:router|app|fastify)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi;

for (const file of codeFiles) {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const relFile = path.relative(targetDir, file).replace(/\\/g, '/');
    const lines = content.split('\n');

    // 1A. Express / Fastify / Hono
    let match;
    routeDeclRegex.lastIndex = 0;
    while ((match = routeDeclRegex.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const endpoint = match[2];

      if ((inputMethod === 'ALL' || inputMethod === method) && endpointsMatch(endpoint)) {
        const lineNum = content.slice(0, match.index).split('\n').length;
        const lineContent = lines[lineNum - 1] || '';
        const hasAuth = /verifyToken|auth|requireAuth|authenticate|jwt|protect/i.test(lineContent) || /router\.use\s*\(\s*(?:verifyToken|auth)/i.test(content);

        backendMatches.push({
          file: relFile,
          line: lineNum,
          method,
          endpoint,
          hasAuth
        });
      }
    }

    // 1B. Next.js App Router (app/.../route.ts|js)
    const nextRouteMatch = relFile.match(/(?:^|\/)(?:src\/)?app(\/.*)\/route\.(?:ts|tsx|js|jsx)$/);
    if (nextRouteMatch) {
      const inferredEndpoint = normalizeRoutePattern(nextRouteMatch[1]);
      if (endpointsMatch(inferredEndpoint)) {
        const nextExportRegex = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)\b|export\s+const\s+(GET|POST|PUT|DELETE|PATCH)\s*=/g;
        let nMatch;
        while ((nMatch = nextExportRegex.exec(content)) !== null) {
          const method = (nMatch[1] || nMatch[2]).toUpperCase();
          if (inputMethod === 'ALL' || inputMethod === method) {
            const lineNum = content.slice(0, nMatch.index).split('\n').length;
            const hasAuth = /getServerSession|auth\(|verifyToken|cookies\(\)|headers\(\)\.get\(['"]authorization/i.test(content);
            backendMatches.push({
              file: relFile,
              line: lineNum,
              method,
              endpoint: inferredEndpoint,
              hasAuth
            });
          }
        }
      }
    }

    // 1C. NestJS (@Controller + @Get/@Post/@Put/@Delete/@Patch)
    const ctrlMatch = content.match(/@Controller\s*\(\s*['"`]?([^'"`)]*)['"`]?\s*\)/);
    if (ctrlMatch) {
      const basePath = '/' + (ctrlMatch[1] || '').replace(/^\/+/, '');
      const nestMethodRegex = /@(Get|Post|Put|Delete|Patch)\s*\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)/g;
      let nm;
      while ((nm = nestMethodRegex.exec(content)) !== null) {
        const method = nm[1].toUpperCase();
        const subPath = nm[2] ? '/' + nm[2].replace(/^\/+/, '') : '';
        const fullEndpoint = normalizeRoutePattern(basePath + subPath);
        if ((inputMethod === 'ALL' || inputMethod === method) && endpointsMatch(fullEndpoint)) {
          const lineNum = content.slice(0, nm.index).split('\n').length;
          const hasAuth = /@UseGuards|AuthGuard|JwtAuthGuard|Roles/i.test(content);
          backendMatches.push({
            file: relFile,
            line: lineNum,
            method,
            endpoint: fullEndpoint,
            hasAuth
          });
        }
      }
    }
  } catch (e) {}
}

// 2. Procurar consumidores no Frontend / Clientes HTTP
const callers = [];
// Constrói regex que casa tanto a rota literal quanto interpolações de parâmetros (:id -> ${...} ou valor)
const staticPrefix = normalizedInput.split('/:')[0];
const dynamicConsumerRegex = new RegExp(
  normalizedInput
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/:[a-zA-Z0-9_]+/g, '(?:\\$\\{[^}]+\\}|[a-zA-Z0-9_-]+|:id)'),
  'i'
);

for (const file of codeFiles) {
  try {
    const relFile = path.relative(targetDir, file).replace(/\\/g, '/');
    if (backendMatches.some((m) => m.file === relFile)) continue;

    const content = fs.readFileSync(file, 'utf-8');
    if (!content.includes(staticPrefix) && !dynamicConsumerRegex.test(content)) continue;

    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
      if (
        line.includes(inputEndpoint) ||
        dynamicConsumerRegex.test(line) ||
        (staticPrefix.length > 4 && line.includes(staticPrefix) && /(?:fetch|axios|api\.|useQuery|useSWR|useMutation|http)/i.test(line))
      ) {
        callers.push({
          file: relFile,
          line: idx + 1,
          snippet: trimmed
        });
      }
    });
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
