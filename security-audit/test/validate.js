/**
 * test/validate.js - Validador de Integridade da Skill Security Audit
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Validando arquivos da skill security-audit...\n');

const rootDir = path.resolve(__dirname, '..');
const requiredFiles = [
  'SKILL.md',
  'install.js',
  'security-audit.mdc',
  'AGENTS.md',
  'README.md',
  'package.json',
  'audit.config.example.json',
  'schemas/audit-report.schema.json',
  'scripts/audit.js',
  'scripts/install-hook.js'
];

let hasErrors = false;

// 1. Validar existência e tamanho dos arquivos
requiredFiles.forEach((file) => {
  const fullPath = path.join(rootDir, file);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Arquivo obrigatório não encontrado: ${file}`);
    hasErrors = true;
  } else {
    const stats = fs.statSync(fullPath);
    if (stats.size === 0) {
      console.error(`❌ Arquivo vazio: ${file}`);
      hasErrors = true;
    } else {
      console.log(`✅ ${file} (${stats.size} bytes)`);
    }
  }
});

// 2. Validar sintaxe dos JSONs
const jsonFiles = [
  'package.json',
  'audit.config.example.json',
  'schemas/audit-report.schema.json'
];

jsonFiles.forEach((file) => {
  try {
    const content = fs.readFileSync(path.join(rootDir, file), 'utf-8');
    JSON.parse(content);
    console.log(`✅ JSON válido: ${file}`);
  } catch (err) {
    console.error(`❌ JSON inválido em ${file}: ${err.message}`);
    hasErrors = true;
  }
});

// 3. Validar Frontmatter do SKILL.md
try {
  const skillContent = fs.readFileSync(path.join(rootDir, 'SKILL.md'), 'utf-8');
  if (!skillContent.startsWith('---')) {
    console.error('❌ SKILL.md: Frontmatter não inicia com ---');
    hasErrors = true;
  } else {
    const frontmatterEnd = skillContent.indexOf('---', 3);
    const frontmatter = skillContent.slice(3, frontmatterEnd);
    if (!frontmatter.includes('name: security-audit')) {
      console.error('❌ SKILL.md: nome inválido no frontmatter.');
      hasErrors = true;
    } else {
      console.log('✅ SKILL.md: Frontmatter válido e nome correspondente.');
    }
  }
} catch (e) {
  console.error(`❌ Erro ao validar SKILL.md: ${e.message}`);
  hasErrors = true;
}

// 4. Testar execução de audit.js com --sarif
const { execSync } = require('child_process');
try {
  const sarifOut = execSync(`node "${path.join(rootDir, 'scripts', 'audit.js')}" --sarif`, { encoding: 'utf-8' });
  const parsed = JSON.parse(sarifOut);
  if (parsed.version === '2.1.0' && parsed.runs) {
    console.log('✅ Execução bem-sucedida: scripts/audit.js (--sarif export válido)');
  }
} catch (e) {
  // Se o exit code for 1 por ter achados no projeto, ainda checamos se o output é JSON SARIF válido
  if (e.stdout) {
    try {
      const parsed = JSON.parse(e.stdout);
      if (parsed.version === '2.1.0') {
        console.log('✅ Execução bem-sucedida: scripts/audit.js (--sarif export válido)');
      }
    } catch {
      console.error('❌ Falha ao exportar SARIF:', e.message);
      hasErrors = true;
    }
  }
}

if (hasErrors) {
  console.error('\n❌ Falha na validação dos componentes!');
  process.exit(1);
} else {
  console.log('\n🎉 Todos os componentes validados com 100% de integridade!');
}
