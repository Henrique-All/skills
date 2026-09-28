/**
 * test/validate.js - Validador de Integridade da Skill Frontend Craftsman
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧪 Validando arquivos da skill frontend-craftsman...\n');

const rootDir = path.resolve(__dirname, '..');
const requiredFiles = [
  'SKILL.md',
  'install.js',
  'frontend-craftsman.mdc',
  'AGENTS.md',
  'README.md',
  'package.json',
  'scripts/craft-audit.js',
  'scripts/craft-palette.js',
  'scripts/generate-spec.js',
  'scripts/preview-spec.js',
  'templates/AnimatedTabs.tsx',
  'templates/SpotlightCard.tsx',
  'templates/MagneticButton.tsx',
  'templates/SmoothAccordion.tsx',
  'templates/ContentSkeleton.tsx'
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
  const skillContent = fs.readFileSync(path.join(rootDir, 'SKILL.md'), 'utf-8');
  if (!skillContent.startsWith('---')) {
    console.error('❌ SKILL.md não inicia com frontmatter YAML (---)');
    hasErrors = true;
  } else {
    const endMatch = skillContent.indexOf('---', 3);
    if (endMatch === -1) {
      console.error('❌ SKILL.md não fecha frontmatter YAML (---)');
      hasErrors = true;
    } else {
      const frontmatter = skillContent.slice(3, endMatch);
      if (!frontmatter.includes('name: frontend-craftsman')) {
        console.error('❌ SKILL.md não define name: frontend-craftsman');
        hasErrors = true;
      }
      if (!frontmatter.includes('description:')) {
        console.error('❌ SKILL.md não define description');
        hasErrors = true;
      }
      console.log('✅ Frontmatter YAML válido em SKILL.md');
    }
  }
} catch (err) {
  console.error(`❌ Erro ao validar SKILL.md: ${err.message}`);
  hasErrors = true;
}

// 4. Testar execução de craft-palette.js
try {
  const paletteOutput = execSync('node scripts/craft-palette.js linear-dark', { cwd: rootDir, encoding: 'utf-8' });
  if (paletteOutput.includes('PALETA CRAFTSMAN: Linear Dark')) {
    console.log('✅ Execução bem-sucedida: scripts/craft-palette.js');
  } else {
    console.error('❌ Saída inesperada em craft-palette.js');
    hasErrors = true;
  }
} catch (err) {
  console.error(`❌ Erro ao executar craft-palette.js: ${err.message}`);
  hasErrors = true;
}

// 5. Testar execução de generate-spec.js
try {
  const tempSpec = path.join(rootDir, 'test-spec-temp.md');
  execSync(`node scripts/generate-spec.js "Tela de Teste" --preset=linear-dark --output=test-spec-temp.md`, { cwd: rootDir, encoding: 'utf-8' });
  if (fs.existsSync(tempSpec)) {
    const specContent = fs.readFileSync(tempSpec, 'utf-8');
    if (specContent.includes('Especificação de Design — Tela de Teste') && specContent.includes('Linear Dark')) {
      console.log('✅ Execução bem-sucedida: scripts/generate-spec.js');
    } else {
      console.error('❌ Conteúdo inesperado em generate-spec.js');
      hasErrors = true;
    }
    fs.unlinkSync(tempSpec);
  } else {
    console.error('❌ Arquivo de especificação temporário não foi gerado');
    hasErrors = true;
  }
} catch (err) {
  console.error(`❌ Erro ao executar generate-spec.js: ${err.message}`);
  hasErrors = true;
}

// 6. Testar execução de craft-palette.js com Tailwind v4 e preset Light
try {
  const v4Output = execSync('node scripts/craft-palette.js stripe-clean-light --format=tailwind-v4', { cwd: rootDir, encoding: 'utf-8' });
  if (v4Output.includes('@theme') && v4Output.includes('Stripe Clean Light')) {
    console.log('✅ Execução bem-sucedida: Tailwind v4 (@theme) & Stripe Light');
  } else {
    console.error('❌ Falha ao gerar saída Tailwind v4');
    hasErrors = true;
  }
} catch (err) {
  console.error(`❌ Erro ao testar Tailwind v4: ${err.message}`);
  hasErrors = true;
}

// 7. Testar execução de preview-spec.js
try {
  const previewOutput = execSync('node scripts/preview-spec.js --preset=stripe-clean-light --no-open', { cwd: rootDir, encoding: 'utf-8' });
  const previewPath = path.join(rootDir, '.craft', 'preview.html');
  if (fs.existsSync(previewPath) && previewOutput.includes('PREVIEW VISUAL INSTANTÂNEO')) {
    console.log('✅ Execução bem-sucedida: scripts/preview-spec.js');
  } else {
    console.error('❌ Falha ao gerar preview.html');
    hasErrors = true;
  }
} catch (err) {
  console.error(`❌ Erro ao executar preview-spec.js: ${err.message}`);
  hasErrors = true;
}

// 8. Testar execução de craft-audit.js nos próprios templates (deve passar com louvor)
try {
  const auditOutput = execSync('node scripts/craft-audit.js templates/ --json', { cwd: rootDir, encoding: 'utf-8' });
  const parsed = JSON.parse(auditOutput);
  if (parsed.passed && parsed.score >= 85) {
    console.log(`✅ Auditoria nos templates passou com louvor! Score: ${parsed.score}/100`);
  } else {
    console.error(`❌ Templates receberam score insuficiente: ${parsed.score}/100`);
    hasErrors = true;
  }
} catch (err) {
  console.error(`❌ Erro ao executar craft-audit.js: ${err.message}`);
  hasErrors = true;
}

if (hasErrors) {
  console.error('\n💥 Falha na validação da skill frontend-craftsman.');
  process.exit(1);
} else {
  console.log('\n🎉 Skill frontend-craftsman 100% validada com sucesso!\n');
  process.exit(0);
}
