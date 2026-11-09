#!/usr/bin/env node
/**
 * scripts/test-firewall.js
 * Suite de testes automatizados para o Firewall de Comandos no SO (scripts/hooks/pre-command-guard.js).
 */

const path = require('path');
const { execFileSync } = require('child_process');
const { evaluatePayload } = require('./hooks/pre-command-guard.js');

const guardPath = path.join(__dirname, 'hooks', 'pre-command-guard.js');

function runGuard(commandLine, toolName = 'run_command', argKey = 'CommandLine') {
  return evaluatePayload({
    toolCall: {
      name: toolName,
      args: { [argKey]: commandLine }
    }
  });
}

function runGuardSubprocess(commandLine) {
  const payload = {
    toolCall: {
      name: 'run_command',
      args: { CommandLine: commandLine }
    }
  };
  const out = execFileSync(process.execPath, [guardPath], {
    input: JSON.stringify(payload),
    encoding: 'utf-8'
  });
  return JSON.parse(out.trim());
}

const shouldBlock = [
  // Variações de rm destrutivo
  { label: 'rm -rf /', cmd: 'rm -rf /' },
  { label: 'rm -fr /', cmd: 'rm -fr /' },
  { label: 'rm -rf /*', cmd: 'rm -rf /*' },
  { label: 'rm -rf .', cmd: 'rm -rf .' },
  { label: 'rm -rf ./', cmd: 'rm -rf ./' },
  { label: 'rm -rf ./*', cmd: 'rm -rf ./*' },
  { label: 'rm -rf ..', cmd: 'rm -rf ..' },
  { label: 'rm -r -f /', cmd: 'rm -r -f /' },
  { label: 'rm -f -r ./*', cmd: 'rm -f -r ./*' },
  { label: 'rm --recursive --force /', cmd: 'rm --recursive --force /' },
  { label: 'rm --force --recursive .', cmd: 'rm --force --recursive .' },
  // Caminhos com aspas ou variáveis de ambiente
  { label: 'rm -rf "/"', cmd: 'rm -rf "/"' },
  { label: "rm -rf '.'", cmd: "rm -rf '.'" },
  { label: 'rm -rf "./*"', cmd: 'rm -rf "./*"' },
  { label: 'rm -rf "$HOME"', cmd: 'rm -rf "$HOME"' },
  { label: 'rm -rf $HOME', cmd: 'rm -rf $HOME' },
  { label: 'rm -rf $PWD', cmd: 'rm -rf $PWD' },
  { label: 'rm -rf ~', cmd: 'rm -rf ~' },
  { label: 'rm -rf ~/*', cmd: 'rm -rf ~/*' },
  // Comandos encadeados com ;, &&, |, $(), sudo
  { label: 'encadeado com ; (rm -rf .; echo ok)', cmd: 'rm -rf .; echo ok' },
  { label: 'encadeado com && (npm test && rm -rf /)', cmd: 'npm test && rm -rf /' },
  { label: 'encadeado com | (echo y | rm -rf ./*)', cmd: 'echo y | rm -rf ./*' },
  { label: 'subshell $(rm -rf /)', cmd: 'echo $(rm -rf /)' },
  { label: 'sudo rm -rf /', cmd: 'sudo rm -rf /' },
  { label: 'sudo -u root rm --recursive --force /', cmd: 'sudo -u root rm --recursive --force /' },
  // git push force (incluindo bypass com comando encadeado)
  { label: 'git push -f origin main', cmd: 'git push -f origin main' },
  { label: 'git push --force origin main', cmd: 'git push --force origin main' },
  { label: 'git push -f encadeado com --force-with-lease', cmd: 'git push origin main -f && git push origin feat --force-with-lease' },
  // SQL destrutivo com espaços e maiúsculas/minúsculas
  { label: 'DROP   TABLE com múltiplos espaços e case misto', cmd: 'psql -c "DrOp    TaBlE   users;"' },
  { label: 'TRUNCATE   TABLE com múltiplos espaços', cmd: 'mysql -e "TrUnCaTe   TaBlE orders"' },
  // PowerShell Remove-Item e cmd rmdir com flags em outra ordem
  { label: 'Remove-Item -Recurse -Force /', cmd: 'Remove-Item -Recurse -Force /' },
  { label: 'Remove-Item -Force -Recurse /', cmd: 'Remove-Item -Force -Recurse /' },
  { label: 'Remove-Item C:\\ -Recurse -Force', cmd: 'Remove-Item C:\\ -Recurse -Force' },
  { label: 'Remove-Item ./* -Force -Recurse', cmd: 'Remove-Item ./* -Force -Recurse' },
  { label: 'rmdir /q /s C:\\', cmd: 'rmdir /q /s C:\\' },
  // Prisma migrate reset
  { label: 'prisma migrate reset --force', cmd: 'npx prisma migrate reset --force' },
  { label: 'prisma migrate reset -f', cmd: 'npx prisma migrate reset -f' },
  // Outras ferramentas declaradas em hooks.json (execute_command / bash)
  { label: 'bash tool com rm -rf /', cmd: 'rm -rf /', tool: 'bash', key: 'command' },
  { label: 'execute_command tool com DROP TABLE', cmd: 'DROP TABLE customers;', tool: 'execute_command', key: 'command' }
];

const shouldAllow = [
  { label: 'rm -rf node_modules (falso positivo legítimo)', cmd: 'rm -rf node_modules' },
  { label: 'rm -rf ./node_modules dist build .next', cmd: 'rm -rf ./node_modules dist build .next' },
  { label: 'Remove-Item -Recurse -Force node_modules', cmd: 'Remove-Item -Recurse -Force node_modules' },
  { label: 'Remove-Item node_modules -Force -Recurse', cmd: 'Remove-Item node_modules -Force -Recurse' },
  { label: 'git push --force-with-lease', cmd: 'git push origin feat/branch --force-with-lease' },
  { label: 'git push --force-if-includes', cmd: 'git push origin feat/branch --force-with-lease --force-if-includes' },
  { label: 'npm test && npm run doctor', cmd: 'npm test && npm run doctor' },
  { label: 'prisma migrate dev', cmd: 'npx prisma migrate dev --name init' }
];

let failures = 0;

for (const tc of shouldBlock) {
  const res = runGuard(tc.cmd, tc.tool || 'run_command', tc.key || 'CommandLine');
  if (res.decision !== 'deny') {
    console.error(`❌ [FALHA DE BLOQUEIO] Esperava 'deny' para [${tc.label}]: "${tc.cmd}" -> obteve '${res.decision}'`);
    failures++;
  }
}

for (const tc of shouldAllow) {
  const res = runGuard(tc.cmd, tc.tool || 'run_command', tc.key || 'CommandLine');
  if (res.decision !== 'allow') {
    console.error(`❌ [FALSO POSITIVO] Esperava 'allow' para [${tc.label}]: "${tc.cmd}" -> obteve '${res.decision}' (${res.reason || ''})`);
    failures++;
  }
}

// Teste de integração via stdin/stdout real em subprocesso
if (runGuardSubprocess('rm -rf ./*').decision !== 'deny' || runGuardSubprocess('rm -rf node_modules').decision !== 'allow') {
  console.error('❌ [SUBPROCESS STDIN] Falha na integração via stdin/stdout de pre-command-guard.js');
  failures++;
}

if (failures > 0) {
  console.error(`\n💥 Firewall falhou em ${failures} caso(s) de teste.`);
  process.exit(1);
}

console.log(`✅ Firewall de Comandos no SO aprovado em ${shouldBlock.length} bloqueios destrutivos e ${shouldAllow.length} casos legítimos (zero falsos positivos).`);
