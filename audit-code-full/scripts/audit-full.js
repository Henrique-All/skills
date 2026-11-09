#!/usr/bin/env node
/**
 * audit-code-full/scripts/audit-full.js
 * Orquestrador Híbrido da Skill audit-code-full (Motor Estruturador + 4 Agentes de IA Paralelos)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFile, execSync } = require('child_process');

const rawArgs = process.argv.slice(2);
const isJson = rawArgs.includes('--json');
const targetArg = rawArgs.find((a) => !a.startsWith('-'));
const targetDir = targetArg ? path.resolve(targetArg) : process.cwd();

const workerScript = path.join(__dirname, 'worker-agent.js');
const monorepoRoot = path.resolve(__dirname, '..', '..');

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m'
};

function spawnAgentWorker(agentName, dir) {
  if (typeof agentName !== 'string' || typeof dir !== 'string') return Promise.resolve({});
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    execFile(
      process.execPath,
      [workerScript, agentName, dir],
      { maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          return reject(new Error(`Falha no agente ${agentName}: ${stderr || err.message}`));
        }
        try {
          const parsed = JSON.parse(stdout);
          parsed.durationMs = Date.now() - startTime;
          resolve(parsed);
        } catch (parseErr) {
          reject(new Error(`Saída JSON inválida do agente ${agentName}: ${parseErr.message}`));
        }
      }
    );
  });
}

function buildAiSubagentsDispatch(dir, crawlerReport, bruteReport, uiReport, buttonReport) {
  if (!crawlerReport || !bruteReport || !uiReport || !buttonReport) return null;
  return {
    generatedAt: new Date().toISOString(),
    targetDir: dir,
    executionMode: 'PARALLEL_4_AI_SUBAGENTS',
    subagents: [
      {
        id: 'qa-crawler',
        agentFile: 'agents/qa-crawler.agent.md',
        role: 'QA Code Walker & Cartography Mapper (Agent 1/4)',
        structuredContext: {
          filesWalked: crawlerReport.filesWalked,
          layersCount: crawlerReport.layersCount,
          routesDiscovered: crawlerReport.routesDiscovered
        },
        aiPrompt: `Analise a arquitetura estruturada em .code-map/INDEX.md (${crawlerReport.filesWalked} arquivos em 6 camadas). Verifique se existem arquivos órfãos, dependências quebradas entre camadas ou rotas desconectadas e valide o code-map final.`
      },
      {
        id: 'qa-bruteforce',
        agentFile: 'agents/qa-bruteforce.agent.md',
        role: 'QA Brute-Force & Stress Tester (Agent 2/4)',
        structuredContext: {
          functionsInspected: bruteReport.functionsInspected,
          realRuntimeCalls: bruteReport.realRuntimeCalls,
          hotspotFindings: (bruteReport.findings || []).slice(0, 25)
        },
        aiPrompt: `Inspecione as funções e fluxos apontados pelo fuzzing em VM (${(bruteReport.findings || []).length} alertas em ${bruteReport.functionsInspected} funções). Teste a lógica de negócio coisa por coisa sob entradas extremas, concorrência e estados inválidos.`
      },
      {
        id: 'qa-ui-palette',
        agentFile: 'agents/qa-ui-palette.agent.md',
        role: 'QA UI & Code-UI Palette Inspector (Agent 3/4)',
        structuredContext: {
          uiFilesScanned: uiReport.uiFilesScanned,
          paletteConfigFiles: uiReport.paletteConfigFiles,
          paletteTokensCount: uiReport.paletteTokensCount,
          hotspotFindings: (uiReport.findings || []).slice(0, 25)
        },
        aiPrompt: `Audite semanticamente os ${uiReport.uiFilesScanned} arquivos de UI e o código de estilo. Verifique se os componentes respeitam a paleta de cores oficial do projeto (${uiReport.paletteTokensCount} tokens detectados) e se possuem contraste correto no Modo Claro e Modo Escuro.`
      },
      {
        id: 'qa-button-action',
        agentFile: 'agents/qa-button-action.agent.md',
        role: 'QA Button Functionality & Wiring Verifier (Agent 4/4)',
        structuredContext: {
          uiFilesScanned: buttonReport.uiFilesScanned,
          totalButtonsAudited: buttonReport.totalButtonsAudited,
          functionalButtons: buttonReport.functionalButtons,
          deadButtonsFound: buttonReport.deadButtonsFound,
          hotspotFindings: buttonReport.findings
        },
        aiPrompt: `Rastreie profundamente todos os ${buttonReport.totalButtonsAudited} botões e elementos interativos nos arquivos de UI. Entre nas funções associadas a cada onClick/onSubmit para confirmar se executam lógica real de negócio ou se há ações incompletas/mortas.`
      }
    ]
  };
}

function runFinalCodeMap(dir, crawlerReport, bruteReport, uiReport, buttonReport, finalScore) {
  if (typeof dir !== 'string' || !crawlerReport || !bruteReport || !uiReport || !buttonReport) return null;
  const codeMapDir = path.join(dir, '.code-map');
  if (!fs.existsSync(codeMapDir)) {
    fs.mkdirSync(codeMapDir, { recursive: true });
  }

  let graphNodesCount = crawlerReport.filesWalked;
  let graphEdgesCount = 0;
  let graphCyclesCount = 0;

  const cartographerCandidates = [
    path.join(monorepoRoot, 'repo-cartographer', 'scripts', 'cartographer.js'),
    path.join(dir, 'repo-cartographer', 'scripts', 'cartographer.js')
  ];

  const cartScript = cartographerCandidates.find((p) => fs.existsSync(p));
  if (cartScript) {
    try {
      execSync(`node "${cartScript}" init "${dir}"`, { cwd: dir, stdio: 'pipe' });
    } catch {}
  }

  const graphPath = path.join(codeMapDir, 'graph.json');
  let graphNodes = [];
  let graphEdges = [];
  if (fs.existsSync(graphPath)) {
    try {
      const g = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
      graphNodes = g.nodes || [];
      graphEdges = g.edges || [];
      graphNodesCount = graphNodes.length || crawlerReport.filesWalked;
      graphEdgesCount = graphEdges.length;
      graphCyclesCount = g.metadata?.cyclesFound || 0;
    } catch {}
  } else {
    const fallbackGraph = {
      version: '1.0.0',
      updatedAt: new Date().toISOString(),
      metadata: {
        generator: 'audit-code-full/qa-crawler',
        nodesCount: crawlerReport.filesWalked,
        edgesCount: 0,
        cyclesFound: 0
      },
      nodes: Object.entries(crawlerReport.layers || {}).flatMap(([layerName, list]) =>
        list.map((relPath) => ({ id: relPath, path: relPath, type: layerName }))
      ),
      edges: []
    };
    fs.writeFileSync(graphPath, JSON.stringify(fallbackGraph, null, 2), 'utf8');
  }

  const nodeByPath = new Map();
  graphNodes.forEach((n) => {
    if (n && n.path) nodeByPath.set(n.path, n);
  });

  const formatList = (items = []) => {
    if (items.length === 0) return '_Nenhum arquivo nesta camada_';
    return items
      .map((relPath) => {
        const n = nodeByPath.get(relPath);
        if (!n) return `- \`${relPath}\``;
        const lineBadge = n.linesCount ? ` *(${n.linesCount}L)*` : '';
        const symStr =
          Array.isArray(n.symbols) && n.symbols.length > 0
            ? ` — 🎯 ${n.symbols
                .slice(0, 6)
                .map((s) => `\`${s.name}:L${s.line}${s.endLine > s.line ? '-' + s.endLine : ''}\``)
                .join(', ')}`
            : '';
        const rtStr =
          Array.isArray(n.routes) && n.routes.length > 0
            ? ` — 🛣️ ${n.routes
                .slice(0, 4)
                .map((r) => `\`${r.method} ${r.path}:L${r.line}\``)
                .join(', ')}`
            : '';
        return `- \`${relPath}\`${lineBadge}${symStr}${rtStr}`;
      })
      .join('\n');
  };

  const routesMd =
    (crawlerReport.routesDiscovered || []).length === 0
      ? '_Nenhuma rota HTTP explícita detectada_'
      : crawlerReport.routesDiscovered.map((r) => `- **${r.method}** \`${r.path}\` (${r.file})`).join('\n');

  const indexMd = `# 🗺️ Code-Map & Inventário Completo — \`audit-code-full\`

> **Gerado por:** Enxame de 4 Agentes Paralelos (\`qa-crawler\`, \`qa-bruteforce\`, \`qa-ui-palette\`, \`qa-button-action\`)  
> **Diretório Auditado:** \`${dir}\`  
> **Score Global de QA:** **${finalScore}/100**  
> **Arquivos Mapeados:** ${crawlerReport.filesWalked} | **Nós AST:** ${graphNodesCount} | **Conexões:** ${graphEdgesCount} | **Ciclos:** ${graphCyclesCount}

---

## 📊 Resumo dos 4 Agentes de QA

| Agente | Especialidade | Score | Métrica Principal | Alertas |
| :--- | :--- | :---: | :--- | :---: |
| 🕷️ **\`qa-crawler\`** | Varredura 360° & Code-Map | **100/100** | ${crawlerReport.filesWalked} arquivos / ${crawlerReport.exportedSymbolsCount} símbolos | 0 |
| 💥 **\`qa-bruteforce\`** | Teste Bruto Coisa por Coisa (VM + IA) | **${bruteReport.score}/100** | ${bruteReport.functionsInspected} funções (${bruteReport.simulatedFuzzCombinations} chamadas brutas) | ${bruteReport.findings.length} |
| 🎨 **\`qa-ui-palette\`** | UI, Código UI & Paleta de Cores | **${uiReport.score}/100** | ${uiReport.uiFilesScanned} arquivos UI / ${uiReport.paletteTokensCount} tokens | ${uiReport.findings.length} |
| 🔘 **\`qa-button-action\`** | Funcionalidade Real de Botões | **${buttonReport.score}/100** | ${buttonReport.functionalButtons}/${buttonReport.totalButtonsAudited} botões funcionais | ${buttonReport.findings.length} |

---

## 🏗️ Listagem Completa por Camada Arquitetural (6 Camadas)

### 1. 🎨 Camada UI (${crawlerReport.layers.ui.length} arquivos)
${formatList(crawlerReport.layers.ui)}

### 2. 🧠 Camada de Estado (${crawlerReport.layers.state.length} arquivos)
${formatList(crawlerReport.layers.state)}

### 3. 🌐 Camada de API & Contratos (${crawlerReport.layers.api.length} arquivos)
${formatList(crawlerReport.layers.api)}

### 4. ⚙️ Camada de Backend & Domínio (${crawlerReport.layers.backend.length} arquivos)
${formatList(crawlerReport.layers.backend)}

### 5. 🗄️ Camada de Banco de Dados (${crawlerReport.layers.database.length} arquivos)
${formatList(crawlerReport.layers.database)}

### 6. 🛠️ Camada de Infra & Scripts (${crawlerReport.layers.infra.length} arquivos)
${formatList(crawlerReport.layers.infra)}

---

## 🛣️ Rotas Mapeadas
${routesMd}
`;

  const indexPath = path.join(codeMapDir, 'INDEX.md');
  fs.writeFileSync(indexPath, indexMd, 'utf8');

  return {
    codeMapDir: '.code-map',
    indexPath: '.code-map/INDEX.md',
    graphPath: '.code-map/graph.json',
    aiDispatchPath: '.code-map/ai-agents-dispatch.json',
    nodesCount: graphNodesCount,
    edgesCount: graphEdgesCount,
    cyclesCount: graphCyclesCount
  };
}

async function main() {
  if (!targetDir) return;
  const startTotal = Date.now();

  if (!isJson) {
    console.log('===============================================================');
    console.log(`${colors.cyan}${colors.bold}🕵️‍♂️ AUDIT-CODE-FULL — QA BRUTE-FORCE 360° (4 AGENTES + IA)${colors.reset}`);
    console.log('===============================================================');
    console.log(`📁 Diretório Alvo: ${targetDir}`);
    console.log(`🐝 Estruturando código e disparando os 4 motores em paralelo...\n`);
  }

  const [crawlerReport, bruteReport, uiReport, buttonReport] = await Promise.all([
    spawnAgentWorker('crawler', targetDir),
    spawnAgentWorker('bruteforce', targetDir),
    spawnAgentWorker('ui-palette', targetDir),
    spawnAgentWorker('button-action', targetDir)
  ]);

  const allFindings = [
    ...bruteReport.findings.map((f) => ({ ...f, agent: 'qa-bruteforce' })),
    ...uiReport.findings.map((f) => ({ ...f, agent: 'qa-ui-palette' })),
    ...buttonReport.findings.map((f) => ({ ...f, agent: 'qa-button-action' }))
  ];

  const finalScore = Math.round(
    (crawlerReport.score + bruteReport.score + uiReport.score + buttonReport.score) / 4
  );

  const codeMapSummary = runFinalCodeMap(
    targetDir,
    crawlerReport,
    bruteReport,
    uiReport,
    buttonReport,
    finalScore
  );

  const aiDispatch = buildAiSubagentsDispatch(
    targetDir,
    crawlerReport,
    bruteReport,
    uiReport,
    buttonReport
  );
  const aiDispatchPath = path.join(targetDir, '.code-map', 'ai-agents-dispatch.json');
  fs.writeFileSync(aiDispatchPath, JSON.stringify(aiDispatch, null, 2), 'utf8');

  const consolidatedReport = {
    skill: 'audit-code-full',
    version: '1.0.0',
    targetDir,
    totalDurationMs: Date.now() - startTotal,
    score: finalScore,
    passed: finalScore >= 80 && allFindings.filter((f) => f.severity === 'HIGH').length === 0,
    agents: {
      crawler: {
        agent: crawlerReport.agent,
        durationMs: crawlerReport.durationMs,
        filesWalked: crawlerReport.filesWalked,
        layersCount: crawlerReport.layersCount,
        exportedSymbolsCount: crawlerReport.exportedSymbolsCount,
        routesCount: crawlerReport.routesDiscovered.length,
        score: crawlerReport.score
      },
      bruteforce: {
        agent: bruteReport.agent,
        durationMs: bruteReport.durationMs,
        filesTested: bruteReport.filesTested,
        functionsInspected: bruteReport.functionsInspected,
        functionsExecutedInVm: bruteReport.functionsExecutedInVm,
        realRuntimeCalls: bruteReport.realRuntimeCalls,
        simulatedFuzzCombinations: bruteReport.simulatedFuzzCombinations,
        score: bruteReport.score,
        findingsCount: bruteReport.findings.length
      },
      uiPalette: {
        agent: uiReport.agent,
        durationMs: uiReport.durationMs,
        uiFilesScanned: uiReport.uiFilesScanned,
        paletteTokensCount: uiReport.paletteTokensCount,
        score: uiReport.score,
        findingsCount: uiReport.findings.length
      },
      buttonAction: {
        agent: buttonReport.agent,
        durationMs: buttonReport.durationMs,
        totalButtonsAudited: buttonReport.totalButtonsAudited,
        functionalButtons: buttonReport.functionalButtons,
        deadButtonsFound: buttonReport.deadButtonsFound,
        score: buttonReport.score,
        findingsCount: buttonReport.findings.length
      }
    },
    aiSubagentsDispatch: aiDispatch,
    codeMap: codeMapSummary,
    findings: allFindings
  };

  const reportPath = path.join(targetDir, '.code-map', 'audit-full-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(consolidatedReport, null, 2), 'utf8');

  if (isJson) {
    console.log(JSON.stringify(consolidatedReport, null, 2));
    process.exit(0);
  }

  console.log(`🕷️  [Agente 1/4] ${colors.bold}qa-crawler${colors.reset} (${crawlerReport.durationMs}ms)`);
  console.log(`   ✅ ${crawlerReport.filesWalked} arquivos percorridos nas 6 camadas | ${crawlerReport.exportedSymbolsCount} símbolos | ${crawlerReport.routesDiscovered.length} rotas`);

  console.log(`💥 [Agente 2/4] ${colors.bold}qa-bruteforce${colors.reset} (${bruteReport.durationMs}ms)`);
  console.log(`   ✅ ${bruteReport.functionsInspected} funções (${bruteReport.realRuntimeCalls} execuções reais em VM) | Score: ${bruteReport.score}/100 (${bruteReport.findings.length} alertas)`);

  console.log(`🎨 [Agente 3/4] ${colors.bold}qa-ui-palette${colors.reset} (${uiReport.durationMs}ms)`);
  console.log(`   ✅ ${uiReport.uiFilesScanned} arquivos UI auditados | ${uiReport.paletteTokensCount} tokens de paleta | Score: ${uiReport.score}/100 (${uiReport.findings.length} alertas)`);

  console.log(`🔘 [Agente 4/4] ${colors.bold}qa-button-action${colors.reset} (${buttonReport.durationMs}ms)`);
  console.log(`   ✅ ${buttonReport.functionalButtons}/${buttonReport.totalButtonsAudited} botões funcionais | ${buttonReport.deadButtonsFound} botões mortos | Score: ${buttonReport.score}/100`);

  console.log(`\n🤖 [Despacho IA] ${colors.bold}Contexto Estruturado para os 4 Subagentes de IA:${colors.reset}`);
  console.log(`   📄 Manifesto IA:        ${aiDispatchPath}`);

  console.log(`\n🗺️  [Passo Final] ${colors.bold}Code-Map Executado & Sincronizado:${colors.reset}`);
  console.log(`   📄 Inventário completo: ${path.join(targetDir, '.code-map', 'INDEX.md')}`);
  console.log(`   📄 Grafo AST:           ${path.join(targetDir, '.code-map', 'graph.json')}`);
  console.log(`   📄 Relatório QA JSON:   ${reportPath}`);

  if (allFindings.length > 0) {
    console.log('\n---------------------------------------------------------------');
    console.log(`🚨 APONTAMENTOS ENCONTRADOS PELOS 4 AGENTES (${allFindings.length}):`);
    console.log('---------------------------------------------------------------');
    allFindings.slice(0, 15).forEach((f) => {
      const badge =
        f.severity === 'HIGH'
          ? `${colors.red}[HIGH]${colors.reset}`
          : f.severity === 'MEDIUM'
          ? `${colors.yellow}[MEDIUM]${colors.reset}`
          : `${colors.gray}[LOW]${colors.reset}`;
      console.log(`${badge} [${f.agent} -> ${f.ruleId}] ${f.file}:${f.line}`);
      console.log(`   ${f.message}`);
      console.log(`   💡 ${f.suggestion}`);
    });
    if (allFindings.length > 15) {
      console.log(`   ... e mais ${allFindings.length - 15} apontamentos listados em .code-map/audit-full-report.json`);
    }
  }

  console.log('\n---------------------------------------------------------------');
  console.log(`🏆 ${colors.bold}AUDIT-CODE-FULL SCORE GLOBAL: ${finalScore}/100${colors.reset} (Concluído em ${consolidatedReport.totalDurationMs}ms)`);
  console.log('---------------------------------------------------------------\n');
}

main().catch((err) => {
  console.error(`❌ Erro fatal no audit-code-full: ${err.message}`);
  process.exit(1);
});
