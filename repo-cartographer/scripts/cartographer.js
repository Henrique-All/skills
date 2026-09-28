#!/usr/bin/env node
/**
 * scripts/cartographer.js - Engine utilitária do Repo Cartographer
 * 
 * Executa tarefas determinísticas de I/O, cache incremental, validação de hash
 * e exportação Obsidian sem dependências externas (Zero dependencies).
 * 
 * Uso:
 *   node cartographer.js init [projectDir]
 *   node cartographer.js check [projectDir]
 *   node cartographer.js obsidian [projectDir]
 *   node cartographer.js handshake --task="desc" --entrypoint="/checkout" [projectDir]
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

function initCodeMap(projectDir) {
  const mapDir = getCodeMapDir(projectDir);
  if (!fs.existsSync(mapDir)) {
    fs.mkdirSync(mapDir, { recursive: true });
  }

  const graphPath = path.join(mapDir, 'graph.json');
  if (!fs.existsSync(graphPath)) {
    const template = {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        generator: 'repo-cartographer',
        description: 'Context IR incremental cache'
      },
      nodes: [],
      edges: []
    };
    fs.writeFileSync(graphPath, JSON.stringify(template, null, 2), 'utf-8');
    console.log(`✅ Inicializado: ${graphPath}`);
  } else {
    console.log(`ℹ️  Já existe: ${graphPath}`);
  }

  const obsidianDir = path.join(mapDir, 'obsidian');
  if (!fs.existsSync(obsidianDir)) {
    fs.mkdirSync(obsidianDir, { recursive: true });
  }
}

function checkCacheValidity(projectDir) {
  const mapDir = getCodeMapDir(projectDir);
  const graphPath = path.join(mapDir, 'graph.json');

  if (!fs.existsSync(graphPath)) {
    console.log('⚠️  Nenhum graph.json encontrado. Necessário criar mapa.');
    return { valid: false, staleNodes: [] };
  }

  try {
    const graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
    const staleNodes = [];

    for (const node of graph.nodes || []) {
      const fullPath = path.isAbsolute(node.path) ? node.path : path.join(projectDir, node.path);
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
  const mapDir = getCodeMapDir(projectDir);
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

// CLI Runner
const args = process.argv.slice(2);
const command = args[0] || 'check';
const targetDir = args.find((a) => !a.startsWith('--') && a !== command) || process.cwd();

switch (command) {
  case 'init':
    initCodeMap(targetDir);
    break;
  case 'check':
    checkCacheValidity(targetDir);
    break;
  case 'obsidian':
    exportToObsidian(targetDir);
    break;
  default:
    console.log(`Uso: node cartographer.js [init|check|obsidian] [diretório]`);
}
