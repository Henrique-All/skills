/**
 * test/validate.js - Validador de Integridade da Skill Repo Cartographer (v2.7.0)
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
  'scripts/preview-graph.js'
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

// 4. Testar execução dos scripts
const { execSync } = require('child_process');
const cartographerScript = path.join(rootDir, 'scripts', 'cartographer.js');

try {
  execSync(`node "${path.join(rootDir, 'scripts', 'preview-graph.js')}" --no-open`, { stdio: 'ignore' });
  console.log('✅ Execução bem-sucedida: scripts/preview-graph.js (--no-open)');
} catch (e) {
  console.error('❌ Falha ao rodar preview-graph.js:', e.message);
  hasErrors = true;
}

try {
  execSync(`node "${cartographerScript}" callers "${cartographerScript}"`, { stdio: 'ignore' });
  console.log('✅ Execução bem-sucedida: scripts/cartographer.js (callers)');
} catch (e) {
  console.error('❌ Falha ao rodar cartographer.js callers:', e.message);
  hasErrors = true;
}

try {
  execSync(`node "${cartographerScript}" trace "${cartographerScript}" "${rootDir}"`, { stdio: 'ignore' });
  execSync(`node "${cartographerScript}" tree "${cartographerScript}" "${rootDir}"`, { stdio: 'ignore' });
  console.log('✅ Execução bem-sucedida: scripts/cartographer.js (trace & tree alias)');
} catch (e) {
  console.error('❌ Falha ao rodar cartographer.js trace/tree:', e.message);
  hasErrors = true;
}

try {
  const mermaidOut = execSync(`node "${cartographerScript}" mermaid "${cartographerScript}" "${rootDir}"`, { encoding: 'utf-8' });
  if (!mermaidOut.includes('flowchart TD')) {
    throw new Error('Saída Mermaid não contém flowchart TD');
  }
  console.log('✅ Execução bem-sucedida: scripts/cartographer.js (mermaid)');
} catch (e) {
  console.error('❌ Falha ao rodar cartographer.js mermaid:', e.message);
  hasErrors = true;
}

try {
  execSync(`node "${cartographerScript}" check "${rootDir}"`, { stdio: 'ignore' });
  console.log('✅ Execução bem-sucedida: scripts/cartographer.js (check)');
} catch (e) {
  console.error('❌ Falha ao rodar cartographer.js check:', e.message);
  hasErrors = true;
}

try {
  const queryOut = execSync(`node "${cartographerScript}" query "cartographer" "${rootDir}"`, { encoding: 'utf-8' });
  const indexMdPath = path.join(rootDir, '.code-map', 'INDEX.md');
  if (!queryOut.includes('CARTOGRAPHER QUERY') || !fs.existsSync(indexMdPath)) {
    throw new Error('Falha ao gerar .code-map/INDEX.md ou executar query');
  }
  console.log('✅ Execução bem-sucedida: scripts/cartographer.js (query & .code-map/INDEX.md)');
} catch (e) {
  console.error('❌ Falha ao rodar cartographer.js query / INDEX.md:', e.message);
  hasErrors = true;
}

try {
  const orphansRaw = execSync(`node "${cartographerScript}" orphans "${rootDir}" --json`, { encoding: 'utf-8' });
  const orphansParsed = JSON.parse(orphansRaw);
  if (typeof orphansParsed.orphansCount !== 'number' || !Array.isArray(orphansParsed.orphans)) {
    throw new Error('JSON de orphans inválido');
  }
  console.log('✅ Execução bem-sucedida: scripts/cartographer.js (orphans --json)');
} catch (e) {
  console.error('❌ Falha ao rodar cartographer.js orphans:', e.message);
  hasErrors = true;
}

// v2.7.0: classificação de camadas, mapa parcial visível, caminho real da CLI e cache incremental
try {
  const os = require('os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cart-v27-'));
  fs.mkdirSync(path.join(tmp, 'src', 'components'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'scripts', 'hooks'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'install.js'), "require('./src/util');\n");
  fs.writeFileSync(path.join(tmp, 'scripts', 'hooks', 'post-edit.js'), 'module.exports = {};\n');
  fs.writeFileSync(path.join(tmp, 'src', 'util.ts'), 'export const x = 1;\n');
  fs.writeFileSync(path.join(tmp, 'src', 'components', 'Button.tsx'), "import { x } from '../util';\nexport const B = () => x;\n");
  fs.writeFileSync(path.join(tmp, 'src', 'useCart.ts'), 'export function useCart() { return 1; }\n');

  execSync(`node "${cartographerScript}" init "${tmp}"`, { stdio: 'ignore' });
  const graph1 = JSON.parse(fs.readFileSync(path.join(tmp, '.code-map', 'graph.json'), 'utf-8'));
  const byPath = (p) => graph1.nodes.find((n) => n.path === p) || {};
  const problems = [];
  if (byPath('install.js').layer !== 6) problems.push(`install.js deveria ser L6, veio L${byPath('install.js').layer}`);
  if (byPath('scripts/hooks/post-edit.js').layer !== 6) problems.push('scripts/hooks/*.js deveria ser L6 (não Estado)');
  if (byPath('src/components/Button.tsx').layer !== 1) problems.push('Button.tsx deveria ser L1');
  if (byPath('src/useCart.ts').layer !== 2) problems.push('useCart.ts deveria ser L2 (hook de estado)');
  if (graph1.metadata.truncated !== false) problems.push('projeto pequeno não deveria estar truncado');

  const indexMd = fs.readFileSync(path.join(tmp, '.code-map', 'INDEX.md'), 'utf-8');
  if (indexMd.includes('.agents/plugins/enterprise-ai-suite/skills/repo-cartographer')) problems.push('INDEX.md ainda aponta caminho fixo .agents/plugins');
  if (!indexMd.includes('cartographer.js') || !indexMd.includes('orphans')) problems.push('INDEX.md sem caminho real da CLI / comando orphans');

  // Cache incremental: 2ª execução reaproveita os nós não modificados
  execSync(`node "${cartographerScript}" init "${tmp}"`, { stdio: 'ignore' });
  const graph2 = JSON.parse(fs.readFileSync(path.join(tmp, '.code-map', 'graph.json'), 'utf-8'));
  if (!(graph2.metadata.reusedFromCache >= 4)) problems.push(`cache incremental não reaproveitou nós (${graph2.metadata.reusedFromCache})`);
  if (graph2.edges.length !== graph1.edges.length) problems.push('cache incremental perdeu arestas');

  // Mapa parcial
  execSync(`node "${cartographerScript}" init "${tmp}"`, { stdio: 'ignore', env: { ...process.env, CARTOGRAPHER_MAX_FILES: '2' } });
  const graph3 = JSON.parse(fs.readFileSync(path.join(tmp, '.code-map', 'graph.json'), 'utf-8'));
  const indexTrunc = fs.readFileSync(path.join(tmp, '.code-map', 'INDEX.md'), 'utf-8');
  if (!graph3.metadata.truncated || !indexTrunc.includes('Mapa PARCIAL')) problems.push('truncamento não sinalizado no graph.json/INDEX.md');

  fs.rmSync(tmp, { recursive: true, force: true });
  if (problems.length > 0) {
    problems.forEach((p) => console.error(`❌ ${p}`));
    hasErrors = true;
  } else {
    console.log('✅ v2.7.0: camadas corretas, CLI real no INDEX, cache incremental e aviso de mapa parcial validados');
  }
} catch (e) {
  console.error('❌ Falha nos testes v2.7.0 do cartographer:', e.message);
  hasErrors = true;
}

if (hasErrors) {
  console.error('\n❌ Falha na validação dos componentes!');
  process.exit(1);
} else {
  console.log('\n🎉 Todos os componentes validados com 100% de integridade!');
}
