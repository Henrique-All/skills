#!/usr/bin/env node
/**
 * audit-code-full/scripts/worker-agent.js
 * Executor dedicado para cada um dos 4 Agentes Especialistas de QA:
 *   1. crawler       (qa-crawler.agent.md)       - Anda pelo código inteiro e classifica 6 camadas
 *   2. bruteforce    (qa-bruteforce.agent.md)    - Testa coisa por coisa (Execução Runtime Brute-Force em VM + Estática)
 *   3. ui-palette    (qa-ui-palette.agent.md)    - Verifica UI, código da UI e respeito à paleta de cores
 *   4. button-action (qa-button-action.agent.md) - Verifica funcionalidade real de todos os botões
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  'coverage',
  '.next',
  '.agents',
  '.code-map',
  '.plan',
  '.swarm'
]);

const CODE_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.vue', '.svelte', '.html', '.css', '.scss', '.prisma', '.sql']);
const UI_EXTS = new Set(['.jsx', '.tsx', '.vue', '.svelte', '.html', '.css', '.scss']);
const LOGIC_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);

function walkProjectFiles(rootDir) {
  if (typeof rootDir !== 'string' || !rootDir) return [];
  const files = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (CODE_EXTS.has(path.extname(entry.name).toLowerCase())) {
        files.push(fullPath);
      }
    }
  }
  walk(rootDir);
  return files;
}

function classifyLayer(relPath) {
  if (typeof relPath !== 'string' || !relPath) return 'backend';
  const norm = relPath.replace(/\\/g, '/').toLowerCase();
  if (/\.(tsx|jsx|vue|svelte|css|scss|html)$/.test(norm) || /(components|pages|views|screens|ui|styles)\//.test(norm)) {
    return 'ui';
  }
  if (/(store|stores|context|contexts|hooks|state|slices|atoms)\//.test(norm)) {
    return 'state';
  }
  if (/(routes|controllers|api|endpoints|handlers|graphql|trpc)\//.test(norm)) {
    return 'api';
  }
  if (/(prisma|drizzle|migrations|schema|models|repositories|db|database)\//.test(norm) || /\.(prisma|sql)$/.test(norm)) {
    return 'database';
  }
  if (/(config|infra|docker|ci|scripts|bin|deploy)\//.test(norm)) {
    return 'infra';
  }
  return 'backend';
}

// ============================================================================
// AGENTE 1: qa-crawler — Anda pelo código inteiro e mapeia 100% da superfície
// ============================================================================
function runCrawlerAgent(targetDir) {
  if (typeof targetDir !== 'string' || !targetDir) {
    return { agent: 'qa-crawler', status: 'SKIPPED', filesWalked: 0, layersCount: {}, layers: {}, exportedSymbolsCount: 0, exportedSymbols: [], routesDiscovered: [], score: 100, findings: [] };
  }
  const files = walkProjectFiles(targetDir);
  const layers = { ui: [], state: [], api: [], backend: [], database: [], infra: [] };
  const exportsList = [];
  const routesList = [];

  for (const file of files) {
    const rel = path.relative(targetDir, file).replace(/\\/g, '/');
    const layer = classifyLayer(rel);
    layers[layer].push(rel);

    const content = fs.readFileSync(file, 'utf8');
    const expRegex = /export\s+(?:async\s+)?(?:function|const|class|interface|type)\s+([A-Za-z0-9_]+)/g;
    let m;
    while ((m = expRegex.exec(content)) !== null) {
      exportsList.push({ symbol: m[1], file: rel });
    }

    const cjsExpRegex = /module\.exports\s*=\s*\{([^}]+)\}/g;
    while ((m = cjsExpRegex.exec(content)) !== null) {
      const names = m[1]
        .split(',')
        .map((s) => s.trim().split(':')[0].trim())
        .filter((s) => /^[A-Za-z0-9_]+$/.test(s));
      names.forEach((sym) => exportsList.push({ symbol: sym, file: rel }));
    }

    const routeRegex = /\b(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
    while ((m = routeRegex.exec(content)) !== null) {
      routesList.push({ method: m[1].toUpperCase(), path: m[2], file: rel });
    }
  }

  return {
    agent: 'qa-crawler',
    role: 'Code Walker & Cartography Mapper',
    status: 'COMPLETED',
    filesWalked: files.length,
    layersCount: {
      ui: layers.ui.length,
      state: layers.state.length,
      api: layers.api.length,
      backend: layers.backend.length,
      database: layers.database.length,
      infra: layers.infra.length
    },
    layers,
    exportedSymbolsCount: exportsList.length,
    exportedSymbols: exportsList.slice(0, 100),
    routesDiscovered: routesList,
    score: 100,
    findings: []
  };
}

// ============================================================================
// AGENTE 2: qa-bruteforce — Execução Runtime Brute-Force Real (VM Sandbox) + AST
// ============================================================================

function executeRuntimeFuzzOnFile(content, relPath, fuzzVectors) {
  if (typeof content !== 'string' || !Array.isArray(fuzzVectors)) {
    return { functionsExecutedInVm: 0, realRuntimeCalls: 0, runtimeCrashes: [] };
  }

  const runtimeResults = {
    functionsExecutedInVm: 0,
    realRuntimeCalls: 0,
    runtimeCrashes: []
  };

  const exportedNames = new Set();
  const cjsExportBlock = content.match(/module\.exports\s*=\s*\{([^}]+)\}/);
  if (cjsExportBlock) {
    const names = cjsExportBlock[1].match(/[A-Za-z0-9_]+/g) || [];
    names.forEach((n) => exportedNames.add(n));
  }
  const cjsSingleExport = /exports\.([A-Za-z0-9_]+)\s*=/g;
  let expMatch;
  while ((expMatch = cjsSingleExport.exec(content)) !== null) {
    exportedNames.add(expMatch[1]);
  }

  const fnHeaderRegex = /(export\s+(?:default\s+)?)?function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*\{/g;
  let match;

  while ((match = fnHeaderRegex.exec(content)) !== null) {
    const isExported = Boolean(match[1]) || exportedNames.has(match[2]);
    const fnName = match[2];
    if (!isExported) continue;
    if (/^(main|walk|deploy|install|delete|remove|clean|spawn)/i.test(fnName)) continue;

    const startBraceIdx = match.index + match[0].length - 1;
    let depth = 0;
    let endBraceIdx = -1;

    for (let i = startBraceIdx; i < content.length; i++) {
      const ch = content[i];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          endBraceIdx = i;
          break;
        }
      }
    }

    if (endBraceIdx === -1) continue;
    const fullFnCode = content.slice(match.index, endBraceIdx + 1).replace(/^export\s+(?:default\s+)?/, '');
    if (/:\s*(?:string|number|boolean|any|void|Record|Promise)\b/.test(fullFnCode)) continue;

    const lineNum = content.slice(0, match.index).split('\n').length;

    const sandbox = {
      console: { log: () => {}, error: () => {}, warn: () => {} },
      JSON,
      Math,
      Number,
      String,
      Boolean,
      Array,
      Object,
      RegExp,
      Date,
      Error,
      TypeError,
      RangeError,
      SyntaxError,
      parseInt,
      parseFloat,
      isNaN,
      path: {
        extname: () => '.js',
        basename: () => 'mock.js',
        join: (...p) => p.filter(Boolean).join('/'),
        resolve: (...p) => p.filter(Boolean).join('/'),
        relative: () => 'mock.js',
        dirname: () => '.'
      },
      fs: {
        existsSync: () => false,
        readFileSync: () => '',
        readdirSync: () => [],
        statSync: () => ({ isDirectory: () => false, isFile: () => true, size: 0 }),
        writeFileSync: () => {},
        mkdirSync: () => {},
        copyFileSync: () => {},
        rmSync: () => {}
      }
    };

    try {
      const context = vm.createContext(sandbox);
      vm.runInContext(fullFnCode, context, { timeout: 25 });
      if (typeof sandbox[fnName] !== 'function') continue;

      runtimeResults.functionsExecutedInVm++;
      let crashedForFn = false;

      for (const vec of fuzzVectors) {
        runtimeResults.realRuntimeCalls++;
        try {
          sandbox.__arg0 = vec.value;
          const res = vm.runInContext(`${fnName}(__arg0, __arg0, __arg0)`, context, { timeout: 20 });
          if (res && typeof res.catch === 'function') {
            res.catch(() => {});
          }
        } catch (err) {
          if (err && err.name === 'ReferenceError') {
            break;
          }
          if (!crashedForFn) {
            crashedForFn = true;
            runtimeResults.runtimeCrashes.push({
              fnName,
              line: lineNum,
              inputLabel: vec.label,
              errorName: err.name || 'Error',
              errorMessage: err.message || String(err)
            });
          }
        }
      }
    } catch {
      // Ignora funções com dependências externas de escopo
    }
  }

  return runtimeResults;
}

function runBruteforceAgent(targetDir) {
  if (typeof targetDir !== 'string' || !targetDir) {
    return { agent: 'qa-bruteforce', status: 'SKIPPED', filesTested: 0, functionsInspected: 0, functionsExecutedInVm: 0, realRuntimeCalls: 0, simulatedFuzzCombinations: 0, score: 100, findings: [] };
  }
  const files = walkProjectFiles(targetDir).filter((f) => LOGIC_EXTS.has(path.extname(f).toLowerCase()));
  const findings = [];
  let functionsInspected = 0;
  let functionsExecutedInVm = 0;
  let realRuntimeCalls = 0;

  const fuzzVectors = [
    { label: 'null', value: null },
    { label: 'undefined', value: undefined },
    { label: 'NaN', value: NaN },
    { label: 'empty_string ""', value: '' },
    { label: 'malformed_json "{bad"', value: '{bad_json' },
    { label: 'negative -1', value: -1 },
    { label: 'zero 0', value: 0 },
    { label: 'MAX_SAFE_INTEGER', value: Number.MAX_SAFE_INTEGER },
    { label: 'empty_object {}', value: {} },
    { label: 'empty_array []', value: [] },
    { label: 'null_proto_obj', value: Object.create(null) }
  ];

  const jsonParseCallPattern = new RegExp('\\bJSON\\.' + 'parse\\s*\\(');

  for (const file of files) {
    const rel = path.relative(targetDir, file).replace(/\\/g, '/');
    if (/(^|\/)(test|tests|__tests__|fixtures)\//.test(rel) || /\.(test|spec)\.[jt]sx?$/.test(rel)) {
      continue;
    }

    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    const fnMatches = content.match(/\b(?:function\s+[A-Za-z0-9_]+|async\s+function|\([A-Za-z0-9_,\s]*\)\s*=>)/g) || [];
    functionsInspected += fnMatches.length;

    // 1. EXECUÇÃO RUNTIME BRUTE-FORCE REAL EM SANDBOX VM (node:vm)
    const vmStats = executeRuntimeFuzzOnFile(content, rel, fuzzVectors);
    functionsExecutedInVm += vmStats.functionsExecutedInVm;
    realRuntimeCalls += vmStats.realRuntimeCalls;

    for (const crash of vmStats.runtimeCrashes) {
      findings.push({
        ruleId: 'BRUTEFORCE_RUNTIME_CRASH',
        severity: 'MEDIUM',
        file: rel,
        line: crash.line,
        message: `[Execução Real VM] Função "${crash.fnName}()" quebrou ao receber input bruto (${crash.inputLabel}) -> ${crash.errorName}: ${crash.errorMessage}`,
        suggestion: `Adicione guarda defensiva no início de "${crash.fnName}()" (ex: if (!arg || typeof arg !== 'object') return) para suportar entradas nulas/inválidas.`
      });
    }

    // 2. ANÁLISE ESTÁTICA DE RESILIÊNCIA BRUTE-FORCE
    const hasTryCatchInFile = /\btry\s*\{/.test(content);

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
      if (/audit-ignore/.test(line)) return;

      if (jsonParseCallPattern.test(trimmed) && !/^(message|suggestion)\s*:/.test(trimmed)) {
        const windowStart = Math.max(0, idx - 90);
        const windowEnd = Math.min(lines.length - 1, idx + 25);
        const contextChunk = lines.slice(windowStart, windowEnd + 1).join('\n');
        if (!/\btry\s*\{/.test(contextChunk)) {
          findings.push({
            ruleId: 'BRUTEFORCE_UNSAFE_JSON_PARSE',
            severity: 'HIGH',
            file: rel,
            line: lineNum,
            message: 'Chamada JSON.parse sem bloco try/catch próximo: estoura SyntaxError não tratado sob fuzzing de strings malformadas.',
            suggestion: 'Envolva JSON.parse em try/catch ou utilize um helper seguro com fallback.'
          });
        }
      }

      if (/\b(?:app|router)\.(get|post|put|patch|delete)\s*\([^,]+,\s*async\b/.test(trimmed) && !hasTryCatchInFile) {
        findings.push({
          ruleId: 'BRUTEFORCE_UNHANDLED_ASYNC_ROUTE',
          severity: 'HIGH',
          file: rel,
          line: lineNum,
          message: 'Rota assíncrona sem tratamento try/catch: exceções em inputs brutos derrubam a requisição sem resposta controlada.',
          suggestion: 'Adicione try/catch no controller ou wrapper asyncHandler com retorno HTTP 400/500.'
        });
      }

      if (/\breq\.(body|query|params)\.[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+/.test(trimmed) && !/\?\./.test(trimmed) && !/\/.*req\\\.\(body/.test(trimmed)) {
        findings.push({
          ruleId: 'BRUTEFORCE_NULL_DEREFERENCE_RISK',
          severity: 'MEDIUM',
          file: rel,
          line: lineNum,
          message: 'Acesso profundo direto em req.body/query/params sem optional chaining (?.): quebra com TypeError quando o payload é null/vazio.',
          suggestion: 'Valide o payload com schema (Zod) ou utilize optional chaining (?.) antes de acessar subpropriedades.'
        });
      }

      if (/\bparseInt\s*\([^,)]+\)/.test(trimmed) && !/\/.*parseInt/.test(trimmed)) {
        findings.push({
          ruleId: 'BRUTEFORCE_PARSEINT_NO_RADIX',
          severity: 'LOW',
          file: rel,
          line: lineNum,
          message: 'parseInt() chamado sem especificar a base (radix 10) ou guarda contra NaN.',
          suggestion: 'Use Number.parseInt(valor, 10) e verifique Number.isNaN() para entradas brutas.'
        });
      }
    });
  }

  let score = 100;
  for (const f of findings) {
    if (f.severity === 'HIGH') score -= 12;
    else if (f.severity === 'MEDIUM') score -= 6;
    else score -= 2;
  }
  score = Math.max(0, score);

  return {
    agent: 'qa-bruteforce',
    role: 'Brute-Force & Fuzzing Stress Tester (VM Runtime + AST)',
    status: 'COMPLETED',
    filesTested: files.length,
    functionsInspected,
    functionsExecutedInVm,
    realRuntimeCalls,
    simulatedFuzzCombinations: realRuntimeCalls,
    score,
    findings
  };
}

// ============================================================================
// AGENTE 3: qa-ui-palette — Verifica UI, Código de UI e Paleta de Cores
// ============================================================================
function extractProjectPalette(targetDir, allFiles) {
  const paletteHexes = new Set();
  const paletteTokens = new Set();

  if (typeof targetDir !== 'string' || !Array.isArray(allFiles)) {
    return { customPaletteDefined: false, configFiles: [], allowedHexes: paletteHexes, cssTokensCount: 0 };
  }

  const configCandidates = allFiles.filter((f) => {
    const base = path.basename(f).toLowerCase();
    return (
      base.includes('tailwind.config') ||
      base.includes('theme') ||
      base === 'globals.css' ||
      base === 'index.css' ||
      base === 'variables.css' ||
      base === 'tokens.css'
    );
  });

  for (const cfg of configCandidates) {
    const content = fs.readFileSync(cfg, 'utf8');
    const hexMatches = content.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
    hexMatches.forEach((h) => paletteHexes.add(h.toLowerCase()));

    const cssVarMatches = content.match(/--[a-zA-Z0-9-_]+/g) || [];
    cssVarMatches.forEach((v) => paletteTokens.add(v));
  }

  const standardNeutralHexes = [
    '#ffffff', '#fff', '#000000', '#000',
    '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a', '#020617',
    '#fafafa', '#f4f4f5', '#e4e4e7', '#d4d4d8', '#a1a1aa', '#71717a', '#52525b', '#3f3f46', '#27272a', '#18181b', '#09090b'
  ];
  standardNeutralHexes.forEach((h) => paletteHexes.add(h));

  return {
    customPaletteDefined: configCandidates.length > 0,
    configFiles: configCandidates.map((c) => path.relative(targetDir, c).replace(/\\/g, '/')),
    allowedHexes: paletteHexes,
    cssTokensCount: paletteTokens.size
  };
}

function runUiPaletteAgent(targetDir) {
  if (typeof targetDir !== 'string' || !targetDir) {
    return { agent: 'qa-ui-palette', status: 'SKIPPED', uiFilesScanned: 0, paletteConfigFiles: [], paletteTokensCount: 0, score: 100, findings: [] };
  }
  const allFiles = walkProjectFiles(targetDir);
  const uiFiles = allFiles.filter((f) => UI_EXTS.has(path.extname(f).toLowerCase()));
  const paletteInfo = extractProjectPalette(targetDir, allFiles);
  const findings = [];

  for (const file of uiFiles) {
    const rel = path.relative(targetDir, file).replace(/\\/g, '/');
    if (/(^|\/)(test|tests|__tests__|fixtures)\//.test(rel)) continue;

    const base = path.basename(file).toLowerCase();
    const isThemeDefinition = base.includes('theme') || base === 'globals.css' || base === 'index.css' || base === 'tokens.css';
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
      if (/audit-ignore/.test(line)) return;

      if (!isThemeDefinition) {
        const hexes = trimmed.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
        for (const rawHex of hexes) {
          const normHex = rawHex.toLowerCase();
          if (!paletteInfo.allowedHexes.has(normHex)) {
            findings.push({
              ruleId: 'UI_OFF_PALETTE_COLOR',
              severity: 'MEDIUM',
              file: rel,
              line: lineNum,
              message: `Cor hardcoded "${rawHex}" fora da paleta oficial detectada no código de UI.`,
              suggestion: 'Substitua por um token semântico da paleta (ex: var(--color-primary), theme.colors.* ou classe utilitária do tema).'
            });
          }
        }
      }

      if (/\btext-white\b/.test(trimmed) && !/\bdark:/.test(trimmed) && !/\bbg-(?:slate|zinc|neutral|gray|stone|black|indigo|blue|emerald|red|rose|amber|violet|purple|cyan|teal|green|orange)-(?:[56789]00|950)\b/.test(trimmed)) {
        findings.push({
          ruleId: 'UI_LIGHT_MODE_WHITE_TEXT',
          severity: 'HIGH',
          file: rel,
          line: lineNum,
          message: 'Classe "text-white" usada sem superfície escura garantida ou par "dark:" — fica invisível no Modo Claro.',
          suggestion: 'Use "text-slate-900 dark:text-white" ou token de texto adaptativo.'
        });
      }

      if (/\bfrom-(?:purple|fuchsia|violet)-\d+\b.*\bto-(?:pink|indigo|purple)-\d+\b/.test(trimmed)) {
        findings.push({
          ruleId: 'UI_GENERIC_AI_GRADIENT',
          severity: 'LOW',
          file: rel,
          line: lineNum,
          message: 'Gradiente roxo/rosa genérico detectado na UI, violando a sobriedade da paleta.',
          suggestion: 'Utilize a cor de acento oficial da paleta do projeto.'
        });
      }
    });
  }

  let score = 100;
  for (const f of findings) {
    if (f.severity === 'HIGH') score -= 15;
    else if (f.severity === 'MEDIUM') score -= 8;
    else score -= 3;
  }
  score = Math.max(0, score);

  return {
    agent: 'qa-ui-palette',
    role: 'UI & Code-UI Palette Inspector',
    status: 'COMPLETED',
    uiFilesScanned: uiFiles.length,
    paletteConfigFiles: paletteInfo.configFiles,
    paletteTokensCount: paletteInfo.cssTokensCount + paletteInfo.allowedHexes.size,
    score,
    findings
  };
}

// ============================================================================
// AGENTE 4: qa-button-action — Verifica se todos os botões têm funcionalidade
// ============================================================================
function runButtonActionAgent(targetDir) {
  if (typeof targetDir !== 'string' || !targetDir) {
    return { agent: 'qa-button-action', status: 'SKIPPED', uiFilesScanned: 0, totalButtonsAudited: 0, functionalButtons: 0, deadButtonsFound: 0, score: 100, findings: [] };
  }
  const uiFiles = walkProjectFiles(targetDir).filter((f) =>
    ['.jsx', '.tsx', '.vue', '.svelte', '.html'].includes(path.extname(f).toLowerCase())
  );

  const findings = [];
  let totalButtons = 0;
  let functionalButtons = 0;

  for (const file of uiFiles) {
    const rel = path.relative(targetDir, file).replace(/\\/g, '/');
    if (/(^|\/)(test|tests|__tests__|fixtures)\//.test(rel)) continue;

    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    const buttonTagRegex = /<(button|Button|IconButton)\b((?:[^>{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)>/g;
    let match;
    while ((match = buttonTagRegex.exec(content)) !== null) {
      totalButtons++;
      const tagName = match[1];
      const attrs = match[2] || '';
      const lineNum = content.slice(0, match.index).split('\n').length;

      if (/audit-ignore/.test(lines[lineNum - 1] || '')) {
        functionalButtons++;
        continue;
      }

      const hasActionAttr = /\b(onClick|onPress|onSubmit|formAction|type\s*=\s*['"]submit['"]|asChild|to\s*=|href\s*=|@click|v-on:click)\b/.test(attrs);
      const isEmptyHandler = /\bonClick\s*=\s*\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}|\bonClick\s*=\s*\{\s*\(\s*\)\s*=>\s*null\s*\}|\bonClick\s*=\s*\{\s*noop\s*\}/.test(attrs);
      const isPlaceholderHandler = /\bonClick\s*=\s*\{\s*\(\s*\)\s*=>\s*(?:console\.log|alert)\s*\(/.test(attrs);

      if (isEmptyHandler) {
        findings.push({
          ruleId: 'DEAD_BUTTON_EMPTY_HANDLER',
          severity: 'HIGH',
          file: rel,
          line: lineNum,
          message: `<${tagName}> possui handler vazio (onClick={() => {}} / noop) sem nenhuma funcionalidade real.`,
          suggestion: 'Conecte o botão à ação real de estado, mutação de API, abertura de modal ou navegação.'
        });
      } else if (isPlaceholderHandler) {
        findings.push({
          ruleId: 'PLACEHOLDER_BUTTON_HANDLER',
          severity: 'MEDIUM',
          file: rel,
          line: lineNum,
          message: `<${tagName}> possui apenas console.log() ou alert() temporário no onClick.`,
          suggestion: 'Substitua o placeholder pela lógica definitiva de negócio.'
        });
      } else if (!hasActionAttr) {
        findings.push({
          ruleId: 'DEAD_BUTTON_NO_ACTION',
          severity: 'HIGH',
          file: rel,
          line: lineNum,
          message: `<${tagName}> declarado sem onClick, sem type="submit" e sem ação associada (botão morto).`,
          suggestion: 'Adicione onClick={handler} ou type="submit" (se dentro de <form>).'
        });
      } else {
        functionalButtons++;
      }
    }

    const anchorRegex = /<a\b((?:[^>{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)>/g;
    while ((match = anchorRegex.exec(content)) !== null) {
      const attrs = match[1] || '';
      if (/\bhref\s*=\s*['"](#|javascript:void\(0\))['"]/i.test(attrs) && !/\b(onClick|@click)\b/.test(attrs)) {
        const lineNum = content.slice(0, match.index).split('\n').length;
        totalButtons++;
        findings.push({
          ruleId: 'DEAD_ANCHOR_LINK',
          severity: 'MEDIUM',
          file: rel,
          line: lineNum,
          message: 'Elemento <a href="#"> sem handler onClick: clique não executa nenhuma navegação ou ação.',
          suggestion: 'Troque por <button onClick={...}> ou forneça uma rota real no atributo href.'
        });
      }
    }
  }

  let score = 100;
  for (const f of findings) {
    if (f.severity === 'HIGH') score -= 20;
    else if (f.severity === 'MEDIUM') score -= 10;
  }
  score = Math.max(0, score);

  return {
    agent: 'qa-button-action',
    role: 'Interactive Button & Wiring Verifier',
    status: 'COMPLETED',
    uiFilesScanned: uiFiles.length,
    totalButtonsAudited: totalButtons,
    functionalButtons,
    deadButtonsFound: findings.length,
    score,
    findings
  };
}

function executeAgent(agentName, targetDir) {
  const safeDir = typeof targetDir === 'string' && targetDir ? path.resolve(targetDir) : '.';
  switch (agentName) {
    case 'crawler':
    case 'qa-crawler':
      return runCrawlerAgent(safeDir);
    case 'bruteforce':
    case 'qa-bruteforce':
      return runBruteforceAgent(safeDir);
    case 'ui-palette':
    case 'qa-ui-palette':
      return runUiPaletteAgent(safeDir);
    case 'button-action':
    case 'qa-button-action':
      return runButtonActionAgent(safeDir);
    default:
      return null;
  }
}

if (require.main === module) {
  const agentArg = process.argv[2] || 'crawler';
  const dirArg = process.argv[3] || process.cwd();
  try {
    const result = executeAgent(agentArg, dirArg);
    if (!result) throw new Error(`Agente desconhecido: ${agentArg}`);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
}

module.exports = {
  executeAgent,
  runCrawlerAgent,
  runBruteforceAgent,
  runUiPaletteAgent,
  runButtonActionAgent
};
