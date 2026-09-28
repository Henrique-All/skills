#!/usr/bin/env node
/**
 * scripts/preview-graph.js - Visualizador Interativo de Arquitetura 360° no Navegador
 * Cria um ambiente visual interativo local (canvas SVG) onde o desenvolvedor pode
 * arrastar nós, filtrar por camadas (UI, Estado, API, Backend, DB, Infra) e iluminar fluxos.
 * 
 * Uso:
 *   node scripts/preview-graph.js [--no-open]
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const args = process.argv.slice(2);
const noOpen = args.includes('--no-open');

const codeMapDir = path.resolve(process.cwd(), '.code-map');
const graphFile = path.join(codeMapDir, 'graph.json');

let graphData = {
  version: '1.0.0',
  nodes: [
    { id: 'CheckoutView.tsx', type: 'UI Component', layer: 1, status: 'confirmed' },
    { id: 'useCart.ts', type: 'State Hook', layer: 2, status: 'confirmed' },
    { id: 'POST /api/orders', type: 'HTTP Endpoint', layer: 3, status: 'confirmed' },
    { id: 'OrderController.ts', type: 'Backend Controller', layer: 4, status: 'confirmed' },
    { id: 'OrderService.ts', type: 'Domain Service', layer: 4, status: 'confirmed' },
    { id: 'orders_table', type: 'Database Table', layer: 5, status: 'confirmed' },
    { id: 'order-queue (Redis)', type: 'Message Broker', layer: 6, status: 'inferred' }
  ],
  edges: [
    { source: 'CheckoutView.tsx', target: 'useCart.ts', relation: 'uses state', status: 'confirmed' },
    { source: 'useCart.ts', target: 'POST /api/orders', relation: 'calls endpoint', status: 'confirmed' },
    { source: 'POST /api/orders', target: 'OrderController.ts', relation: 'handled by', status: 'confirmed' },
    { source: 'OrderController.ts', target: 'OrderService.ts', relation: 'invokes service', status: 'confirmed' },
    { source: 'OrderService.ts', target: 'orders_table', relation: 'inserts record', status: 'confirmed' },
    { source: 'OrderService.ts', target: 'order-queue (Redis)', relation: 'dispatches event', status: 'inferred' }
  ]
};

if (fs.existsSync(graphFile)) {
  try {
    const raw = JSON.parse(fs.readFileSync(graphFile, 'utf-8'));
    if (raw.nodes && raw.nodes.length > 0) {
      graphData = raw;
    }
  } catch {}
}

const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Repo Cartographer — Canvas 360°</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #09090b;
      --card: #121215;
      --border: rgba(255, 255, 255, 0.08);
      --accent: #3b82f6;
      --text: #f4f4f5;
      --muted: #a1a1aa;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: var(--bg);
      color: var(--text);
      overflow: hidden;
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      height: 60px;
      border-bottom: 1px solid var(--border);
      background: rgba(18, 18, 21, 0.85);
      backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      z-index: 100;
    }
    .logo { font-weight: 700; font-size: 16px; display: flex; align-items: center; gap: 8px; }
    .layers-bar { display: flex; gap: 8px; font-size: 12px; }
    .layer-badge {
      padding: 4px 10px;
      border-radius: 8px;
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--border);
      color: var(--muted);
      cursor: pointer;
    }
    .layer-badge.active { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border-color: rgba(59, 130, 246, 0.4); }
    #canvas-container { flex: 1; position: relative; background: radial-gradient(circle at 50% 50%, #15151a 0%, #09090b 100%); }
    svg { width: 100%; height: 100%; cursor: grab; }
    svg:active { cursor: grabbing; }
    .node-group { cursor: pointer; transition: transform 0.1s ease; }
    .node-rect {
      fill: #141418;
      stroke: var(--border);
      stroke-width: 1.5;
      rx: 14;
      filter: drop-shadow(0 8px 16px rgba(0,0,0,0.4));
    }
    .node-title { fill: #fff; font-size: 13px; font-weight: 600; font-family: 'JetBrains Mono', monospace; }
    .node-sub { fill: var(--muted); font-size: 11px; }
    .edge-line { stroke: rgba(255, 255, 255, 0.2); stroke-width: 2; fill: none; marker-end: url(#arrow); }
    .edge-text { fill: #71717a; font-size: 10px; text-anchor: middle; font-family: monospace; }
  </style>
</head>
<body>
  <header>
    <div class="logo">🗺️ <span>Repo Cartographer 360° Visualizer</span></div>
    <div class="layers-bar">
      <span class="layer-badge active">L1: UI</span>
      <span class="layer-badge active">L2: Estado</span>
      <span class="layer-badge active">L3: API</span>
      <span class="layer-badge active">L4: Backend</span>
      <span class="layer-badge active">L5: Banco</span>
      <span class="layer-badge active">L6: Infra</span>
    </div>
    <div style="font-size: 12px; color: var(--muted);">Arraste nós com o mouse</div>
  </header>

  <div id="canvas-container">
    <svg id="svgGraph">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255, 255, 255, 0.4)" />
        </marker>
      </defs>
      <g id="edgesGroup"></g>
      <g id="nodesGroup"></g>
    </svg>
  </div>

  <script>
    const data = ${JSON.stringify(graphData)};
    const svg = document.getElementById('svgGraph');
    const nodesGroup = document.getElementById('nodesGroup');
    const edgesGroup = document.getElementById('edgesGroup');

    // Layout inicial por camadas horizontais
    const layerX = { 1: 80, 2: 300, 3: 520, 4: 740, 5: 960, 6: 1180 };
    const nodesPos = {};

    data.nodes.forEach((n, idx) => {
      const lx = layerX[n.layer] || 200 + (n.layer * 180);
      const ly = 120 + ((idx % 4) * 140);
      nodesPos[n.id] = { x: lx, y: ly, data: n };
    });

    function render() {
      edgesGroup.innerHTML = '';
      nodesGroup.innerHTML = '';

      // Renderizar Edges
      data.edges.forEach(e => {
        const s = nodesPos[e.source];
        const t = nodesPos[e.target];
        if (!s || !t) return;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const d = \`M \${s.x + 90} \${s.y + 35} C \${s.x + 90 + dx/2} \${s.y + 35}, \${s.x + 90 + dx/2} \${t.y + 35}, \${t.x} \${t.y + 35}\`;
        path.setAttribute('d', d);
        path.setAttribute('class', 'edge-line');
        edgesGroup.appendChild(path);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', s.x + 90 + dx/2);
        text.setAttribute('y', (s.y + t.y)/2 + 25);
        text.setAttribute('class', 'edge-text');
        text.textContent = e.relation;
        edgesGroup.appendChild(text);
      });

      // Renderizar Nodes
      Object.keys(nodesPos).forEach(id => {
        const pos = nodesPos[id];
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'node-group');
        g.setAttribute('transform', \`translate(\${pos.x}, \${pos.y})\`);

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('class', 'node-rect');
        rect.setAttribute('width', '180');
        rect.setAttribute('height', '70');

        const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        title.setAttribute('class', 'node-title');
        title.setAttribute('x', '16');
        title.setAttribute('y', '30');
        title.textContent = id.length > 18 ? id.substring(0, 16) + '...' : id;

        const sub = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        sub.setAttribute('class', 'node-sub');
        sub.setAttribute('x', '16');
        sub.setAttribute('y', '50');
        sub.textContent = \`L\${pos.data.layer} • \${pos.data.type}\`;

        g.appendChild(rect);
        g.appendChild(title);
        g.appendChild(sub);

        // Arraste com mouse
        let isDragging = false;
        let startX, startY;

        g.addEventListener('mousedown', (evt) => {
          isDragging = true;
          startX = evt.clientX - pos.x;
          startY = evt.clientY - pos.y;
        });

        window.addEventListener('mousemove', (evt) => {
          if (!isDragging) return;
          pos.x = evt.clientX - startX;
          pos.y = evt.clientY - startY;
          g.setAttribute('transform', \`translate(\${pos.x}, \${pos.y})\`);
          renderEdges();
        });

        window.addEventListener('mouseup', () => { isDragging = false; });

        nodesGroup.appendChild(g);
      });
    }

    function renderEdges() {
      edgesGroup.innerHTML = '';
      data.edges.forEach(e => {
        const s = nodesPos[e.source];
        const t = nodesPos[e.target];
        if (!s || !t) return;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const dx = t.x - s.x;
        const d = \`M \${s.x + 90} \${s.y + 35} C \${s.x + 90 + dx/2} \${s.y + 35}, \${s.x + 90 + dx/2} \${t.y + 35}, \${t.x} \${t.y + 35}\`;
        path.setAttribute('d', d);
        path.setAttribute('class', 'edge-line');
        edgesGroup.appendChild(path);
      });
    }

    render();
  </script>
</body>
</html>
`;

if (!fs.existsSync(codeMapDir)) {
  fs.mkdirSync(codeMapDir, { recursive: true });
}

const previewFile = path.join(codeMapDir, 'preview.html');
fs.writeFileSync(previewFile, htmlContent, 'utf-8');

console.log('===============================================================');
console.log('🗺️  REPO CARTOGRAPHER — CANVAS 360° GERADO COM SUCESSO');
console.log('===============================================================');
console.log(`📁 Arquivo gerado: ${previewFile}`);
console.log(`📊 Nós no grafo: ${graphData.nodes.length} | Conexões: ${graphData.edges.length}`);

if (!noOpen) {
  const startCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  console.log('🚀 Abrindo canvas de arquitetura no navegador padrão...\n');
  exec(`${startCmd} "" "${previewFile}"`);
} else {
  console.log('ℹ️  Abertura automática desativada via --no-open.\n');
}
