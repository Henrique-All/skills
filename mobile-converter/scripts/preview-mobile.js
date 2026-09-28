#!/usr/bin/env node
/**
 * scripts/preview-mobile.js - Simulador Visual de Telas Mobile no Navegador
 * Renderiza uma moldura fidedigna de smartphone (iPhone 15 Pro / Galaxy) com seletor de
 * viewport (375px, 393px, 412px), rotação de tela e demonstração interativa dos 4 templates:
 * BottomSheet, MobileBottomNav, ResponsiveTableToCards e SwipeableRow.
 * 
 * Uso:
 *   node scripts/preview-mobile.js [--no-open] [--device=iphone15|iphonese|galaxy]
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const args = process.argv.slice(2);
const noOpen = args.includes('--no-open');
const deviceArg = args.find((a) => a.startsWith('--device='))?.split('=')[1] || 'iphone15';

const DEVICES = {
  iphone15: { name: 'iPhone 15 Pro', width: 393, height: 852, radius: 48, hasIsland: true },
  iphonese: { name: 'iPhone SE', width: 375, height: 667, radius: 36, hasIsland: false },
  galaxy: { name: 'Galaxy S24', width: 412, height: 915, radius: 44, hasIsland: false }
};

const selectedDevice = DEVICES[deviceArg] || DEVICES.iphone15;

const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Mobile Converter — Simulador de Alta Fidelidade</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-studio: #09090b;
      --card-bg: #121215;
      --border-color: rgba(255, 255, 255, 0.08);
      --accent: #3b82f6;
      --accent-hover: #2563eb;
      --text-main: #f4f4f5;
      --text-muted: #a1a1aa;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      background: var(--bg-studio);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px;
      user-select: none;
    }

    /* Barra Superior de Controle */
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      width: 100%;
      max-width: 900px;
      background: rgba(24, 24, 27, 0.8);
      backdrop-filter: blur(16px);
      border: 1px border var(--border-color);
      border-radius: 16px;
      padding: 12px 20px;
      margin-bottom: 32px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    }

    .toolbar-title {
      font-size: 15px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .device-switcher {
      display: flex;
      background: rgba(0, 0, 0, 0.4);
      border-radius: 10px;
      padding: 4px;
      gap: 4px;
    }

    .device-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .device-btn.active {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    /* Moldura do Smartphone */
    .device-frame {
      position: relative;
      width: 393px;
      height: 840px;
      background: #000;
      border-radius: 50px;
      box-shadow: 0 0 0 12px #222226, 0 0 0 14px #333338, 0 30px 80px rgba(0,0,0,0.9);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    /* Dynamic Island */
    .dynamic-island {
      position: absolute;
      top: 11px;
      left: 50%;
      transform: translateX(-50%);
      width: 120px;
      height: 32px;
      background: #000;
      border-radius: 20px;
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
    }

    .island-cam {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #111;
      border: 1px solid #222;
    }

    /* Conteúdo da Tela do Smartphone */
    .screen-content {
      width: 100%;
      height: 100%;
      background: #121215;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      position: relative;
      padding: 60px 16px 80px 16px;
    }

    /* Barra Home do iPhone */
    .home-bar {
      position: absolute;
      bottom: 8px;
      left: 50%;
      transform: translateX(-50%);
      width: 135px;
      height: 4px;
      background: rgba(255, 255, 255, 0.5);
      border-radius: 10px;
      z-index: 60;
      pointer-events: none;
    }

    /* Header Mobile */
    .mobile-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .badge-pill {
      font-size: 11px;
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      padding: 4px 10px;
      border-radius: 20px;
      font-weight: 600;
      border: 1px solid rgba(59, 130, 246, 0.25);
    }

    /* Item Deslizante (SwipeableRow) */
    .swipe-container {
      position: relative;
      margin-bottom: 12px;
      border-radius: 16px;
      overflow: hidden;
      background: #18181b;
      border: 1px solid var(--border-color);
      touch-action: pan-y;
    }

    .swipe-actions {
      position: absolute;
      inset: 0;
      display: flex;
      justify-content: flex-end;
      z-index: 1;
    }

    .swipe-act-btn {
      width: 70px;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      border: none;
      cursor: pointer;
    }

    .swipe-act-delete { background: #ef4444; }
    .swipe-act-archive { background: #3b82f6; }

    .swipe-front {
      position: relative;
      z-index: 2;
      background: #18181b;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
      cursor: grab;
    }

    .swipe-front:active { cursor: grabbing; }

    /* Feed de Cards (ResponsiveTableToCards) */
    .card-feed {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 20px;
    }

    .feed-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 14px;
      cursor: pointer;
      transition: transform 0.15s ease;
    }

    .feed-card:active { transform: scale(0.98); }

    .feed-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      margin-top: 6px;
      color: var(--text-muted);
    }

    /* Bottom Navigation Bar */
    .bottom-nav {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 65px;
      background: rgba(18, 18, 21, 0.92);
      backdrop-filter: blur(20px);
      border-top: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding-bottom: 12px;
      z-index: 40;
    }

    .nav-tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      font-size: 10px;
      color: var(--text-muted);
      cursor: pointer;
      background: none;
      border: none;
      position: relative;
      padding: 6px 14px;
    }

    .nav-tab.active { color: #fff; font-weight: 600; }
    .nav-tab.active::after {
      content: '';
      position: absolute;
      inset: 2px 4px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      z-index: -1;
    }

    /* Bottom Sheet Modal */
    .bottom-sheet {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: #18181c;
      border-top: 1px solid var(--border-color);
      border-radius: 28px 28px 0 0;
      padding: 16px 20px 32px 20px;
      z-index: 70;
      box-shadow: 0 -20px 40px rgba(0,0,0,0.7);
      transform: translateY(100%);
      transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .bottom-sheet.open { transform: translateY(0); }

    .sheet-handle {
      width: 44px;
      height: 5px;
      background: rgba(255, 255, 255, 0.25);
      border-radius: 10px;
      margin: 0 auto 16px auto;
      cursor: grab;
    }

    .sheet-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 65;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease;
    }

    .sheet-backdrop.open {
      opacity: 1;
      pointer-events: auto;
    }

    .cta-btn {
      width: 100%;
      min-height: 48px;
      background: var(--accent);
      color: #fff;
      border: none;
      border-radius: 14px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 14px;
      transition: all 0.15s ease;
    }

    .cta-btn:active { transform: scale(0.97); }
  </style>
</head>
<body>

  <!-- Barra Superior -->
  <div class="toolbar">
    <div class="toolbar-title">
      📱 <span>Mobile Converter — Simulador Interativo</span>
    </div>

    <div class="device-switcher">
      <button class="device-btn active" onclick="setDevice('iphone15', 393, 840, true)">iPhone 15 Pro</button>
      <button class="device-btn" onclick="setDevice('iphonese', 375, 667, false)">iPhone SE</button>
      <button class="device-btn" onclick="setDevice('galaxy', 412, 880, false)">Galaxy S24</button>
    </div>

    <button class="device-btn" onclick="toggleSheet()" style="background: rgba(59,130,246,0.2); color:#60a5fa;">
      ⚡ Abrir Bottom Sheet
    </button>
  </div>

  <!-- Moldura do Aparelho -->
  <div class="device-frame" id="deviceFrame">
    <!-- Dynamic Island -->
    <div class="dynamic-island" id="dynamicIsland">
      <div class="island-cam"></div>
      <div style="font-size: 9px; font-weight: 700; color: #fff;">09:41</div>
    </div>

    <!-- Barra Home do iPhone -->
    <div class="home-bar"></div>

    <!-- Fundo Translúcido do Modal -->
    <div class="sheet-backdrop" id="sheetBackdrop" onclick="toggleSheet()"></div>

    <!-- Tela com Conteúdo -->
    <div class="screen-content">
      <div class="mobile-header">
        <div>
          <h2 style="font-size: 18px; font-weight: 700; tracking-tight: -0.02em;">Checkout Móvel</h2>
          <p style="font-size: 12px; color: var(--text-muted);">Adaptação Mobile-First</p>
        </div>
        <span class="badge-pill">Mobile Score: 100</span>
      </div>

      <!-- Demonstração 1: SwipeableRow (Gesto Lateral) -->
      <p style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--text-muted); margin-bottom: 8px;">
        👆 Arraste para a esquerda (SwipeableRow):
      </p>

      <div class="swipe-container" id="swipeItem">
        <div class="swipe-actions">
          <button class="swipe-act-btn swipe-act-archive" onclick="alert('Arquivado!')">Arquivar</button>
          <button class="swipe-act-btn swipe-act-delete" onclick="alert('Excluído!')">Excluir</button>
        </div>
        <div class="swipe-front" id="swipeFront">
          <div>
            <div style="font-size: 14px; font-weight: 600;">Plano Enterprise Anual</div>
            <div style="font-size: 12px; color: var(--text-muted);">Renovação automática • Ativo</div>
          </div>
          <div style="font-weight: 700; font-size: 14px;">R$ 290</div>
        </div>
      </div>

      <!-- Demonstração 2: ResponsiveTableToCards -->
      <p style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: var(--text-muted); margin: 16px 0 8px 0;">
        📊 Metamorfose: Tabela ➔ Cards Táteis:
      </p>

      <div class="card-feed">
        <div class="feed-card" onclick="toggleSheet()">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="font-size: 14px;">Pedido #8942</strong>
            <span style="font-size: 11px; background: rgba(16,185,129,0.15); color: #34d399; padding: 2px 8px; border-radius: 12px; font-weight: 600;">Pago</span>
          </div>
          <div class="feed-row"><span>Cliente:</span> <strong style="color: #fff;">Acme Corp</strong></div>
          <div class="feed-row"><span>Data:</span> <strong>28/09/2026</strong></div>
          <div class="feed-row"><span>Total:</span> <strong style="color: #60a5fa;">R$ 1.450,00</strong></div>
        </div>

        <div class="feed-card" onclick="toggleSheet()">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="font-size: 14px;">Pedido #8941</strong>
            <span style="font-size: 11px; background: rgba(245,158,11,0.15); color: #fbbf24; padding: 2px 8px; border-radius: 12px; font-weight: 600;">Pendente</span>
          </div>
          <div class="feed-row"><span>Cliente:</span> <strong style="color: #fff;">Stripe Inc</strong></div>
          <div class="feed-row"><span>Data:</span> <strong>27/09/2026</strong></div>
          <div class="feed-row"><span>Total:</span> <strong style="color: #60a5fa;">R$ 890,00</strong></div>
        </div>
      </div>

      <button class="cta-btn" onclick="toggleSheet()">
        Ver Detalhes no Bottom Sheet
      </button>
    </div>

    <!-- Demonstração 3: BottomSheet com Puxador -->
    <div class="bottom-sheet" id="bottomSheet">
      <div class="sheet-handle" onclick="toggleSheet()"></div>
      <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 6px;">Detalhes do Pedido #8942</h3>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
        Puxador tátil com gesto de arraste para fechar (drag="y").
      </p>

      <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 12px; font-size: 13px; margin-bottom: 16px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;"><span>Itens:</span><strong>3 licenças Pro</strong></div>
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;"><span>Método:</span><strong>PIX Instantâneo</strong></div>
        <div style="display:flex; justify-content:space-between;"><span>Status:</span><strong style="color:#34d399;">Aprovado</strong></div>
      </div>

      <button class="cta-btn" onclick="toggleSheet()" style="background: #27272a;">
        Fechar Bottom Sheet
      </button>
    </div>

    <!-- Demonstração 4: MobileBottomNav -->
    <nav class="bottom-nav">
      <button class="nav-tab active" onclick="switchNav(this)">
        <span>🏠</span><span>Início</span>
      </button>
      <button class="nav-tab" onclick="switchNav(this)">
        <span>📦</span><span>Pedidos</span>
      </button>
      <button class="nav-tab" onclick="switchNav(this)">
        <span>💳</span><span>Cartões</span>
      </button>
      <button class="nav-tab" onclick="switchNav(this)">
        <span>👤</span><span>Perfil</span>
      </button>
    </nav>
  </div>

  <script>
    function setDevice(device, width, height, hasIsland) {
      const frame = document.getElementById('deviceFrame');
      const island = document.getElementById('dynamicIsland');
      frame.style.width = width + 'px';
      frame.style.height = height + 'px';
      island.style.display = hasIsland ? 'flex' : 'none';

      document.querySelectorAll('.device-btn').forEach(b => b.classList.remove('active'));
      event.target.classList.add('active');
    }

    function toggleSheet() {
      const sheet = document.getElementById('bottomSheet');
      const backdrop = document.getElementById('sheetBackdrop');
      sheet.classList.toggle('open');
      backdrop.classList.toggle('open');
    }

    function switchNav(btn) {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
    }

    // Interação de Swipe Horizontal com Mouse/Touch
    const swipeFront = document.getElementById('swipeFront');
    let startX = 0;
    let currentX = 0;
    let isSwiping = false;

    swipeFront.addEventListener('pointerdown', (e) => {
      startX = e.clientX;
      isSwiping = true;
      swipeFront.setPointerCapture(e.pointerId);
    });

    swipeFront.addEventListener('pointermove', (e) => {
      if (!isSwiping) return;
      const diff = e.clientX - startX;
      if (diff <= 0 && diff >= -140) {
        currentX = diff;
        swipeFront.style.transform = 'translateX(' + diff + 'px)';
      }
    });

    swipeFront.addEventListener('pointerup', (e) => {
      isSwiping = false;
      if (currentX < -60) {
        swipeFront.style.transform = 'translateX(-140px)';
      } else {
        swipeFront.style.transform = 'translateX(0px)';
      }
    });
  </script>
</body>
</html>
`;

const previewDir = path.resolve(process.cwd(), '.mobile-preview');
if (!fs.existsSync(previewDir)) {
  fs.mkdirSync(previewDir, { recursive: true });
}

const previewFile = path.join(previewDir, 'preview.html');
fs.writeFileSync(previewFile, htmlContent, 'utf-8');

console.log('===============================================================');
console.log('📱 MOBILE CONVERTER — PREVIEW INTERATIVO GERADO COM SUCESSO');
console.log('===============================================================');
console.log(`📁 Arquivo gerado: ${previewFile}`);
console.log(`🎯 Dispositivo padrão: ${selectedDevice.name} (${selectedDevice.width}x${selectedDevice.height})`);

if (!noOpen) {
  const startCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  console.log('🚀 Abrindo simulador no navegador padrão...\n');
  exec(`${startCmd} "" "${previewFile}"`);
} else {
  console.log('ℹ️  Abertura automática desativada via --no-open.\n');
}
