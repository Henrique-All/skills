#!/usr/bin/env node
/**
 * scripts/preview-spec.js - Gerador de Preview Visual Instantâneo no Navegador
 * Cria um ambiente HTML interativo local e abre no navegador em 1 segundo
 * para que o usuário veja a paleta, os botões táteis e as molas antes de aprovar.
 * 
 * Uso:
 *   node scripts/preview-spec.js [DESIGN_SPEC.md] [--preset=linear-dark] [--no-open]
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const args = process.argv.slice(2);
const specArg = args.find((a) => !a.startsWith('--'));
const presetArg = args.find((a) => a.startsWith('--preset='));
const noOpen = args.includes('--no-open');

const PRESETS = {
  'linear-dark': {
    name: 'Linear Dark (Zinc Profundo + Amber Warm)',
    bgCanvas: '#09090b',
    bgSurface: '#121215',
    bgElevated: '#18181b',
    borderSubtle: 'rgba(255, 255, 255, 0.08)',
    borderHover: 'rgba(255, 255, 255, 0.16)',
    textPrimary: '#f4f4f5',
    textSecondary: '#a1a1aa',
    textMuted: '#71717a',
    accent: '#f59e0b',
    accentHover: '#d97706',
    innerHighlight: 'rgba(255, 255, 255, 0.06)',
    isDark: true
  },
  'supabase-emerald': {
    name: 'Supabase Emerald (Grafite + Esmeralda Pura)',
    bgCanvas: '#0c0e12',
    bgSurface: '#15181e',
    bgElevated: '#1c2028',
    borderSubtle: 'rgba(255, 255, 255, 0.07)',
    borderHover: 'rgba(255, 255, 255, 0.14)',
    textPrimary: '#ededed',
    textSecondary: '#9ba1a6',
    textMuted: '#687076',
    accent: '#10b981',
    accentHover: '#059669',
    innerHighlight: 'rgba(255, 255, 255, 0.05)',
    isDark: true
  },
  'raycast-obsidian': {
    name: 'Raycast Obsidian (Preto Técnico + Crimson)',
    bgCanvas: '#0a0a0c',
    bgSurface: '#141418',
    bgElevated: '#1d1d23',
    borderSubtle: 'rgba(255, 255, 255, 0.08)',
    borderHover: 'rgba(255, 255, 255, 0.18)',
    textPrimary: '#ffffff',
    textSecondary: '#a0a0aa',
    textMuted: '#52525b',
    accent: '#f43f5e',
    accentHover: '#e11d48',
    innerHighlight: 'rgba(255, 255, 255, 0.07)',
    isDark: true
  },
  'apple-neutral': {
    name: 'Apple Neutral (Cinza Espacial + Azul Cirúrgico)',
    bgCanvas: '#000000',
    bgSurface: '#161618',
    bgElevated: '#212124',
    borderSubtle: 'rgba(255, 255, 255, 0.10)',
    borderHover: 'rgba(255, 255, 255, 0.22)',
    textPrimary: '#f5f5f7',
    textSecondary: '#86868b',
    textMuted: '#6e6e73',
    accent: '#2997ff',
    accentHover: '#0077ed',
    innerHighlight: 'rgba(255, 255, 255, 0.12)',
    isDark: true
  },
  'stripe-clean-light': {
    name: 'Stripe Clean Light (Off-White + Azul Royal Crisp)',
    bgCanvas: '#f8fafc',
    bgSurface: '#ffffff',
    bgElevated: '#ffffff',
    borderSubtle: 'rgba(0, 0, 0, 0.08)',
    borderHover: 'rgba(0, 0, 0, 0.16)',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    accent: '#0048e5',
    accentHover: '#0038b8',
    innerHighlight: 'rgba(0, 0, 0, 0.03)',
    isDark: false
  },
  'apple-pure-light': {
    name: 'Apple Pure Light (Cinza Cerâmica + Azul Apple Tátil)',
    bgCanvas: '#f5f5f7',
    bgSurface: '#ffffff',
    bgElevated: '#ffffff',
    borderSubtle: 'rgba(0, 0, 0, 0.06)',
    borderHover: 'rgba(0, 0, 0, 0.14)',
    textPrimary: '#1d1d1f',
    textSecondary: '#6e6e73',
    textMuted: '#86868b',
    accent: '#0071e3',
    accentHover: '#0058b0',
    innerHighlight: 'rgba(0, 0, 0, 0.02)',
    isDark: false
  }
};

let selectedPreset = 'linear-dark';
if (presetArg) {
  selectedPreset = presetArg.split('=')[1];
} else if (specArg && fs.existsSync(specArg)) {
  const content = fs.readFileSync(specArg, 'utf-8');
  for (const key of Object.keys(PRESETS)) {
    if (content.toLowerCase().includes(key)) {
      selectedPreset = key;
      break;
    }
  }
}

const p = PRESETS[selectedPreset] || PRESETS['linear-dark'];

const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Frontend Craftsman — Visual Design Preview</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-canvas: ${p.bgCanvas};
      --bg-surface: ${p.bgSurface};
      --bg-elevated: ${p.bgElevated};
      --border-subtle: ${p.borderSubtle};
      --border-hover: ${p.borderHover};
      --text-primary: ${p.textPrimary};
      --text-secondary: ${p.textSecondary};
      --text-muted: ${p.textMuted};
      --accent: ${p.accent};
      --accent-hover: ${p.accentHover};
      --inner-highlight: ${p.innerHighlight};
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-canvas);
      color: var(--text-primary);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      padding: 40px 24px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      transition: background-color 0.2s ease;
    }

    .container { max-width: 960px; width: 100%; }

    header {
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    h1 {
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.02em;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 500;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
    }

    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 8px var(--accent);
    }

    .grid-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }

    .card {
      background-color: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      box-shadow: inset 0 1px 0 0 var(--inner-highlight);
      border-radius: 14px;
      padding: 24px;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s ease;
    }

    .card:hover {
      border-color: var(--border-hover);
      transform: translateY(-2px);
    }

    .spotlight-overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.25s ease;
    }

    .card:hover .spotlight-overlay { opacity: 1; }

    .section-title {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
      margin-bottom: 16px;
    }

    /* Paleta Swatches */
    .swatches {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 10px;
      margin-top: 12px;
    }

    .swatch {
      padding: 12px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle);
      cursor: pointer;
      font-size: 11px;
      font-weight: 500;
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: transform 0.15s ease;
    }

    .swatch:hover { transform: scale(1.03); }
    .swatch-color { height: 28px; border-radius: 4px; margin-bottom: 4px; border: 1px solid rgba(0,0,0,0.1); }

    /* Interactive Buttons */
    .btn-group { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
    
    .btn {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: none;
      outline: none;
      user-select: none;
      transition: transform 0.12s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.15s ease;
    }

    .btn:active { transform: scale(0.97); }

    .btn-primary {
      background-color: var(--accent);
      color: #ffffff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.15);
    }
    .btn-primary:hover { background-color: var(--accent-hover); }

    .btn-secondary {
      background-color: var(--bg-elevated);
      color: var(--text-primary);
      border: 1px solid var(--border-subtle);
      box-shadow: inset 0 1px 0 0 var(--inner-highlight);
    }
    .btn-secondary:hover { border-color: var(--border-hover); }

    /* Animated Tabs */
    .tabs-container {
      display: inline-flex;
      background: var(--bg-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      padding: 4px;
      gap: 4px;
      margin-top: 12px;
      position: relative;
    }

    .tab-btn {
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
      transition: color 0.15s ease;
      position: relative;
      z-index: 2;
    }

    .tab-btn.active { color: var(--text-primary); }

    .tab-pill {
      position: absolute;
      top: 4px; bottom: 4px;
      background: var(--bg-surface);
      border: 1px solid var(--border-hover);
      border-radius: 6px;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 1;
    }

    /* Content-Aware Shimmer Skeleton */
    .shimmer-box {
      background: var(--border-subtle);
      border-radius: 6px;
      position: relative;
      overflow: hidden;
    }

    .shimmer-box::after {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
      animation: shimmer 1.8s infinite;
    }

    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    footer {
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      justify-content: space-between;
      color: var(--text-muted);
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>🎨 Frontend Craftsman Preview</h1>
        <p style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">Preset: <strong>${p.name}</strong></p>
      </div>
      <div class="badge">
        <span class="badge-dot"></span>
        Zero AI-Slop Certified
      </div>
    </header>

    <div class="grid-2">
      <!-- Card 1: Spotlight Dinâmico -->
      <div class="card" id="spotlightCard">
        <div class="spotlight-overlay" id="spotlightOverlay"></div>
        <div class="section-title">✨ Card com Spotlight Reativo ao Mouse</div>
        <h2 style="font-size: 16px; margin-bottom: 8px;">Passe o cursor sobre este card</h2>
        <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
          A luz direcional sutil segue as coordenadas do ponteiro sem gerar poluição visual ou lentidão. Acabamento artesanal nível Linear e Apple.
        </p>
        <div class="btn-group">
          <button class="btn btn-primary">Ação de Destaque</button>
          <button class="btn btn-secondary">Secundário Tátil</button>
        </div>
      </div>

      <!-- Card 2: Tabs com layoutId -->
      <div class="card">
        <div class="section-title">⚡ Navegação de Abas Fluidas (layoutId)</div>
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">
          Clique nas abas para ver o deslizamento elástico da pílula indicadora:
        </p>
        <div class="tabs-container" id="tabsContainer">
          <div class="tab-pill" id="tabPill"></div>
          <button class="tab-btn active" onclick="selectTab(0, this)">Visão Geral</button>
          <button class="tab-btn" onclick="selectTab(1, this)">Métricas</button>
          <button class="tab-btn" onclick="selectTab(2, this)">Auditoria</button>
          <button class="tab-btn" onclick="selectTab(3, this)">Logs</button>
        </div>
        <div style="margin-top: 24px;">
          <div class="section-title" style="margin-bottom: 8px;">Skeleton Content-Aware (Zero CLS)</div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div class="shimmer-box" style="height: 14px; width: 65%;"></div>
            <div class="shimmer-box" style="height: 10px; width: 45%;"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Seção de Paleta de Cores Real -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="section-title">💎 Paleta de Cores Deliberada (Tokens de Alta Fidelidade)</div>
      <div class="swatches">
        <div class="swatch" style="background: var(--bg-surface);">
          <div class="swatch-color" style="background: var(--bg-canvas);"></div>
          <div>Canvas</div>
          <div style="color: var(--text-muted);">${p.bgCanvas}</div>
        </div>
        <div class="swatch" style="background: var(--bg-surface);">
          <div class="swatch-color" style="background: var(--bg-surface);"></div>
          <div>Surface</div>
          <div style="color: var(--text-muted);">${p.bgSurface}</div>
        </div>
        <div class="swatch" style="background: var(--bg-surface);">
          <div class="swatch-color" style="background: var(--bg-elevated);"></div>
          <div>Elevated</div>
          <div style="color: var(--text-muted);">${p.bgElevated}</div>
        </div>
        <div class="swatch" style="background: var(--bg-surface);">
          <div class="swatch-color" style="background: var(--accent);"></div>
          <div>Accent Primário</div>
          <div style="color: var(--text-muted);">${p.accent}</div>
        </div>
        <div class="swatch" style="background: var(--bg-surface);">
          <div class="swatch-color" style="background: var(--text-primary);"></div>
          <div>Texto Primário</div>
          <div style="color: var(--text-muted);">${p.textPrimary}</div>
        </div>
      </div>
    </div>

    <footer>
      <div>Visual gerado por <strong>Frontend Craftsman</strong></div>
      <div>Pressione <strong>OK</strong> no terminal para aprovar este design no Hybrid Orchestrator.</div>
    </footer>
  </div>

  <script>
    // Spotlight effect
    const card = document.getElementById('spotlightCard');
    const overlay = document.getElementById('spotlightOverlay');
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      overlay.style.background = 'radial-gradient(350px circle at ' + x + 'px ' + y + 'px, ${p.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}, transparent 75%)';
    });

    // Tab Pill Sliding
    function selectTab(index, btn) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const pill = document.getElementById('tabPill');
      pill.style.left = btn.offsetLeft + 'px';
      pill.style.width = btn.offsetWidth + 'px';
    }
    // Inicializar pílula na primeira aba
    window.addEventListener('load', () => {
      const firstTab = document.querySelector('.tab-btn.active');
      if (firstTab) selectTab(0, firstTab);
    });
  </script>
</body>
</html>`;

const outDir = path.resolve(process.cwd(), '.craft');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const previewFile = path.join(outDir, 'preview.html');
fs.writeFileSync(previewFile, htmlContent, 'utf-8');

console.log('===============================================================');
console.log('🎨 FRONTEND CRAFTSMAN — PREVIEW VISUAL INSTANTÂNEO GERADO!');
console.log('===============================================================\n');
console.log(`📄 Arquivo HTML: ${previewFile}`);
console.log(`💎 Preset Renderizado: ${p.name}`);
console.log(`🔗 URL Local: file:///${previewFile.replace(/\\/g, '/')}\n`);

if (!noOpen) {
  console.log('🌐 Abrindo preview no seu navegador padrão...');
  const startCmd = process.platform === 'win32' ? `start "" "${previewFile}"` :
                   process.platform === 'darwin' ? `open "${previewFile}"` :
                   `xdg-open "${previewFile}"`;
  exec(startCmd, (err) => {
    if (err) {
      console.log('ℹ️  Abra o link acima no navegador para visualizar o preview.');
    } else {
      console.log('✅ Preview aberto com sucesso!');
    }
  });
}
