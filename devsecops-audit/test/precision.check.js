/**
 * test/precision.test.js — Precisão do devsecops-audit (v2.7.0)
 *
 * Garante que o motor NÃO grita à toa:
 *  1. Fixture limpa (código correto + axios corrigido via lockfile) -> 0 achados
 *  2. Supressão inline com motivo funciona; sem motivo é ignorada; Pilar 16 nunca é suprimido
 *  3. Baseline: --update-baseline grava os achados conhecidos e mantém os segredos (Pilar 16)
 *     no relatório e no exit code; achado novo depois disso volta a aparecer
 *  4. Evidência legível (só segredos são mascarados)
 *  5. Baseline + npm audit: um CVE novo no mesmo lockfile não fica escondido (npm falso no PATH, sem rede)
 *  6. --fix só remove do relatório o que de fato corrigiu e só grava arquivos que mudaram
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync, execFileSync } = require('child_process');

const auditScript = path.join(__dirname, '..', 'scripts', 'audit.js');
let failures = 0;

/** Roda o audit.js com --json e devolve { status, report } (exit code + relatório). */
function runAuditStatus(dir, args = [], env = process.env) {
  let out = '';
  let status = 0;
  try {
    out = execFileSync(process.execPath, [auditScript, dir, '--json', ...args], { env, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    status = e.status;
    out = e.stdout ? e.stdout.toString() : '';
  }
  return { status, report: JSON.parse(out) };
}

function runAudit(dir, extra = '') {
  let out = '';
  try {
    out = execSync(`node "${auditScript}" "${dir}" --json --no-npm-audit ${extra}`, { encoding: 'utf-8' });
  } catch (e) {
    out = e.stdout ? e.stdout.toString() : '';
  }
  return JSON.parse(out);
}

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`   ✅ [PASS] ${label}`);
  } else {
    console.error(`   ❌ [FAIL] ${label}${detail ? ` -> ${detail}` : ''}`);
    failures++;
  }
}

console.log('🎯 Testes de Precisão do devsecops-audit (fixtures negativas, supressão e baseline)...\n');

// ---------------------------------------------------------------------------
// 1. Fixture LIMPA cobrindo todas as 13 regras RULE_* + Express/Prisma -> 0 achados
// ---------------------------------------------------------------------------
const cleanDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devsecops-clean-'));
fs.mkdirSync(path.join(cleanDir, 'src', 'routes'), { recursive: true });
fs.mkdirSync(path.join(cleanDir, 'prisma'), { recursive: true });

fs.writeFileSync(path.join(cleanDir, 'package.json'), JSON.stringify({
  name: 'clean-express-prisma-fixture', version: '1.0.0',
  dependencies: { axios: '^1.5.0', jsonwebtoken: '^9.0.2', express: '^4.21.2', '@prisma/client': '^6.0.0', zod: '^3.24.0' }
}, null, 2));
fs.writeFileSync(path.join(cleanDir, 'package-lock.json'), JSON.stringify({
  name: 'clean-express-prisma-fixture', lockfileVersion: 3,
  packages: {
    '': {},
    'node_modules/axios': { version: '1.7.9' },
    'node_modules/jsonwebtoken': { version: '9.0.2' },
    'node_modules/express': { version: '4.21.2' }
  }
}, null, 2));

// Schema Prisma limpo
fs.writeFileSync(path.join(cleanDir, 'prisma', 'schema.prisma'), [
  'datasource db { provider = "postgresql" url = env("DATABASE_URL") }',
  'model Order {',
  '  id        String @id @default(cuid())',
  '  userId    String',
  '  totalCents Int',
  '  @@index([userId])',
  '}'
].join('\n'));

// Tauri config seguro (RULE_TAURI_IPC_UNRESTRICTED_CSP negativa)
fs.writeFileSync(path.join(cleanDir, 'tauri.conf.json'), JSON.stringify({
  tauri: {
    security: { csp: "default-src 'self'; script-src 'self'" },
    allowlist: { shell: { execute: false, open: false } }
  }
}, null, 2));

// Rotas Express + Prisma cobrindo versões SEGURAS de todas as 12 regras RULE_* de código
fs.writeFileSync(path.join(cleanDir, 'src', 'routes', 'app.ts'), [
  "import express from 'express';",
  "import helmet from 'helmet';",
  "import bcrypt from 'bcrypt';",
  "import crypto from 'crypto';",
  "import jwt from 'jsonwebtoken';",
  "import DOMPurify from 'isomorphic-dompurify';",
  "import { z } from 'zod';",
  'const app = express();',
  'app.use(helmet());',
  "const UpdateSchema = z.object({ name: z.string().max(80) });",
  // 1. RULE_JWT_MISSING_ALGORITHM_OPTION (seguro: algorithms explícito)
  'export function verifySession(token: string, secret: string) {',
  "  return jwt.verify(token, secret, { algorithms: ['HS256'] });",
  '}',
  // 2. RULE_AUTH_HARDCODED_MASTER_PASSWORDS + 3. RULE_AUTH_MFA_UNIVERSAL_BYPASS + 4. RULE_AUTH_INFO_DISCLOSURE_IN_ERRORS (seguro)
  'export async function login(req, res) {',
  '  const user = await prisma.user.findUnique({ where: { email: req.body.email } });',
  '  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {',
  "    return res.status(401).json({ error: 'Credenciais inválidas' });",
  '  }',
  '  const mfaValid = authenticator.verify({ token: req.body.otp, secret: user.totpSecret });',
  '  if (!mfaValid) return res.status(401).json({ error: "Código MFA inválido" });',
  "  res.cookie('session', 'abc', { httpOnly: true, secure: true, sameSite: 'strict' });",
  '  return res.json({ ok: true });',
  '}',
  // 5. RULE_BOLA_IDOR_MISSING_OWNERSHIP_CHECK + 6. RULE_MASS_ASSIGNMENT_UNSANITIZED_BODY (seguro)
  'export async function updateProfile(req, res) {',
  '  const safeData = UpdateSchema.parse(req.body);',
  '  await prisma.profile.update({ where: { id: req.params.id, userId: req.user.id }, data: safeData });',
  '  return res.json({ ok: true });',
  '}',
  // 7. RULE_WEBHOOK_MISSING_HMAC_SIGNATURE + 8. RULE_TIMING_ATTACK_STRING_COMPARE (seguro)
  "app.post('/webhooks/stripe', (req, res) => {",
  "  const expectedSignature = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET!).update(req.rawBody).digest('hex');",
  "  const clientSignature = String(req.headers['x-signature'] || '');",
  '  const isValid = crypto.timingSafeEqual(Buffer.from(clientSignature), Buffer.from(expectedSignature));',
  '  if (!isValid) return res.status(401).end();',
  '  return res.status(200).json({ received: true });',
  '});',
  // 9. RULE_WEBSOCKET_UNAUTHENTICATED_ROOMS (seguro: usa socket.data.user.id)
  'export function setupSocket(io) {',
  "  io.on('connection', (socket) => {",
  "    socket.on('join-room', () => { socket.join(`user:${socket.data.user.id}`); });",
  '  });',
  '}',
  // 10. RULE_SSRF_UNVALIDATED_MEDIA_DOWNLOAD (seguro: validateUrl + bloqueio de IPs privados)
  'export async function fetchAvatar(req, res) {',
  '  const mediaUrl = validateUrl(req.body.mediaUrl);',
  "  if (mediaUrl.includes('127.0.0.1') || mediaUrl.includes('169.254.169.254') || isPrivateIP(mediaUrl)) {",
  '    return res.status(400).end();',
  '  }',
  '  const resp = await fetch(mediaUrl);',
  '  return res.json({ status: resp.status });',
  '}',
  // 11. RULE_STORED_XSS_UNSANITIZED_SVG_UPLOAD (seguro: DOMPurify.sanitize + Content-Disposition: attachment)
  'export function sanitizeSvgUpload(file, res) {',
  "  if (file.mimetype === 'image/svg+xml') {",
  '    const clean = DOMPurify.sanitize(file.buffer.toString());',
  "    res.setHeader('Content-Disposition', 'attachment');",
  '    return clean;',
  '  }',
  '}',
  // 12. RULE_UNPROTECTED_FILE_DOWNLOAD_ROUTE (seguro: middleware requireAuth presente)
  "app.get('/api/files/:id', requireAuth, (req, res) => res.sendFile(req.params.id));"
].join('\n'));

const cleanReport = runAudit(cleanDir);
check('Fixture limpa (13 regras RULE_* seguras + projeto Express/Prisma + lockfile) gera 0 falsos positivos',
  cleanReport.findings.length === 0,
  cleanReport.findings.map((f) => `${f.id}@${f.file}:${f.line}`).join(', '));
fs.rmSync(cleanDir, { recursive: true, force: true });

// ---------------------------------------------------------------------------
// 2. Supressão inline
// ---------------------------------------------------------------------------
const supDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devsecops-suppress-'));
fs.writeFileSync(path.join(supDir, 'compare.ts'), [
  'export function a(clientSignature: string, expectedSignature: string) {',
  '  // audit-ignore-next-line RULE_TIMING_ATTACK_STRING_COMPARE: comparação de enum público, não é segredo',
  '  return clientSignature === expectedSignature;',
  '}',
  'export function b(clientSignature: string, expectedSignature: string) {',
  '  // audit-ignore-next-line RULE_TIMING_ATTACK_STRING_COMPARE',
  '  return clientSignature === expectedSignature;',
  '}',
  '// audit-ignore-next-line HARDCODED_SECRET_DETECTED: tentativa de esconder segredo',
  `export const key = "${'AKIA' + '1234567890ABCDEF'}";`
].join('\n'));

const supReport = runAudit(supDir);
const timingLines = supReport.findings.filter((f) => f.id === 'RULE_TIMING_ATTACK_STRING_COMPARE').map((f) => f.line);
check('Supressão COM motivo remove o achado (linha 3)', !timingLines.includes(3), `linhas: ${timingLines}`);
check('Supressão SEM motivo é ignorada (linha 7 continua)', timingLines.includes(7), `linhas: ${timingLines}`);
check('Pilar 16 (segredo) NUNCA é suprimido inline', supReport.findings.some((f) => f.id === 'HARDCODED_SECRET_DETECTED'));
check('Relatório registra a supressão aplicada com motivo', (supReport.suppressions || []).length === 1 && /enum público/.test(supReport.suppressions[0].reason));

// ---------------------------------------------------------------------------
// 3. Baseline
// ---------------------------------------------------------------------------
const baselineRun = runAuditStatus(supDir, ['--no-npm-audit', '--update-baseline']);
const baseReportBefore = baselineRun.report;
const baselinePath = path.join(supDir, '.audit-baseline.json');
check('--update-baseline grava o baseline e mantém só os segredos (Pilar 16) no relatório',
  fs.existsSync(baselinePath) && baseReportBefore.findings.length > 0 && baseReportBefore.findings.every((f) => f.pilar === 16),
  baseReportBefore.findings.map((f) => f.id).join(', '));
check('--update-baseline com segredo continua bloqueando (exit 1)', baselineRun.status === 1, `exit ${baselineRun.status}`);

const secretFingerprint = (supReport.findings.find((f) => f.id === 'HARDCODED_SECRET_DETECTED') || {}).fingerprint;
const baselineFingerprints = fs.existsSync(baselinePath)
  ? (JSON.parse(fs.readFileSync(baselinePath, 'utf-8')).fingerprints || [])
  : [];
check('Fingerprint do segredo NÃO entra no .audit-baseline.json',
  Boolean(secretFingerprint) && !baselineFingerprints.includes(secretFingerprint),
  String(secretFingerprint));

const baseReportAfter = runAudit(supDir, '--baseline');
// Pilar 16 nunca entra no baseline como "aceito": segredo continua aparecendo
check('--baseline oculta achados conhecidos e mantém os segredos do Pilar 16',
  baseReportAfter.findings.length > 0 && baseReportAfter.findings.every((f) => f.pilar === 16),
  baseReportAfter.findings.map((f) => f.id).join(', '));

fs.writeFileSync(path.join(supDir, 'new.ts'), 'export function c(req, res) { res.cookie("sid", "x", { path: "/" }); }');
const baseReportNew = runAudit(supDir, '--baseline');
check('Achado NOVO após o baseline volta a aparecer', baseReportNew.findings.some((f) => f.id === 'COOKIE_INSECURE_FLAGS'));

// ---------------------------------------------------------------------------
// 4. Evidência legível
// ---------------------------------------------------------------------------
const cookieFinding = baseReportNew.findings.find((f) => f.id === 'COOKIE_INSECURE_FLAGS');
check('Evidência de regra não-secreta permanece legível (sem ****)', cookieFinding && cookieFinding.evidence && !cookieFinding.evidence.includes('****'), cookieFinding && cookieFinding.evidence);
const secretFinding = baseReportNew.findings.find((f) => f.id === 'HARDCODED_SECRET_DETECTED');
check('Evidência de segredo continua mascarada', secretFinding && secretFinding.evidence.includes('****'));

fs.rmSync(supDir, { recursive: true, force: true });

// ---------------------------------------------------------------------------
// 5. Baseline + npm audit: os achados apontam para a linha 1 do lockfile, então
//    só uma chave estável (pacote + advisories) impede que o baseline esconda CVEs novos
// ---------------------------------------------------------------------------
const npmRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'devsecops-npm-audit-'));
try {
  const npmProj = path.join(npmRoot, 'proj');
  const fakeBin = path.join(npmRoot, 'fakebin');
  fs.mkdirSync(npmProj, { recursive: true });
  fs.mkdirSync(fakeBin, { recursive: true });
  fs.writeFileSync(path.join(npmProj, 'package.json'), JSON.stringify({
    name: 'npm-audit-fixture', version: '1.0.0', dependencies: { semver: '^7.5.0' }
  }, null, 2));
  fs.writeFileSync(path.join(npmProj, 'package-lock.json'), JSON.stringify({
    name: 'npm-audit-fixture', lockfileVersion: 3,
    packages: { '': {}, 'node_modules/semver': { version: '7.5.0' } }
  }, null, 2));

  // npm falso: imprime fakebin/audit.json e sai 1, como o npm audit real quando há vulnerabilidades
  if (process.platform === 'win32') {
    fs.writeFileSync(path.join(fakeBin, 'npm.cmd'), ['@echo off', 'type "%~dp0audit.json"', 'exit /b 1', ''].join('\r\n'));
  } else {
    fs.writeFileSync(path.join(fakeBin, 'npm'), ['#!/bin/sh', 'cat "$(dirname "$0")/audit.json"', 'exit 1', ''].join('\n'), { mode: 0o755 });
  }
  // No Windows a variável se chama "Path": altera a chave existente em vez de criar uma segunda
  const npmEnv = { ...process.env };
  const pathKey = Object.keys(npmEnv).find((k) => k.toLowerCase() === 'path') || 'PATH';
  npmEnv[pathKey] = fakeBin + path.delimiter + (npmEnv[pathKey] || '');

  const semverVuln = {
    name: 'semver', severity: 'high', range: '<7.5.2', fixAvailable: true,
    via: [{ title: 'semver ReDoS', url: 'https://github.com/advisories/GHSA-c2qf-rxjj-qqgw', severity: 'high' }]
  };
  const undiciVuln = {
    name: 'undici', severity: 'critical', range: '<5.28.4', fixAvailable: true,
    via: [{ title: 'undici exemplo', url: 'https://github.com/advisories/GHSA-0000-0000-0000', severity: 'critical' }]
  };

  fs.writeFileSync(path.join(fakeBin, 'audit.json'), JSON.stringify({ vulnerabilities: { semver: semverVuln } }));
  const npmFirst = runAuditStatus(npmProj, ['--update-baseline'], npmEnv);
  check('npm audit (falso) lido: --update-baseline guarda o HIGH de semver',
    npmFirst.report.summary.baselined === 1,
    `baselined=${npmFirst.report.summary.baselined}`);

  fs.writeFileSync(path.join(fakeBin, 'audit.json'), JSON.stringify({ vulnerabilities: { semver: semverVuln, undici: undiciVuln } }));
  const npmSecond = runAuditStatus(npmProj, ['--baseline'], npmEnv);
  const npmFindings = npmSecond.report.findings.filter((f) => f.id === 'SUPPLY_CHAIN_NPM_AUDIT_CVE');
  check('CVE NOVO do npm audit (undici) aparece depois do baseline',
    npmFindings.some((f) => f.message.includes('"undici"')),
    npmSecond.report.findings.map((f) => f.id).join(', ') || 'nenhum achado');
  check('CVE já conhecido (semver) continua oculto pelo baseline',
    !npmFindings.some((f) => f.message.includes('"semver"')));
  check('CVE novo bloqueia (exit 1)', npmSecond.status === 1, `exit ${npmSecond.status}`);
} catch (e) {
  check('Cenário npm audit + baseline executado sem exceções', false, e.message);
} finally {
  fs.rmSync(npmRoot, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// 6. --fix honesto: só some do relatório o que foi corrigido de verdade
// ---------------------------------------------------------------------------
const fixRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'devsecops-fix-'));
try {
  // A. CVE com lockfile: o range muda, mas a versão instalada continua vulnerável até o install
  const cveDir = path.join(fixRoot, 'cve');
  fs.mkdirSync(cveDir);
  fs.writeFileSync(path.join(cveDir, 'package.json'), JSON.stringify({
    name: 'fix-fixture', version: '1.0.0', dependencies: { axios: '^1.5.0' }
  }, null, 2));
  fs.writeFileSync(path.join(cveDir, 'package-lock.json'), JSON.stringify({
    name: 'fix-fixture', lockfileVersion: 3,
    packages: { '': {}, 'node_modules/axios': { version: '1.5.0' } }
  }, null, 2));

  const cveFix1 = runAudit(cveDir, '--fix');
  const pkgAfterFix1 = fs.readFileSync(path.join(cveDir, 'package.json'), 'utf-8');
  const axiosFinding = cveFix1.findings.find((f) => f.id === 'SUPPLY_CHAIN_KNOWN_CVE' && f.message.includes('"axios"'));
  check('--fix com lockfile vulnerável: CVE do axios continua no relatório (HIGH)',
    Boolean(axiosFinding) && axiosFinding.severity === 'HIGH',
    cveFix1.findings.map((f) => f.id).join(', ') || 'nenhum achado');
  check('--fix atualiza o range do axios no package.json para a versão segura',
    JSON.parse(pkgAfterFix1).dependencies.axios === '^1.7.4',
    JSON.parse(pkgAfterFix1).dependencies.axios);
  check('--fix orienta a atualizar o lockfile (npm install)',
    Boolean(axiosFinding) && /npm install/.test(axiosFinding.remediation || ''),
    axiosFinding && axiosFinding.remediation);

  const cveFix2 = runAudit(cveDir, '--fix');
  const pkgAfterFix2 = fs.readFileSync(path.join(cveDir, 'package.json'), 'utf-8');
  check('2º --fix não regrava o package.json (nada mudou)',
    pkgAfterFix2 === pkgAfterFix1 && cveFix2.summary.autoFixedFiles.length === 0,
    JSON.stringify(cveFix2.summary.autoFixedFiles));

  // A2. CVE sem lockfile: o range do package.json é a única fonte da versão, então o --fix resolve
  const noLockDir = path.join(fixRoot, 'cve-no-lock');
  fs.mkdirSync(noLockDir);
  fs.writeFileSync(path.join(noLockDir, 'package.json'), JSON.stringify({
    name: 'fix-fixture-no-lock', version: '1.0.0', dependencies: { axios: '^1.5.0' }
  }, null, 2));
  const noLockFix = runAudit(noLockDir, '--fix');
  check('--fix sem lockfile corrige o range e remove o CVE do relatório',
    JSON.parse(fs.readFileSync(path.join(noLockDir, 'package.json'), 'utf-8')).dependencies.axios === '^1.7.4' &&
      !noLockFix.findings.some((f) => f.id === 'SUPPLY_CHAIN_KNOWN_CVE') &&
      noLockFix.summary.autoFixedFiles.includes('package.json'),
    noLockFix.findings.map((f) => f.id).join(', ') || 'nenhum achado');

  // B/C. Cookie: sem objeto de opções o --fix não corrige; com objeto, corrige a linha
  const cookieDir = path.join(fixRoot, 'cookie');
  fs.mkdirSync(cookieDir);
  const plainCookie = "export function login(req, res, token) {\n  res.cookie('sid', token);\n}\n";
  const optsCookie = "export function login2(req, res, token) {\n  res.cookie('sid', token, { path: '/' });\n}\n";
  fs.writeFileSync(path.join(cookieDir, 'cookie-plain.js'), plainCookie);
  fs.writeFileSync(path.join(cookieDir, 'cookie-opts.js'), optsCookie);

  const cookieFix = runAudit(cookieDir, '--fix');
  const cookieFiles = cookieFix.findings.filter((f) => f.id === 'COOKIE_INSECURE_FLAGS').map((f) => f.file);
  check('--fix mantém o achado de cookie que não conseguiu corrigir',
    cookieFiles.includes('cookie-plain.js'),
    JSON.stringify(cookieFiles));
  check('--fix não altera arquivo que não corrigiu',
    fs.readFileSync(path.join(cookieDir, 'cookie-plain.js'), 'utf-8') === plainCookie);
  check('--fix corrige cookie com objeto de opções e remove o achado',
    !cookieFiles.includes('cookie-opts.js') && /httpOnly: true/.test(fs.readFileSync(path.join(cookieDir, 'cookie-opts.js'), 'utf-8')),
    fs.readFileSync(path.join(cookieDir, 'cookie-opts.js'), 'utf-8'));

  // D/E. Tabnabbing: --dry-run simula sem tocar no disco e --fix cria backup .bak e corrige só a linha acusada
  const linkDir = path.join(fixRoot, 'link');
  fs.mkdirSync(linkDir);
  const linkLine2 = '<a rel="noreferrer" target="_blank" href="https://b">b</a>';
  const originalLinkFile = ['<a href="https://a" target="_blank">a</a>', linkLine2, ''].join('\n');
  fs.writeFileSync(path.join(linkDir, 'link.jsx'), originalLinkFile);

  const linkDryRun = runAudit(linkDir, '--fix --dry-run');
  check('--fix --dry-run não altera o arquivo no disco e lista plannedFixes',
    fs.readFileSync(path.join(linkDir, 'link.jsx'), 'utf-8') === originalLinkFile &&
      linkDryRun.summary.dryRun === true &&
      Array.isArray(linkDryRun.summary.plannedFixes) &&
      linkDryRun.summary.plannedFixes.length === 1,
    JSON.stringify(linkDryRun.summary));

  const linkFix = runAudit(linkDir, '--fix');
  const linkLines = fs.readFileSync(path.join(linkDir, 'link.jsx'), 'utf-8').split('\n');
  check('--fix cria arquivo de backup .bak com o conteúdo original antes de modificar',
    fs.existsSync(path.join(linkDir, 'link.jsx.bak')) &&
      fs.readFileSync(path.join(linkDir, 'link.jsx.bak'), 'utf-8') === originalLinkFile,
    'link.jsx.bak');
  check('--fix corrige o link acusado (rel uma única vez) e remove o achado',
    !linkFix.findings.some((f) => f.id === 'FRONTEND_REVERSE_TABNABBING') &&
      (linkLines[0].match(/rel="noopener noreferrer"/g) || []).length === 1,
    linkLines[0]);
  check('--fix não mexe em linha que não foi acusada', linkLines[1] === linkLine2, linkLines[1]);

  // F. --changed: em repositório git, filtra apenas achados de arquivos modificados/untracked
  const gitDir = path.join(fixRoot, 'git-changed');
  fs.mkdirSync(gitDir);
  execSync('git init', { cwd: gitDir, stdio: 'ignore' });
  execSync('git config user.email "test@example.com"', { cwd: gitDir, stdio: 'ignore' });
  execSync('git config user.name "Test"', { cwd: gitDir, stdio: 'ignore' });
  fs.writeFileSync(path.join(gitDir, 'committed.ts'), "export function a(req, res) { res.cookie('sid', '1'); }\n");
  execSync('git add committed.ts && git commit -m "init"', { cwd: gitDir, stdio: 'ignore' });
  // Cria arquivo novo não commitado (untracked) com outro achado
  fs.writeFileSync(path.join(gitDir, 'untracked.ts'), '<a href="https://example.com" target="_blank">x</a>\n');
  const changedReport = runAudit(gitDir, '--changed');
  const changedFiles = changedReport.findings.map((f) => f.file);
  check('--changed retorna apenas achados de arquivos alterados/untracked no git',
    changedReport.summary.changedOnly === true &&
      changedFiles.includes('untracked.ts') &&
      !changedFiles.includes('committed.ts'),
    JSON.stringify(changedFiles));
} catch (e) {
  check('Cenários de --fix executados sem exceções', false, e.message);
} finally {
  fs.rmSync(fixRoot, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`\n❌ ${failures} teste(s) de precisão falharam.`);
  process.exit(1);
}
console.log('\n🎉 Precisão validada: 0 falsos positivos na fixture limpa, supressão com motivo e baseline funcionando!');
