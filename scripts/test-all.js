#!/usr/bin/env node
/**
 * scripts/test-all.js - Validador Universal do Monorepo (Enterprise AI Suite v2.3.0)
 * Executa testes de integridade das skills, do Plugin oficial, dos Subagentes e dos Hooks.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('===============================================================');
console.log('🧪 MONOREPO CI — VALIDANDO ENTERPRISE AI SUITE v2.3.0');
console.log('   (Skills + Plugin Oficial + Subagentes + Hooks Reativos)');
console.log('===============================================================\n');

const rootDir = path.resolve(__dirname, '..');
let hasFailures = false;

// 1. VALIDAR COMPONENTES DO PLUGIN NATIVO
console.log('📦 [1/3] Validando Manifesto do Plugin e Configurações...');
try {
  // plugin.json
  const pluginJsonPath = path.join(rootDir, 'plugin.json');
  if (!fs.existsSync(pluginJsonPath)) throw new Error('plugin.json não encontrado na raiz!');
  const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf-8'));
  if (!pluginJson.name || !pluginJson.displayName || !pluginJson.version) {
    throw new Error('plugin.json com campos obrigatórios ausentes!');
  }
  console.log(`   ✅ plugin.json válido: ${pluginJson.displayName} (v${pluginJson.version})`);

  // hooks.json
  const hooksJsonPath = path.join(rootDir, 'hooks.json');
  if (!fs.existsSync(hooksJsonPath)) throw new Error('hooks.json não encontrado na raiz!');
  const hooksJson = JSON.parse(fs.readFileSync(hooksJsonPath, 'utf-8'));
  if (!hooksJson['safety-firewall'] || !hooksJson['skill-router'] || !hooksJson['ui-quality-gate']) {
    throw new Error('hooks.json não contém safety-firewall, skill-router ou ui-quality-gate!');
  }
  console.log('   ✅ hooks.json configurado com safety-firewall, skill-router e ui-quality-gate');

  // scripts/hooks/
  const preGuardPath = path.join(rootDir, 'scripts', 'hooks', 'pre-command-guard.js');
  const skillRouterPath = path.join(rootDir, 'scripts', 'hooks', 'skill-router.js');
  const uiQualityPath = path.join(rootDir, 'scripts', 'hooks', 'ui-quality-gate.js');
  const hookUtilsPath = path.join(rootDir, 'scripts', 'hooks', 'lib', 'hook-utils.js');
  if (!fs.existsSync(preGuardPath)) throw new Error('scripts/hooks/pre-command-guard.js não encontrado!');
  if (!fs.existsSync(skillRouterPath)) throw new Error('scripts/hooks/skill-router.js não encontrado!');
  if (!fs.existsSync(uiQualityPath)) throw new Error('scripts/hooks/ui-quality-gate.js não encontrado!');
  if (!fs.existsSync(hookUtilsPath)) throw new Error('scripts/hooks/lib/hook-utils.js não encontrado!');
  console.log('   ✅ Scripts de lifecycle hooks verificados com sucesso');

  // Testar funcionalidade do firewall pre-command-guard.js
  const testDeny = execSync(
    `node "${preGuardPath}"`,
    { input: JSON.stringify({ toolCall: { name: 'run_command', args: { CommandLine: 'DROP TABLE users;' } } }), encoding: 'utf-8' }
  );
  const testDenyJson = JSON.parse(testDeny);
  if (testDenyJson.decision !== 'deny') throw new Error('Firewall falhou ao bloquear "DROP TABLE"!');

  const testDenyForce = execSync(
    `node "${preGuardPath}"`,
    { input: JSON.stringify({ toolCall: { name: 'run_command', args: { CommandLine: 'git push origin main --force' } } }), encoding: 'utf-8' }
  );
  if (JSON.parse(testDenyForce).decision !== 'deny') throw new Error('Firewall falhou ao bloquear "git push --force"!');

  const testAllow = execSync(
    `node "${preGuardPath}"`,
    { input: JSON.stringify({ toolCall: { name: 'run_command', args: { CommandLine: 'npm test' } } }), encoding: 'utf-8' }
  );
  const testAllowJson = JSON.parse(testAllow);
  if (testAllowJson.decision !== 'allow') throw new Error('Firewall bloqueou incorretamente "npm test"!');
  console.log('   ✅ Firewall de segurança testado: Bloqueio estrito de DROP TABLE, git push --force & aprovação de npm test');

  // Executar suíte de testes unitários dos hooks
  const testHooksPath = path.join(rootDir, 'scripts', 'test-hooks.js');
  if (fs.existsSync(testHooksPath)) {
    execSync(`node "${testHooksPath}"`, { stdio: 'pipe' });
    console.log('   ✅ Suíte de testes de hooks (test-hooks.js) passou em todos os cenários');
  }

  // Validar paridade dos utilitários compartilhados entre frontend-craftsman e mobile-converter
  const craftBlocks = fs.readFileSync(path.join(rootDir, 'frontend-craftsman', 'scripts', 'lib', 'style-blocks.js'), 'utf-8');
  const mobileBlocks = fs.readFileSync(path.join(rootDir, 'mobile-converter', 'scripts', 'lib', 'style-blocks.js'), 'utf-8');
  if (craftBlocks !== mobileBlocks) {
    throw new Error('scripts/lib/style-blocks.js difere entre frontend-craftsman e mobile-converter!');
  }
  const craftVisual = fs.readFileSync(path.join(rootDir, 'frontend-craftsman', 'scripts', 'visual-check.js'), 'utf-8');
  const mobileVisual = fs.readFileSync(path.join(rootDir, 'mobile-converter', 'scripts', 'visual-check.js'), 'utf-8');
  if (craftVisual !== mobileVisual) {
    throw new Error('scripts/visual-check.js difere entre frontend-craftsman e mobile-converter!');
  }
  console.log('   ✅ Paridade de código verificada: style-blocks.js e visual-check.js idênticos');

} catch (err) {
  console.error(`   ❌ Falha na validação do Plugin: ${err.message}`);
  hasFailures = true;
}

// 2. VALIDAR SUBAGENTES DEDICADOS
console.log('\n🤖 [2/3] Validando Subagentes Especialistas (agents/)...');
const expectedSubagents = [
  'cartographer.agent.md',
  'route-guard.agent.md',
  'ui-craftsman.agent.md',
  'falsifier.agent.md',
  'security-auditor.agent.md',
  'db-sentinel.agent.md',
  'test-engineer.agent.md'
];

for (const agentFile of expectedSubagents) {
  const agentPath = path.join(rootDir, 'agents', agentFile);
  if (!fs.existsSync(agentPath)) {
    console.error(`   ❌ Subagente ausente: ${agentFile}`);
    hasFailures = true;
  } else {
    const content = fs.readFileSync(agentPath, 'utf-8');
    if (!content.startsWith('---') || !content.includes('name:')) {
      console.error(`   ❌ Subagente ${agentFile} com frontmatter YAML inválido!`);
      hasFailures = true;
    } else {
      console.log(`   ✅ Subagente [${agentFile}] verificado`);
    }
  }
}

// 3. VALIDAR SKILLS INDIVIDUAIS
console.log('\n📚 [3/3] Validando Testes Unitários de Cada Skill...');
const entries = fs.readdirSync(rootDir, { withFileTypes: true });
const skillDirs = entries
  .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'scripts' && e.name !== 'agents' && e.name !== 'rules')
  .filter((e) => fs.existsSync(path.join(rootDir, e.name, 'SKILL.md')))
  .map((e) => e.name);

console.log(`🔍 Skills detectadas (${skillDirs.length}): ${skillDirs.join(', ')}\n`);

for (const skillName of skillDirs) {
  const skillPath = path.join(rootDir, skillName);
  console.log(`▶️  Testando skill: [${skillName}]...`);
  
  try {
    execSync('npm test', { cwd: skillPath, stdio: 'inherit' });
    console.log(`✅ [${skillName}] aprovado!\n`);
  } catch (err) {
    console.error(`❌ [${skillName}] falhou nos testes!\n`);
    hasFailures = true;
  }
}

if (hasFailures) {
  console.error('💥 Erros encontrados no pipeline de validação do monorepo.');
  process.exit(1);
} else {
  console.log('===============================================================');
  console.log('🎉 100% DOS COMPONENTES (PLUGIN + SUBAGENTES + SKILLS) APROVADOS!');
  console.log('===============================================================\n');
}
