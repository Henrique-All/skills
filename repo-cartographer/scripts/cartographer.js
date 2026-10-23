#!/usr/bin/env node
/**
 * scripts/cartographer.js - Engine utilitária do Repo Cartographer (v2.7.0)
 * 
 * Executa tarefas determinísticas de I/O, cache incremental, validação de hash,
 * resolução de path aliases (tsconfig/jsconfig), detecção de ciclos, módulos órfãos e exportação Obsidian.
 * Zero dependências externas.
 * 
 * Uso:
 *   node cartographer.js init [projectDir]
 *   node cartographer.js check [projectDir]
 *   node cartographer.js query <termo> [projectDir]
 *   node cartographer.js orphans [projectDir] [--json]
 *   node cartographer.js trace <entrypointFile> [projectDir]
 *   node cartographer.js obsidian [projectDir]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function getCodeMapDir(projectDir) {
  return path.join(projectDir, '.code-map');
}

function calculateFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
  } catch (e) {
    return null;
  }
}

// 1. Resolução de Path Aliases (tsconfig.json / jsconfig.json)
function loadTsConfigPaths(projectDir) {
  const configs = ['tsconfig.json', 'jsconfig.json', 'tsconfig.app.json'];
  for (const cfg of configs) {
    const fullPath = path.join(projectDir, cfg);
    if (fs.existsSync(fullPath)) {
      try {
        let content = fs.readFileSync(fullPath, 'utf-8');
        // Remove comentários // e /* */ para parsing JSON
        content = content.replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*$/gm, '$1');
        const parsed = JSON.parse(content);
        const compilerOptions = parsed.compilerOptions || {};
        return {
          baseUrl: compilerOptions.baseUrl ? path.resolve(projectDir, compilerOptions.baseUrl) : projectDir,
          paths: compilerOptions.paths || {}
        };
      } catch (e) {
        // Falha silenciosa, segue fallback
      }
    }
  }
  return { baseUrl: projectDir, paths: {} };
}

function resolveWithExtensions(basePath) {
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', ''];
  for (const ext of extensions) {
    const candidate = basePath + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  // Se for diretório com index
  for (const ext of extensions) {
    const candidate = path.join(basePath, 'index' + ext);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

function resolveImportPath(importStr, currentFilePath, projectDir, tsConfig) {
  // Ignora pacotes de node_modules nativos
  if (!importStr.startsWith('.') && !importStr.startsWith('/') && Object.keys(tsConfig.paths).length === 0) {
    return null;
  }

  // 1. Relativo
  if (importStr.startsWith('.')) {
    const dir = path.dirname(currentFilePath);
    return resolveWithExtensions(path.resolve(dir, importStr));
  }

  // 2. Path Aliases do tsconfig (ex: @/*, ~/*)
  for (const [aliasPattern, targetPatterns] of Object.entries(tsConfig.paths)) {
    const prefix = aliasPattern.replace(/\*$/, '');
    if (importStr.startsWith(prefix)) {
      const rest = importStr.slice(prefix.length);
      for (const targetPattern of targetPatterns) {
        const targetPrefix = targetPattern.replace(/\*$/, '');
        const candidateBase = path.resolve(tsConfig.baseUrl, targetPrefix, rest);
        const resolved = resolveWithExtensions(candidateBase);
        if (resolved) return resolved;
      }
    }
  }

  // 3. BaseUrl direto
  const fromBase = resolveWithExtensions(path.resolve(tsConfig.baseUrl, importStr));
  if (fromBase) return fromBase;

  return null;
}

// 2. Classificação de Camada
// Ordem importa: testes, instaladores e scripts/CLI vão para a Camada 6 ANTES das demais regras,
// evitando que "install.js" vire "API" ou que "scripts/hooks/*.js" vire "Estado".
function classifyLayer(filePath, content) {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  const baseName = path.basename(filePath);
  const isReactLike = /\.(?:tsx|jsx|ts)$/.test(normalized);

  const isTestOrTooling =
    /(?:^|\/)(?:test|tests|__tests__|fixtures|e2e)\//.test(normalized) ||
    /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(normalized) ||
    /(?:^|\/)install\.[cm]?js$/.test(normalized) ||
    normalized.startsWith('scripts/') || normalized.includes('/scripts/') || normalized.startsWith('bin/') ||
    String(content).startsWith('#!/usr/bin/env node');
  if (isTestOrTooling) {
    return { layer: 6, type: 'infra' };
  }

  if (normalized.includes('/pages/') || normalized.includes('/views/') || normalized.includes('/components/') || normalized.includes('/screens/') || normalized.includes('/templates/') || normalized.endsWith('.tsx') || normalized.endsWith('.jsx')) {
    // Hooks React em .tsx (useX.tsx) continuam sendo Estado
    if (/^use[A-Z]/.test(baseName) && !normalized.includes('/components/')) return { layer: 2, type: 'state' };
    return { layer: 1, type: 'ui' };
  }
  if (normalized.includes('/models/') || normalized.includes('/schemas/') || normalized.includes('/entities/') || normalized.includes('/repositories/') || normalized.includes('prisma') || content.includes('@prisma/client') || content.includes('typeorm') || content.includes('drizzle-orm')) {
    return { layer: 5, type: 'database' };
  }
  if (normalized.includes('/controllers/') || normalized.includes('/routes/') || normalized.includes('/services/') || normalized.includes('/middlewares/') || normalized.includes('/middleware/') || normalized.includes('/server/') || /(?:^|\/)app\/api\//.test(normalized) || /(?:^|\/)route\.[jt]s$/.test(normalized) || content.includes('express(') || /\brouter\.(?:get|post|put|patch|delete|use)\s*\(/.test(content) || content.includes("'use server'") || content.includes('"use server"')) {
    return { layer: 4, type: 'backend' };
  }
  const isStateFile =
    normalized.includes('/store') || normalized.includes('/slices') || normalized.includes('/context') ||
    (normalized.includes('/hooks/') && isReactLike && /^use[A-Z]/.test(baseName)) ||
    (isReactLike && /^use[A-Z]/.test(baseName)) ||
    content.includes('from \'zustand\'') || content.includes('from "zustand"') || content.includes('createContext(');
  if (isStateFile) {
    return { layer: 2, type: 'state' };
  }
  if (normalized.includes('redis') || normalized.includes('queue') || normalized.includes('worker') || normalized.includes('kafka') || normalized.includes('/hooks/') || normalized.includes('/lib/') || normalized.startsWith('lib/') || normalized.startsWith('shared/') || normalized.includes('/shared/')) {
    return { layer: 6, type: 'infra' };
  }
  return { layer: 3, type: 'api' };
}

// 3. Detecção de Ciclos de Dependência (DFS)
function detectCycles(edges) {
  const adj = new Map();
  edges.forEach((e) => {
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source).push(e.target);
  });

  const visited = new Set();
  const recStack = new Set();
  const cycles = [];

  function dfs(node, pathAcc) {
    visited.add(node);
    recStack.add(node);

    const neighbors = adj.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...pathAcc, neighbor]);
      } else if (recStack.has(neighbor)) {
        const cyclePath = [...pathAcc.slice(pathAcc.indexOf(neighbor)), neighbor];
        cycles.push(cyclePath);
      }
    }
    recStack.delete(node);
  }

  for (const node of adj.keys()) {
    if (!visited.has(node)) {
      dfs(node, [node]);
    }
  }

  return cycles;
}

function getNodeId(relPath) {
  const normalized = relPath.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^src\//, '');
  const noExt = normalized.replace(/\.[^/.]+$/, '');
  return noExt || path.basename(relPath, path.extname(relPath));
}

// Limites de varredura (ajustáveis via CARTOGRAPHER_MAX_FILES). Com a indexação incremental,
// arquivos não modificados não são relidos, então os limites podem ser bem maiores que na v2.6.
const CARTOGRAPHER_VERSION = '2.7.0';
const MAX_SEED_FILES = Number(process.env.CARTOGRAPHER_MAX_FILES) || 800;
const MAX_GRAPH_NODES = Math.max(MAX_SEED_FILES, Number(process.env.CARTOGRAPHER_MAX_FILES) || 2000);

/** Índice do graph.json anterior para reaproveitamento incremental (descartado se a versão mudou). */
function loadPreviousGraphIndex(projectDir) {
  const empty = { byPath: new Map(), byId: new Map(), outgoing: new Map() };
  const graphPath = path.join(getCodeMapDir(projectDir), 'graph.json');
  if (!fs.existsSync(graphPath)) return empty;
  try {
    const prev = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
    if (!prev || prev.version !== CARTOGRAPHER_VERSION) return empty; // classificador pode ter mudado
    for (const n of prev.nodes || []) {
      empty.byId.set(n.id, n);
      if (n.hash !== 'virtual') empty.byPath.set(n.path, n);
    }
    for (const e of prev.edges || []) {
      if (!empty.outgoing.has(e.source)) empty.outgoing.set(e.source, []);
      empty.outgoing.get(e.source).push(e);
    }
    return empty;
  } catch {
    return empty;
  }
}

/** Caminho da CLI que está rodando AGORA (relativo ao projeto quando estiver dentro dele). */
function getCliPathForDocs(projectDir) {
  const rel = path.relative(projectDir, __filename).replace(/\\/g, '/');
  const isInside = rel && !rel.startsWith('..') && !path.isAbsolute(rel);
  return isInside ? rel : __filename.replace(/\\/g, '/');
}

// 4. Trace 360° Determinístico
function traceDependencies(entrypointRelative, projectDir, extraEntryFiles = []) {
  const tsConfig = loadTsConfigPaths(projectDir);
  const fullEntry = entrypointRelative ? path.resolve(projectDir, entrypointRelative) : null;

  if (fullEntry && !fs.existsSync(fullEntry) && extraEntryFiles.length === 0) {
    console.error(`❌ Ponto de entrada não encontrado: ${fullEntry}`);
    return { nodes: [], edges: [], cycles: [] };
  }

  const nodes = [];
  const edges = [];
  const visitedFiles = new Set();
  const queue = [];
  let nodeCapHit = false;
  let reusedCount = 0;

  if (fullEntry && fs.existsSync(fullEntry)) queue.push(fullEntry);
  for (const f of extraEntryFiles) {
    if (fs.existsSync(f) && !queue.includes(f)) queue.push(f);
  }

  const addEdgeUnique = (source, target, relation, status = 'confirmed') => {
    if (source === target) return;
    const key = `${source}\u0000${target}\u0000${relation}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ source, target, relation, status });
  };
  const edgeKeys = new Set();

  // C2 — Cartografia incremental: reaproveita nós cujo mtime não mudou (sem reler nem re-parsear o arquivo)
  const previous = loadPreviousGraphIndex(projectDir);

  const enqueue = (absPath) => {
    if (visitedFiles.has(absPath) || queue.includes(absPath)) return;
    if (visitedFiles.size + queue.length >= MAX_GRAPH_NODES) { nodeCapHit = true; return; }
    queue.push(absPath);
  };

  while (queue.length > 0) {
    const current = queue.shift();
    if (visitedFiles.has(current)) continue;
    visitedFiles.add(current);

    let stat;
    try { stat = fs.statSync(current); } catch { continue; }
    const relPath = path.relative(projectDir, current).replace(/\\/g, '/');
    const mtime = Math.floor(stat.mtimeMs);

    const prevNode = previous.byPath.get(relPath);
    if (prevNode && prevNode.mtime === mtime && prevNode.hash && prevNode.metadata && Array.isArray(prevNode.metadata.deps)) {
      reusedCount++;
      if (!nodes.some((n) => n.id === prevNode.id)) nodes.push(prevNode);
      for (const e of previous.outgoing.get(prevNode.id) || []) {
        addEdgeUnique(e.source, e.target, e.relation, e.status);
        const endpointNode = previous.byId.get(e.target);
        if (endpointNode && endpointNode.hash === 'virtual' && !nodes.some((n) => n.id === endpointNode.id)) nodes.push(endpointNode);
      }
      for (const depRel of prevNode.metadata.deps) enqueue(path.resolve(projectDir, depRel));
      continue;
    }

    let content = '';
    try {
      content = fs.readFileSync(current, 'utf-8');
    } catch (e) {
      continue;
    }

    const hash = calculateFileHash(current);
    const classification = classifyLayer(relPath, content);

    const nodeId = getNodeId(relPath);
    const deps = [];
    const nodeRecord = {
      id: nodeId,
      path: relPath,
      type: classification.type,
      layer: classification.layer,
      hash,
      mtime,
      lastIndexed: new Date().toISOString(),
      metadata: { deps }
    };
    if (!nodes.some((n) => n.id === nodeId)) nodes.push(nodeRecord);

    // Scanner regex expandido: static imports, requires, dynamic imports e re-exports (barrels)
    const importRegex = /(?:import\s+(?:[\w*\s{},]*)\s+from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s*\(\s*['"]([^'"]+)['"]\s*\)|export\s+(?:[\w*\s{},]*)\s+from\s+['"]([^'"]+)['"])/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importStr = match[1] || match[2] || match[3] || match[4];
      const resolved = resolveImportPath(importStr, current, projectDir, tsConfig);

      if (resolved) {
        const targetRel = path.relative(projectDir, resolved).replace(/\\/g, '/');
        const targetId = getNodeId(targetRel);
        const relType = match[4] ? 're-exports' : (match[3] ? 'dynamic-import' : 'imports');

        // Sempre registra a aresta (mesmo para nós já visitados) para permitir detecção real de ciclos e grafos DAG
        addEdgeUnique(nodeId, targetId, relType, 'confirmed');
        if (!deps.includes(targetRel)) deps.push(targetRel);
        enqueue(resolved);
      }
    }

    // Detector de Endpoints HTTP literais (Camada 3)
    const httpRegex = /(?:axios\.(?:get|post|put|delete|patch)|fetch)\s*\(\s*[`'"](\/(?:api\/)?[^`'"]+)[`'"]/g;
    let httpMatch;
    while ((httpMatch = httpRegex.exec(content)) !== null) {
      const endpoint = httpMatch[1];
      const endpointId = `ENDPOINT_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`;
      if (!nodes.some((n) => n.id === endpointId)) {
        nodes.push({
          id: endpointId,
          path: endpoint,
          type: 'api',
          layer: 3,
          hash: 'virtual',
          mtime,
          lastIndexed: new Date().toISOString()
        });
      }
      addEdgeUnique(nodeId, endpointId, 'calls_endpoint', 'confirmed');
    }
  }

  // Detecta ciclos
  const cycles = detectCycles(edges);
  if (cycles.length > 0) {
    console.log(`⚠️  ${cycles.length} dependência(s) circular(es) detectada(s):`);
    cycles.forEach((c) => console.log(`   🔁 ${c.join(' ➔ ')}`));
  }

  // Salva no .code-map/graph.json e .code-map/INDEX.md
  const mapDir = getCodeMapDir(projectDir);
  if (!fs.existsSync(mapDir)) fs.mkdirSync(mapDir, { recursive: true });

  const seedsTruncated = Boolean(extraEntryFiles && extraEntryFiles.truncated);
  const truncated = seedsTruncated || nodeCapHit;
  if (truncated) {
    console.log(`⚠️  Mapa PARCIAL: limite de ${seedsTruncated ? MAX_SEED_FILES + ' arquivos-semente' : MAX_GRAPH_NODES + ' nós'} atingido. Ajuste com CARTOGRAPHER_MAX_FILES=<n>.`);
  }

  const graphData = {
    version: CARTOGRAPHER_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    entrypoint: entrypointRelative || 'project-scan',
    metadata: {
      generator: 'repo-cartographer',
      nodesCount: nodes.length,
      edgesCount: edges.length,
      cyclesFound: cycles.length,
      scannedFiles: visitedFiles.size,
      reusedFromCache: reusedCount,
      truncated,
      limits: { seedFiles: MAX_SEED_FILES, graphNodes: MAX_GRAPH_NODES }
    },
    nodes,
    edges
  };

  fs.writeFileSync(path.join(mapDir, 'graph.json'), JSON.stringify(graphData, null, 2), 'utf-8');
  generateIndexMarkdown(projectDir, graphData);
  console.log(`✅ Grafo 360° gerado com sucesso em .code-map/graph.json e .code-map/INDEX.md!`);
  console.log(`   - Nós identificados: ${nodes.length} (${reusedCount} reaproveitados do cache incremental)`);
  console.log(`   - Conexões (arestas): ${edges.length}`);
  console.log(`   - Ciclos: ${cycles.length}`);
  return { nodes, edges, cycles };
}

function generateIndexMarkdown(projectDir, graphData) {
  const mapDir = getCodeMapDir(projectDir);
  const nodes = graphData.nodes || [];
  const edges = graphData.edges || [];

  const inDegree = new Map();
  const outDegree = new Map();
  edges.forEach((e) => {
    outDegree.set(e.source, (outDegree.get(e.source) || 0) + 1);
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
  });

  const layerLabels = {
    1: '1. 🖥️ Camada 1: UI (Telas, Páginas & Componentes)',
    2: '2. 🔄 Camada 2: Estado (Stores, Contexts & Hooks)',
    3: '3. 🔌 Camada 3: Rede, API Client & Contratos HTTP',
    4: '4. ⚙️ Camada 4: Backend (Rotas, Controllers & Services)',
    5: '5. 🗄️ Camada 5: Banco de Dados (Models, Schemas & ORM)',
    6: '6. ☁️ Camada 6: Infraestrutura, Filas & Utilitários'
  };

  let md = `# 🗺️ Índice Arquitetural 360° (.code-map/INDEX.md)\n\n`;
  md += `> ⚡ **LEITURA OBRIGATÓRIA PARA AGENTES DE IA (PASSO ZERO — ANTI-VOLTAS):**\n`;
  md += `> Este arquivo resume a cartografia completa do projeto. Consulte as camadas e conexões abaixo para abrir diretamente os arquivos exatos com \`view_file\`, sem fazer buscas cegas pelo repositório.\n\n`;
  if (graphData.metadata && graphData.metadata.truncated) {
    const lim = graphData.metadata.limits || {};
    md += `> [!WARNING]\n> **Mapa PARCIAL:** o limite de varredura (${lim.seedFiles || '?'} arquivos-semente / ${lim.graphNodes || '?'} nós) foi atingido. Arquivos fora do mapa existem — use \`query\` ou busca direcionada antes de concluir que algo não existe. Para ampliar: \`CARTOGRAPHER_MAX_FILES=<n>\`.\n\n`;
  }
  md += `- **Atualizado em:** \`${graphData.updatedAt}\`\n`;
  md += `- **Métricas:** **${nodes.length}** nós mapeados | **${edges.length}** conexões | **${graphData.metadata?.cyclesFound || 0}** ciclos\n`;
  md += `- **Busca Rápida via CLI:** \`node "${getCliPathForDocs(projectDir)}" query <termo>\`\n`;
  md += `- **Módulos órfãos (dead code):** \`node "${getCliPathForDocs(projectDir)}" orphans\`\n\n`;

  // Top Hubs
  const rankedNodes = [...nodes]
    .map((n) => ({
      ...n,
      inCount: inDegree.get(n.id) || 0,
      outCount: outDegree.get(n.id) || 0,
      total: (inDegree.get(n.id) || 0) + (outDegree.get(n.id) || 0)
    }))
    .filter((n) => n.total > 0)
    .sort((a, b) => b.inCount - a.inCount || b.total - a.total)
    .slice(0, 12);

  if (rankedNodes.length > 0) {
    md += `## 🔥 Núcleos de Maior Impacto (Top Hubs)\n\n`;
    md += `| Arquivo / Nó | Camada | Dependentes (In) | Importa (Out) |\n`;
    md += `| :--- | :---: | :---: | :---: |\n`;
    rankedNodes.forEach((n) => {
      md += `| \`${n.path}\` | L${n.layer} (${n.type}) | ${n.inCount} | ${n.outCount} |\n`;
    });
    md += `\n`;
  }

  // Agrupamento por Camada
  md += `## 📚 Arquivos Mapeados por Camada (6 Layers)\n\n`;
  for (let layerNum = 1; layerNum <= 6; layerNum++) {
    const layerNodes = nodes.filter((n) => (n.layer || 3) === layerNum);
    if (layerNodes.length === 0) continue;
    md += `### ${layerLabels[layerNum]} (${layerNodes.length})\n`;
    layerNodes.slice(0, 40).forEach((n) => {
      const callers = inDegree.get(n.id) || 0;
      const deps = outDegree.get(n.id) || 0;
      const meta = callers + deps > 0 ? ` *(usado por ${callers}, chama ${deps})*` : '';
      md += `- \`${n.path}\`${meta}\n`;
    });
    if (layerNodes.length > 40) {
      md += `- *...e mais ${layerNodes.length - 40} nós (consulte \`.code-map/graph.json\` ou use \`cartographer.js query <termo>\`)*\n`;
    }
    md += `\n`;
  }

  // Fluxo de Conexões Principais
  if (edges.length > 0) {
    md += `## 🔗 Mapa de Fluxo Direto (Quem Chama Quem)\n\n`;
    const groupedEdges = new Map();
    edges.forEach((e) => {
      if (!groupedEdges.has(e.source)) groupedEdges.set(e.source, []);
      groupedEdges.get(e.source).push(e.target);
    });
    let count = 0;
    for (const [src, targets] of groupedEdges.entries()) {
      if (count >= 50) {
        md += `- *...mais fluxos disponíveis em \`.code-map/graph.json\`*\n`;
        break;
      }
      const srcNode = nodes.find((n) => n.id === src);
      const srcLabel = srcNode ? srcNode.path : src;
      md += `- \`${srcLabel}\` ➔ ${targets.map((t) => `\`${t}\``).join(', ')}\n`;
      count++;
    }
    md += `\n`;
  }

  fs.writeFileSync(path.join(mapDir, 'INDEX.md'), md, 'utf-8');
}

function discoverProjectSeeds(projectDir, limit = MAX_SEED_FILES) {
  const seeds = [];
  const seen = new Set();
  const skipDirs = new Set([
    'node_modules', '.git', 'dist', 'build', 'coverage', '.next',
    '.code-map', '.agents', '.claude', '.cursor', '.plan', '.craft', '.mobile-preview', '.swarm'
  ]);

  function walk(dir) {
    if (seeds.length >= limit || !fs.existsSync(dir)) return;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      if (seeds.length >= limit) break;
      if (skipDirs.has(ent.name) || ent.name.startsWith('.')) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(full);
      } else if (/\.(ts|tsx|js|jsx)$/.test(ent.name) && !/\.d\.ts$|\.min\.js$/.test(ent.name)) {
        if (!seen.has(full)) {
          seen.add(full);
          seeds.push(full);
        }
      }
    }
  }

  // Prioriza diretórios de código de aplicação (incluindo estruturas Fullstack e Monorepo)
  const priorityDirs = [
    'src', 'app', 'pages', 'components', 'server', 'api', 'client', 'web', 'backend', 'frontend', 'lib', 'bin', 'scripts',
    'frontend/src', 'frontend/app', 'backend/src', 'client/src', 'server/src', 'web/src', 'api/src'
  ];
  for (const d of priorityDirs) {
    const p = path.join(projectDir, d);
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) walk(p);
  }

  // Suporte a workspaces de monorepo (apps/*, packages/*, services/*)
  const monoContainers = ['apps', 'packages', 'services', 'modules'];
  for (const container of monoContainers) {
    const cPath = path.join(projectDir, container);
    if (fs.existsSync(cPath) && fs.statSync(cPath).isDirectory()) {
      walk(cPath);
    }
  }

  // Complementa com demais pastas da raiz se ainda houver espaço no limite
  if (seeds.length < limit) walk(projectDir);
  if (seeds.length >= limit) seeds.truncated = true; // sinaliza mapa parcial para o INDEX.md
  return seeds;
}

function initCodeMap(projectDir) {
  const resolvedDir = path.resolve(projectDir || process.cwd());
  const mapDir = getCodeMapDir(resolvedDir);
  if (!fs.existsSync(mapDir)) {
    fs.mkdirSync(mapDir, { recursive: true });
  }

  const obsidianDir = path.join(mapDir, 'obsidian');
  if (!fs.existsSync(obsidianDir)) {
    fs.mkdirSync(obsidianDir, { recursive: true });
  }

  const seeds = discoverProjectSeeds(resolvedDir, MAX_SEED_FILES);
  if (seeds.length > 0) {
    const firstRel = path.relative(resolvedDir, seeds[0]).replace(/\\/g, '/');
    return traceDependencies(firstRel, resolvedDir, seeds);
  }

  const graphPath = path.join(mapDir, 'graph.json');
  if (!fs.existsSync(graphPath)) {
    const template = {
      version: CARTOGRAPHER_VERSION,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        generator: 'repo-cartographer',
        description: 'Context IR incremental cache',
        nodesCount: 0,
        edgesCount: 0,
        cyclesFound: 0
      },
      nodes: [],
      edges: []
    };
    fs.writeFileSync(graphPath, JSON.stringify(template, null, 2), 'utf-8');
    generateIndexMarkdown(resolvedDir, template);
    console.log(`✅ Inicializado: ${graphPath}`);
  } else {
    console.log(`ℹ️  Já existe: ${graphPath}`);
  }
  return { nodes: [], edges: [], cycles: [] };
}

function checkCacheValidity(projectDir) {
  const resolvedDir = path.resolve(projectDir || process.cwd());
  const mapDir = getCodeMapDir(resolvedDir);
  const graphPath = path.join(mapDir, 'graph.json');

  if (!fs.existsSync(graphPath)) {
    console.log('⚠️  Nenhum graph.json encontrado. Necessário criar mapa.');
    return { valid: false, staleNodes: [] };
  }

  try {
    const graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
    const staleNodes = [];

    for (const node of graph.nodes || []) {
      if (node.hash === 'virtual') continue;
      const fullPath = path.isAbsolute(node.path) ? node.path : path.join(resolvedDir, node.path);
      if (!fs.existsSync(fullPath)) {
        staleNodes.push({ id: node.id, path: node.path, reason: 'Arquivo deletado ou renomeado' });
        continue;
      }

      const currentHash = calculateFileHash(fullPath);
      if (node.hash && currentHash !== node.hash) {
        staleNodes.push({ id: node.id, path: node.path, reason: 'Hash divergente (conteúdo modificado)' });
      }
    }

    if (staleNodes.length === 0) {
      console.log(`✅ Cache válido: todos os ${graph.nodes.length} nós conferem com o disco.`);
      return { valid: true, staleNodes: [] };
    } else {
      console.log(`⚠️  Cache parcialmente obsoleto (${staleNodes.length} nós alterados):`);
      staleNodes.forEach((s) => console.log(`   - [${s.id}] ${s.path} (${s.reason})`));
      return { valid: false, staleNodes };
    }
  } catch (err) {
    console.error(`❌ Erro ao ler graph.json: ${err.message}`);
    return { valid: false, error: err.message };
  }
}

function exportToObsidian(projectDir) {
  const resolvedDir = path.resolve(projectDir || process.cwd());
  const mapDir = getCodeMapDir(resolvedDir);
  const graphPath = path.join(mapDir, 'graph.json');
  const obsidianDir = path.join(mapDir, 'obsidian');

  if (!fs.existsSync(graphPath)) {
    console.error('❌ graph.json não encontrado. Execute o mapeamento primeiro.');
    return;
  }

  if (!fs.existsSync(obsidianDir)) {
    fs.mkdirSync(obsidianDir, { recursive: true });
  }

  const graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
  const nodes = graph.nodes || [];
  const edges = graph.edges || [];

  // Gerar notas individuais com [[wikilinks]]
  nodes.forEach((node) => {
    const sanitizedName = (node.id || path.basename(node.path)).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const noteFile = path.join(obsidianDir, `${sanitizedName}.md`);

    const outEdges = edges.filter((e) => e.source === node.id);
    const inEdges = edges.filter((e) => e.target === node.id);

    let md = `# ${node.id}\n\n`;
    md += `- **Tipo:** ${node.type || 'desconhecido'}\n`;
    md += `- **Arquivo:** \`${node.path}\`\n`;
    md += `- **Camada:** ${node.layer || 'N/A'}\n\n`;

    if (outEdges.length > 0) {
      md += `## Dependências de Saída (Chama/Consome)\n`;
      outEdges.forEach((e) => {
        md += `- [[${e.target.replace(/[^a-zA-Z0-9_\-\.]/g, '_')}]] — *${e.relation}* (${e.status})\n`;
      });
      md += `\n`;
    }

    if (inEdges.length > 0) {
      md += `## Invocado por (Entradas)\n`;
      inEdges.forEach((e) => {
        md += `- [[${e.source.replace(/[^a-zA-Z0-9_\-\.]/g, '_')}]] — *${e.relation}*\n`;
      });
      md += `\n`;
    }

    fs.writeFileSync(noteFile, md, 'utf-8');
  });

  // Gerar canvas nativo do Obsidian (JSON canvas spec)
  const canvasNodes = nodes.map((node, idx) => ({
    id: `node_${idx}`,
    type: 'text',
    text: `### ${node.id}\n**${node.type}** (L${node.layer})\n\`${path.basename(node.path)}\``,
    x: ((node.layer || 1) - 1) * 280,
    y: (idx % 6) * 160,
    width: 220,
    height: 120
  }));

  const canvasEdges = edges.map((edge, idx) => {
    const srcIdx = nodes.findIndex((n) => n.id === edge.source);
    const tgtIdx = nodes.findIndex((n) => n.id === edge.target);
    return {
      id: `edge_${idx}`,
      fromNode: srcIdx >= 0 ? `node_${srcIdx}` : null,
      toNode: tgtIdx >= 0 ? `node_${tgtIdx}` : null,
      label: `${edge.relation} [${edge.status}]`
    };
  }).filter((e) => e.fromNode && e.toNode);

  const canvasContent = {
    nodes: canvasNodes,
    edges: canvasEdges
  };

  fs.writeFileSync(path.join(obsidianDir, 'graph.canvas'), JSON.stringify(canvasContent, null, 2), 'utf-8');
  console.log(`✅ Exportado para Obsidian em ${obsidianDir}:`);
  console.log(`   - ${nodes.length} notas Markdown criadas`);
  console.log(`   - 1 arquivo graph.canvas visual gerado`);
}

// 7. Gerar Diagrama Mermaid Direto
function exportMermaid(entrypoint, projectDir) {
  const result = traceDependencies(entrypoint, projectDir) || { nodes: [], edges: [] };
  const nodes = result.nodes || [];
  const edges = result.edges || [];

  console.log('\n===============================================================');
  console.log('🗺️  MERMAID FLOWCHART (TD)');
  console.log('===============================================================\n');

  let mm = '```mermaid\nflowchart TD\n';
  nodes.forEach((n, idx) => {
    const cleanId = `N${idx}_${n.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    const label = `${n.type}: ${path.basename(n.path || n.id)}<br/>Layer ${n.layer}`;
    mm += `    ${cleanId}["${label}"]\n`;
  });
  mm += '\n';

  edges.forEach((e) => {
    const srcIdx = nodes.findIndex((n) => n.id === e.source);
    const tgtIdx = nodes.findIndex((n) => n.id === e.target);
    if (srcIdx >= 0 && tgtIdx >= 0) {
      const srcId = `N${srcIdx}_${nodes[srcIdx].id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
      const tgtId = `N${tgtIdx}_${nodes[tgtIdx].id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
      mm += `    ${srcId} -->|"${e.relation}"| ${tgtId}\n`;
    }
  });

  mm += '```\n';
  console.log(mm);
  return mm;
}

// 8. Rastreamento Reverso (Quem consome este arquivo?)
function traceCallers(targetFile, projectDir) {
  console.log('===============================================================');
  console.log(`🔍 CARTOGRAPHER REVERSE TRACE — QUEM CHAMA [${path.basename(targetFile)}]?`);
  console.log('===============================================================\n');

  const baseName = path.basename(targetFile, path.extname(targetFile));
  const callers = [];

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.name === 'node_modules' || ent.name.startsWith('.') || ent.name === 'dist') continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        scanDir(full);
      } else if (/\.(ts|tsx|js|jsx)$/.test(ent.name)) {
        try {
          const content = fs.readFileSync(full, 'utf-8');
          if (content.includes(baseName) && full !== path.resolve(projectDir, targetFile)) {
            callers.push({ file: path.relative(projectDir, full), type: ent.name.endsWith('x') ? 'UI / View' : 'Service / Logic' });
          }
        } catch {}
      }
    }
  }

  scanDir(projectDir);

  if (callers.length === 0) {
    console.log('ℹ️  Nenhum chamador direto encontrado para este arquivo.');
  } else {
    console.log(`🚨 ${callers.length} consumidor(es) afetados (Blast Radius):\n`);
    callers.forEach((c, idx) => {
      console.log(`  ${idx + 1}. [${c.type}] ${c.file}`);
    });
    console.log('\n💡 Alterações neste arquivo podem quebrar os componentes acima.');
  }
}

// 9. Consulta Instantânea no Grafo (Anti-Voltas para Agentes de IA)
function queryGraph(keyword, projectDir) {
  const resolvedDir = path.resolve(projectDir || process.cwd());
  const mapDir = getCodeMapDir(resolvedDir);
  const graphPath = path.join(mapDir, 'graph.json');

  let graph = null;
  if (fs.existsSync(graphPath)) {
    try {
      graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
    } catch {}
  }

  if (!graph || !Array.isArray(graph.nodes) || graph.nodes.length === 0) {
    console.log('⚡ Grafo vazio ou ausente. Inicializando cartografia automática...');
    initCodeMap(resolvedDir);
    if (fs.existsSync(graphPath)) {
      graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
    }
  }

  const nodes = (graph && graph.nodes) || [];
  const edges = (graph && graph.edges) || [];
  const q = (keyword || '').toLowerCase();

  const matched = nodes.filter(
    (n) =>
      (n.id && n.id.toLowerCase().includes(q)) ||
      (n.path && n.path.toLowerCase().includes(q)) ||
      (n.type && n.type.toLowerCase().includes(q))
  );

  console.log(`🗺️  CARTOGRAPHER QUERY: "${keyword}" (${matched.length} nó(s) encontrado(s))\n`);
  if (matched.length === 0) {
    console.log(`ℹ️  Nenhum nó com "${keyword}" no grafo atual. Consulte .code-map/INDEX.md para a visão completa.`);
    return;
  }

  matched.slice(0, 15).forEach((n, idx) => {
    const incoming = edges.filter((e) => e.target === n.id).map((e) => e.source);
    const outgoing = edges.filter((e) => e.source === n.id).map((e) => e.target);
    console.log(`${idx + 1}. [Layer ${n.layer} | ${n.type}] ${n.path}`);
    if (incoming.length > 0) console.log(`   ⬅️  Chamado por (In): ${incoming.join(', ')}`);
    if (outgoing.length > 0) console.log(`   ➡️  Chama/Importa (Out): ${outgoing.join(', ')}`);
  });
}

// 10. Detecção de Módulos Órfãos / Dead Code (inDegree === 0 excluindo entrypoints)
function findOrphans(projectDir, isJson = false) {
  const resolvedDir = path.resolve(projectDir || process.cwd());
  const mapDir = getCodeMapDir(resolvedDir);
  const graphPath = path.join(mapDir, 'graph.json');

  let graph = null;
  if (fs.existsSync(graphPath)) {
    try {
      graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
    } catch {}
  }

  if (!graph || !Array.isArray(graph.nodes) || graph.nodes.length === 0) {
    if (!isJson) console.log('⚡ Grafo vazio ou ausente. Inicializando cartografia automática...');
    initCodeMap(resolvedDir);
    if (fs.existsSync(graphPath)) {
      graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
    }
  }

  const nodes = (graph && graph.nodes) || [];
  const edges = (graph && graph.edges) || [];

  const inDegree = new Map();
  edges.forEach((e) => {
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
  });

  const entrypointRegex = /(?:^|\/)(?:page|layout|route|loading|error|not-found|middleware|index|main|app|server|install)\.(?:ts|tsx|js|jsx)$/i;
  const infraOrTestDirRegex = /(?:^|\/)(?:scripts|bin|test|tests|templates|migrations|pages|app)\//i;

  const orphans = [];
  let entrypointsExcluded = 0;

  for (const n of nodes) {
    if (n.hash === 'virtual') continue;
    const inc = inDegree.get(n.id) || 0;
    if (inc > 0) continue;

    const normPath = (n.path || '').replace(/\\/g, '/');
    if (entrypointRegex.test(normPath) || infraOrTestDirRegex.test(normPath) || /\.(?:test|spec)\.(?:ts|tsx|js|jsx)$/i.test(normPath)) {
      entrypointsExcluded++;
      continue;
    }

    orphans.push({
      id: n.id,
      path: normPath,
      layer: n.layer,
      type: n.type
    });
  }

  if (isJson) {
    console.log(
      JSON.stringify(
        {
          totalNodes: nodes.length,
          entrypointsExcluded,
          orphansCount: orphans.length,
          orphans
        },
        null,
        2
      )
    );
    return orphans;
  }

  console.log('===============================================================');
  console.log('🧹 CARTOGRAPHER ORPHAN DETECTOR (DEAD CODE / MÓDULOS SEM CONSUMIDOR)');
  console.log('===============================================================');
  console.log(`📊 Total de nós analisados: ${nodes.length} (${entrypointsExcluded} entrypoints/CLIs/testes excluídos)\n`);

  if (orphans.length === 0) {
    console.log('✅ Nenhum módulo órfão detectado! Todos os módulos internos possuem consumidores ativos.');
  } else {
    console.log(`⚠️  ${orphans.length} módulo(s) sem consumidores diretos no grafo (candidatos a Dead Code):\n`);
    orphans.slice(0, 30).forEach((o, idx) => {
      console.log(`  ${idx + 1}. [Layer ${o.layer} | ${o.type}] ${o.path}`);
    });
  }
  return orphans;
}

// CLI Runner
const args = process.argv.slice(2);
const isJsonFlag = args.includes('--json');
const positionalArgs = args.filter((a) => !a.startsWith('--'));
const command = positionalArgs[0] || 'check';

// Para comandos sem arquivo de entrada (init, check, obsidian, orphans), o 2º argumento posicional é o diretório do projeto.
// Para comandos com arquivo/termo (trace, tree, mermaid, callers, query), o 2º argumento é o alvo e o 3º é o diretório.
const dirOnlyCommands = new Set(['init', 'check', 'obsidian', 'orphans']);
const targetDir = dirOnlyCommands.has(command)
  ? (positionalArgs[1] ? path.resolve(positionalArgs[1]) : process.cwd())
  : (positionalArgs[2] ? path.resolve(positionalArgs[2]) : process.cwd());

switch (command) {
  case 'init':
    initCodeMap(targetDir);
    break;
  case 'check':
    checkCacheValidity(targetDir);
    break;
  case 'query': {
    const kw = positionalArgs[1] || '';
    queryGraph(kw, targetDir);
    break;
  }
  case 'orphans':
    findOrphans(targetDir, isJsonFlag);
    break;
  case 'trace':
  case 'tree': {
    const entrypoint = positionalArgs[1];
    if (!entrypoint) {
      console.error('❌ Informe o ponto de entrada. Ex: node cartographer.js trace src/pages/Checkout.tsx');
      process.exit(1);
    }
    traceDependencies(entrypoint, targetDir);
    break;
  }
  case 'mermaid': {
    const mmEntry = positionalArgs[1];
    if (!mmEntry) {
      console.error('❌ Informe o ponto de entrada. Ex: node cartographer.js mermaid src/pages/Checkout.tsx');
      process.exit(1);
    }
    exportMermaid(mmEntry, targetDir);
    break;
  }
  case 'callers': {
    const callerTarget = positionalArgs[1];
    if (!callerTarget) {
      console.error('❌ Informe o arquivo alvo. Ex: node cartographer.js callers src/models/User.ts');
      process.exit(1);
    }
    traceCallers(callerTarget, targetDir);
    break;
  }
  case 'obsidian':
    exportToObsidian(targetDir);
    break;
  default:
    console.log(`Uso: node cartographer.js [init|check|query <termo>|orphans|trace <file>|tree <file>|mermaid <file>|callers <file>|obsidian] [diretório]`);
}
