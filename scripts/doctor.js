#!/usr/bin/env node
/**
 * scripts/doctor.js
 * Diagnóstico de Saúde e Integridade do Ecossistema Enterprise AI Suite
 * Executa checagens determinísticas no ambiente, permissões, ferramentas e subagentes.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');

// Cores ANSI para o terminal
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

const checks = [];
let passCount = 0;
let warnCount = 0;
let failCount = 0;

function report(category, name, status, details = '') {
  checks.push({ category, name, status, details });
  if (status === 'PASS') passCount++;
  else if (status === 'WARN') warnCount++;
  else failCount++;
}

console.log(`\n${colors.cyan}${colors.bold}🩺 ENTERPRISE AI SUITE — DIAGNÓSTICO DO ECOSSISTEMA (DOCTOR)${colors.reset}`);
console.log(`${colors.gray}Verificando runtime, configurações de IA, subagentes e segurança...${colors.reset}\n`);

// 1. Runtime & Ferramental
const nodeVer = process.version;
const major = parseInt(nodeVer.replace('v', '').split('.')[0], 10);
if (major >= 18) {
  report('Runtime', `Node.js (${nodeVer})`, 'PASS', 'Compatível com especificações modernas (Node >= 18)');
} else {
  report('Runtime', `Node.js (${nodeVer})`, 'FAIL', 'Necessário Node.js >= 18.0.0');
}

try {
  const gitVer = execSync('git --version', { encoding: 'utf-8' }).trim();
  report('Runtime', `Git (${gitVer})`, 'PASS', 'Git instalado e disponível no PATH');
} catch (e) {
  report('Runtime', 'Git', 'FAIL', 'Git não encontrado no PATH do sistema');
}

// 2. Integridade dos Manifestos Principais
const pluginJsonPath = path.join(rootDir, 'plugin.json');
if (fs.existsSync(pluginJsonPath)) {
  try {
    const pj = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf-8'));
    if (pj.name === 'enterprise-ai-suite' && pj.version) {
      report('Manifestos', `plugin.json (v${pj.version})`, 'PASS', `Plugin oficial válido: ${pj.displayName}`);
    } else {
      report('Manifestos', 'plugin.json', 'WARN', 'plugin.json incompleto ou com campos ausentes');
    }
  } catch (e) {
    report('Manifestos', 'plugin.json', 'FAIL', `Erro de JSON: ${e.message}`);
  }
} else {
  report('Manifestos', 'plugin.json', 'FAIL', 'plugin.json não encontrado na raiz');
}

const hooksJsonPath = path.join(rootDir, 'hooks.json');
if (fs.existsSync(hooksJsonPath)) {
  try {
    const hj = JSON.parse(fs.readFileSync(hooksJsonPath, 'utf-8'));
    const hasSafety = !!hj['safety-firewall']?.PreToolUse;
    const hasRouter = !!hj['skill-router']?.PreInvocation;
    const hasGate = !!hj['ui-quality-gate']?.Stop;
    if (hasSafety && hasRouter && hasGate) {
      report('Manifestos', 'hooks.json (Governança Ativa)', 'PASS', 'Hooks de PreToolUse (firewall), PreInvocation (router) e Stop (quality gate) configurados');
    } else {
      report('Manifestos', 'hooks.json', 'WARN', 'hooks.json presente mas sem todas as travas declaradas (safety, router, gate)');
    }
  } catch (e) {
    report('Manifestos', 'hooks.json', 'FAIL', `Erro de JSON: ${e.message}`);
  }
} else {
  report('Manifestos', 'hooks.json', 'FAIL', 'hooks.json não encontrado');
}

// 3. Scripts de Lifecycle Hooks (Firewall e Governança no SO)
const preCmdPath = path.join(rootDir, 'scripts', 'hooks', 'pre-command-guard.js');
const routerPath = path.join(rootDir, 'scripts', 'hooks', 'skill-router.js');
const gatePath = path.join(rootDir, 'scripts', 'hooks', 'ui-quality-gate.js');
const utilsPath = path.join(rootDir, 'scripts', 'hooks', 'lib', 'hook-utils.js');
if (fs.existsSync(preCmdPath) && fs.existsSync(routerPath) && fs.existsSync(gatePath) && fs.existsSync(utilsPath)) {
  report('Segurança', 'Scripts de Lifecycle Hooks', 'PASS', 'pre-command-guard.js, skill-router.js, ui-quality-gate.js e hook-utils.js verificados');
} else {
  report('Segurança', 'Scripts de Lifecycle Hooks', 'FAIL', 'Um ou mais scripts de hook estão ausentes');
}

// 4. Subagentes Especialistas (agents/)
const expectedAgents = [
  'cartographer.agent.md',
  'route-guard.agent.md',
  'ui-craftsman.agent.md',
  'falsifier.agent.md',
  'security-auditor.agent.md',
  'db-sentinel.agent.md',
  'test-engineer.agent.md'
];

const agentsDir = path.join(rootDir, 'agents');
if (fs.existsSync(agentsDir)) {
  let missingAgents = [];
  expectedAgents.forEach(ag => {
    if (!fs.existsSync(path.join(agentsDir, ag))) {
      missingAgents.push(ag);
    }
  });

  if (missingAgents.length === 0) {
    report('Subagentes', `Enxame de 7 Subagentes (agents/)`, 'PASS', 'Todos os 7 subagentes especialistas presentes com isolamento');
  } else {
    report('Subagentes', 'Enxame de Subagentes', 'FAIL', `Ausentes: ${missingAgents.join(', ')}`);
  }
} else {
  report('Subagentes', 'Diretório agents/', 'FAIL', 'Pasta agents/ não encontrada');
}

// 5. As 9 Skills do Ecossistema
const expectedSkills = [
  'frontend-craftsman',
  'mobile-converter',
  'hybrid-orchestrator',
  'orch',
  'repo-cartographer',
  'route-guard',
  'security-audit',
  'db-sentinel',
  'test-forge'
];

let skillsOk = 0;
expectedSkills.forEach(sk => {
  const skPath = path.join(rootDir, sk, 'SKILL.md');
  if (fs.existsSync(skPath)) skillsOk++;
});

if (skillsOk === expectedSkills.length) {
  report('Skills', `9 Skills Registradas (${skillsOk}/9)`, 'PASS', 'Todas as 8 skills individuais + comando mestre /orch presentes');
} else {
  report('Skills', `Skills Registradas (${skillsOk}/9)`, 'WARN', 'Alguma skill pode estar ausente ou com SKILL.md faltante');
}

// 6. Configurações dos Agentes de IA
const homeDir = os.homedir();
const localPlugin = path.join(rootDir, '.agents', 'plugins', 'enterprise-ai-suite');
const antigravityGlobalPlugin = path.join(homeDir, '.gemini', 'config', 'plugins', 'enterprise-ai-suite');

if (fs.existsSync(localPlugin)) {
  report('Integrações', 'Plugin no Workspace (.agents)', 'PASS', 'Instalado localmente em .agents/plugins/enterprise-ai-suite');
} else {
  report('Integrações', 'Plugin no Workspace (.agents)', 'WARN', 'Não instalado localmente. Execute: npm run install:plugin');
}

if (fs.existsSync(antigravityGlobalPlugin)) {
  report('Integrações', 'Google Antigravity (Global)', 'PASS', 'Plugin instalado em ~/.gemini/config/plugins/enterprise-ai-suite');
} else {
  report('Integrações', 'Google Antigravity (Global)', 'PASS', 'Workspace local ativo (instalação global opcional via npm run install:plugin:global)');
}

// 7. Auditoria de Segredos Rastreados no Git
try {
  const trackedFiles = execSync('git ls-files', { cwd: rootDir, encoding: 'utf-8' }).split('\n');
  const leakedEnv = trackedFiles.filter(f => f.trim().endsWith('.env') || f.trim().includes('/.env'));
  if (leakedEnv.length === 0) {
    report('DevSecOps', 'Scanner de Arquivos Sensíveis', 'PASS', 'Nenhum arquivo .env rastreado pelo Git');
  } else {
    report('DevSecOps', 'Scanner de Arquivos Sensíveis', 'FAIL', `Arquivos .env rastreados detectados: ${leakedEnv.join(', ')}`);
  }
} catch (e) {
  report('DevSecOps', 'Scanner de Arquivos Sensíveis', 'WARN', 'Não foi possível rodar git ls-files');
}

// 8. Estado da Branch e Git
try {
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: rootDir, encoding: 'utf-8' }).trim();
  const commit = execSync('git rev-parse --short HEAD', { cwd: rootDir, encoding: 'utf-8' }).trim();
  report('Versionamento', `Branch Ativa (${branch}@${commit})`, 'PASS', `Trabalhando na branch ${branch}`);
} catch (e) {
  report('Versionamento', 'Git Branch', 'WARN', 'Não foi possível ler branch ativa');
}

// Exibição dos Resultados Formatados
let currentCategory = '';
checks.forEach(c => {
  if (c.category !== currentCategory) {
    currentCategory = c.category;
    console.log(`\n📁 ${colors.bold}${currentCategory}${colors.reset}`);
  }

  let tag = '';
  if (c.status === 'PASS') tag = `${colors.green}[PASS]${colors.reset}`;
  else if (c.status === 'WARN') tag = `${colors.yellow}[WARN]${colors.reset}`;
  else tag = `${colors.red}[FAIL]${colors.reset}`;

  console.log(`   ${tag} ${colors.bold}${c.name}${colors.reset}`);
  if (c.details) {
    console.log(`          ${colors.gray}${c.details}${colors.reset}`);
  }
});

console.log(`\n---------------------------------------------------------------`);
console.log(`📊 ${colors.bold}RESUMO DO DIAGNÓSTICO:${colors.reset}`);
console.log(`   ✅ Aprovados:  ${colors.green}${passCount}${colors.reset}`);
console.log(`   ⚠️  Alertas:    ${colors.yellow}${warnCount}${colors.reset}`);
console.log(`   ❌ Falhas:     ${colors.red}${failCount}${colors.reset}`);
console.log(`---------------------------------------------------------------`);

if (failCount === 0 && warnCount === 0) {
  console.log(`\n🎉 ${colors.green}${colors.bold}PARABÉNS! SEU ECOSSISTEMA ESTÁ 100% SAUDÁVEL E OPERACIONAL.${colors.reset}\n`);
  process.exit(0);
} else if (failCount === 0) {
  console.log(`\n💡 ${colors.yellow}${colors.bold}SISTEMA OPERACIONAL COM ALGUNS AVISOS LEVES (Veja detalhes acima).${colors.reset}\n`);
  process.exit(0);
} else {
  console.log(`\n❌ ${colors.red}${colors.bold}FORAM ENCONTRADAS FALHAS CRÍTICAS QUE PRECISAM DE ATENÇÃO.${colors.reset}\n`);
  process.exit(1);
}
