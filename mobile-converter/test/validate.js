/**
 * test/validate.js - Validador de Integridade da Skill Mobile Converter
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧪 Validando arquivos da skill mobile-converter...\n');

const rootDir = path.resolve(__dirname, '..');
const requiredFiles = [
  'SKILL.md',
  'install.js',
  'mobile-converter.mdc',
  'AGENTS.md',
  'README.md',
  'package.json',
  'scripts/mobile-audit.js',
  'scripts/adapt-screen.js',
  'templates/BottomSheet.tsx',
  'templates/MobileBottomNav.tsx',
  'templates/ResponsiveTableToCards.tsx'
];

let hasErrors = false;

// 1. Validar existência e integridade dos arquivos
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

// 2. Validar sintaxe do package.json
try {
  const content = fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8');
  JSON.parse(content);
  console.log('✅ JSON válido: package.json');
} catch (err) {
  console.error(`❌ JSON inválido em package.json: ${err.message}`);
  hasErrors = true;
}

// 3. Validar Frontmatter do SKILL.md
try {
  const skillMd = fs.readFileSync(path.join(rootDir, 'SKILL.md'), 'utf-8');
  if (!skillMd.startsWith('---')) {
    console.error('❌ SKILL.md deve iniciar com frontmatter YAML (---)');
    hasErrors = true;
  } else {
    const parts = skillMd.split('---');
    if (parts.length < 3) {
      console.error('❌ Frontmatter YAML mal formatado em SKILL.md');
      hasErrors = true;
    } else {
      const frontmatter = parts[1];
      if (!frontmatter.includes('name: mobile-converter')) {
        console.error('❌ Frontmatter deve conter name: mobile-converter');
        hasErrors = true;
      } else {
        console.log('✅ Frontmatter YAML válido em SKILL.md');
      }
    }
  }
} catch (err) {
  console.error(`❌ Erro ao ler SKILL.md: ${err.message}`);
  hasErrors = true;
}

// 4. Executar scripts/mobile-audit.js nos templates
try {
  const templatesDir = path.join(rootDir, 'templates');
  const auditOutput = execSync(`node "${path.join(rootDir, 'scripts', 'mobile-audit.js')}" "${templatesDir}"`, {
    encoding: 'utf-8'
  });
  console.log('✅ Execução bem-sucedida: scripts/mobile-audit.js');

  if (auditOutput.includes('PONTUAÇÃO FINAL DE READINESS MOBILE: 100/100')) {
    console.log('✅ Auditoria nos templates passou com louvor! Score: 100/100');
  } else {
    console.log('ℹ️  Auditoria executada com avisos.');
  }
} catch (err) {
  console.error(`❌ Erro ao executar scripts/mobile-audit.js: ${err.message}`);
  hasErrors = true;
}

// 5. Executar scripts/adapt-screen.js em um template
try {
  const testFile = path.join(rootDir, 'templates', 'ResponsiveTableToCards.tsx');
  execSync(`node "${path.join(rootDir, 'scripts', 'adapt-screen.js')}" "${testFile}"`, {
    encoding: 'utf-8'
  });
  console.log('✅ Execução bem-sucedida: scripts/adapt-screen.js');
} catch (err) {
  console.error(`❌ Erro ao executar scripts/adapt-screen.js: ${err.message}`);
  hasErrors = true;
}

if (hasErrors) {
  console.error('\n💥 Validação da skill mobile-converter falhou!');
  process.exit(1);
} else {
  console.log('\n🎉 Skill mobile-converter 100% validada com sucesso!');
}
