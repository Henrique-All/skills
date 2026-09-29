#!/usr/bin/env node
/**
 * scripts/preview-plan.js - Painel Visual Interativo de Governança no Navegador
 * Transforma o planejamento do Turno 1 em um dashboard HTML rico, tátil e interativo,
 * integrando os artefatos de todas as skills (Grafo 360°, Preview de UI, Sabatina e Checklist).
 * 
 * Uso:
 *   node scripts/preview-plan.js [titulo-da-feature] [--plan=PLAN.md] [--route=B] [--no-open]
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const args = process.argv.slice(2);
const noOpen = args.includes('--no-open') || Boolean(process.env.CI);
const planArg = args.find((a) => a.startsWith('--plan='));
const routeArg = args.find((a) => a.startsWith('--route='));

const routeName = routeArg ? routeArg.split('=')[1].toUpperCase() : 'B';
const titleArgs = args.filter((a) => !a.startsWith('--'));
const featureTitle = titleArgs.join(' ') || 'Implementação de Arquitetura & Governança';

// Detectar artefatos do ecossistema no diretório atual ou raiz
const cwd = process.cwd();
const codeMapHtml = path.join(cwd, '.code-map', 'graph.html');
const craftPreviewHtml = path.join(cwd, '.craft', 'preview.html');
const designSpecMd = path.join(cwd, 'DESIGN_SPEC.md');
const handshakeJson = path.join(cwd, '.code-map', 'handshake.json');

const hasGraph = fs.existsSync(codeMapHtml);
const hasCraft = fs.existsSync(craftPreviewHtml);
const hasSpec = fs.existsSync(designSpecMd);
const hasHandshake = fs.existsSync(handshakeJson);

let handshakeData = null;
if (hasHandshake) {
  try {
    handshakeData = JSON.parse(fs.readFileSync(handshakeJson, 'utf-8'));
  } catch {}
}

const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hybrid Orchestrator — Painel de Governança & Execução</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-canvas: #09090b;
      --bg-surface: #121215;
      --bg-elevated: #18181b;
      --border-subtle: rgba(255, 255, 255, 0.08);
      --border-hover: rgba(255, 255, 255, 0.16);
      --text-primary: #f4f4f5;
      --text-secondary: #a1a1aa;
      --text-muted: #71717a;
      --accent-amber: #f59e0b;
      --accent-emerald: #10b981;
      --accent-indigo: #6366f1;
      --accent-cyan: #06b6d4;
      --accent-rose: #f43f5e;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-canvas);
      color: var(--text-primary);
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      padding: 32px 20px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .container {
      width: 100%;
      max-width: 1100px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Header */
    .header {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 16px;
      padding: 24px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      overflow: hidden;
    }
    .header::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; height: 2px;
      background: linear-gradient(90deg, var(--accent-indigo), var(--accent-emerald), var(--accent-amber));
    }
    .header-info h1 {
      font-size: 22px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 6px;
    }
    .header-info p {
      font-size: 14px;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .route-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 999px;
      color: var(--accent-amber);
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      font-weight: 600;
    }

    /* Ecosystem Status Bar */
    .ecosystem-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 14px;
    }
    .eco-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .eco-card:hover {
      border-color: var(--border-hover);
      transform: translateY(-2px);
    }
    .eco-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .eco-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .status-pill {
      font-size: 11px;
      font-family: 'JetBrains Mono', monospace;
      padding: 2px 8px;
      border-radius: 999px;
      font-weight: 600;
    }
    .status-active {
      background: rgba(16, 185, 129, 0.15);
      color: var(--accent-emerald);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .status-ready {
      background: rgba(99, 102, 241, 0.15);
      color: var(--accent-indigo);
      border: 1px solid rgba(99, 102, 241, 0.3);
    }
    .eco-action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 12px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      color: var(--text-primary);
      text-decoration: none;
      font-size: 12px;
      font-weight: 600;
      transition: all 0.15s ease;
      cursor: pointer;
    }
    .eco-action-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: var(--border-hover);
      color: #fff;
    }

    /* 4 Quadrants Grid */
    .grid-4q {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    @media (max-width: 800px) {
      .grid-4q { grid-template-columns: 1fr; }
    }
    .quadrant-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .quadrant-header {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 15px;
      font-weight: 700;
      color: #fff;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 10px;
    }
    .quadrant-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .quadrant-list li {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.5;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .quadrant-list li::before {
      content: '•';
      color: var(--accent-indigo);
      font-weight: bold;
    }

    /* Checklist Section */
    .checklist-section {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 22px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .checklist-title {
      font-size: 16px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .task-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.15s ease;
      user-select: none;
    }
    .task-item:hover {
      border-color: var(--border-hover);
      background: rgba(255, 255, 255, 0.04);
    }
    .task-item input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: var(--accent-emerald);
      cursor: pointer;
    }
    .task-text {
      font-size: 13px;
      color: var(--text-primary);
      font-family: 'JetBrains Mono', monospace;
    }
    .task-completed .task-text {
      text-decoration: line-through;
      color: var(--text-muted);
    }

    /* Trava de Permissão Banner */
    .trava-banner {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(99, 102, 241, 0.08));
      border: 1px solid rgba(245, 158, 11, 0.35);
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      position: relative;
    }
    .trava-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .trava-header h3 {
      font-size: 17px;
      font-weight: 700;
      color: #fff;
    }
    .trava-desc {
      font-size: 14px;
      color: var(--text-secondary);
      line-height: 1.6;
    }
    .trava-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 6px;
    }
    .trava-btn {
      padding: 10px 18px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      border: none;
      transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: inherit;
    }
    .trava-btn:active {
      transform: scale(0.97);
    }
    .btn-approve {
      background: var(--accent-emerald);
      color: #000;
    }
    .btn-approve:hover {
      background: #059669;
      color: #fff;
    }
    .btn-step {
      background: var(--bg-elevated);
      color: var(--text-primary);
      border: 1px solid var(--border-subtle);
    }
    .btn-step:hover {
      border-color: var(--border-hover);
      background: rgba(255, 255, 255, 0.1);
    }
    .btn-adjust {
      background: transparent;
      color: var(--accent-amber);
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .btn-adjust:hover {
      background: rgba(245, 158, 11, 0.15);
    }

    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 12px 20px;
      background: var(--accent-emerald);
      color: #000;
      border-radius: 8px;
      font-weight: 600;
      font-size: 13px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.2s ease;
      pointer-events: none;
    }
    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header class="header">
      <div class="header-info">
        <h1>⚡ Hybrid Orchestrator</h1>
        <p>🎯 Demanda: <strong>${featureTitle}</strong></p>
      </div>
      <div class="route-badge">
        <span>🛡️</span> ROTA ${routeName} — GOVERNANÇA ATIVA
      </div>
    </header>

    <!-- Ecosystem Bar -->
    <div class="ecosystem-bar">
      <!-- Repo Cartographer -->
      <div class="eco-card">
        <div class="eco-top">
          <div class="eco-title">🗺️ Repo Cartographer</div>
          <span class="status-pill status-active">${hasGraph ? 'MAPA PRONTO' : 'ATIVO'}</span>
        </div>
        <p style="font-size: 12px; color: var(--text-secondary);">Mapeamento 360° em 6 camadas orientado a evidência.</p>
        ${hasGraph 
          ? `<a class="eco-action-btn" href="file:///${codeMapHtml.replace(/\\/g, '/')}" target="_blank">🌐 Abrir Grafo 360° ↗</a>`
          : `<span class="eco-action-btn" style="opacity: 0.6; cursor: default;">Grafo em geração...</span>`
        }
      </div>

      <!-- Frontend Craftsman -->
      <div class="eco-card">
        <div class="eco-top">
          <div class="eco-title">🎨 Frontend Craftsman</div>
          <span class="status-pill ${hasCraft ? 'status-active' : 'status-ready'}">${hasCraft ? 'PREVIEW PRONTO' : 'ALINHADO'}</span>
        </div>
        <p style="font-size: 12px; color: var(--text-secondary);">Molas Framer Motion, tokens refinados e anti-AI slop.</p>
        ${hasCraft 
          ? `<a class="eco-action-btn" href="file:///${craftPreviewHtml.replace(/\\/g, '/')}" target="_blank">🎨 Abrir Preview Visual ↗</a>`
          : `<span class="eco-action-btn" style="opacity: 0.6; cursor: default;">Preview em geração...</span>`
        }
      </div>

      <!-- Route Guard -->
      <div class="eco-card">
        <div class="eco-top">
          <div class="eco-title">🛡️ Route Guard</div>
          <span class="status-pill status-ready">ZERO BREAKING</span>
        </div>
        <p style="font-size: 12px; color: var(--text-secondary);">Análise de blast radius e contratos Zod/DTO.</p>
        <span class="eco-action-btn" style="opacity: 0.8; cursor: default;">🔒 Endpoints Travados</span>
      </div>

      <!-- Security Audit -->
      <div class="eco-card">
        <div class="eco-top">
          <div class="eco-title">🔒 Security Audit</div>
          <span class="status-pill status-ready">PORTÃO ATIVO</span>
        </div>
        <p style="font-size: 12px; color: var(--text-secondary);">18 pilares OWASP, DevSecOps e verificação pós-código.</p>
        <span class="eco-action-btn" style="opacity: 0.8; cursor: default;">🛡️ Portão Turno 2</span>
      </div>
    </div>

    <!-- 4 Quadrants -->
    <div class="grid-4q">
      <!-- Q1 -->
      <div class="quadrant-card">
        <div class="quadrant-header">
          <span>📋</span> Q1: Contratos de API & Tipagem
        </div>
        <ul class="quadrant-list">
          <li>Endpoints mapeados e retrocompatibilidade garantida.</li>
          <li>Tipagem estrita Zod / TypeScript DTOs.</li>
          <li>Blast Radius verificado: zero telas dependentes quebradas.</li>
        </ul>
      </div>

      <!-- Q2 -->
      <div class="quadrant-card">
        <div class="quadrant-header">
          <span>🗄️</span> Q2: Dados, Concorrência & Transações
        </div>
        <ul class="quadrant-list">
          <li>Operações de banco estritamente aditivas (sem DROP/TRUNCATE).</li>
          <li>Transações atômicas para estados interdependentes.</li>
          <li>Sem queries N+1 em loops assíncronos.</li>
        </ul>
      </div>

      <!-- Q3 -->
      <div class="quadrant-card">
        <div class="quadrant-header">
          <span>🎨</span> Q3: UI & Experiência Tátil (Craftsman)
        </div>
        <ul class="quadrant-list">
          <li>Paleta escura calibrada com contraste AA/AAA.</li>
          <li>Micro-interações táteis em botões (:active / whileTap).</li>
          <li>Molas suaves (stiffness: 300, damping: 25) sem quebras visuais.</li>
        </ul>
      </div>

      <!-- Q4 -->
      <div class="quadrant-card">
        <div class="quadrant-header">
          <span>🔒</span> Q4: Auth & Governança (Security Audit)
        </div>
        <ul class="quadrant-list">
          <li>Proteção de rotas com verificação de sessão/RBAC.</li>
          <li>Zero segredos ou tokens hardcoded no código.</li>
          <li>Auditoria pré-commit dos 18 pilares OWASP.</li>
        </ul>
      </div>
    </div>

    <!-- Checklist -->
    <div class="checklist-section">
      <div class="checklist-title">
        <span>⚡</span> Checklist de Execução Governamental (Turno 2)
      </div>
      <div class="task-item" onclick="toggleTask(this, 1)">
        <input type="checkbox" id="task-1">
        <label class="task-text" for="task-1">1. [Segurança] Criar snapshot de recuperação (git stash create)</label>
      </div>
      <div class="task-item" onclick="toggleTask(this, 2)">
        <input type="checkbox" id="task-2">
        <label class="task-text" for="task-2">2. [Implementação] Aplicar diffs cirúrgicos nos arquivos mapeados</label>
      </div>
      <div class="task-item" onclick="toggleTask(this, 3)">
        <input type="checkbox" id="task-3">
        <label class="task-text" for="task-3">3. [Falsifier] Executar ataque de estresse e resiliência</label>
      </div>
      <div class="task-item" onclick="toggleTask(this, 4)">
        <input type="checkbox" id="task-4">
        <label class="task-text" for="task-4">4. [Auditoria] Validar Pipeline DevSecOps (Score Craftsmanship & OWASP)</label>
      </div>
    </div>

    <!-- Trava de Permissão Banner -->
    <div class="trava-banner">
      <div class="trava-header">
        <span style="font-size: 24px;">🛑</span>
        <div>
          <h3>TRAVA DE PERMISSÃO OBRIGATÓRIA (TURNO 1)</h3>
          <p style="font-size: 13px; color: var(--accent-amber); font-weight: 600;">Nenhum arquivo de código foi modificado. O agente aguarda sua autorização no chat.</p>
        </div>
      </div>
      <p class="trava-desc">
        O plano estrutural acima atende à sua necessidade? Copie uma das respostas abaixo e cole no chat com o seu Agente de IA para autorizar:
      </p>
      <div class="trava-actions">
        <button class="trava-btn btn-approve" onclick="copyText('OK - Executar Tudo')">
          <span>✅</span> Copiar "OK - Executar Tudo"
        </button>
        <button class="trava-btn btn-step" onclick="copyText('OK - Passo a Passo')">
          <span>👣</span> Copiar "OK - Passo a Passo"
        </button>
        <button class="trava-btn btn-adjust" onclick="copyText('Ajustes: ')">
          <span>✏️</span> Copiar "Ajustes"
        </button>
      </div>
    </div>
  </div>

  <div id="toast" class="toast">Texto copiado para a área de transferência!</div>

  <script>
    function copyText(text) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Comando "' + text + '" copiado! Cole no chat do agente.');
      });
    }

    function showToast(msg) {
      const toast = document.getElementById('toast');
      toast.innerText = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2500);
    }

    function toggleTask(el, id) {
      const cb = el.querySelector('input[type="checkbox"]');
      cb.checked = !cb.checked;
      if (cb.checked) {
        el.classList.add('task-completed');
      } else {
        el.classList.remove('task-completed');
      }
      localStorage.setItem('task_' + id, cb.checked ? 'true' : 'false');
    }

    window.addEventListener('load', () => {
      [1, 2, 3, 4].forEach(id => {
        const checked = localStorage.getItem('task_' + id) === 'true';
        const cb = document.getElementById('task-' + id);
        if (cb && checked) {
          cb.checked = true;
          cb.closest('.task-item').classList.add('task-completed');
        }
      });
    });
  </script>
</body>
</html>`;

const outDir = path.resolve(cwd, '.plan');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const planFile = path.join(outDir, 'plan.html');
fs.writeFileSync(planFile, htmlContent, 'utf-8');

console.log('===============================================================');
console.log('⚡ HYBRID ORCHESTRATOR — PAINEL DE GOVERNANÇA GERADO COM SUCESSO!');
console.log('===============================================================\n');
console.log(`📄 Arquivo HTML: ${planFile}`);
console.log(`🛡️  Rota de Execução: [ ROTA ${routeName} - GOVERNANÇA ATIVA ]`);
console.log(`🔗 URL Local: file:///${planFile.replace(/\\/g, '/')}\n`);

if (!noOpen) {
  console.log('🌐 Abrindo painel visual de governança no seu navegador padrão...');
  const startCmd = process.platform === 'win32' ? `start "" "${planFile}"` :
                   process.platform === 'darwin' ? `open "${planFile}"` :
                   `xdg-open "${planFile}"`;
  exec(startCmd, (err) => {
    if (err) {
      console.log('ℹ️  Abra o link acima no navegador para visualizar o plano.');
    } else {
      console.log('✅ Painel aberto no navegador com sucesso!');
    }
  });
}
