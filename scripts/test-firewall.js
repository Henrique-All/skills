#!/usr/bin/env node
/**
 * scripts/test-firewall.js
 * Bateria de testes de regressão para o Firewall de Comandos (pre-command-guard.js)
 * e para o Seletor de Versão Remota (switch-version.js).
 */

const path = require('path');
const { execFileSync } = require('child_process');
const { evaluateCommand, handlePayload } = require('./hooks/pre-command-guard');
const {
  validateUrl,
  validateTagFormat,
  validateSha256Arg,
  buildSafeEnv
} = require('./switch-version');

let passed = 0;
let failed = 0;

function check(label, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`   ✅ [PASS] ${label}`);
  } else {
    failed++;
    console.error(`   ❌ [FAIL] ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('🛡️  Executando Bateria de Regressão do Firewall (pre-command-guard.js) & Switch-Version...\n');

// 1. Os 11 Bypasses Críticos Apontados na Revisão (DEVEM SER BLOQUEADOS -> deny)
const shouldDenyCases = [
  ['Subshell bash -c', 'bash -c "rm -rf /"'],
  ['Subshell sh -lc', 'sh -lc "rm -rf /etc"'],
  ['Subshell zsh -c', 'zsh -c "rm -rf ~"'],
  ['PowerShell -Command Remove-Item', 'powershell -Command "Remove-Item C:\\ -Recurse -Force"'],
  ['CMD /c rd /s /q', 'cmd /c "rd /s /q C:\\"'],
  ['Operador & simples', 'sleep 1 & rm -rf /'],
  ['Atribuição inline de variável (FOO=1)', 'FOO=1 rm -rf /'],
  ['Subshell entre parênteses (rm -rf /)', '(rm -rf /)'],
  ['Bloco entre chaves { rm -rf /; }', '{ rm -rf /; }'],
  ['Condicional shell if/then/fi', 'if true; then rm -rf /; fi'],
  ['Wrapper env', 'env rm -rf /'],
  ['Wrapper command', 'command rm -rf /'],
  ['Wrapper nohup', 'nohup rm -rf /'],
  ['Wrapper xargs', 'xargs rm -rf /'],
  ['Wrapper sudo -u root', 'sudo -u root rm -rf /'],
  ['Wrapper timeout 10', 'timeout 10 rm -rf /'],
  ['Git com opção global -C antes de push -f', 'git -C . push -f'],
  ['Git push com refspec +main', 'git push origin +main'],
  ['Git push --delete', 'git push origin --delete main'],
  ['Git push :main (deleção por refspec)', 'git push origin :main'],
  ['PowerShell abreviação -Rec -For', 'Remove-Item -Rec -For C:\\'],
  ['PowerShell abreviação -r -fo', 'Remove-Item C:\\Windows -r -fo'],
  ['Alvo crítico /etc', 'rm -rf /etc'],
  ['Alvo crítico /home', 'rm -rf /home'],
  ['Alvo crítico $HOME/*', 'rm -rf $HOME/*'],
  ['Alvo crítico // (barras duplas)', 'rm -rf //'],
  ['CMD del /s /q C:\\*', 'del /s /q C:\\*'],
  ['Prisma migrate reset --force', 'npx prisma migrate reset --force'],
  ['Prisma db push --force-reset', 'npx prisma db push --force-reset'],
  ['Prisma db push --accept-data-loss', 'prisma db push --accept-data-loss'],
  ['SQL DROP TABLE direto', 'DROP TABLE users;'],
  ['SQL DROP SCHEMA via psql', 'psql -c "DROP SCHEMA public CASCADE;"'],
  ['Formatação mkfs.ext4', 'mkfs.ext4 /dev/sda1'],
  ['Escrita direta em bloco dd', 'dd if=/dev/zero of=/dev/sda bs=1M']
];

for (const [label, cmd] of shouldDenyCases) {
  const res = evaluateCommand(cmd);
  check(`Bloqueia (${label}): ${cmd}`, res.decision === 'deny', `retornou: ${res.decision}`);
}

// 2. Casos de Alto Impacto (force_ask)
const shouldAskCases = [
  ['git reset --hard', 'git reset --hard HEAD~1'],
  ['git -C ./app clean -fd', 'git -C ./app clean -fd'],
  ['docker system prune', 'docker system prune -a'],
  ['npx rimraf dist', 'npx rimraf dist']
];

for (const [label, cmd] of shouldAskCases) {
  const res = evaluateCommand(cmd);
  check(`Exige confirmação (${label}): ${cmd}`, res.decision === 'force_ask', `retornou: ${res.decision}`);
}

// 3. Casos Seguros & Prevenção de Falsos Positivos (DEVEM PASSAR -> allow)
const shouldAllowCases = [
  ['npm test normal', 'npm test'],
  ['git push --force-with-lease', 'git push origin feat/branch --force-with-lease'],
  ['git push --force-if-includes', 'git push origin feat/branch --force-if-includes'],
  ['Falso positivo SQL em mensagem de commit', 'git commit -m "fix DROP TABLE bug"'],
  ['Falso positivo rm -rf dentro de mensagem de commit', 'git commit -m "x; rm -rf /"'],
  ['Echo com texto de comando', 'echo "To reset run: rm -rf /"'],
  ['Remoção segura de pasta local build', 'rm -rf ./dist/temp-build'],
  ['Redirecionamento 2>&1 seguro', 'node scripts/test-all.js 2>&1']
];

for (const [label, cmd] of shouldAllowCases) {
  const res = evaluateCommand(cmd);
  check(`Permite comando seguro (${label}): ${cmd}`, res.decision === 'allow', `retornou: ${res.decision}`);
}

// 4. Integração Multi-Agente (Claude Code "Bash" maiúsculo + hookSpecificOutput)
const claudeOut = handlePayload({
  tool_name: 'Bash',
  tool_input: { command: 'bash -c "rm -rf /"' }
});
check(
  'Compatibilidade Claude Code (tool_name: "Bash" + hookSpecificOutput.permissionDecision: "deny")',
  claudeOut.decision === 'deny' &&
    claudeOut.hookSpecificOutput &&
    claudeOut.hookSpecificOutput.permissionDecision === 'deny'
);

// 5. Validações de Segurança do switch-version.js
let badHostRejected = false;
try {
  validateUrl('https://evil.example.com/archive.tar.gz');
} catch {
  badHostRejected = true;
}
check('switch-version.js rejeita host fora da allowlist', badHostRejected);

let httpRejected = false;
try {
  validateUrl('http://github.com/Henrique-All/skills/archive/refs/tags/v2.8.0.tar.gz');
} catch {
  httpRejected = true;
}
check('switch-version.js rejeita protocolo HTTP não criptografado', httpRejected);

let emptyShaRejected = false;
try {
  validateSha256Arg('--sha256=');
} catch {
  emptyShaRejected = true;
}
check('switch-version.js rejeita --sha256= vazio', emptyShaRejected);

let malformedShaRejected = false;
try {
  validateSha256Arg('--sha256=12345');
} catch {
  malformedShaRejected = true;
}
check('switch-version.js rejeita --sha256 malformado', malformedShaRejected);

const validSha = 'a'.repeat(64);
check('switch-version.js aceita --sha256 de 64 hex válidos', validateSha256Arg(`--sha256=${validSha}`) === validSha);
check('switch-version.js valida formato de tag v2.8.0', validateTagFormat('v2.8.0') === 'v2.8.0');

process.env.SECRET_API_TOKEN_TEST = 'super-secret-value';
const safeEnv = buildSafeEnv('/tmp/work');
delete process.env.SECRET_API_TOKEN_TEST;
check(
  'switch-version.js filtra variáveis sensíveis do ambiente (buildSafeEnv)',
  safeEnv.SECRET_API_TOKEN_TEST === undefined && safeEnv.TARGET_WORKSPACE === '/tmp/work'
);

const dryRunOut = execFileSync(
  process.execPath,
  [path.join(__dirname, 'switch-version.js'), '--version=v2.8.0', '--dry-run'],
  { encoding: 'utf-8' }
);
check(
  'switch-version.js --dry-run valida URL .tar.gz sem baixar',
  dryRunOut.includes('v2.8.0.tar.gz') && dryRunOut.includes('[DRY-RUN]')
);

console.log(`\n📊 Resultado Firewall & Switch-Version: ${passed} passaram, ${failed} falharam.`);
if (failed > 0) {
  process.exit(1);
}

