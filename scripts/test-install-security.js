#!/usr/bin/env node
/**
 * scripts/test-install-security.js
 * Testes automatizados de segurança para install.js, scripts/switch-version.js e bin/orch.js (Parte 2B).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const switchPath = path.join(rootDir, 'scripts', 'switch-version.js');
const installPath = path.join(rootDir, 'install.js');

// 1. Verificar ausência de exec/execSync com interpolação de strings em install.js e switch-version.js
const switchSrc = fs.readFileSync(switchPath, 'utf-8');
const installSrc = fs.readFileSync(installPath, 'utf-8');

assert(!/\bexecSync\s*\(/.test(switchSrc), 'switch-version.js não deve usar execSync com strings de shell');
assert(!/\bexecSync\s*\(/.test(installSrc), 'install.js não deve usar execSync com strings de shell');

// 2. Testar validação de formato de tag e URL allowlist exportados por switch-version.js
const { isValidVersionTag, validateGitHubUrl } = require(switchPath);
assert(typeof isValidVersionTag === 'function', 'switch-version.js deve exportar isValidVersionTag');
assert(typeof validateGitHubUrl === 'function', 'switch-version.js deve exportar validateGitHubUrl');

// Tags legítimas
assert.strictEqual(isValidVersionTag('v2.1.0'), true);
assert.strictEqual(isValidVersionTag('v2.2.0-beta.1'), true);
assert.strictEqual(isValidVersionTag('2.8.0'), true);

// Tentativas de path traversal e injeção de argumento/comando
assert.strictEqual(isValidVersionTag('../etc/passwd'), false);
assert.strictEqual(isValidVersionTag('v2.1.0; echo pwn'), false);
assert.strictEqual(isValidVersionTag('v2.1.0 && calc'), false);
assert.strictEqual(isValidVersionTag('--upload-pack=evil'), false);
assert.strictEqual(isValidVersionTag('$(whoami)'), false);

// Validação de URLs contra SSRF / redirecionamento malicioso
assert.doesNotThrow(() => validateGitHubUrl('https://api.github.com/repos/Henrique-All/skills/releases'));
assert.doesNotThrow(() => validateGitHubUrl('https://codeload.github.com/Henrique-All/skills/zip/refs/tags/v2.1.0'));
assert.throws(() => validateGitHubUrl('http://169.254.169.254/latest/meta-data'), /URL bloqueada/);
assert.throws(() => validateGitHubUrl('https://evil.example.com/archive.zip'), /Host não autorizado/);

// 3. Testar CLI switch-version.js com tag posicional em modo --dry-run
const drySwitchOut = execFileSync(process.execPath, [switchPath, 'v2.1.0', '--dry-run'], { encoding: 'utf-8' });
assert(drySwitchOut.includes('[DRY-RUN]'), 'switch-version.js deve suportar --dry-run e tag posicional');

// 4. Testar rejeição de tag maliciosa via CLI
let rejectedMalicious = false;
try {
  execFileSync(process.execPath, [switchPath, '--version=../evil', '--dry-run'], { stdio: 'pipe' });
} catch (err) {
  rejectedMalicious = err.status !== 0;
}
assert(rejectedMalicious, 'switch-version.js deve falhar com código != 0 para tags inválidas');

// 5. Testar install.js --dry-run e criação de backup (.bak) ao sobrescrever instalação existente
const tmpWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'suite-install-test-'));
try {
  // 5a. --dry-run não deve criar diretório .agents
  execFileSync(process.execPath, [installPath, '--plugin-only', '--dry-run'], {
    env: { ...process.env, TARGET_WORKSPACE: tmpWorkspace },
    stdio: 'pipe'
  });
  assert(!fs.existsSync(path.join(tmpWorkspace, '.agents')), 'install.js --dry-run não deve modificar o disco');

  // 5b. Primeira instalação cria .agents/plugins/enterprise-ai-suite
  execFileSync(process.execPath, [installPath, '--plugin-only'], {
    env: { ...process.env, TARGET_WORKSPACE: tmpWorkspace },
    stdio: 'pipe'
  });
  const pluginDir = path.join(tmpWorkspace, '.agents', 'plugins', 'enterprise-ai-suite');
  assert(fs.existsSync(path.join(pluginDir, 'plugin.json')), 'install.js deve instalar plugin.json');

  // Marca arquivo customizado para verificar se o backup o preserva na segunda instalação
  const markerPath = path.join(pluginDir, 'custom-marker.txt');
  fs.writeFileSync(markerPath, 'preserve-me-in-backup', 'utf-8');

  // 5c. Segunda instalação sobrescreve criando backup .bak
  execFileSync(process.execPath, [installPath, '--plugin-only'], {
    env: { ...process.env, TARGET_WORKSPACE: tmpWorkspace },
    stdio: 'pipe'
  });
  const backupDir = `${pluginDir}.bak`;
  assert(fs.existsSync(path.join(backupDir, 'custom-marker.txt')), 'install.js deve criar backup .bak ao sobrescrever instalação existente');
} finally {
  fs.rmSync(tmpWorkspace, { recursive: true, force: true });
}

console.log('✅ Segurança de install.js e switch-version.js verificada (validação de tag, allowlist SSRF, --dry-run, backup .bak e execFileSync).');
