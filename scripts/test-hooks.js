#!/usr/bin/env node
/**
 * scripts/test-hooks.js — testa os hooks com transcripts simulados (formato real do Antigravity).
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const hooksDir = path.join(root, 'scripts', 'hooks');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eas-hook-test-'));
let failed = 0;

const enc = (v) => JSON.stringify(v); // args do transcript são strings JSON-encoded

function transcript(name, userText, toolCalls) {
  const lines = [
    { step_index: 1, source: 'USER_EXPLICIT', type: 'USER_INPUT', status: 'DONE', content: `<USER_REQUEST>\n${userText}\n</USER_REQUEST>\n<ADDITIONAL_METADATA>x</ADDITIONAL_METADATA>` },
    { step_index: 2, source: 'MODEL', type: 'PLANNER_RESPONSE', status: 'DONE', content: '', tool_calls: toolCalls.map((t) => ({ name: t.name, args: Object.fromEntries(Object.entries(t.args).map(([k, v]) => [k, enc(v)])) })) },
  ];
  const p = path.join(tmp, `${name}.jsonl`);
  fs.writeFileSync(p, lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
  return p;
}

function run(hook, input, env = {}) {
  const r = spawnSync(process.execPath, [path.join(hooksDir, hook)], {
    input: typeof input === 'string' ? input : JSON.stringify(input),
    encoding: 'utf8',
    cwd: root,
    env: { ...process.env, ...env },
    timeout: 90000,
  });
  try { return JSON.parse(r.stdout || '{}'); } catch { return { __raw: r.stdout, __err: r.stderr }; }
}

function check(name, cond, detail) {
  if (cond) console.log(`  ✅ ${name}`);
  else { failed++; console.log(`  ❌ ${name}${detail ? `\n     ${String(detail).slice(0, 400)}` : ''}`); }
}

const cid = (s) => `test-${s}-${process.pid}-${Date.now()}`;

console.log('🧪 Hooks: skill-router (PreInvocation)');
{
  const t = transcript('router-ui', 'o modo claro da tela de atendimento ficou horrível no celular', []);
  const id = cid('router');
  const r1 = run('skill-router.js', { conversationId: id, transcriptPath: t, invocationNum: 1 });
  const msg = r1.injectSteps && r1.injectSteps[0] && r1.injectSteps[0].ephemeralMessage;
  check('injeta mensagem para pedido de UI/mobile', !!msg, JSON.stringify(r1));
  check('aponta frontend-craftsman e mobile-converter', msg && /frontend-craftsman/.test(msg) && /mobile-converter/.test(msg), msg);
  check('inclui visual-check obrigatório', msg && /visual-check\.js/.test(msg), msg);
  const r2 = run('skill-router.js', { conversationId: id, transcriptPath: t, invocationNum: 2 });
  check('não repete no mesmo turno', !r2.injectSteps, JSON.stringify(r2));
  const tq = transcript('router-none', 'qual a capital da frança?', []);
  const r3 = run('skill-router.js', { conversationId: cid('router-none'), transcriptPath: tq });
  check('não injeta em pedido sem domínio', !r3.injectSteps, JSON.stringify(r3));
  const r4 = run('skill-router.js', 'isto não é json');
  check('fail-open com stdin inválido', JSON.stringify(r4) === '{}', JSON.stringify(r4));
}

console.log('🧪 Hooks: ui-quality-gate (Stop)');
{
  const proj = path.join(tmp, 'proj', 'src');
  fs.mkdirSync(proj, { recursive: true });
  const bad = path.join(proj, 'Layout.styles.ts');
  fs.writeFileSync(bad, [
    "import styled from 'styled-components';",
    'export const Shell = styled.div`',
    '  display: grid;',
    '  grid-template-columns: 300px 1fr 310px;',
    '  @media (max-width: 1024px) {',
    '    flex-direction: column;',
    '    display: flex;',
    '  }',
    '`;',
    '',
  ].join('\n'));
  const good = path.join(proj, 'Ok.styles.ts');
  fs.writeFileSync(good, "import styled from 'styled-components';\nexport const A = styled.div`\n  display: flex;\n`;\n");

  const t1 = transcript('gate-bad', 'ajuste o layout mobile', [{ name: 'replace_file_content', args: { TargetFile: bad, Instruction: 'x' } }]);
  const id = cid('gate');
  const g1 = run('ui-quality-gate.js', { conversationId: id, transcriptPath: t1, terminationReason: 'model_stop', executionNum: 1 });
  check('bloqueia o encerramento com erro novo', g1.decision === 'continue', JSON.stringify(g1));
  check('cita STACKED_COLUMNS', /STACKED_COLUMNS/.test(g1.reason || ''), g1.reason);
  check('cobra a verificação visual', /visual-check/.test(g1.reason || ''), g1.reason);
  const g2 = run('ui-quality-gate.js', { conversationId: id, transcriptPath: t1, terminationReason: 'model_stop', executionNum: 2 });
  check('bloqueia no máximo 1x por pedido', JSON.stringify(g2) === '{}', JSON.stringify(g2));

  const t2 = transcript('gate-good', 'ajuste o layout', [
    { name: 'write_to_file', args: { TargetFile: good, CodeContent: '...' } },
    { name: 'run_command', args: { CommandLine: 'node visual-check.js --url http://localhost:5173/x', Cwd: proj } },
  ]);
  const g3 = run('ui-quality-gate.js', { conversationId: cid('gate-good'), transcriptPath: t2, terminationReason: 'model_stop' });
  check('deixa encerrar quando limpo e verificado', JSON.stringify(g3) === '{}', JSON.stringify(g3));

  const t3 = transcript('gate-novis', 'ajuste o layout', [{ name: 'write_to_file', args: { TargetFile: good, CodeContent: '...' } }]);
  const g4 = run('ui-quality-gate.js', { conversationId: cid('gate-novis'), transcriptPath: t3, terminationReason: 'model_stop' });
  check('cobra visual-check mesmo sem erro estático', g4.decision === 'continue' && /visual/.test(g4.reason || ''), JSON.stringify(g4));

  const t4 = transcript('gate-noui', 'ajuste o backend', [{ name: 'write_to_file', args: { TargetFile: path.join(root, 'install.js'), CodeContent: '...' } }]);
  const g5 = run('ui-quality-gate.js', { conversationId: cid('gate-noui'), transcriptPath: t4, terminationReason: 'model_stop' });
  check('ignora turnos sem arquivo de UI', JSON.stringify(g5) === '{}', JSON.stringify(g5));

  const g6 = run('ui-quality-gate.js', { conversationId: cid('gate-off'), transcriptPath: t1, terminationReason: 'model_stop' }, { EAS_UI_GATE: 'off' });
  check('desliga com EAS_UI_GATE=off', JSON.stringify(g6) === '{}', JSON.stringify(g6));
  const g7 = run('ui-quality-gate.js', '{{{');
  check('fail-open com stdin inválido', JSON.stringify(g7) === '{}', JSON.stringify(g7));
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `\n❌ ${failed} teste(s) de hook falharam` : '\n✅ Hooks OK');
process.exit(failed ? 1 : 0);
