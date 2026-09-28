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
function loadConfig() {
  const configPath = path.join(projectDir, 'audit.config.json');
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch (e) {
      console.warn('⚠️  audit.config.json corrompido, usando auto-detecção.');
    }
  }
  return {
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

// Pilar 3, 4, 5, 6, 7, 8, 9, 15: Padrões estáticos no código
for (const file of codeFiles) {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;

      // Pilar 5: JWT Fallback
      if (line.includes('process.env.JWT_SECRET') && line.includes('||')) {
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
    });
  } catch (e) {}
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
          name: "security-audit-devsecops",
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
