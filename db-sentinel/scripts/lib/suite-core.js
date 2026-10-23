/**
 * shared/suite-core.js — Núcleo comum do Enterprise AI Suite (v2.7.0)
 *
 * FONTE ÚNICA. Não edite as cópias em <skill>/scripts/lib/suite-core.js:
 * elas são geradas por `node scripts/sync-shared.js` (cada skill é instalada
 * de forma avulsa no Claude Code / Cursor, por isso o arquivo é copiado em vez de importado).
 *
 * Recursos:
 *  - walkFiles()            Varredura única respeitando ignores padrão + .gitignore
 *  - isCliOrTest()          Detecta scripts CLI, testes, migrations
 *  - splitHandlers()        Divide um arquivo em blocos de função/rota (escopo por handler)
 *  - getChangedFiles()      Arquivos alterados no git (modo --changed)
 *  - postProcess()          Aplica --changed, supressão inline, baseline e gera SARIF
 *
 * Zero dependências externas.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const SUITE_CORE_VERSION = '2.7.0';

const DEFAULT_IGNORES = [
  'node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.nuxt', '.turbo',
  '.code-map', '.agents', '.claude', '.cursor', '.plan', '.craft', '.mobile-preview', '.swarm', 'out'
];

// ---------------------------------------------------------------------------
// 1. Argumentos comuns
// ---------------------------------------------------------------------------
function parseCommonArgs(argv = process.argv.slice(2)) {
  const getValue = (flag) => {
    const hit = argv.find((a) => a === flag || a.startsWith(`${flag}=`));
    if (!hit) return null;
    return hit.includes('=') ? hit.split('=').slice(1).join('=') : true;
  };
  const baselineVal = getValue('--baseline');
  const updateVal = getValue('--update-baseline');
  const sarifVal = getValue('--sarif');
  return {
    changed: argv.includes('--changed'),
    baseline: typeof baselineVal === 'string' ? baselineVal : (baselineVal || updateVal ? '.audit-baseline.json' : null),
    updateBaseline: Boolean(updateVal),
    sarif: sarifVal ? (typeof sarifVal === 'string' ? sarifVal : true) : false,
    online: argv.includes('--online')
  };
}

// ---------------------------------------------------------------------------
// 2. Varredura de arquivos com .gitignore
// ---------------------------------------------------------------------------
function loadGitignoreMatchers(projectDir) {
  const giPath = path.join(projectDir, '.gitignore');
  if (!fs.existsSync(giPath)) return [];
  try {
    return fs
      .readFileSync(giPath, 'utf-8')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && !l.startsWith('!'))
      .map((pattern) => {
        const clean = pattern.replace(/^\//, '').replace(/\/$/, '');
        if (clean.includes('*')) {
          const rx = new RegExp('^' + clean.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
          return (rel, base) => rx.test(base) || rx.test(rel);
        }
        if (clean.includes('/')) return (rel) => rel === clean || rel.startsWith(clean + '/');
        return (rel, base) => base === clean;
      });
  } catch {
    return [];
  }
}

function walkFiles(projectDir, { extensions = null, extraIgnores = [], limit = Infinity } = {}) {
  const root = path.resolve(projectDir);
  const ignoreNames = new Set([...DEFAULT_IGNORES, ...extraIgnores]);
  const gitMatchers = loadGitignoreMatchers(root);
  const results = [];

  (function walk(dir) {
    if (results.length >= limit) return;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      if (results.length >= limit) return;
      if (ignoreNames.has(ent.name)) continue;
      const full = path.join(dir, ent.name);
      const rel = path.relative(root, full).replace(/\\/g, '/');
      if (gitMatchers.some((m) => m(rel, ent.name))) continue;
      if (ent.isDirectory()) {
        walk(full);
      } else if (!extensions || extensions.test(ent.name)) {
        results.push(full);
      }
    }
  })(root);

  return results;
}

// ---------------------------------------------------------------------------
// 3. Contexto de arquivo
// ---------------------------------------------------------------------------
function isCliOrTest(filePath, content = '') {
  const normalized = String(filePath || '').replace(/\\/g, '/');
  return (
    /(?:^|\/)(?:scripts|bin|test|tests|__tests__|migrations|prisma|drizzle|fixtures)\//i.test(normalized) ||
    /\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(normalized) ||
    String(content).startsWith('#!/usr/bin/env node')
  );
}

const HANDLER_START_REGEX = new RegExp(
  [
    '^\\s*(?:export\\s+)?(?:default\\s+)?(?:async\\s+)?function\\b',
    '^\\s*(?:export\\s+)?(?:const|let|var)\\s+[\\w$]+\\s*=\\s*(?:async\\s*)?(?:\\([^)]*\\)|[\\w$]+)\\s*=>',
    '\\b(?:router|app|fastify|server|api)\\.(?:get|post|put|patch|delete|all)\\s*\\(',
    '^\\s*(?:public\\s+|private\\s+|protected\\s+)?(?:static\\s+)?(?:async\\s+)?[\\w$]+\\s*\\([^)]*\\)\\s*(?::\\s*[^{]+)?\\{\\s*$'
  ].join('|')
);
const NON_HANDLER_KEYWORDS = /^\s*(?:if|for|while|switch|catch|return|else)\b/;

/**
 * Divide o conteúdo em blocos por função/rota. Cada bloco: { startLine (1-based), endLine, text }.
 * O bloco 0 (preâmbulo: imports, constantes) recebe startLine 1.
 */
function splitHandlers(content) {
  const lines = String(content).split('\n');
  const starts = [];
  lines.forEach((line, idx) => {
    if (NON_HANDLER_KEYWORDS.test(line)) return;
    if (HANDLER_START_REGEX.test(line)) starts.push(idx);
  });
  if (starts.length === 0) return [{ startLine: 1, endLine: lines.length, text: content, isPreamble: false }];

  const blocks = [];
  if (starts[0] > 0) {
    blocks.push({ startLine: 1, endLine: starts[0], text: lines.slice(0, starts[0]).join('\n'), isPreamble: true });
  }
  starts.forEach((start, i) => {
    const end = i + 1 < starts.length ? starts[i + 1] : lines.length;
    blocks.push({ startLine: start + 1, endLine: end, text: lines.slice(start, end).join('\n'), isPreamble: false });
  });
  return blocks;
}

// ---------------------------------------------------------------------------
// 4. Modo --changed (git)
// ---------------------------------------------------------------------------
function getChangedFiles(projectDir) {
  const root = path.resolve(projectDir);
  try {
    const run = (cmd) => execSync(cmd, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const topLevel = run('git rev-parse --show-toplevel').trim();
    const raw = [
      run('git diff --name-only HEAD'),
      run('git diff --name-only --cached'),
      run('git ls-files --others --exclude-standard')
    ].join('\n');
    const set = new Set();
    raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((rel) => {
      set.add(path.resolve(topLevel, rel).toLowerCase());
    });
    return set;
  } catch {
    return null; // fora de um repositório git
  }
}

// ---------------------------------------------------------------------------
// 5. Fingerprint, supressão inline e baseline
// ---------------------------------------------------------------------------
const fileLineCache = new Map();
function readLines(absFile) {
  if (!fileLineCache.has(absFile)) {
    let lines = null;
    try { lines = fs.readFileSync(absFile, 'utf-8').split('\n'); } catch { lines = null; }
    fileLineCache.set(absFile, lines);
  }
  return fileLineCache.get(absFile);
}

function ruleIdOf(f) {
  return f.id || f.rule || f.ruleId || 'UNKNOWN_RULE';
}

function absFileOf(f, projectDir) {
  if (!f.file) return null;
  return path.isAbsolute(f.file) ? f.file : path.resolve(projectDir, f.file);
}

function fingerprint(f, projectDir) {
  const abs = absFileOf(f, projectDir);
  const relFile = abs ? path.relative(projectDir, abs).replace(/\\/g, '/') : String(f.file || '');
  // Achados sem linha própria (lockfile, tsconfig) informam uma chave estável em fingerprintKey;
  // sem ela, o texto da linha (ou a mensagem) identifica o achado.
  let identity;
  if (typeof f.fingerprintKey === 'string' && f.fingerprintKey.length > 0) {
    identity = f.fingerprintKey;
  } else {
    const lines = abs ? readLines(abs) : null;
    const lineText = lines && f.line ? String(lines[f.line - 1] || '').replace(/\s+/g, ' ').trim() : '';
    identity = lineText || f.message || '';
  }
  const basis = `${ruleIdOf(f)}|${relFile}|${identity}`;
  return crypto.createHash('sha1').update(basis).digest('hex').slice(0, 20);
}

/**
 * Supressão inline (motivo obrigatório):
 *   // audit-ignore-next-line RULE_ID: motivo
 *   código(); // audit-ignore RULE_ID: motivo
 * Também aceita `#` como comentário (Python / YAML) e `ALL` como coringa.
 */
function findInlineSuppression(f, projectDir) {
  const abs = absFileOf(f, projectDir);
  const lines = abs ? readLines(abs) : null;
  if (!lines || !f.line) return null;
  const rule = ruleIdOf(f);
  const candidates = [
    { text: lines[f.line - 1] || '', rx: /(?:\/\/|#|\/\*)\s*audit-ignore\s+([A-Z0-9_,\s]+?)\s*:\s*(.+?)\s*(?:\*\/)?\s*$/ },
    { text: lines[f.line - 2] || '', rx: /(?:\/\/|#|\/\*)\s*audit-ignore-next-line\s+([A-Z0-9_,\s]+?)\s*:\s*(.+?)\s*(?:\*\/)?\s*$/ }
  ];
  for (const { text, rx } of candidates) {
    const m = text.match(rx);
    if (!m) continue;
    const rules = m[1].split(',').map((r) => r.trim()).filter(Boolean);
    const reason = (m[2] || '').trim();
    if (reason.length < 3) continue; // motivo obrigatório
    if (rules.includes(rule) || rules.includes('ALL')) return reason;
  }
  return null;
}

function loadBaseline(baselinePath) {
  try {
    const data = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
    return new Set(Array.isArray(data.fingerprints) ? data.fingerprints : []);
  } catch {
    return null;
  }
}

function writeBaseline(baselinePath, findings, projectDir, toolName) {
  let existing = {};
  try { existing = JSON.parse(fs.readFileSync(baselinePath, 'utf-8')); } catch { existing = {}; }
  const tools = existing.tools || {};
  tools[toolName] = findings.map((f) => fingerprint(f, projectDir));
  const all = Array.from(new Set(Object.values(tools).flat())).sort();
  const payload = {
    generator: 'enterprise-ai-suite',
    version: SUITE_CORE_VERSION,
    updatedAt: new Date().toISOString(),
    tools,
    fingerprints: all
  };
  fs.writeFileSync(baselinePath, JSON.stringify(payload, null, 2) + '\n', 'utf-8');
}

// ---------------------------------------------------------------------------
// 6. SARIF 2.1.0
// ---------------------------------------------------------------------------
function severityToLevel(sev) {
  const s = String(sev || '').toUpperCase();
  if (s === 'CRITICAL' || s === 'HIGH' || s === 'ERROR') return 'error';
  if (s === 'MEDIUM' || s === 'WARNING' || s === 'WARN') return 'warning';
  return 'note';
}

function toSarif(findings, { toolName, version, projectDir, informationUri = 'https://github.com/Henrique-All/skills' }) {
  const ruleIds = Array.from(new Set(findings.map(ruleIdOf)));
  return {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: toolName,
            version,
            informationUri,
            rules: ruleIds.map((id) => ({ id, shortDescription: { text: id } }))
          }
        },
        results: findings.map((f) => {
          const abs = absFileOf(f, projectDir);
          const uri = abs ? path.relative(projectDir, abs).replace(/\\/g, '/') : String(f.file || '');
          return {
            ruleId: ruleIdOf(f),
            level: severityToLevel(f.severity),
            message: { text: [f.message, f.remediation || f.fix || f.suggestion].filter(Boolean).join(' -> ') },
            partialFingerprints: { suiteFingerprint: fingerprint(f, projectDir) },
            locations: [{ physicalLocation: { artifactLocation: { uri }, region: { startLine: f.line || 1 } } }]
          };
        })
      }
    ]
  };
}

function writeSarifIfRequested(findings, opts, ctx) {
  if (!opts.sarif) return null;
  const sarif = toSarif(findings, ctx);
  if (typeof opts.sarif === 'string') {
    const out = path.resolve(ctx.projectDir, opts.sarif);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(sarif, null, 2), 'utf-8');
  }
  return sarif;
}

// ---------------------------------------------------------------------------
// 7. Pipeline de pós-processamento
// ---------------------------------------------------------------------------
/**
 * @param {Array} findings  achados brutos do auditor
 * @param {Object} ctx      { projectDir, toolName, version, argv?, neverSuppress?(f) }
 * @returns {{ findings, meta }}
 */
function postProcess(findings, ctx) {
  const projectDir = path.resolve(ctx.projectDir || process.cwd());
  const opts = parseCommonArgs(ctx.argv || process.argv.slice(2));
  const neverSuppress = typeof ctx.neverSuppress === 'function' ? ctx.neverSuppress : () => false;
  const meta = { changedOnly: false, suppressed: [], baselined: 0, baselineUpdated: false, sarif: null };

  let current = Array.isArray(findings) ? findings.slice() : [];

  // a) --changed
  if (opts.changed) {
    const changed = getChangedFiles(projectDir);
    if (changed) {
      meta.changedOnly = true;
      current = current.filter((f) => {
        const abs = absFileOf(f, projectDir);
        return abs ? changed.has(path.resolve(abs).toLowerCase()) : true;
      });
    }
  }

  // b) supressão inline (motivo obrigatório)
  current = current.filter((f) => {
    if (neverSuppress(f)) return true;
    const reason = findInlineSuppression(f, projectDir);
    if (reason) {
      meta.suppressed.push({ rule: ruleIdOf(f), file: f.file, line: f.line, reason });
      return false;
    }
    return true;
  });

  // c) baseline
  if (opts.baseline) {
    const baselinePath = path.resolve(projectDir, opts.baseline);
    if (opts.updateBaseline) {
      // Achados protegidos (ex.: segredos do Pilar 16) nunca entram no baseline
      // e continuam no relatório e no exit code desta execução.
      const protegidos = current.filter((f) => neverSuppress(f));
      const aceitos = current.filter((f) => !neverSuppress(f));
      writeBaseline(baselinePath, aceitos, projectDir, ctx.toolName || 'unknown-tool');
      meta.baselineUpdated = true;
      meta.baselined = aceitos.length;
      current = protegidos;
    } else {
      const known = loadBaseline(baselinePath);
      if (known) {
        const before = current.length;
        current = current.filter((f) => neverSuppress(f) || !known.has(fingerprint(f, projectDir)));
        meta.baselined = before - current.length;
      }
    }
  }

  // d) fingerprint em cada achado (útil para CI / dedupe)
  current = current.map((f) => ({ ...f, fingerprint: fingerprint(f, projectDir) }));

  // e) SARIF
  meta.sarif = writeSarifIfRequested(current, opts, {
    toolName: ctx.toolName || 'enterprise-ai-suite',
    version: ctx.version || SUITE_CORE_VERSION,
    projectDir
  });

  return { findings: current, meta, opts };
}

module.exports = {
  SUITE_CORE_VERSION,
  DEFAULT_IGNORES,
  parseCommonArgs,
  walkFiles,
  isCliOrTest,
  splitHandlers,
  getChangedFiles,
  fingerprint,
  findInlineSuppression,
  loadBaseline,
  writeBaseline,
  toSarif,
  postProcess
};
