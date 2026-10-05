#!/usr/bin/env node
/**
 * scripts/hooks/ui-quality-gate.js — Hook Stop (Antigravity)
 *
 * Quando o agente tenta encerrar um turno em que editou arquivos de UI:
 *   1. roda craft-audit + mobile-audit (--json) nesses arquivos;
 *   2. considera só achados "error" nas linhas alteradas (git diff vs HEAD;
 *      arquivo novo/sem git = arquivo inteiro);
 *   3. confere se o visual-check foi executado neste turno.
 * Se houver erro novo ou faltar a verificação visual, devolve
 * {"decision":"continue","reason":...} UMA única vez por turno (nunca entra em loop).
 *
 * Fail-open: qualquer erro → "{}" (o agente encerra normalmente).
 * Desligar temporariamente: variável de ambiente EAS_UI_GATE=off.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const u = require('./lib/hook-utils');

const EDIT_TOOLS = /^(write_to_file|replace_file_content|multi_replace_file_content|edit_file|create_file)$/;
const UI_EXT = /\.(tsx|jsx|vue|svelte|css|scss|less|html)$/i;
const MAX_FINDINGS = 10;

function isUiFile(file) {
  if (UI_EXT.test(file)) return true;
  if (!/\.(ts|js|mjs)$/i.test(file)) return false;
  try {
    const t = fs.readFileSync(file, 'utf8');
    return /\bstyled[.(]|\bcss`|createGlobalStyle|className=/.test(t);
  } catch { return false; }
}

function excluded(file, input) {
  const f = path.resolve(file).toLowerCase();
  const home = os.homedir().toLowerCase();
  if (input.artifactDirectoryPath && f.startsWith(path.resolve(input.artifactDirectoryPath).toLowerCase())) return true;
  if (f.startsWith(path.join(home, '.gemini').toLowerCase())) return true;
  if (/[\\/](node_modules|dist|build|\.agents|\.visual-check)[\\/]/.test(f)) return true;
  if (/[\\/]test[\\/]fixtures[\\/]/.test(f)) return true; // fixtures propositalmente ruins das skills
  return false;
}

// Linhas alteradas (1-based) em relação ao HEAD. null = considerar o arquivo inteiro.
function changedLines(file) {
  const dir = path.dirname(file);
  const git = (args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 8000 });
  try {
    git(['rev-parse', '--is-inside-work-tree']);
  } catch { return { mode: 'no-git', lines: null }; }
  try {
    git(['ls-files', '--error-unmatch', file]);
  } catch { return { mode: 'untracked', lines: null }; }
  const diff = git(['diff', '-U0', '--no-color', 'HEAD', '--', file]);
  const set = new Set();
  for (const m of diff.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
    const start = Number(m[1]);
    const count = m[2] === undefined ? 1 : Number(m[2]);
    for (let i = 0; i < count; i++) set.add(start + i);
  }
  return { mode: 'diff', lines: set };
}

function runAudit(script, files) {
  if (!script) return null;
  try {
    const stdout = execFileSync(process.execPath, [script, ...files, '--json'], { encoding: 'utf8', timeout: 25000, maxBuffer: 20 * 1024 * 1024 });
    return JSON.parse(stdout);
  } catch (e) {
    if (e.stdout) { try { return JSON.parse(e.stdout); } catch { /* saída inválida */ } }
    return null;
  }
}

u.failOpen(() => {
  if (String(process.env.EAS_UI_GATE || '').toLowerCase() === 'off') return {};
  const input = u.readStdin();
  const { conversationId, transcriptPath, terminationReason } = input;
  if (terminationReason && terminationReason !== 'model_stop') return {};
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return {};

  const { user, toolCalls } = u.readCurrentTurn(transcriptPath);
  if (!user) return {};

  const state = u.readState(conversationId, 'gate');
  if (state.lastUserStep === user.step_index) return {}; // já bloqueou neste turno: deixa encerrar

  const edited = [...new Set(toolCalls
    .filter((t) => EDIT_TOOLS.test(t.name))
    .map((t) => t.args.TargetFile || t.args.target_file || t.args.path)
    .filter((f) => typeof f === 'string' && f))]
    .filter((f) => fs.existsSync(f) && !excluded(f, input) && isUiFile(f));
  if (!edited.length) return {};

  const commands = toolCalls.filter((t) => t.name === 'run_command').map((t) => String(t.args.CommandLine || ''));
  const ranVisual = commands.some((c) => /visual-check/.test(c) && !/--setup|--help/.test(c));

  const craftScript = u.findSkillFile('frontend-craftsman', 'scripts/craft-audit.js');
  const mobileScript = u.findSkillFile('mobile-converter', 'scripts/mobile-audit.js');
  const visualScript = u.findSkillFile('frontend-craftsman', 'scripts/visual-check.js');
  const reports = [runAudit(craftScript, edited), runAudit(mobileScript, edited)].filter(Boolean);

  const scope = new Map();
  for (const f of edited) scope.set(path.resolve(f).toLowerCase(), changedLines(f));
  const unscoped = [...scope.values()].some((s) => s.mode === 'no-git');

  const newErrors = [];
  for (const r of reports) {
    for (const f of r.findings || []) {
      if (f.severity !== 'error') continue;
      const abs = path.resolve(process.cwd(), f.file).toLowerCase();
      const s = [...scope.entries()].find(([k]) => k === abs || k.endsWith(path.normalize(f.file).toLowerCase().replace(/^(\.\.[\\/])+/, '')));
      const sc = s ? s[1] : null;
      if (sc && sc.lines && !sc.lines.has(f.line)) continue; // linha não mexida neste trabalho
      newErrors.push({ ...f, tool: r.tool });
    }
  }

  const problems = [];
  if (newErrors.length) {
    problems.push(`Auditoria encontrou ${newErrors.length} erro(s) em linhas que você alterou${unscoped ? ' (projeto sem git: podem ser preexistentes, confira)' : ''}:`);
    for (const e of newErrors.slice(0, MAX_FINDINGS)) {
      problems.push(`- [${e.ruleId}] ${e.file}:${e.line}${e.component ? ` (${e.component})` : ''} — ${e.message} → ${e.suggestion}`);
    }
    if (newErrors.length > MAX_FINDINGS) problems.push(`- … +${newErrors.length - MAX_FINDINGS} (rode os audits com --json)`);
  }
  if (!ranVisual) {
    problems.push(
      `Você alterou UI (${edited.map((f) => path.basename(f)).join(', ')}) e não rodou a verificação visual neste turno.`,
      `Rode: node "${visualScript}" --url <rota afetada>  (verifica tema claro/escuro, mobile/desktop; gera screenshots) e abra os screenshots com view_file.`,
      'Se não for possível rodar (servidor parado, login, tema não aplicável), NÃO tente contornar: encerre dizendo explicitamente ao usuário que a verificação visual não foi feita e por quê.'
    );
  }
  if (!problems.length) return {};

  u.writeState(conversationId, 'gate', { lastUserStep: user.step_index, at: Date.now(), errors: newErrors.length, ranVisual });
  return {
    decision: 'continue',
    reason: `[Enterprise AI Suite · ui-quality-gate] Antes de encerrar:\n${problems.join('\n')}\n(Este aviso aparece só uma vez por pedido. Corrija apenas o que é do escopo do pedido; não refatore o resto.)`,
  };
});
