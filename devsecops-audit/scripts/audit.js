#!/usr/bin/env node
/**
 * scripts/audit.js - Motor Universal DevSecOps de Auditoria de Segurança
 * 
 * Executa checagens mecânicas dos 18 pilares de segurança em qualquer repositório.
 * Zero dependências externas.
 * 
 * Uso:
 *   node audit.js                       -> Auditoria completa
 *   node audit.js --pilares=2,3,5       -> Auditoria seletiva por pilares
 *   node audit.js --json                -> Emite relatório em formato JSON estruturado
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const isJsonOutput = args.includes('--json');
const isSarifOutput = args.includes('--sarif');
const shouldFix = args.includes('--fix');
const pilaresArg = args.find((a) => a.startsWith('--pilares=') || a.startsWith('--pillars='));
const selectedPilares = pilaresArg ? pilaresArg.split('=')[1].split(',').map(Number) : null;

const projectDir = process.cwd();

// 1. Carregar Configuração e Exceções
const defaultAuditConfig = {
  autoDetect: true,
  rules: {
    minBcryptRounds: 10,
    secretsScan: {
      ignorePaths: ['node_modules', '.git', 'dist', 'build', '.code-map'],
      regexPatterns: [
        'AKIA[0-9A-Z]{16}',
        'AIza[0-9A-Za-z\\-_]{35}',
        '-----BEGIN (?:RSA |EC )?PRIVATE KEY-----',
        'ghp_[0-9a-zA-Z]{36}',
        'sk-proj-[a-zA-Z0-9_-]{30,}'
      ]
    }
  },
  exceptionsFile: '.audit-exceptions.json'
};

function loadConfig() {
  const configPath = path.join(projectDir, 'audit.config.json');
  if (fs.existsSync(configPath)) {
    try {
      const userCfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return {
        ...defaultAuditConfig,
        ...userCfg,
        rules: {
          ...defaultAuditConfig.rules,
          ...(userCfg.rules || {}),
          secretsScan: {
            ...defaultAuditConfig.rules.secretsScan,
            ...((userCfg.rules && userCfg.rules.secretsScan) || {})
          }
        }
      };
    } catch (e) {
      console.warn('⚠️  audit.config.json corrompido, usando auto-detecção.');
    }
  }
  return defaultAuditConfig;
}

function loadExceptions(config) {
  const excPath = path.join(projectDir, config.exceptionsFile || '.audit-exceptions.json');
  if (fs.existsSync(excPath)) {
    try {
      const list = JSON.parse(fs.readFileSync(excPath, 'utf-8'));
      const now = new Date();
      return list.filter((exc) => {
        if (!exc.expiraEm) return false;
        return new Date(exc.expiraEm) > now;
      });
    } catch (e) {
      return [];
    }
  }
  return [];
}

const config = loadConfig();
const validExceptions = loadExceptions(config);
const findings = [];

function maskSecret(val) {
  if (!val || val.length < 8) return '****';
  return val.slice(0, 4) + '****' + val.slice(-3);
}

function isExcepted(ruleId, filePath) {
  return validExceptions.some((exc) => {
    return exc.id === ruleId && (!exc.arquivo || filePath.includes(exc.arquivo));
  });
}

function addFinding({ id, pilar, severity, file, line, message, evidence, remediation }) {
  if (selectedPilares && !selectedPilares.includes(pilar)) return;
  if (isExcepted(id, file)) return;

  findings.push({
    id,
    pilar,
    severity,
    file: path.relative(projectDir, file).replace(/\\/g, '/'),
    line: line || 1,
    message,
    evidence: evidence ? maskSecret(evidence.trim()) : undefined,
    remediation
  });
}

// 2. Leitura Recursiva Resiliente de Arquivos
function getProjectFiles(dir, ignores = ['node_modules', '.git', 'dist', 'build', '.code-map']) {
  let results = [];
  try {
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of list) {
      if (ignores.includes(item.name)) continue;
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        results = results.concat(getProjectFiles(fullPath, ignores));
      } else {
        results.push(fullPath);
      }
    }
  } catch (e) {
    // Diretório inacessível
  }
  return results;
}

const allFiles = getProjectFiles(projectDir);
const codeFiles = allFiles.filter((f) => /\.(ts|tsx|js|jsx|py|go|php|java)$/.test(f));

// 3. Execução dos Pilares Mecânicos

// Pilar 1: Build TypeScript
if (!selectedPilares || selectedPilares.includes(1)) {
  const tsConfig = path.join(projectDir, 'tsconfig.json');
  if (fs.existsSync(tsConfig)) {
    try {
      execSync('npx tsc --noEmit', { cwd: projectDir, stdio: 'pipe' });
    } catch (err) {
      const output = err.stdout ? err.stdout.toString() : err.message;
      addFinding({
        id: 'TYPESCRIPT_BUILD_FAIL',
        pilar: 1,
        severity: 'HIGH',
        file: 'tsconfig.json',
        message: 'Falha no build do TypeScript (erros de tipo ou sintaxe detectados).',
        evidence: output.split('\n')[0],
        remediation: 'Corrija os erros de tipagem apontados pelo compilador antes de prosseguir.'
      });
    }
  }
}

// Pilar 16: Segredos & Git
if (!selectedPilares || selectedPilares.includes(16)) {
  // Verifica se .env está no git
  const envFile = path.join(projectDir, '.env');
  if (fs.existsSync(envFile)) {
    try {
      const inGit = execSync('git ls-files .env', { cwd: projectDir, stdio: 'pipe' }).toString().trim();
      if (inGit) {
        addFinding({
          id: 'ENV_COMMITTED_IN_GIT',
          pilar: 16,
          severity: 'CRITICAL',
          file: '.env',
          message: 'Arquivo .env está rastreado no repositório Git! Risco crítico de vazamento de credenciais.',
          remediation: 'Remova do git com git rm --cached .env e adicione .env ao .gitignore.'
        });
      }
    } catch (e) {}
  }

  // Regex de segredos no código
  const secretPatterns = config.rules.secretsScan.regexPatterns.map((p) => new RegExp(p, 'g'));
  for (const file of codeFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        for (const pattern of secretPatterns) {
          const match = pattern.exec(line);
          if (match) {
            addFinding({
              id: 'HARDCODED_SECRET_DETECTED',
              pilar: 16,
              severity: 'CRITICAL',
              file,
              line: idx + 1,
              message: 'Possível credencial ou chave privada encontrada no código fonte.',
              evidence: match[0],
              remediation: 'Mova a credencial imediatamente para variável de ambiente (.env) e rotacione a chave exposta.'
            });
          }
        }
      });
    } catch (e) {}
  }
}

// Pilar 2, 3, 4, 5, 6, 7, 8, 9, 12, 14, 15, 18: Padrões estáticos no código
for (const file of codeFiles) {
  try {
    const content = fs.readFileSync(file, 'utf-8');

    // Ignora o próprio motor de auditoria para evitar falsos positivos nos padrões de regex
    if (path.basename(file) === 'audit.js' && content.includes('addFinding({')) {
      continue;
    }

    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmedLine = line.trim();
      const isComment = trimmedLine.startsWith('//') || trimmedLine.startsWith('*') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('#');
      if (isComment) return;

      // =========================================================================
      // 🛡️ 1. CONTROLE DE ACESSO & AUTENTICAÇÃO (BOLA, BACKDOORS & BYPASSES)
      // =========================================================================

      // 1A. RULE_AUTH_HARDCODED_MASTER_PASSWORDS (CRITICAL)
      const masterArrayRegex = /(?:const|let|var)\s+([a-zA-Z0-9_$]*(?:master|bypass|backdoor|devPass|superPass|universal|override)[a-zA-Z0-9_$]*(?:pass|token|secret|key|credential)[a-zA-Z0-9_$]*)\s*=\s*\[/i;
      const commonBypassArrayRegex = /(?:const|let|var)\s+([a-zA-Z0-9_$]+(?:pass|token|key|cred)?)\s*=\s*\[\s*(?:['"][^'"]+['"]\s*,\s*)*['"](?:admin123|999999|admin|123456|pass123|root|secret123|master123)['"]/i;
      const devPassComparison = /(?:password|pass|senha)\s*===?\s*['"](?:admin123|password123|devPass|root|123456|master123)['"]/i;
      const devPassNamed = /if\s*\(.*(?:password|pass|senha)\s*===?\s*(?:DEV_PASS|MASTER_PASSWORD|BACKDOOR_PASSWORD|DEV_PASSWORD)/i;
      const plaintextCompareRegex = /(?:user|account|usuario|usr|dbUser|record)\.(?:password|pass|senha|hash)\s*===?\s*(?:req\.body\.)?(?:password|pass|senha|reqPassword|inputPassword)/i;
      const plaintextCompareInverse = /(?:req\.body\.)?(?:password|pass|senha|inputPassword)\s*===?\s*(?:user|account|usuario|usr|dbUser|record)\.(?:password|pass|senha|hash)/i;
      const directPasswordCompare = /if\s*\(\s*(?:req\.body\.)?password\s*===?\s*(?:user|account)\.password\s*\)/i;
      const sqlPartialAuth = /(?:SELECT|FROM)\s+.*(?:users?|accounts?|usuarios?)\s+.*WHERE\s+.*(?:email|username|usuario)\s+LIKE\s+['"`]?%.*%/i;
      const templatePartialAuth = /(?:email|username|usuario)\s+LIKE\s+['"`]?%\$\{[^}]+\}%/i;
      const ormPartialAuth = /(?:email|username)\s*:\s*\{\s*(?:contains|startsWith)\s*:\s*(?:req\.body|email|username)/i;

      if (masterArrayRegex.test(line) || commonBypassArrayRegex.test(line) || devPassComparison.test(line) || devPassNamed.test(line) || plaintextCompareRegex.test(line) || plaintextCompareInverse.test(line) || directPasswordCompare.test(line) || sqlPartialAuth.test(line) || templatePartialAuth.test(line) || (ormPartialAuth.test(line) && /login|auth|signin|user/i.test(file))) {
        addFinding({
          id: 'RULE_AUTH_HARDCODED_MASTER_PASSWORDS',
          pilar: 2,
          severity: 'CRITICAL',
          file,
          line: lineNum,
          message: 'Credencial mestre, backdoor ou bypass de senha hardcoded detectado no código.',
          evidence: line,
          remediation: 'Elimine senhas mestres e condicionais de bypass. Utilize autenticação forte via RBAC com senhas hasheadas por bcrypt/argon2 e busca exata de usuário.'
        });
      }

      // 1B. RULE_AUTH_MFA_UNIVERSAL_BYPASS (CRITICAL)
      const mfaBypassRegex = /(?:if\s*\(.*|\b)(?:code|otp|token|mfaCode|smsCode|authCode|twoFactorCode)\s*===?\s*['"](?:999999|000000|123456|888888|111111|123123|654321)['"]/i;
      const mfaBypassNamedConst = /(?:if\s*\(.*|\b)(?:code|otp|token|mfaCode|smsCode)\s*===?\s*(?:DEV_UNIVERSAL_CODE|MASTER_OTP|BYPASS_OTP|UNIVERSAL_CODE|DEV_OTP|MFA_BYPASS)/i;
      if (mfaBypassRegex.test(line) || mfaBypassNamedConst.test(line)) {
        addFinding({
          id: 'RULE_AUTH_MFA_UNIVERSAL_BYPASS',
          pilar: 2,
          severity: 'CRITICAL',
          file,
          line: lineNum,
          message: 'Bypass universal de segundo fator (MFA/OTP) com código fixo/estático detectado.',
          evidence: line,
          remediation: 'Remova qualquer código OTP estático. Valide o segundo fator contra HMAC criptográfico (RFC 6238 TOTP) ou token efêmero com expiração no banco.'
        });
      }

      // 1C. RULE_BOLA_IDOR_MISSING_OWNERSHIP_CHECK (HIGH)
      const idorQueryRegex = /(?:prisma\.\w+\.(?:findUnique|findFirst|update|delete)|findOneAndDelete|findByIdAndUpdate|findById)\s*\(\s*\{\s*where:\s*\{\s*id:\s*(?:req\.params\.id|id)\s*\}\s*\}/i;
      const idorSqlRegex = /(?:SELECT|UPDATE|DELETE)\s+FROM\s+\w+\s+WHERE\s+id\s*=\s*(?:\$1|\?|req\.params\.id)/i;
      const idorDbQueryRegex = /db\.query\s*\(\s*['"`](?:SELECT|UPDATE|DELETE)[^'"`]*WHERE\s+id\s*=\s*(?:\$1|\?)[^'"`]*,\s*\[(?:req\.params\.)?id\]/i;
      if (idorQueryRegex.test(line) || idorSqlRegex.test(line) || idorDbQueryRegex.test(line)) {
        const hasOwnershipInLine = /userId|tenantId|ownerId|user\.id|req\.user|isAdmin|ensureOwnership|requireAuth|requireRole/i.test(line);
        const hasOwnershipInFile = /userId|tenantId|ownerId|req\.user\.id|ensureOwnership|isOwner|checkOwnership/i.test(content);
        if (!hasOwnershipInLine && !hasOwnershipInFile) {
          addFinding({
            id: 'RULE_BOLA_IDOR_MISSING_OWNERSHIP_CHECK',
            pilar: 15,
            severity: 'HIGH',
            file,
            line: lineNum,
            message: 'Endpoint/consulta manipula recurso por ID sem validar propriedade do usuário (req.user.id) ou perfil administrativo (BOLA/IDOR).',
            evidence: line,
            remediation: 'Escopar a consulta ao proprietário do recurso: { where: { id: req.params.id, userId: req.user.id } } ou aplicar middleware de validação de propriedade.'
          });
        }
      }

      // 1D. RULE_MASS_ASSIGNMENT_UNSANITIZED_BODY (HIGH)
      const massAssignOrm = /(?:prisma\.\w+\.(?:update|upsert|create)|db\.\w+\.(?:update|create)|(?:User|Account|Profile|Order|Customer|Ticket)\.(?:update|create|findByIdAndUpdate))\s*\(\s*(?:\{[^}]*data:\s*req\.body\b|[^)]*,\s*req\.body\b|\{\s*req\.body\s*\}|req\.body\s*[,)])/i;
      const massAssignExplicit = /data:\s*req\.body\b/i;
      if (massAssignOrm.test(line) || (massAssignExplicit.test(line) && /(?:update|create|upsert)/i.test(line))) {
        const hasWhitelist = /\.pick\(|\.omit\(|\.parse\(req\.body\)|whitelist:\s*true/i.test(content);
        if (!hasWhitelist) {
          addFinding({
            id: 'RULE_MASS_ASSIGNMENT_UNSANITIZED_BODY',
            pilar: 15,
            severity: 'HIGH',
            file,
            line: lineNum,
            message: 'Atualização/inserção em banco consumindo req.body diretamente sem schema Zod de whitelist (.pick(), .omit()) ou DTO explícito (Mass Assignment).',
            evidence: line,
            remediation: 'Desestruture estritamente os campos permitidos ou use Zod com schema de whitelist: const safeData = updateSchema.parse(req.body).'
          });
        }
      }

      // 1E. RULE_AUTH_INFO_DISCLOSURE_IN_ERRORS (MEDIUM)
      const passwordLeakInError = /message\s*:\s*['"`][^'"`]*(?:a senha [eé]|a senha correta|senha é|password is|the password is|senha temporária:)[^'"`]*['"`]/i;
      const emailListLeakInError = /message\s*:\s*['"`][^'"`]*(?:e-mails? válidos?|contas válidas|valid emails?:?|usuários permitidos:?)[^'"`]*['"`]/i;
      const errorStatusWithHint = /(?:status\((?:400|401|404)\)\.(?:json|send)|send\((?:400|401|404))\s*\(\s*\{[^}]*(?:valid_emails|valid_users|password_hint|correct_password)/i;
      if (passwordLeakInError.test(line) || emailListLeakInError.test(line) || errorStatusWithHint.test(line)) {
        addFinding({
          id: 'RULE_AUTH_INFO_DISCLOSURE_IN_ERRORS',
          pilar: 8,
          severity: 'MEDIUM',
          file,
          line: lineNum,
          message: 'Resposta de erro HTTP expõe dicas explícitas de senha ou listas de contas/e-mails válidos para enumeração de usuários.',
          evidence: line,
          remediation: 'Retorne mensagens de erro genéricas e neutras (ex: "Credenciais inválidas") sem revelar senhas ou e-mails corporativos válidos.'
        });
      }

      // =========================================================================
      // 🌐 2. REDE, WEBHOOKS & COMUNICAÇÃO ASSÍNCRONA
      // =========================================================================

      // 2A. RULE_WEBHOOK_MISSING_HMAC_SIGNATURE (HIGH)
      const webhookSecretFallback = /(?:const|let|var)\s+\w*(?:webhook|whSec|webhookSecret|stripeSecret|hubSecret)\w*\s*=\s*process\.env\.\w+\s*\|\|\s*['"][^'"]+['"]/i;
      const webhookHardcodedVerifyToken = /(?:verifyToken|verify_token|hub_verify_token)\s*===?\s*['"][a-zA-Z0-9_\-\.]{3,}['"]/i;
      const isWebhookRouteLine = /(?:\.post|\.use)\s*\(\s*['"]\/(?:api\/)?(?:webhooks?|whatsapp\/webhook|stripe\/webhook|meta\/webhook|mercadopago\/webhook|github\/webhook)['"]/i.test(line);

      if (webhookSecretFallback.test(line) || webhookHardcodedVerifyToken.test(line)) {
        addFinding({
          id: 'RULE_WEBHOOK_MISSING_HMAC_SIGNATURE',
          pilar: 14,
          severity: 'HIGH',
          file,
          line: lineNum,
          message: 'Token de verificação ou secret de webhook com fallback estático hardcoded detectado.',
          evidence: line,
          remediation: 'Exija o segredo de webhook obrigatoriamente através de variável de ambiente (process.env) sem fallback estático em código.'
        });
      } else if (isWebhookRouteLine) {
        const hasHmacVerification = /createHmac|constructEvent|timingSafeEqual|x-hub-signature|stripe-signature|svix|verifyWebhookSignature/i.test(content);
        if (!hasHmacVerification) {
          addFinding({
            id: 'RULE_WEBHOOK_MISSING_HMAC_SIGNATURE',
            pilar: 14,
            severity: 'HIGH',
            file,
            line: lineNum,
            message: 'Rota de webhook externo registrada sem validação de assinatura criptográfica HMAC (ex: x-hub-signature-256 ou stripe-signature).',
            evidence: line,
            remediation: 'Implemente a validação de assinatura HMAC-SHA256 (crypto.createHmac ou SDK oficial) utilizando o raw body da requisição antes de processar eventos.'
          });
        }
      }

      // 2B. RULE_WEBSOCKET_UNAUTHENTICATED_ROOMS (HIGH)
      const socketJoinRoomRegex = /socket\.on\s*\(\s*['"](?:join_ticket|join_room|join_channel|join_chat|join_order|join_private)['"]/i;
      if (socketJoinRoomRegex.test(line)) {
        const hasSocketAuthCheck = /socket\.(?:user|data\.user|handshake\.auth)|verifyToken|jwt\.verify|authenticate/i.test(content);
        if (!hasSocketAuthCheck) {
          addFinding({
            id: 'RULE_WEBSOCKET_UNAUTHENTICATED_ROOMS',
            pilar: 2,
            severity: 'HIGH',
            file,
            line: lineNum,
            message: 'Inscrição em sala WebSocket (Socket.IO join) permitida sem autenticação prévia ou verificação de permissão do usuário.',
            evidence: line,
            remediation: 'Autentique o socket no handshake (io.use(socketAuthMiddleware)) e valide permissão de acesso à sala antes de executar socket.join().'
          });
        }
      }

      const socketPresenceRegex = /socket\.on\s*\(\s*['"](?:presence|status|user_online|join_user)['"]/i;
      if (socketPresenceRegex.test(line)) {
        const sliceAfter = lines.slice(idx, idx + 10).join('\n');
        if (/(?:data|payload|msg)\.user_?id/i.test(sliceAfter) && !/socket\.(?:data\.user|user|handshake)/i.test(sliceAfter)) {
          addFinding({
            id: 'RULE_WEBSOCKET_UNAUTHENTICATED_ROOMS',
            pilar: 2,
            severity: 'HIGH',
            file,
            line: lineNum,
            message: 'Evento de presença/status WebSocket consome userId enviado diretamente pelo cliente sem validação contra o handshake autenticado.',
            evidence: line,
            remediation: 'Utilize exclusivamente a identidade autenticada do socket (socket.data.userId ou socket.user.id) para gerenciar eventos de presença, ignorando identificadores enviados pelo cliente.'
          });
        }
      }

      // 2C. RULE_SSRF_UNVALIDATED_MEDIA_DOWNLOAD (HIGH)
      const ssrfCallRegex = /(?:axios(?:\.get)?|fetch|needle\.get|http\.get|https\.get)\s*\(\s*(?:req\.(?:query|body|params)\.(?:url|target|mediaUrl|downloadUrl|link)|url|mediaUrl|targetUrl|userUrl)\b/i;
      if (ssrfCallRegex.test(line)) {
        const hasSsrfProtection = /(?:127\.0\.0\.1|169\.254|localhost|isPrivateIP|ssrfFilter|validateUrl|isLocalIP|isAllowedDomain|ipRange)/i.test(content);
        if (!hasSsrfProtection) {
          addFinding({
            id: 'RULE_SSRF_UNVALIDATED_MEDIA_DOWNLOAD',
            pilar: 10,
            severity: 'HIGH',
            file,
            line: lineNum,
            message: 'Chamada HTTP de saída consome URL fornecida pelo usuário sem validar ou bloquear faixas de IP locais/internas (SSRF).',
            evidence: line,
            remediation: 'Resolva o DNS e bloqueie conexões para IPs locais ou de metadados da nuvem (localhost, 127.0.0.1, 10.0.0.0/8, 192.168.0.0/16, 169.254.169.254).'
          });
        }
      }

      // =========================================================================
      // 📦 3. CRIPTOGRAFIA, ARQUIVOS & CLIENTES DESKTOP
      // =========================================================================

      // 3A. RULE_TIMING_ATTACK_STRING_COMPARE (MEDIUM)
      const timingAttackRegexA = /(?:signature|expectedSignature|hmac|expectedHmac|secretToken|expectedToken|clientSignature)\s*===?\s*(?:clientSignature|signature|hmac|incomingSig|receivedSignature|token|expectedSignature|expectedHmac)/i;
      const timingAttackRegexB = /(?:clientSignature|receivedSignature|incomingSig|clientSig|sig)\s*===?\s*(?:signature|expectedSignature|hmac|secretToken|expectedHmac)/i;
      if ((timingAttackRegexA.test(line) || timingAttackRegexB.test(line)) && !content.includes('timingSafeEqual')) {
        addFinding({
          id: 'RULE_TIMING_ATTACK_STRING_COMPARE',
          pilar: 6,
          severity: 'MEDIUM',
          file,
          line: lineNum,
          message: 'Comparação de token/secret/assinatura HMAC usando operador simples (=== ou ==) suscetível a ataque de timing.',
          evidence: line,
          remediation: 'Utilize crypto.timingSafeEqual(Buffer.from(sigA), Buffer.from(sigB)) para comparação em tempo constante.'
        });
      }

      // 3B. RULE_STORED_XSS_UNSANITIZED_SVG_UPLOAD (HIGH)
      const svgUploadRegex = /(?:mimetype.*image\/svg\+xml|fileFilter.*\.svg|acceptedFiles.*\.svg|mime.*image\/svg\+xml|['"]image\/svg\+xml['"])/i;
      if (svgUploadRegex.test(line)) {
        const hasSvgSanitizer = /(?:DOMPurify|sanitize|attachment|Content-Disposition)/i.test(content);
        if (!hasSvgSanitizer && /(?:multer|upload|fileFilter|storage|mimetype)/i.test(content)) {
          addFinding({
            id: 'RULE_STORED_XSS_UNSANITIZED_SVG_UPLOAD',
            pilar: 7,
            severity: 'HIGH',
            file,
            line: lineNum,
            message: 'Regra de upload aceita formato SVG (image/svg+xml) sem sanitização contra tags <script> nem imposição de header attachment (Stored XSS).',
            evidence: line,
            remediation: 'Sanitize o conteúdo do SVG com DOMPurify no upload ou force o cabeçalho Content-Disposition: attachment ao servir o arquivo.'
          });
        }
      }

      // 3C. RULE_UNPROTECTED_FILE_DOWNLOAD_ROUTE (HIGH)
      const fileDownloadRouteRegex = /(?:\.get)\s*\(\s*['"]\/(?:api\/)?(?:attachments?|files?|downloads?|uploads?|documents?|anexos?)\/(?::[a-zA-Z0-9_]+|\*)/i;
      if (fileDownloadRouteRegex.test(line)) {
        const authMiddlewares = /(?:verifyToken|authenticate|ensureAuth|requireAuth|isAuth|jwtAuth|checkAuth|protect|authMiddleware|passport\.authenticate)/i;
        if (!authMiddlewares.test(line)) {
          addFinding({
            id: 'RULE_UNPROTECTED_FILE_DOWNLOAD_ROUTE',
            pilar: 7,
            severity: 'HIGH',
            file,
            line: lineNum,
            message: 'Rota de download de arquivos ou anexos registrada sem middleware de autenticação (Download Público Não Autorizado).',
            evidence: line,
            remediation: 'Proteja a rota de download aplicando middleware de autenticação (ex: verifyToken ou requireAuth).'
          });
        }
      }

      // 3D. RULE_JWT_MISSING_ALGORITHM_OPTION (MEDIUM)
      const jwtVerifySimple = /(?:jwt|jsonwebtoken)\.verify\s*\(\s*[^,)]+,\s*[^,)]+\s*\)/i;
      const jwtVerifyNoAlgo = /(?:jwt|jsonwebtoken)\.verify\s*\(\s*[^,]+,\s*[^,]+,\s*\{(?!.*algorithms)[^}]*\}\s*\)/i;
      if ((jwtVerifySimple.test(line) || jwtVerifyNoAlgo.test(line)) && !line.includes('algorithms')) {
        addFinding({
          id: 'RULE_JWT_MISSING_ALGORITHM_OPTION',
          pilar: 5,
          severity: 'MEDIUM',
          file,
          line: lineNum,
          message: 'Chamada jwt.verify() sem especificar explicitamente a lista de algoritmos permitidos ({ algorithms: ["HS256"] }). Risco de confusão de algoritmo.',
          evidence: line,
          remediation: 'Forneça a opção explícita de algoritmos autorizados: jwt.verify(token, secret, { algorithms: ["HS256"] }).'
        });
      }

      // Pilar 5: JWT Fallback
      if (/process\.env\.JWT_SECRET\s*\|\|/.test(line)) {
        addFinding({
          id: 'JWT_SECRET_FALLBACK',
          pilar: 5,
          severity: 'CRITICAL',
          file,
          line: lineNum,
          message: 'Fallback inseguro para JWT_SECRET com valor default estático.',
          evidence: line,
          remediation: 'Falhe imediatamente se process.env.JWT_SECRET não estiver definido. Nunca use secret default.'
        });
      }

      // Pilar 3: CORS com origin '*' e credentials
      if (line.includes("origin: '*'") || line.includes('origin: "*"')) {
        if (content.includes('credentials: true')) {
          addFinding({
            id: 'CORS_WILDCARD_CREDENTIALS',
            pilar: 3,
            severity: 'HIGH',
            file,
            line: lineNum,
            message: 'CORS configurado com origin wildcard (*) permitindo credentials: true (violação de política e RFC).',
            evidence: line,
            remediation: 'Especifique as origens permitidas explicitamente em uma lista branca.'
          });
        }
      }

      // Pilar 6: Senhas com MD5/SHA1
      if (/createHash\(['"](md5|sha1)['"]\)/i.test(line) && /pass|senha/i.test(line)) {
        addFinding({
          id: 'WEAK_PASSWORD_HASH',
          pilar: 6,
          severity: 'CRITICAL',
          file,
          line: lineNum,
          message: 'Uso de algoritmo de hash fraco (MD5/SHA1) para senhas.',
          evidence: line,
          remediation: 'Utilize bcrypt (custo >= 10) ou argon2 com salt automático.'
        });
      }

      // Pilar 9/15: XSS no Frontend
      if (line.includes('dangerouslySetInnerHTML') && !line.includes('DOMPurify')) {
        addFinding({
          id: 'DANGEROUS_HTML_WITHOUT_PURIFY',
          pilar: 15,
          severity: 'HIGH',
          file,
          line: lineNum,
          message: 'Uso de dangerouslySetInnerHTML sem sanitização com DOMPurify (Risco de XSS).',
          evidence: line,
          remediation: 'Sanitize o HTML antes da injeção usando DOMPurify.sanitize().'
        });
      }

      // Pilar 8: Vazamento de erro para o cliente
      if (/res\.(?:send|json)\s*\(\s*(?:err|error)\.(?:stack|message)\s*\)/.test(line)) {
        addFinding({
          id: 'ERROR_STACK_LEAK_IN_RESPONSE',
          pilar: 8,
          severity: 'MEDIUM',
          file,
          line: lineNum,
          message: 'Stack trace ou erro bruto retornado diretamente na resposta HTTP.',
          evidence: line,
          remediation: 'Retorne mensagens amigáveis e genéricas para o usuário; registre o stack trace apenas em logs protegidos.'
        });
      }

      // Pilar 18: Usuário Superadmin do Banco em código
      if (/(?:postgres:\/\/|mysql:\/\/|mongodb:\/\/)(?:root|sa|postgres):/i.test(line)) {
        addFinding({
          id: 'DB_SUPERUSER_CONNECTION',
          pilar: 18,
          severity: 'MEDIUM',
          file,
          line: lineNum,
          message: 'String de conexão faz uso direto de superusuário de banco (root/postgres/sa).',
          evidence: line,
          remediation: 'Configure um usuário de aplicação com princípio do menor privilégio (SELECT, INSERT, UPDATE, DELETE apenas).'
        });
      }

      // Pilar 3: Ausência de Rate Limiting em rotas críticas de autenticação
      if (/(?:\.post|\.put)\s*\(\s*['"]\/(?:api\/)?(?:auth|login|signin|register|reset-password)['"]/i.test(line)) {
        if (!content.includes('rateLimit') && !content.includes('limiter') && !content.includes('throttle')) {
          addFinding({
            id: 'MISSING_RATE_LIMIT_ON_AUTH',
            pilar: 3,
            severity: 'HIGH',
            file,
            line: lineNum,
            message: 'Rota de autenticação sensível sem middleware de limitação de taxa (Rate Limit) detectado.',
            evidence: line,
            remediation: 'Proteja contra ataques de força bruta adicionando middleware de rate-limiting (ex: express-rate-limit).'
          });
        }
      }

      // Pilar 12: Headers de Segurança / Helmet ausentes em servidores HTTP
      if ((line.includes('express()') || line.includes('createServer(')) && !content.includes('helmet') && !content.includes('Content-Security-Policy')) {
        addFinding({
          id: 'MISSING_SECURITY_HEADERS_HELMET',
          pilar: 12,
          severity: 'MEDIUM',
          file,
          line: lineNum,
          message: 'Servidor HTTP inicializado sem Helmet ou headers de segurança essenciais (CSP, HSTS, X-Content-Type-Options).',
          evidence: line,
          remediation: 'Instale e configure helmet(): app.use(helmet()) para aplicar CSP, HSTS e ocultar X-Powered-By.'
        });
      }

    });
  } catch (e) {}
}

// 🚨 [Pilar 12]: Desktop IPC & Content Security Policy (RULE_TAURI_IPC_UNRESTRICTED_CSP)
if (!selectedPilares || selectedPilares.includes(12)) {
  const tauriConfigFiles = allFiles.filter((f) => /tauri\.(?:.+)?conf\.json$/i.test(path.basename(f)));
  for (const tauriFile of tauriConfigFiles) {
    try {
      const rawContent = fs.readFileSync(tauriFile, 'utf-8');
      const tauriJson = JSON.parse(rawContent);

      let cspValue = null;
      if (tauriJson.app && tauriJson.app.security) {
        cspValue = tauriJson.app.security.csp;
      } else if (tauriJson.tauri && tauriJson.tauri.security) {
        cspValue = tauriJson.tauri.security.csp;
      }

      const isCspUnrestricted = cspValue === null || cspValue === '' || /"csp"\s*:\s*null/i.test(rawContent);

      let hasShellAccess = false;
      if (tauriJson.tauri && tauriJson.tauri.allowlist) {
        if (tauriJson.tauri.allowlist.shell || tauriJson.tauri.allowlist.all) {
          hasShellAccess = true;
        }
      }
      if (/shell:default|shell:allow-execute|"open"\s*:\s*true/i.test(rawContent)) {
        hasShellAccess = true;
      }

      const capabilitiesDir = path.join(path.dirname(tauriFile), 'capabilities');
      if (fs.existsSync(capabilitiesDir)) {
        const capFiles = fs.readdirSync(capabilitiesDir).filter((f) => f.endsWith('.json'));
        for (const capFile of capFiles) {
          const capContent = fs.readFileSync(path.join(capabilitiesDir, capFile), 'utf-8');
          if (/shell:default|shell:allow-execute/i.test(capContent)) {
            hasShellAccess = true;
            break;
          }
        }
      }

      if (isCspUnrestricted && hasShellAccess) {
        const lines = rawContent.split('\n');
        const cspLineIdx = lines.findIndex((l) => /"csp"\s*:\s*null/i.test(l));
        addFinding({
          id: 'RULE_TAURI_IPC_UNRESTRICTED_CSP',
          pilar: 12,
          severity: 'HIGH',
          file: tauriFile,
          line: cspLineIdx >= 0 ? cspLineIdx + 1 : 1,
          message: 'Configuração do Tauri combina Content Security Policy nula/irrestrita ("csp": null) com permissões ativas de shell (shell:default ou execute). Risco crítico de Execução Remota de Código (RCE).',
          evidence: cspLineIdx >= 0 ? lines[cspLineIdx].trim() : '"csp": null',
          remediation: 'Defina uma Content Security Policy (CSP) rigorosa no tauri.conf.json e restrinja as permissões de shell exclusivamente para escopos controlados e binários pré-validados.'
        });
      }
    } catch (e) {}
  }
}

// 4. Consolidação do Relatório
const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;
const highCount = findings.filter((f) => f.severity === 'HIGH').length;
const mediumCount = findings.filter((f) => f.severity === 'MEDIUM').length;
const lowCount = findings.filter((f) => f.severity === 'LOW').length;

const isBlocked = criticalCount > 0 || highCount > 0;
const status = isBlocked ? 'BLOQUEADO' : (mediumCount > 0 ? 'AVISOS' : 'APROVADO');

const report = {
  version: '1.0.0',
  timestamp: new Date().toISOString(),
  summary: {
    totalFindings: findings.length,
    critical: criticalCount,
    high: highCount,
    medium: mediumCount,
    low: lowCount,
    status
  },
  findings
};

// 4. Autofix (se ativado via --fix)
if (shouldFix && findings.length > 0) {
  const fixedFiles = new Set();
  findings.forEach((f) => {
    if (!fs.existsSync(f.file)) return;
    try {
      let content = fs.readFileSync(f.file, 'utf-8');
      let changed = false;

      // Fix 1: Reverse Tabnabbing (target="_blank")
      if (content.includes('target="_blank"') && !content.includes('rel="noopener')) {
        content = content.replace(/target="_blank"(?!\s+rel=)/g, 'target="_blank" rel="noopener noreferrer"');
        changed = true;
      }

      // Fix 2: Cookie Security (adiciona httpOnly e secure)
      if (content.includes('res.cookie(') && (!content.includes('httpOnly') || !content.includes('sameSite'))) {
        content = content.replace(/(res\.cookie\([^,]+,[^,]+,\s*\{)([^}]*)(\})/g, (match, p1, p2, p3) => {
          let opts = p2.trim();
          if (!opts.includes('httpOnly')) opts += (opts ? ', ' : '') + 'httpOnly: true';
          if (!opts.includes('sameSite')) opts += (opts ? ', ' : '') + "sameSite: 'strict'";
          if (!opts.includes('secure')) opts += (opts ? ', ' : '') + 'secure: true';
          return `${p1} ${opts} ${p3}`;
        });
        changed = true;
      }

      if (changed) {
        fs.writeFileSync(f.file, content, 'utf-8');
        fixedFiles.add(f.file);
      }
    } catch {}
  });

  if (fixedFiles.size > 0) {
    console.log(`🔧 [AUTO-FIX] ${fixedFiles.size} arquivo(s) corrigidos automaticamente de forma segura.\n`);
  }
}

if (isSarifOutput) {
  const sarif = {
    $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [{
      tool: {
        driver: {
          name: "devsecops-audit",
          version: "1.0.0",
          informationUri: "https://github.com/Henrique-All/skills",
          rules: Array.from(new Set(findings.map((f) => f.id))).map((id) => ({
            id,
            shortDescription: { text: id }
          }))
        }
      },
      results: findings.map((f) => ({
        ruleId: f.id,
        level: f.severity === 'CRITICAL' || f.severity === 'HIGH' ? 'error' : (f.severity === 'MEDIUM' ? 'warning' : 'note'),
        message: { text: `${f.message} -> ${f.remediation}` },
        locations: [{
          physicalLocation: {
            artifactLocation: { uri: f.file },
            region: { startLine: f.line || 1 }
          }
        }]
      }))
    }]
  };
  console.log(JSON.stringify(sarif, null, 2));
  process.exit(isBlocked ? 1 : 0);
}

if (isJsonOutput) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('===============================================================');
  console.log('🛡️  RELATÓRIO DE AUDITORIA DE SEGURANÇA (DEVSECOPS)');
  console.log('===============================================================\n');

  console.log(`📊 Status Geral: ${status === 'APROVADO' ? '✅ APROVADO' : (isBlocked ? '🛑 BLOQUEADO' : '⚠️  AVISOS')}`);
  console.log(`   - 🔴 Crítico: ${criticalCount}`);
  console.log(`   - 🟠 Alto:    ${highCount}`);
  console.log(`   - 🟡 Médio:   ${mediumCount}`);
  console.log(`   - 🟢 Baixo:   ${lowCount}`);
  console.log(`   - 📄 Total:   ${findings.length} achado(s)\n`);

  if (findings.length > 0) {
    console.log('---------------------------------------------------------------');
    console.log('🚨 ACHADOS DETECTADOS:');
    console.log('---------------------------------------------------------------');
    findings.forEach((f, idx) => {
      const badge = f.severity === 'CRITICAL' ? '🔴' : (f.severity === 'HIGH' ? '🟠' : '🟡');
      console.log(`\n[${idx + 1}] ${badge} ${f.severity} — [Pilar ${f.pilar}] ${f.id}`);
      console.log(`    Arquivo: ${f.file}:${f.line}`);
      console.log(`    Problema: ${f.message}`);
      if (f.evidence) console.log(`    Evidência: ${f.evidence}`);
      console.log(`    Remediação: ${f.remediation}`);
    });
  } else {
    console.log('✨ Nenhum achado de segurança detectado! O projeto está em conformidade.');
  }

  console.log('\n===============================================================\n');
}

// Exit code: 1 se houver Crítico/Alto bloqueante, 0 se tudo ok
process.exit(isBlocked ? 1 : 0);
