#!/usr/bin/env node
/**
 * scripts/install-hook.js - Instalador do Git Pre-Commit Hook DevSecOps
 * Instala um hook determinístico em .git/hooks/pre-commit para bloquear commits
 * com segredos expostos (.env, chaves de API) ou achados críticos de segurança.
 * 
 * Uso:
 *   node scripts/install-hook.js
 */

const fs = require('fs');
const path = require('path');

const gitHooksDir = path.resolve(process.cwd(), '.git', 'hooks');

console.log('===============================================================');
console.log('🛡️  SECURITY AUDIT — INSTALADOR DO GIT PRE-COMMIT HOOK');
console.log('===============================================================\n');

if (!fs.existsSync(gitHooksDir)) {
  console.log('ℹ️  Diretório .git/hooks não encontrado. Tentando localizar raiz do git...');
  // Tenta encontrar .git subindo níveis
  let current = process.cwd();
  let found = false;
  for (let i = 0; i < 4; i++) {
    const checkDir = path.join(current, '.git', 'hooks');
    if (fs.existsSync(checkDir)) {
      installHook(checkDir);
      found = true;
      break;
    }
    current = path.dirname(current);
  }

  if (!found) {
    console.error('❌ Não foi possível encontrar a pasta .git. Certifique-se de estar em um repositório git.');
    process.exit(1);
  }
} else {
  installHook(gitHooksDir);
}

function installHook(targetDir) {
  const hookFile = path.join(targetDir, 'pre-commit');
  const hookScript = `#!/bin/sh
# Git Pre-Commit Hook instalado pelo Security Audit DevSecOps
echo "🔍 Executando Security Audit pré-commit..."
node -e "
const { execSync } = require('child_process');
try {
  execSync('node security-audit/scripts/audit.js', { stdio: 'inherit' });
} catch (err) {
  console.error('\\n🛑 COMMIT BLOQUEADO: Foram encontrados achados críticos de segurança.');
  console.error('Corrija as vulnerabilidades ou use .audit-exceptions.json para exceções justificadas.\\n');
  process.exit(1);
}
"
`;

  try {
    fs.writeFileSync(hookFile, hookScript, { encoding: 'utf-8', mode: 0o755 });
    console.log(`✅ Git Pre-Commit Hook instalado com sucesso em:`);
    console.log(`   ${hookFile}\n`);
    console.log('🛡️  Seus commits agora são protegidos automaticamente contra vazamento de segredos e falhas críticas.');
  } catch (err) {
    console.error(`❌ Falha ao gravar hook: ${err.message}`);
    process.exit(1);
  }
}
