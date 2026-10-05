/**
 * scripts/hooks/lib/hook-utils.js — utilidades dos hooks do Antigravity.
 *
 * Regras de ouro: todo hook é FAIL-OPEN (qualquer erro → saída "{}"), barato
 * (PreInvocation roda antes de CADA chamada do modelo) e com estado em os.tmpdir()
 * por conversationId (o plugin pode estar instalado local + global; o estado
 * compartilhado evita injetar/bloquear duas vezes).
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

function readStdin() {
  try {
    const raw = fs.readFileSync(0, 'utf8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function out(obj) {
  process.stdout.write(JSON.stringify(obj || {}));
}

// Executa o hook com proteção total: nunca quebra o agente.
function failOpen(fn) {
  try {
    const result = fn();
    out(result || {});
  } catch (e) {
    try { logDebug('hook-error', { message: e.message, stack: String(e.stack).split('\n').slice(0, 4).join(' | ') }); } catch { /* nada */ }
    out({});
  }
}

const STATE_DIR = path.join(os.tmpdir(), 'enterprise-ai-suite-hooks');

function stateFile(conversationId, name) {
  const safe = String(conversationId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(STATE_DIR, `${safe}.${name}.json`);
}

function readState(conversationId, name) {
  try { return JSON.parse(fs.readFileSync(stateFile(conversationId, name), 'utf8')); } catch { return {}; }
}

function writeState(conversationId, name, data) {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(stateFile(conversationId, name), JSON.stringify(data));
  } catch { /* fail-open */ }
}

function logDebug(event, data) {
  if (!process.env.EAS_HOOK_DEBUG) return;
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.appendFileSync(path.join(STATE_DIR, 'debug.log'), `${new Date().toISOString()} ${event} ${JSON.stringify(data)}\n`);
}

// ---------------------------------------------------------------------------
// Transcript (JSONL). Os args de tool_calls vêm como strings JSON-encoded.
// ---------------------------------------------------------------------------

function parseArg(v) {
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return v.replace(/^"|"$/g, ''); }
}

// Lê só o final do arquivo até achar o último USER_INPUT (barato para PreInvocation).
function readLastUserInput(transcriptPath) {
  const fd = fs.openSync(transcriptPath, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    let chunk = 256 * 1024;
    while (true) {
      const start = Math.max(0, size - chunk);
      const buf = Buffer.alloc(size - start);
      fs.readSync(fd, buf, 0, buf.length, start);
      const lines = buf.toString('utf8').split('\n');
      if (start > 0) lines.shift(); // linha possivelmente cortada
      for (let i = lines.length - 1; i >= 0; i--) {
        if (!lines[i].includes('"USER_INPUT"')) continue;
        try {
          const j = JSON.parse(lines[i]);
          if (j.type === 'USER_INPUT') return j;
        } catch { /* linha truncada */ }
      }
      if (start === 0) return null;
      chunk *= 4;
    }
  } finally {
    fs.closeSync(fd);
  }
}

// Passos do turno atual (depois do último USER_INPUT).
function readCurrentTurn(transcriptPath) {
  const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
  const steps = [];
  for (const l of lines) {
    if (!l.trim()) continue;
    try { steps.push(JSON.parse(l)); } catch { /* ignora */ }
  }
  let startIdx = -1;
  for (let i = steps.length - 1; i >= 0; i--) {
    if (steps[i].type === 'USER_INPUT') { startIdx = i; break; }
  }
  const user = startIdx >= 0 ? steps[startIdx] : null;
  const turn = steps.slice(startIdx + 1);
  const toolCalls = [];
  for (const s of turn) {
    if (s.type !== 'PLANNER_RESPONSE' || !Array.isArray(s.tool_calls)) continue;
    for (const tc of s.tool_calls) {
      const args = {};
      for (const [k, v] of Object.entries(tc.args || {})) args[k] = parseArg(v);
      toolCalls.push({ name: tc.name, args, step: s.step_index });
    }
  }
  return { user, toolCalls, steps: turn };
}

function userText(userStep) {
  if (!userStep || !userStep.content) return '';
  const m = String(userStep.content).match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
  return (m ? m[1] : String(userStep.content)).trim();
}

// ---------------------------------------------------------------------------
// Localização das skills (plugin instalado ou monorepo)
// ---------------------------------------------------------------------------

const PLUGIN_ROOT = path.resolve(__dirname, '..', '..', '..');

function findSkillFile(skill, rel) {
  const candidates = [
    path.join(PLUGIN_ROOT, 'skills', skill, rel),
    path.join(PLUGIN_ROOT, skill, rel),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

module.exports = {
  readStdin,
  out,
  failOpen,
  readState,
  writeState,
  logDebug,
  parseArg,
  readLastUserInput,
  readCurrentTurn,
  userText,
  findSkillFile,
  PLUGIN_ROOT,
  STATE_DIR,
};
