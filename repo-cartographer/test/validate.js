/**
 * test/validate.js - Validador de Integridade da Skill Repo Cartographer
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Validando arquivos da skill repo-cartographer...\n');

const rootDir = path.resolve(__dirname, '..');
const requiredFiles = [
  'SKILL.md',
  'install.js',
  'repo-cartographer.mdc',
  'AGENTS.md',
  'README.md',
  'package.json',
  'schemas/graph.schema.json',
  'schemas/handshake.schema.json',
  'templates/graph.template.json',
  'scripts/cartographer.js',
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
  'schemas/graph.schema.json',
  'schemas/handshake.schema.json',
  'templates/graph.template.json',
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
    if (!frontmatter.includes('name: repo-cartographer')) {
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

if (hasErrors) {
  console.error('\n❌ Falha na validação dos componentes!');
  process.exit(1);
} else {
  console.log('\n🎉 Todos os componentes validados com 100% de integridade!');
}
