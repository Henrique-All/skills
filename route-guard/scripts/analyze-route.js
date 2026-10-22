#!/usr/bin/env node
/**
 * scripts/analyze-route.js - Analisador Universal de Rotas, Server Actions, tRPC e Zero-Trust (v2.0)
 *
 * Localiza declaração de rotas no backend (Express, Fastify, Hono, Next.js App Router,
 * Next.js Server Actions 'use server', tRPC procedures e NestJS), mapeia consumidores
 * e audita resiliência Zero-Trust (Validação Zod, Idempotency-Key e Rate Limiting).
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

function normalizeRoutePattern(routeStr) {
  return routeStr
    .replace(/\/+/g, '/')
    .replace(/\/$/, '')
    .replace(/\[([^\]]+)\]/g, ':$1') || '/';
}

const normalizedInput = normalizeRoutePattern(inputEndpoint);
const strippedInput = normalizeRoutePattern(inputEndpoint.replace(/^\/api(?:\/v\d+)?/, '') || '/');
const lastSegment = normalizedInput.split('/').filter(Boolean).pop() || '';

function endpointsMatch(declaredEndpoint) {
  const normDecl = normalizeRoutePattern(declaredEndpoint);
  if (normDecl === normalizedInput || normDecl === strippedInput) return true;
  if (normDecl.endsWith(normalizedInput) || normalizedInput.endsWith(normDecl)) return true;
  const regexStr = '^' + normDecl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$';
  try {
    if (new RegExp(regexStr, 'i').test(normalizedInput)) return true;
  } catch (e) {}
  return false;
}

function buildAdvisories(content, method, endpoint) {
  const advisories = [];
  const hasValidation = /safeParse|\.parse\(|validate\(|Schema|z\.object|Joi\.|yup\./i.test(content);
  if (['POST', 'PUT', 'PATCH'].includes(method) && !hasValidation) {
    advisories.push('MISSING_SCHEMA_VALIDATION: Handler de escrita sem validação de schema (Zod/DTO) detectada.');
  }
  if (method === 'POST' && /(?:order|payment|checkout|transfer|invoice|charge|withdraw|pedido|pagamento)/i.test(endpoint)) {
    if (!/idempotency[-_]?key/i.test(content)) {
      advisories.push('MISSING_IDEMPOTENCY_KEY: Endpoint financeiro/pedido POST sem verificação de Idempotency-Key.');
    }
  }
  if (/(?:login|auth|register|signup|otp|reset-password|forgot-password)/i.test(endpoint)) {
    if (!/rateLimit|Ratelimit|Throttler|limiter/i.test(content)) {
      advisories.push('MISSING_RATE_LIMIT: Endpoint sensível de autenticação sem Rate Limiter explícito.');
    }
  }
  return advisories;
}

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
          kind: 'HTTP_ROUTE',
          hasAuth,
          advisories: buildAdvisories(content, method, endpoint),
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
              kind: 'NEXT_APP_ROUTE',
              hasAuth,
              advisories: buildAdvisories(content, method, inferredEndpoint),
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
            kind: 'NEST_CONTROLLER',
            hasAuth,
            advisories: buildAdvisories(content, method, fullEndpoint),
          });
        }
      }
    }

    // 1D. Next.js Server Actions ('use server')
    if (/['"]use server['"]/.test(content) && lastSegment) {
      const actionRegex = /export\s+async\s+function\s+([A-Za-z0-9_]+)\s*\(/g;
      let aMatch;
      while ((aMatch = actionRegex.exec(content)) !== null) {
        const fnName = aMatch[1];
        if (fnName.toLowerCase() === lastSegment.toLowerCase() || endpointsMatch(`/actions/${fnName}`)) {
          const lineNum = content.slice(0, aMatch.index).split('\n').length;
          const hasAuth = /getServerSession|auth\(|currentUser|verifyToken|cookies\(\)/i.test(content);
          backendMatches.push({
            file: relFile,
            line: lineNum,
            method: 'ACTION',
            endpoint: `/actions/${fnName}`,
            kind: 'SERVER_ACTION',
            hasAuth,
            advisories: buildAdvisories(content, 'POST', `/actions/${fnName}`),
          });
        }
      }
    }

    // 1E. tRPC Procedures (publicProcedure / protectedProcedure)
    if (/Procedure\b/.test(content) && lastSegment) {
      const trpcRegex = /([A-Za-z0-9_]+)\s*:\s*(publicProcedure|protectedProcedure|adminProcedure|authedProcedure)[\s\S]{0,160}?\.(query|mutation)\s*\(/g;
      let trMatch;
      while ((trMatch = trpcRegex.exec(content)) !== null) {
        const procName = trMatch[1];
        const procKind = trMatch[2];
        const opType = trMatch[3] === 'mutation' ? 'POST' : 'GET';
        if (procName.toLowerCase() === lastSegment.toLowerCase() || endpointsMatch(`/trpc/${procName}`)) {
          const lineNum = content.slice(0, trMatch.index).split('\n').length;
          backendMatches.push({
            file: relFile,
            line: lineNum,
            method: opType,
            endpoint: `/trpc/${procName}`,
            kind: 'TRPC_PROCEDURE',
            hasAuth: procKind !== 'publicProcedure',
            advisories: buildAdvisories(content, opType, `/trpc/${procName}`),
          });
        }
      }
    }
  } catch (e) {}
}

// 2. Procurar consumidores no Frontend / Clientes HTTP
const callers = [];
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
    const matchesActionOrTrpc = lastSegment.length > 3 && content.includes(lastSegment);
    if (!content.includes(staticPrefix) && !dynamicConsumerRegex.test(content) && !matchesActionOrTrpc) continue;

    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
      if (
        line.includes(inputEndpoint) ||
        dynamicConsumerRegex.test(line) ||
        (staticPrefix.length > 4 && line.includes(staticPrefix) && /(?:fetch|axios|api\.|useQuery|useSWR|useMutation|http)/i.test(line)) ||
        (matchesActionOrTrpc && new RegExp(`\\b${lastSegment}\\s*\\(|trpc\\.[\\w.]+\\.${lastSegment}\\b`).test(line))
      ) {
        callers.push({
          file: relFile,
          line: idx + 1,
          snippet: trimmed,
        });
      }
    });
  } catch (e) {}
}

const exists = backendMatches.length > 0;
let riskLevel = 'BAIXO';
if (exists) {
  riskLevel = callers.length > 2 ? 'ALTO' : callers.length > 0 ? 'MÉDIO' : 'BAIXO';
}

const securityAdvisories = backendMatches.flatMap((m) => m.advisories || []);

const report = {
  method: inputMethod,
  endpoint: inputEndpoint,
  status: exists ? 'ROTA_EXISTENTE' : 'ROTA_NOVA',
  riskLevel,
  declarations: backendMatches,
  consumersCount: callers.length,
  consumers: callers,
  securityAdvisories,
};

if (isJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('===============================================================');
  console.log('🛡️  ROUTE GUARD v2.0 — ANÁLISE DE IMPACTO, SERVER ACTIONS & tRPC');
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
      console.log(`   - [${m.method}] ${m.endpoint} (${m.kind})`);
      console.log(`     Arquivo: ${m.file}:${m.line}`);
      console.log(`     Protegido com Autenticação: ${m.hasAuth ? '✅ SIM' : '❌ NÃO / PÚBLICO'}`);
      if (m.advisories && m.advisories.length > 0) {
        m.advisories.forEach((adv) => console.log(`     ⚠️  ${adv}`));
      }
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

  console.log('\n===============================================================\n');
}
