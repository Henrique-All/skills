#!/usr/bin/env node
/**
 * test/installed-layout.check.js — /orch no layout do plugin instalado (v2.7.0)
 *
 * Instala o plugin numa pasta temporária (TARGET_WORKSPACE + --plugin-only, sem tocar no
 * perfil do usuário) e roda o bin/orch.js da cópia instalada, onde as skills ficam em skills/<nome>/:
 *  1. As etapas encontram os scripts e o DevSecOps acusa o segredo (CRÍTICO no PLAN.md)
 *  2. `orch audit` funciona na cópia instalada
 *  3. Skill ausente aparece como NÃO EXECUTADO
 *  4. Exit code do pipeline: 0 (tudo rodou, nada bloqueou), 1 (achado bloqueante), 2 (etapa não executada ou falha)
 *
 * Só roda dentro do monorepo (precisa de install.js); numa cópia instalada da skill, é pulado.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..', '..');
const installJs = path.join(repoRoot, 'install.js');
const pipelineJs = path.join(repoRoot, 'scripts', 'orch-pipeline.js');

if (!fs.existsSync(installJs) || !fs.existsSync(pipelineJs)) {
  console.log('ℹ️  installed-layout.check.js pulado: install.js / scripts/orch-pipeline.js não existem aqui (cópia instalada da skill).');
  process.exit(0);
}

let failures = 0;

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`   ✅ [PASS] ${label}`);
  } else {
    console.error(`   ❌ [FAIL] ${label}${detail ? ` -> ${detail}` : ''}`);
    failures++;
  }
}

/** Roda um script Node e devolve { status, stdout, out } sem lançar exceção. */
function runNode(script, args, opts = {}) {
  try {
    const stdout = execFileSync(process.execPath, [script, ...args], { encoding: 'utf-8', stdio: 'pipe', ...opts });
    return { status: 0, stdout, out: stdout };
  } catch (e) {
    const stdout = e.stdout ? e.stdout.toString() : '';
    const stderr = e.stderr ? e.stderr.toString() : '';
    return { status: e.status, stdout, out: stdout + stderr };
  }
}

const tail = (text) => String(text || '').slice(-1200);

console.log('🧩 Testando /orch no layout do plugin instalado (skills/<nome>/)...\n');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-installed-'));
try {
  const install = runNode(installJs, ['--plugin-only'], { cwd: tmp, env: { ...process.env, TARGET_WORKSPACE: tmp } });
  const pluginDir = path.join(tmp, '.agents', 'plugins', 'enterprise-ai-suite');
  const orchJs = path.join(pluginDir, 'bin', 'orch.js');
  check('Plugin instalado na pasta temporária', install.status === 0 && fs.existsSync(orchJs), tail(install.out));
  if (!fs.existsSync(orchJs)) throw new Error('bin/orch.js não foi instalado; testes do pipeline interrompidos');

  const orch = (args, cwd) => runNode(orchJs, args, { cwd });

  // Projeto com segredo hardcoded (montado por concatenação para o repositório não ser acusado)
  const proj = path.join(tmp, 'proj');
  fs.mkdirSync(path.join(proj, 'src'), { recursive: true });
  fs.writeFileSync(path.join(proj, 'src', 'key.ts'), `export const key = "${'AKIA' + '1234567890ABCDEF'}";\n`);

  // 1. Pipeline completo na cópia instalada
  const first = orch(['run', proj], proj);
  const planPath = path.join(proj, '.plan', 'PLAN.md');
  const plan = fs.existsSync(planPath) ? fs.readFileSync(planPath, 'utf-8') : '';
  check('run: o DevSecOps da cópia instalada acusa o segredo (CRÍTICO no PLAN.md)',
    /DevSecOps Auditor\*\* \| \*\*CRÍTICO\*\*/.test(plan),
    tail(first.out));
  check('run: todas as etapas encontram o script da skill',
    !/NÃO EXECUTADO|Script não encontrado/.test(first.out),
    tail(first.out));
  check('run: achado bloqueante sai com exit 1', first.status === 1, `exit ${first.status}`);
  check('run: mensagem final e PLAN.md indicam bloqueio',
    /CONCLUÍDO COM BLOQUEIOS/.test(first.out) && /Concluído com bloqueios/.test(plan),
    tail(first.out));

  // 2. orch audit na cópia instalada
  const audit = orch(['audit', proj, '--json'], proj);
  let auditReport = null;
  try { auditReport = JSON.parse(audit.stdout); } catch { auditReport = null; }
  check('audit: roda na cópia instalada e acusa o segredo',
    Boolean(auditReport && auditReport.summary && auditReport.summary.critical >= 1),
    tail(audit.out));

  // 4. Projeto limpo: todas as etapas rodam e nenhuma bloqueia
  const clean = path.join(tmp, 'proj-clean');
  fs.mkdirSync(path.join(clean, 'src'), { recursive: true });
  fs.writeFileSync(path.join(clean, 'src', 'ok.ts'), 'export const ok = 1;\n');
  const cleanRun = orch(['run', clean], clean);
  check('run: projeto limpo sai com exit 0', cleanRun.status === 0, `exit ${cleanRun.status}\n${tail(cleanRun.out)}`);
  check('run: projeto limpo termina com sucesso', /PIPELINE CONCLUÍDO COM SUCESSO/.test(cleanRun.out), tail(cleanRun.out));

  // 3. Skill ausente (apagada só dentro da pasta temporária)
  fs.rmSync(path.join(pluginDir, 'skills', 'db-sentinel'), { recursive: true, force: true });
  const missing = orch(['run', proj], proj);
  check('run: skill ausente aparece como NÃO EXECUTADO', /NÃO EXECUTADO/.test(missing.out), tail(missing.out));
  check('run: etapa não executada sai com exit 2', missing.status === 2, `exit ${missing.status}`);
  check('run: mensagem final indica pipeline incompleto', /PIPELINE INCOMPLETO/.test(missing.out), tail(missing.out));
} catch (e) {
  check('Execução sem exceções', false, e && e.message ? e.message : String(e));
} finally {
  try {
    fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 3 });
  } catch (e) {
    console.warn(`⚠️  Não foi possível remover a pasta temporária ${tmp}: ${e.message}`);
  }
}

if (failures > 0) {
  console.error(`\n❌ ${failures} teste(s) do layout instalado falharam.`);
  process.exit(1);
}
console.log('\n🎉 /orch validado no layout do plugin instalado.');
