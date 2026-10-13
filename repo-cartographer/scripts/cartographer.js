#!/usr/bin/env node
/**
 * scripts/cartographer.js - Engine utilitária do Repo Cartographer
 * 
 * Executa tarefas determinísticas de I/O, cache incremental, validação de hash,
 * resolução de path aliases (tsconfig/jsconfig), detecção de ciclos e exportação Obsidian.
 * Zero dependências externas.
 * 
 * Uso:
 *   node cartographer.js init [projectDir]
 *   node cartographer.js check [projectDir]
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
function classifyLayer(filePath, content) {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  
  if (normalized.includes('/pages/') || normalized.includes('/views/') || normalized.includes('/components/') || normalized.endsWith('.tsx') || normalized.endsWith('.jsx')) {
    return { layer: 1, type: 'ui' };
  }
  if (normalized.includes('/store') || normalized.includes('/slices') || normalized.includes('/context') || normalized.includes('use') || content.includes('zustand') || content.includes('createContext')) {
    return { layer: 2, type: 'state' };
  }
  if (normalized.includes('/api/') || normalized.includes('/routes/') || normalized.includes('/controllers/') || content.includes('express') || content.includes('router.')) {
    return { layer: 4, type: 'backend' };
  }
  if (normalized.includes('/models/') || normalized.includes('/schemas/') || normalized.includes('/entities/') || normalized.includes('prisma') || content.includes('@prisma') || content.includes('typeorm')) {
    return { layer: 5, type: 'database' };
  }
  if (normalized.includes('redis') || normalized.includes('queue') || normalized.includes('worker') || normalized.includes('kafka')) {
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

  if (fullEntry && fs.existsSync(fullEntry)) queue.push(fullEntry);
  for (const f of extraEntryFiles) {
    if (fs.existsSync(f) && !queue.includes(f)) queue.push(f);
  }

  const addEdgeUnique = (source, target, relation, status = 'confirmed') => {
    if (source === target) return;
    if (!edges.some((e) => e.source === source && e.target === target && e.relation === relation)) {
      edges.push({ source, target, relation, status });
    }
  };

  while (queue.length > 0) {
    const current = queue.shift();
    if (visitedFiles.has(current)) continue;
    visitedFiles.add(current);

    let content = '';
    try {
      content = fs.readFileSync(current, 'utf-8');
    } catch (e) {
      continue;
    }

    const relPath = path.relative(projectDir, current).replace(/\\/g, '/');
    const hash = calculateFileHash(current);
    const mtime = fs.statSync(current).mtimeMs;
    const classification = classifyLayer(relPath, content);

    const nodeId = getNodeId(relPath);
    if (!nodes.some((n) => n.id === nodeId)) {
      nodes.push({
        id: nodeId,
        path: relPath,
        type: classification.type,
        layer: classification.layer,
        hash,
        mtime: Math.floor(mtime),
        lastIndexed: new Date().toISOString()
      });
    }

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

        if (!visitedFiles.has(resolved) && !queue.includes(resolved) && visitedFiles.size + queue.length < 120) {
          queue.push(resolved);
        }
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
          mtime: Math.floor(mtime),
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

  // Salva no .code-map/graph.json
  const mapDir = getCodeMapDir(projectDir);
  if (!fs.existsSync(mapDir)) fs.mkdirSync(mapDir, { recursive: true });

  const graphData = {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    entrypoint: entrypointRelative || 'project-scan',
    metadata: {
      generator: 'repo-cartographer',
      nodesCount: nodes.length,
      edgesCount: edges.length,
      cyclesFound: cycles.length
    },
    nodes,
    edges
  };

  fs.writeFileSync(path.join(mapDir, 'graph.json'), JSON.stringify(graphData, null, 2), 'utf-8');
  console.log(`✅ Grafo 360° gerado com sucesso em .code-map/graph.json!`);
  console.log(`   - Nós identificados: ${nodes.length}`);
  console.log(`   - Conexões (arestas): ${edges.length}`);
  console.log(`   - Ciclos: ${cycles.length}`);
  return { nodes, edges, cycles };
}

function discoverProjectSeeds(projectDir, limit = 80) {
  const seeds = [];
  const skipDirs = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.code-map', '.agents', '.claude', '.cursor']);

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
        seeds.push(full);
      }
    }
  }

  // Prioriza diretórios de código de aplicação antes de varrer a raiz
  const priorityDirs = ['src', 'app', 'pages', 'server', 'lib', 'bin', 'scripts'];
  for (const d of priorityDirs) {
    const p = path.join(projectDir, d);
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) walk(p);
  }
  if (seeds.length === 0) walk(projectDir);
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

  const seeds = discoverProjectSeeds(resolvedDir, 80);
  if (seeds.length > 0) {
    const firstRel = path.relative(resolvedDir, seeds[0]).replace(/\\/g, '/');
    return traceDependencies(firstRel, resolvedDir, seeds);
  }

  const graphPath = path.join(mapDir, 'graph.json');
  if (!fs.existsSync(graphPath)) {
    const template = {
      version: '1.0.0',
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

// CLI Runner
const args = process.argv.slice(2);
const positionalArgs = args.filter((a) => !a.startsWith('--'));
const command = positionalArgs[0] || 'check';

// Para comandos sem arquivo de entrada (init, check, obsidian), o 2º argumento posicional é o diretório do projeto.
// Para comandos com arquivo (trace, tree, mermaid, callers), o 2º argumento é o arquivo e o 3º é o diretório.
const dirOnlyCommands = new Set(['init', 'check', 'obsidian']);
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
    console.log(`Uso: node cartographer.js [init|check|trace <file>|tree <file>|mermaid <file>|callers <file>|obsidian] [diretório]`);
}
