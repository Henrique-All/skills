/**
 * test/rules.test.js - Teste Unitário dos 13 Vetores Avançados de AppSec & Red Team
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧪 Executando Bateria de Testes dos 13 Vetores de Ataque Avançados (DevSecOps Red Team)...\n');

const testDir = path.join(__dirname, 'temp_fixtures');
if (fs.existsSync(testDir)) {
  fs.rmSync(testDir, { recursive: true, force: true });
}
fs.mkdirSync(testDir, { recursive: true });

// 1. Fixture: RULE_AUTH_HARDCODED_MASTER_PASSWORDS
fs.writeFileSync(path.join(testDir, 'vuln_master_auth.ts'), [
  '// Teste de senhas mestres e comparacao plaintext',
  'export const devMasterPasswords = ["admin123", "999999", "admin", "123456"];',
  '',
  'export async function login(req, res) {',
  '  const { email, password } = req.body;',
  '  const user = await db.query("SELECT * FROM users WHERE email LIKE \'%" + email + "%\'");',
  '  if (user && user.password === password) {',
  '    return res.json({ token: "ok" });',
  '  }',
  '}'
].join('\n'));

// 2. Fixture: RULE_AUTH_MFA_UNIVERSAL_BYPASS
fs.writeFileSync(path.join(testDir, 'vuln_mfa.ts'), [
  'export async function verifyMfa(req, res) {',
  '  const { code, userId } = req.body;',
  '  if (code === "999999" || code === DEV_UNIVERSAL_CODE) {',
  '    return res.json({ mfaVerified: true });',
  '  }',
  '}'
].join('\n'));

// 3. Fixture: RULE_BOLA_IDOR_MISSING_OWNERSHIP_CHECK
fs.writeFileSync(path.join(testDir, 'vuln_bola.ts'), [
  'export async function getDocument(req, res) {',
  '  const doc = await prisma.document.findUnique({ where: { id: req.params.id } });',
  '  return res.json(doc);',
  '}'
].join('\n'));

// 4. Fixture: RULE_MASS_ASSIGNMENT_UNSANITIZED_BODY
fs.writeFileSync(path.join(testDir, 'vuln_mass_assign.ts'), [
  'export async function updateAccount(req, res) {',
  '  // Sem schema Zod de whitelist (.pick/.omit)',
  '  await prisma.account.update({ where: { id: req.params.id, userId: req.user.id }, data: req.body });',
  '  return res.json({ updated: true });',
  '}'
].join('\n'));

// 5. Fixture: RULE_AUTH_INFO_DISCLOSURE_IN_ERRORS
fs.writeFileSync(path.join(testDir, 'vuln_info_leak.ts'), [
  'export async function loginHandler(req, res) {',
  '  return res.status(401).json({',
  '    message: "Credencial inválida. e-mails válidos: admin@corp.com, sec@corp.com"',
  '  });',
  '}',
  '',
  'export async function forgotPass(req, res) {',
  '  return res.status(200).json({',
  '    message: "Para teste, a senha é admin123"',
  '  });',
  '}'
].join('\n'));

// 6. Fixture: RULE_WEBHOOK_MISSING_HMAC_SIGNATURE
fs.writeFileSync(path.join(testDir, 'vuln_webhook.ts'), [
  'const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_static_fallback";',
  '',
  'app.post(\'/api/webhooks\', (req, res) => {',
  '  const event = req.body;',
  '  processEvent(event);',
  '  res.sendStatus(200);',
  '});'
].join('\n'));

// 7. Fixture: RULE_WEBSOCKET_UNAUTHENTICATED_ROOMS
fs.writeFileSync(path.join(testDir, 'vuln_socket.ts'), [
  'io.on("connection", (socket) => {',
  '  socket.on("join_ticket", (data) => {',
  '    socket.join(data.ticketId);',
  '  });',
  '',
  '  socket.on("presence", (data) => {',
  '    updateStatus(data.userId, "online");',
  '  });',
  '});'
].join('\n'));

// 8. Fixture: RULE_SSRF_UNVALIDATED_MEDIA_DOWNLOAD
fs.writeFileSync(path.join(testDir, 'vuln_ssrf.ts'), [
  'import axios from "axios";',
  'export async function downloadMedia(req, res) {',
  '  const mediaUrl = req.query.mediaUrl;',
  '  const response = await axios.get(mediaUrl);',
  '  return res.send(response.data);',
  '}'
].join('\n'));

// 9. Fixture: RULE_TIMING_ATTACK_STRING_COMPARE
fs.writeFileSync(path.join(testDir, 'vuln_timing.ts'), [
  'export function verifyHmac(clientSignature: string, expectedSignature: string) {',
  '  if (clientSignature === expectedSignature) {',
  '    return true;',
  '  }',
  '  return false;',
  '}'
].join('\n'));

// 10. Fixture: RULE_STORED_XSS_UNSANITIZED_SVG_UPLOAD
fs.writeFileSync(path.join(testDir, 'vuln_svg.ts'), [
  'import multer from "multer";',
  'const upload = multer({',
  '  fileFilter: (req, file, cb) => {',
  '    if (file.mimetype === "image/svg+xml") {',
  '      cb(null, true);',
  '    }',
  '  }',
  '});'
].join('\n'));

// 11. Fixture: RULE_UNPROTECTED_FILE_DOWNLOAD_ROUTE
fs.writeFileSync(path.join(testDir, 'vuln_download.ts'), [
  'router.get(\'/attachments/:filename\', (req, res) => {',
  '  res.sendFile(req.params.filename);',
  '});'
].join('\n'));

// 12. Fixture: RULE_JWT_MISSING_ALGORITHM_OPTION
fs.writeFileSync(path.join(testDir, 'vuln_jwt.ts'), [
  'import jwt from "jsonwebtoken";',
  'export function verifySession(token: string, secret: string) {',
  '  return jwt.verify(token, secret);',
  '}'
].join('\n'));

// 13. Fixture: RULE_TAURI_IPC_UNRESTRICTED_CSP
fs.writeFileSync(path.join(testDir, 'tauri.conf.json'), JSON.stringify({
  build: { beforeBuildCommand: '' },
  tauri: {
    security: {
      csp: null
    },
    allowlist: {
      shell: {
        all: false,
        open: true,
        execute: true
      }
    }
  }
}, null, 2));

const auditScript = path.join(__dirname, '..', 'scripts', 'audit.js');

try {
  let stdout = '';
  try {
    stdout = execSync('node "' + auditScript + '" --json', { cwd: testDir, encoding: 'utf-8' });
  } catch (e) {
    stdout = e.stdout ? e.stdout.toString() : '';
  }

  const report = JSON.parse(stdout);
  const foundRuleIds = new Set(report.findings.map(f => f.id));

  const expectedRules = [
    'RULE_AUTH_HARDCODED_MASTER_PASSWORDS',
    'RULE_AUTH_MFA_UNIVERSAL_BYPASS',
    'RULE_BOLA_IDOR_MISSING_OWNERSHIP_CHECK',
    'RULE_MASS_ASSIGNMENT_UNSANITIZED_BODY',
    'RULE_AUTH_INFO_DISCLOSURE_IN_ERRORS',
    'RULE_WEBHOOK_MISSING_HMAC_SIGNATURE',
    'RULE_WEBSOCKET_UNAUTHENTICATED_ROOMS',
    'RULE_SSRF_UNVALIDATED_MEDIA_DOWNLOAD',
    'RULE_TIMING_ATTACK_STRING_COMPARE',
    'RULE_STORED_XSS_UNSANITIZED_SVG_UPLOAD',
    'RULE_UNPROTECTED_FILE_DOWNLOAD_ROUTE',
    'RULE_JWT_MISSING_ALGORITHM_OPTION',
    'RULE_TAURI_IPC_UNRESTRICTED_CSP'
  ];

  console.log('📊 Total de achados detectados nas fixtures: ' + report.findings.length);

  let allPassed = true;
  for (const rule of expectedRules) {
    if (foundRuleIds.has(rule)) {
      console.log('   ✅ [PASS] ' + rule);
    } else {
      console.error('   ❌ [FAIL] Regra não detectada: ' + rule);
      allPassed = false;
    }
  }

  // Limpeza
  fs.rmSync(testDir, { recursive: true, force: true });

  if (!allPassed) {
    process.exit(1);
  }

  console.log('\n🎉 Todas as 13 regras de AppSec/Red Team foram detectadas com 100% de precisão!');
} catch (err) {
  console.error('❌ Erro no teste:', err.message);
  if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  process.exit(1);
}
