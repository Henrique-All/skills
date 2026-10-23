#!/usr/bin/env node
/**
 * scripts/orch-pipeline.js
 * Pipeline de Execução Unificada do Enterprise AI Suite (v2.7.0)
 * 
 * Executa determinística e compulsoriamente auditorias locais (Node.js na CPU):
 * - S1: Cartografia 360° (AST & Nós) — SEMPRE OBRIGATÓRIA (Fundação)
 * - Flags Diretas Opcionais:
 *   --front / --ui       -> Roda S1 + S3 (UI Craftsman) + S4 (Mobile Converter)
 *   --mobile             -> Roda S1 + S4 (Mobile Converter)
 *   --db / --database    -> Roda S1 + S5 (DB Sentinel) + S6 (Falsifier Concorrência)
 *   --sec / --security   -> Roda S1 + S2 (DevSecOps 18 Pilares OWASP)
 *   --api / --routes     -> Roda S1 + S2 (Segurança) + S6 (Falsifier Concorrência)
 *   --test               -> Roda S1 + Test Forge (Test Audit)
 *   (Sem flags)          -> Roda TODAS as 6 skills completas (Governança Total)
 * 
 * Uso:
 *   node scripts/orch-pipeline.js [projectDir] "[demanda]" [--front|--db|--sec|--mobile|--test]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const args = process.argv.slice(2);

// Flags de escopo direto
const hasFront = args.includes('--front') || args.includes('--ui');
const hasMobile = args.includes('--mobile');
const hasDb = args.includes('--db') || args.includes('--database');
const hasSec = args.includes('--sec') || args.includes('--security');
const hasApi = args.includes('--api') || args.includes('--routes');
const hasTest = args.includes('--test');

const isTargeted = hasFront || hasMobile || hasDb || hasSec || hasApi || hasTest;

// v2.7.0: flags repassadas a todos os auditores (modo incremental, baseline e consulta OSV online)
const passThroughFlags = args
  .filter((a) => a === '--changed' || a === '--online' || a === '--update-baseline' || a === '--baseline' || a.startsWith('--baseline='))
  .map((a) => ' ' + a)
  .join('');

function isExistingDir(candidate) {
  try {
    return Boolean(candidate) && fs.existsSync(candidate) && fs.statSync(candidate).isDirectory();
  } catch {
    return false;
  }
}

// Procura o script da skill nos dois layouts suportados:
//  - monorepo:          <raiz>/<skill>/scripts/<arquivo>
//  - plugin instalado:  <raiz>/skills/<skill>/scripts/<arquivo>
function resolveSkillScript(skill, ...parts) {
  const candidates = [
    path.join(rootDir, skill, ...parts),
    path.join(rootDir, 'skills', skill, ...parts)
  ];
  return candidates.find((c) => fs.existsSync(c)) || null;
}

const NOT_RUN = 'NÃO EXECUTADO';

/** Marca a etapa como não executada (script da skill ausente nesta instalação). */
function markNotRun(stepResult, skill, file) {
  stepResult.status = NOT_RUN;
  console.log(`❌ ${NOT_RUN} (Script não encontrado: ${skill}/scripts/${file})`);
}

const targetArg = args.find((a) => !a.startsWith('--') && isExistingDir(a));
const projectDir = targetArg ? path.resolve(targetArg) : process.cwd();
const demand = args.filter((a) => a !== targetArg && !a.startsWith('--')).join(' ') || 'Orquestração e Desenvolvimento do Projeto';

console.log('===============================================================');
console.log('⚡ ENTERPRISE AI SUITE — PIPELINE DE VALIDAÇÃO UNIFICADA (v2.7.0)');
console.log('===============================================================');
console.log(`📁 Projeto Alvo: ${projectDir}`);
console.log(`🎯 Demanda: "${demand}"`);
if (isTargeted) {
  const activeFlags = [
    hasFront && '--front (UI/Molas)',
    hasMobile && '--mobile (Ergonomia)',
    hasDb && '--db (Banco/Índices)',
    hasSec && '--sec (OWASP/RBAC)',
    hasApi && '--api (Contratos/Concorrência)',
    hasTest && '--test (Testes Reais)'
  ].filter(Boolean).join(', ');
  console.log(`🎯 Modo Filtrado via Flag: ${activeFlags}`);
} else {
  console.log('🎯 Modo Completo: Todas as disciplinas serão executadas compulsoriamente.');
}
console.log('');

// exitCode: código de saída do auditor de cada etapa (> 0 = o auditor bloqueou pela própria regra)
const results = {
  cartography: { status: 'OK', layers: 6, nodes: 0, edges: 0, cycles: 0, exitCode: 0 },
  security: { status: isTargeted && !hasSec && !hasApi ? 'IGNORADO' : 'PENDENTE', findings: 0, critical: 0, high: 0, exitCode: 0 },
  uiCraft: { status: isTargeted && !hasFront ? 'IGNORADO' : 'PENDENTE', score: 100, issues: 0, exitCode: 0 },
  mobile: { status: isTargeted && !hasMobile && !hasFront ? 'IGNORADO' : 'PENDENTE', score: 100, issues: 0, exitCode: 0 },
  database: { status: isTargeted && !hasDb ? 'IGNORADO' : 'PENDENTE', score: 100, issues: 0, missingIndexes: 0, exitCode: 0 },
  falsifier: { status: isTargeted && !hasDb && !hasApi ? 'IGNORADO' : 'PENDENTE', vectorsFailed: 0, exitCode: 0 },
  testForge: { status: isTargeted && !hasTest ? 'IGNORADO' : 'PENDENTE', score: 100, issues: 0, exitCode: 0 }
};

const collectedFindings = [];

function pushFindings(sourceLabel, items = []) {
  for (const item of items) {
    collectedFindings.push({
      source: sourceLabel,
      severity: (item.severity || 'MEDIUM').toUpperCase(),
      rule: item.rule || item.id || 'RULE',
      file: item.file || '-',
      line: item.line || 1,
      message: item.message || ''
    });
  }
}

// 1. CARTOGRAFIA 360° (SEMPRE OBRIGATÓRIA - FUNDAÇÃO ARQUITETURAL)
process.stdout.write('🗺️  [1/7] Executando Cartografia 360° & AST (Fundação)... ');
const cartScript = resolveSkillScript('repo-cartographer', 'scripts', 'cartographer.js');
if (!cartScript) {
  // Sem o cartógrafo, um graph.json antigo não é apresentado como resultado desta execução
  markNotRun(results.cartography, 'repo-cartographer', 'cartographer.js');
} else {
  try {
    execSync(`node "${cartScript}" init "${projectDir}"`, { cwd: projectDir, stdio: 'pipe' });
    const graphPath = path.join(projectDir, '.code-map', 'graph.json');
    if (fs.existsSync(graphPath)) {
      const graphData = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
      results.cartography.nodes = (graphData.nodes || []).length;
      results.cartography.edges = (graphData.edges || []).length;
      results.cartography.cycles = graphData.metadata?.cyclesFound || 0;
    }
    results.cartography.status = results.cartography.cycles > 0 ? 'CICLOS DETECTADOS' : 'CONCLUÍDO';
    console.log(`✅ OK (${results.cartography.nodes} nós, ${results.cartography.edges} conexões, ${results.cartography.cycles} ciclos)`);
  } catch (e) {
    results.cartography.status = 'ALERTA';
    console.log('⚠️ Alerta');
  }
}

// 2. SEGURANÇA (DEVSECOPS AUDIT)
function parseSecurityOutput(raw) {
  const data = JSON.parse(raw);
  results.security.findings = data.summary?.totalFindings ?? 0;
  results.security.critical = data.summary?.critical ?? 0;
  results.security.high = data.summary?.high ?? 0;
  results.security.status = results.security.critical > 0 ? 'CRÍTICO' : results.security.high > 0 ? 'ALTO' : 'OK';
  pushFindings('🔒 DevSecOps', data.findings || []);
}

if (!isTargeted || hasSec || hasApi) {
  process.stdout.write('🔒 [2/7] Executando Auditoria DevSecOps (18 Pilares OWASP)... ');
  const secScript = resolveSkillScript('devsecops-audit', 'scripts', 'audit.js');
  if (!secScript) {
    markNotRun(results.security, 'devsecops-audit', 'audit.js');
  } else {
    try {
      const raw = execSync(`node "${secScript}" "${projectDir}" --json${passThroughFlags}`, { cwd: projectDir, stdio: 'pipe' }).toString();
      parseSecurityOutput(raw);
      results.security.exitCode = 0;
      console.log(`✅ ${results.security.findings} apontamentos (${results.security.critical} críticos)`);
    } catch (e) {
      try {
        const raw = e.stdout ? e.stdout.toString() : '';
        parseSecurityOutput(raw);
        results.security.exitCode = e.status ?? 1;
        console.log(`⚠️ ${results.security.findings} apontamentos (${results.security.critical} críticos, ${results.security.high} altos)`);
      } catch {
        results.security.status = 'FALHA';
        console.log('❌ Falha na execução do devsecops-audit');
      }
    }
  }
} else {
  console.log('🔒 [2/7] Auditoria DevSecOps... ⏭️  Ignorada (flag direcionada ativa)');
}

// 3. UI CRAFTSMAN (CRAFT AUDIT)
if (!isTargeted || hasFront) {
  process.stdout.write('🎨 [3/7] Executando Auditoria de Design Engineering (Anti-Slop)... ');
  const craftScript = resolveSkillScript('frontend-craftsman', 'scripts', 'craft-audit.js');
  if (!craftScript) {
    markNotRun(results.uiCraft, 'frontend-craftsman', 'craft-audit.js');
  } else {
    try {
      const raw = execSync(`node "${craftScript}" "${projectDir}" --json${passThroughFlags}`, { cwd: projectDir, stdio: 'pipe' }).toString();
      const data = JSON.parse(raw);
      results.uiCraft.score = data.score ?? 100;
      results.uiCraft.issues = (data.findings || []).length;
      results.uiCraft.status = data.passed ? 'APROVADO' : 'ALERTA';
      results.uiCraft.exitCode = 0;
      pushFindings('🎨 UI Craft', data.findings || []);
      console.log(`✅ Score: ${results.uiCraft.score}/100 (${results.uiCraft.issues} apontamentos)`);
    } catch (e) {
      try {
        const raw = e.stdout ? e.stdout.toString() : '';
        const data = JSON.parse(raw);
        results.uiCraft.score = data.score ?? 0;
        results.uiCraft.issues = (data.findings || []).length;
        results.uiCraft.status = results.uiCraft.score >= 85 ? 'ATENÇÃO' : 'CRÍTICO';
        results.uiCraft.exitCode = e.status ?? 1;
        pushFindings('🎨 UI Craft', data.findings || []);
        console.log(`⚠️ Score: ${results.uiCraft.score}/100 (${results.uiCraft.issues} apontamentos)`);
      } catch {
        results.uiCraft.score = 0;
        results.uiCraft.status = 'FALHA';
        console.log('❌ Falha na execução do craft-audit');
      }
    }
  }
} else {
  console.log('🎨 [3/7] Design Engineering... ⏭️  Ignorada (flag direcionada ativa)');
}

// 4. MOBILE CONVERTER (MOBILE AUDIT)
if (!isTargeted || hasMobile || hasFront) {
  process.stdout.write('📱 [4/7] Executando Auditoria de Ergonomia Mobile (44px+, dvh)... ');
  const mobScript = resolveSkillScript('mobile-converter', 'scripts', 'mobile-audit.js');
  if (!mobScript) {
    markNotRun(results.mobile, 'mobile-converter', 'mobile-audit.js');
  } else {
    try {
      const raw = execSync(`node "${mobScript}" "${projectDir}" --json${passThroughFlags}`, { cwd: projectDir, stdio: 'pipe' }).toString();
      const data = JSON.parse(raw);
      results.mobile.score = data.score ?? 100;
      results.mobile.issues = (data.findings || []).length;
      results.mobile.status = data.passed ? 'APROVADO' : 'ATENÇÃO';
      results.mobile.exitCode = 0;
      pushFindings('📱 Mobile', data.findings || []);
      console.log(`✅ Score: ${results.mobile.score}/100 (${results.mobile.issues} apontamentos)`);
    } catch (e) {
      try {
        const raw = e.stdout ? e.stdout.toString() : '';
        const data = JSON.parse(raw);
        results.mobile.score = data.score ?? 0;
        results.mobile.issues = (data.findings || []).length;
        results.mobile.status = results.mobile.score >= 85 ? 'ATENÇÃO' : 'CRÍTICO';
        results.mobile.exitCode = e.status ?? 1;
        pushFindings('📱 Mobile', data.findings || []);
        console.log(`⚠️ Score: ${results.mobile.score}/100 (${results.mobile.issues} apontamentos)`);
      } catch {
        results.mobile.score = 0;
        results.mobile.status = 'FALHA';
        console.log('❌ Falha na execução do mobile-audit');
      }
    }
  }
} else {
  console.log('📱 [4/7] Ergonomia Mobile... ⏭️  Ignorada (flag direcionada ativa)');
}

// 5. BANCO DE DADOS (DB SENTINEL)
function parseDbOutput(raw) {
  const data = JSON.parse(raw);
  if (data.error) {
    results.database.status = 'SEM SCHEMA';
    results.database.score = 100;
    return;
  }
  results.database.score = data.score ?? 100;
  results.database.issues = (data.findings || []).length;
  results.database.missingIndexes = (data.findings || []).filter((f) => f.rule === 'MISSING_FOREIGN_KEY_INDEX').length;
  const hasCritical = (data.findings || []).some((f) => f.severity === 'CRITICAL');
  results.database.status = hasCritical ? 'CRÍTICO' : results.database.missingIndexes > 0 ? 'FALTA ÍNDICE' : results.database.issues > 0 ? 'ALERTA' : 'OK';
  pushFindings('🗄️ DB Sentinel', data.findings || []);
}

if (!isTargeted || hasDb) {
  process.stdout.write('🗄️  [5/7] Executando Auditoria de Banco de Dados & Índices... ');
  const dbScript = resolveSkillScript('db-sentinel', 'scripts', 'db-audit.js');
  if (!dbScript) {
    markNotRun(results.database, 'db-sentinel', 'db-audit.js');
  } else {
    try {
      const out = execSync(`node "${dbScript}" "${projectDir}" --json${passThroughFlags}`, { cwd: projectDir, stdio: 'pipe' }).toString();
      parseDbOutput(out);
      results.database.exitCode = 0;
      console.log(`✅ Score: ${results.database.score}/100 (${results.database.missingIndexes} FKs sem índice)`);
    } catch (e) {
      try {
        const raw = e.stdout ? e.stdout.toString() : '';
        parseDbOutput(raw);
        results.database.exitCode = e.status ?? 1;
        console.log(`⚠️ Score: ${results.database.score}/100 (${results.database.issues} apontamentos, ${results.database.missingIndexes} FKs sem índice)`);
      } catch {
        results.database.status = 'FALHA';
        console.log('❌ Falha na execução do db-audit');
      }
    }
  }
} else {
  console.log('🗄️  [5/7] Banco de Dados & Índices... ⏭️  Ignorada (flag direcionada ativa)');
}

// 6. ADVERSARY FALSIFIER (8 VETORES)
function parseFalsifierOutput(out) {
  try {
    const parsed = JSON.parse(out);
    results.falsifier.vectorsFailed = parsed.vectorsFailed ?? (parsed.findings || []).length;
    results.falsifier.status = results.falsifier.vectorsFailed > 0 ? 'VULNERÁVEL' : 'SEGURO';
    pushFindings('⚡ Falsifier', parsed.findings || []);
    return;
  } catch {
    const failedMatch = out.match(/encontrou (\d+) vulnerabilidade/);
    results.falsifier.vectorsFailed = failedMatch ? parseInt(failedMatch[1], 10) : 0;
    results.falsifier.status = results.falsifier.vectorsFailed > 0 ? 'VULNERÁVEL' : 'SEGURO';
  }
}

if (!isTargeted || hasDb || hasApi) {
  process.stdout.write('⚡ [6/7] Executando Falsifier (8 Vetores de Estresse Concorrente)... ');
  const falsifyScript = resolveSkillScript('hybrid-orchestrator', 'scripts', 'falsify.js');
  if (!falsifyScript) {
    markNotRun(results.falsifier, 'hybrid-orchestrator', 'falsify.js');
  } else {
    try {
      const out = execSync(`node "${falsifyScript}" "${projectDir}" --json${passThroughFlags}`, { cwd: projectDir, stdio: 'pipe' }).toString();
      parseFalsifierOutput(out);
      results.falsifier.exitCode = 0;
      console.log(`✅ ${results.falsifier.vectorsFailed} vetores identificados`);
    } catch (e) {
      const raw = e.stdout ? e.stdout.toString() : '';
      if (raw) {
        parseFalsifierOutput(raw);
        results.falsifier.exitCode = e.status ?? 1;
        console.log(`⚠️ ${results.falsifier.vectorsFailed} vetores identificados`);
      } else {
        results.falsifier.status = 'FALHA';
        console.log('❌ Falha na execução do falsify.js');
      }
    }
  }
} else {
  console.log('⚡ [6/7] Adversary Falsifier... ⏭️  Ignorada (flag direcionada ativa)');
}

// 7. TEST FORGE (QUALIDADE DE TESTES & ANTI-MOCK SLOP)
if (!isTargeted || hasTest) {
  process.stdout.write('🧪 [7/7] Executando Test Forge (Auditoria Anti-Mock Slop)... ');
  const testScript = resolveSkillScript('test-forge', 'scripts', 'test-audit.js');
  if (!testScript) {
    markNotRun(results.testForge, 'test-forge', 'test-audit.js');
  } else {
    try {
      const out = execSync(`node "${testScript}" "${projectDir}" --json${passThroughFlags}`, { cwd: projectDir, stdio: 'pipe' }).toString();
      const data = JSON.parse(out);
      results.testForge.exitCode = 0;
      if (data.error) {
        results.testForge.status = 'SEM TESTES';
        results.testForge.score = 0;
        console.log('ℹ️ Nenhum arquivo .test/.spec encontrado');
      } else {
        results.testForge.score = data.score ?? 100;
        results.testForge.issues = (data.findings || []).length;
        results.testForge.status = results.testForge.score >= 85 ? 'APROVADO' : 'ATENÇÃO';
        pushFindings('🧪 Test Forge', data.findings || []);
        console.log(`✅ Score: ${results.testForge.score}/100 (${results.testForge.issues} apontamentos)`);
      }
    } catch (e) {
      results.testForge.status = 'FALHA';
      console.log('❌ Falha na execução do test-audit');
    }
  }
} else {
  console.log('🧪 [7/7] Test Forge (Anti-Mock Slop)... ⏭️  Ignorada (flag direcionada ativa)');
}

// Código de saída do pipeline (política 0/1/2):
//   2 = alguma etapa não executou (script ausente) ou falhou (saída ilegível)
//   1 = todas rodaram, mas algum auditor bloqueou pela própria regra (exit > 0)
//   0 = todas rodaram e nada bloqueou
// IGNORADO (flag), SEM SCHEMA, SEM TESTES e ALERTA da cartografia não contam como falha.
const stepResults = [
  results.cartography, results.security, results.uiCraft, results.mobile,
  results.database, results.falsifier, results.testForge
];
const incompleteSteps = stepResults.filter((r) => r.status === NOT_RUN || r.status === 'FALHA' || r.status === 'PENDENTE').length;
const blockingSteps = stepResults.filter((r) => (r.exitCode || 0) > 0).length;
const finalExitCode = incompleteSteps > 0 ? 2 : blockingSteps > 0 ? 1 : 0;
const planStatus = finalExitCode === 2
  ? `⚠️ Incompleto: ${incompleteSteps} etapa(s) não executada(s) ou com falha`
  : finalExitCode === 1 ? '🔴 Concluído com bloqueios' : '🟢 Concluído sem bloqueios';

// Ordenação dos Top Apontamentos por severidade
const severityRank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
const topFindings = [...collectedFindings]
  .sort((a, b) => (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0))
  .slice(0, 15);

let topFindingsSection = '';
if (topFindings.length > 0) {
  topFindingsSection = `\n## 🔍 1.1 Top Apontamentos Detectados (Arquivo:Linha)\n\n`;
  topFindingsSection += `| Motor | Severidade | Regra | Local (\`Arquivo:Linha\`) | Diagnóstico |\n`;
  topFindingsSection += `| :--- | :---: | :--- | :--- | :--- |\n`;
  topFindings.forEach((f) => {
    const cleanMsg = String(f.message).replace(/\|/g, '/').replace(/\r?\n/g, ' ').slice(0, 110);
    topFindingsSection += `| ${f.source} | **${f.severity}** | \`${f.rule}\` | \`${f.file}:${f.line}\` | ${cleanMsg} |\n`;
  });
} else {
  topFindingsSection = `\n## 🔍 1.1 Top Apontamentos Detectados (Arquivo:Linha)\n\n> ✅ Nenhum apontamento bloqueante detectado nos motores executados.\n`;
}

// GERAÇÃO CONSOLIDADA DO .plan/PLAN.md
const planDir = path.join(projectDir, '.plan');
if (!fs.existsSync(planDir)) fs.mkdirSync(planDir, { recursive: true });

// Etapa ignorada por flag, não executada ou com falha não exibe os valores padrão (score 100, 0 achados)
function metricCell(r, text) {
  if (r.status === 'IGNORADO') return 'Bypass via Flag';
  if (r.status === NOT_RUN) return 'Não executado';
  if (r.status === 'FALHA') return 'Sem resultado';
  return text;
}
function diagnosisCell(r, text) {
  if (r.status === 'IGNORADO') return 'Não requisitado na flag';
  if (r.status === NOT_RUN) return 'Script da skill não encontrado nesta instalação';
  if (r.status === 'FALHA') return 'Falha na execução do auditor (saída ilegível)';
  return text;
}
function quadrantValue(r, label, text) {
  if (r.status === 'IGNORADO') return `${label} ignorado`;
  if (r.status === NOT_RUN) return `${label} não executado`;
  if (r.status === 'FALHA') return `${label} com falha`;
  return text;
}

const planMd = `# 🎯 Plano de Engenharia Unificado — Enterprise AI Suite (v2.7.0)

> **Demanda:** "${demand}"  
> **Projeto:** \`${path.basename(projectDir)}\`  
> **Modo de Execução:** ${isTargeted ? '🎯 Filtrado por Flag Direta' : '⚡ Completo (Governança 6 Camadas)'}  
> **Status:** ${planStatus} (Aguardando Aprovação)  
> **Data:** ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}

---

## 📊 1. Scorecard de Diagnóstico Local das Skills

| Especialista | Status | Métrica / Score | Diagnóstico Técnico |
| :--- | :---: | :---: | :--- |
| 🗺️ **Repo Cartographer** | **${results.cartography.status}** | ${metricCell(results.cartography, `${results.cartography.nodes} nós / ${results.cartography.edges} arestas`)} | ${diagnosisCell(results.cartography, `AST e grafo mapeados em \`.code-map/graph.json\` (${results.cartography.cycles} ciclos)`)} |
| 🔒 **DevSecOps Auditor** | **${results.security.status}** | ${metricCell(results.security, `${results.security.findings} apontamentos`)} | ${diagnosisCell(results.security, `${results.security.critical} críticos, ${results.security.high} altos (OWASP / RBAC / Auth / IA)`)} |
| 🎨 **UI Craftsman (Anti-Slop)** | **${results.uiCraft.status}** | ${metricCell(results.uiCraft, `Score: ${results.uiCraft.score}/100`)} | ${diagnosisCell(results.uiCraft, `${results.uiCraft.issues} apontamentos de contraste dual-theme ou estética`)} |
| 📱 **Mobile Converter** | **${results.mobile.status}** | ${metricCell(results.mobile, `Score: ${results.mobile.score}/100`)} | ${diagnosisCell(results.mobile, `${results.mobile.issues} apontamentos (Touch targets 44px+, Safe Areas, 100dvh)`)} |
| 🗄️ **DB Sentinel** | **${results.database.status}** | ${metricCell(results.database, `Score: ${results.database.score}/100`)} | ${diagnosisCell(results.database, `${results.database.missingIndexes} FKs sem índice (${results.database.issues} alertas totais)`)} |
| ⚡ **Adversary Falsifier** | **${results.falsifier.status}** | ${metricCell(results.falsifier, `${results.falsifier.vectorsFailed} vetores`)} | ${diagnosisCell(results.falsifier, '8 vetores: concorrência, Lost Update, N+1, memory leaks e transações')} |
| 🧪 **Test Forge** | **${results.testForge.status}** | ${metricCell(results.testForge, `Score: ${results.testForge.score}/100`)} | ${diagnosisCell(results.testForge, `${results.testForge.issues} alertas de mocks excessivos, .only ou sleeps fixos`)} |
${topFindingsSection}
---

## 🛡️ 2. Sabatina dos 4 Quadrantes

| Quadrante | Diagnóstico do Pipeline | Resolução da Arquitetura |
| :--- | :--- | :--- |
| **Q1: Contratos & Tipagem** | ${quadrantValue(results.cartography, 'Cartografia', `${results.cartography.nodes} módulos rastreados no grafo AST`)} | Validação estrita de contratos (Zod/DTO), preservação de payloads e zero breaking changes |
| **Q2: Dados & Concorrência** | ${results.falsifier.status === 'IGNORADO' ? 'Não estressado (Modo Focado)' : `${quadrantValue(results.falsifier, 'Falsifier', `${results.falsifier.vectorsFailed} vetores de estresse`)} • ${quadrantValue(results.database, 'DB Sentinel', `${results.database.missingIndexes} FKs sem índice`)}`} | Transações atômicas em escritas múltiplas, prevenção de N+1, anti-Lost Update e indexação de FKs |
| **Q3: Design Dual-Theme & Mobile** | ${quadrantValue(results.uiCraft, 'Craft', `Craft: ${results.uiCraft.score}/100`)} • ${quadrantValue(results.mobile, 'Mobile', `Mobile: ${results.mobile.score}/100`)} | Coerência obrigatória Light/Dark mode (WCAG AA), fluxo Master-Detail mobile, 100dvh e alvos >= 44px |
| **Q4: Segurança & Zero-Trust** | ${results.security.status === 'IGNORADO' ? 'Não auditado (Modo Focado)' : quadrantValue(results.security, 'DevSecOps', `${results.security.critical} críticos • ${results.security.high} altos`)} | Isolamento de propriedade (anti-BOLA/IDOR), proteção de env público e bloqueio de segredos hardcoded |

---

## 📋 3. Checklist de Execução & Governança

- [ ] Execução cirúrgica focada nos requisitos da demanda ("${demand}")
- [ ] Preservação da integridade de contratos de API, eventos e layouts existentes
- [ ] Coerência visual nos temas Claro e Escuro + responsividade mobile verificada
`;

fs.writeFileSync(path.join(planDir, 'PLAN.md'), planMd, 'utf8');

console.log('\n---------------------------------------------------------------');
if (finalExitCode === 0) {
  console.log('🎉 PIPELINE CONCLUÍDO COM SUCESSO (0 TOKENS DE LLM GASTOS)');
} else if (finalExitCode === 1) {
  console.log('🔴 PIPELINE CONCLUÍDO COM BLOQUEIOS (veja .plan/PLAN.md)');
} else {
  console.log(`⚠️  PIPELINE INCOMPLETO: ${incompleteSteps} etapa(s) não executada(s) ou com falha`);
}
console.log(`📄 Relatório visual gerado em: ${path.join(planDir, 'PLAN.md')}`);
console.log('---------------------------------------------------------------\n');

process.exitCode = finalExitCode;
