#!/usr/bin/env node
/**
 * scripts/visual-check.js — Verificação VISUAL real (Playwright), nos dois temas.
 *
 * O que a análise estática não consegue ver, este script mede na tela renderizada:
 *   CONTRAST        texto com contraste < WCAG (cor e fundo COMPUTADOS, com opacidade e camadas)
 *   OVERLAP         elemento fixo (ex.: botão hambúrguer) cobrindo texto — confirmado por elementFromPoint
 *   H_OVERFLOW      página mais larga que a viewport (rolagem horizontal no celular)
 *   TOUCH_TARGET    alvo interativo < 44x44px na viewport mobile
 *   CONSOLE_ERROR   erros de console / exceções da página
 * E problemas de VERIFICAÇÃO (exit 2): servidor fora do ar, login exigido, tema não aplicado.
 *
 * Uso rápido:
 *   node visual-check.js --setup                       # 1x: instala Playwright+Chromium no cache do usuário
 *   node visual-check.js --url http://localhost:5173/rota
 *   node visual-check.js --url http://localhost:5173/rota --ls-light theme=light --ls-dark theme=dark
 *   node visual-check.js --config caminho/visual-check.config.json
 *
 * Flags: --viewport mobile|desktop|LxA (repetível) · --theme light|dark (repetível)
 *        --ls chave=valor (localStorage para todos) · --ls-light / --ls-dark chave=valor
 *        --wait <ms|seletor> · --out <pasta> (padrão .visual-check) · --json
 *
 * Config (JSON): { baseUrl, routes[], viewports[], themes[{name,colorScheme,localStorage,initScript,clickSelector}],
 *   auth: { localStorage{} | storageState | login{ url, steps[{fill,value}|{click}|{waitForURL}|{waitFor}] } },
 *   wait, outDir }. Valores "$ENV:NOME" são lidos de variáveis de ambiente (nunca grave senhas no arquivo).
 *
 * Saída: screenshots full-page em <out>/, relatório <out>/report.json.
 * Exit: 0 ok · 1 problemas de UI (severidade error) · 2 não foi possível verificar.
 *
 * ATENÇÃO: arquivo idêntico em frontend-craftsman/scripts e mobile-converter/scripts.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const VERSION = '1.0.0';
const CACHE_DIR = path.join(os.homedir(), '.cache', 'enterprise-ai-suite', 'visual-check');

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const flag = (f) => argv.includes(f);
function multi(name) {
  const out = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === `--${name}` && argv[i + 1] !== undefined) out.push(argv[++i]);
    else if (argv[i].startsWith(`--${name}=`)) out.push(argv[i].slice(name.length + 3));
  }
  return out;
}
const single = (name, def) => { const v = multi(name); return v.length ? v[v.length - 1] : def; };

if (flag('--help') || flag('-h')) {
  console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^#!.*\n\/\*\*?/, '').replace(/^ \* ?/gm, ''));
  process.exit(0);
}

const asJson = flag('--json');
const log = (...a) => { if (!asJson) console.log(...a); };

// ---------------------------------------------------------------------------
// Playwright: localizar / instalar
// ---------------------------------------------------------------------------

function loadPlaywright() {
  const attempts = [
    ['playwright', process.cwd()],
    ['@playwright/test', process.cwd()],
    ['playwright', CACHE_DIR],
  ];
  for (const [name, base] of attempts) {
    try {
      const resolved = require.resolve(name, { paths: [base] });
      const mod = require(resolved);
      if (mod && mod.chromium) return { pw: mod, from: path.dirname(resolved) };
    } catch { /* tenta o próximo */ }
  }
  return null;
}

function setup() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const pkg = path.join(CACHE_DIR, 'package.json');
  if (!fs.existsSync(pkg)) fs.writeFileSync(pkg, JSON.stringify({ name: 'eas-visual-check', private: true }, null, 2));
  console.log(`📦 Instalando Playwright em ${CACHE_DIR} (fora do seu projeto)...`);
  execSync('npm install playwright@^1 --no-audit --no-fund --loglevel=error', { cwd: CACHE_DIR, stdio: 'inherit' });
  const cli = path.join(CACHE_DIR, 'node_modules', 'playwright', 'cli.js');
  console.log('🌐 Baixando Chromium...');
  execSync(`"${process.execPath}" "${cli}" install chromium`, { cwd: CACHE_DIR, stdio: 'inherit' });
  console.log('✅ visual-check pronto.');
}

if (flag('--setup')) {
  try { setup(); process.exit(0); } catch (e) { console.error(`❌ Falha no setup: ${e.message}`); process.exit(2); }
}

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

const env = (v) => (typeof v === 'string' && v.startsWith('$ENV:') ? process.env[v.slice(5)] || '' : v);
const envObj = (o) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, env(v)]));
const kv = (list) => Object.fromEntries(list.map((s) => { const i = s.indexOf('='); return i === -1 ? [s, ''] : [s.slice(0, i), s.slice(i + 1)]; }));

const VIEWPORTS = {
  mobile: { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  desktop: { name: 'desktop', width: 1280, height: 800, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
};

function parseViewport(v) {
  if (typeof v === 'object') return { deviceScaleFactor: 1, ...v, name: v.name || `${v.width}x${v.height}` };
  if (VIEWPORTS[v]) return VIEWPORTS[v];
  const m = String(v).match(/^(\d+)x(\d+)$/);
  if (m) { const w = +m[1]; return { name: v, width: w, height: +m[2], isMobile: w < 768, hasTouch: w < 768, deviceScaleFactor: 1 }; }
  throw new Error(`viewport inválida: ${v}`);
}

function loadConfig() {
  const cfgPath = single('config', null) || (fs.existsSync('visual-check.config.json') ? 'visual-check.config.json' : null);
  let cfg = {};
  if (cfgPath) cfg = JSON.parse(fs.readFileSync(path.resolve(cfgPath), 'utf8'));
  const urls = multi('url');
  const routes = urls.length ? urls : (cfg.routes || ['/']).map((r) => (/^https?:/.test(r) ? r : new URL(r, cfg.baseUrl || 'http://localhost:5173').href));
  if (!urls.length && !cfg.baseUrl && !cfg.routes) throw new Error('Informe --url <endereço> ou --config <arquivo>.');

  const vpFlags = multi('viewport');
  const viewports = (vpFlags.length ? vpFlags : cfg.viewports || ['mobile', 'desktop']).map(parseViewport);

  const lsAll = { ...envObj(cfg.auth && cfg.auth.localStorage), ...kv(multi('ls')) };
  const cliThemeLs = { light: kv(multi('ls-light')), dark: kv(multi('ls-dark')) };
  const themeFlags = multi('theme');
  let themes = cfg.themes || [{ name: 'light', colorScheme: 'light' }, { name: 'dark', colorScheme: 'dark' }];
  themes = themes.map((t) => ({ ...t, localStorage: { ...envObj(t.localStorage), ...(cliThemeLs[t.name] || {}) } }));
  if (themeFlags.length) themes = themes.filter((t) => themeFlags.includes(t.name));
  const themeConfigured = !!cfg.themes || Object.keys(cliThemeLs.light).length > 0 || Object.keys(cliThemeLs.dark).length > 0;

  const outDir = path.resolve(single('out', cfg.outDir || '.visual-check'));
  return { cfgPath, routes, viewports, themes, themeConfigured, lsAll, auth: cfg.auth || {}, wait: single('wait', cfg.wait), outDir };
}

// ---------------------------------------------------------------------------
// Análise dentro da página (executa no navegador)
// ---------------------------------------------------------------------------

/* eslint-disable no-undef */
function pageAnalysis(opts) {
  const parse = (s) => {
    const m = String(s || '').match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/);
    if (!m) return null;
    let a = 1;
    if (m[4] !== undefined) a = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: +m[1], g: +m[2], b: +m[3], a };
  };
  const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const opacityChain = (el) => { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity || '1'); return o; };

  const describe = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += `#${el.id}`;
    const tid = el.getAttribute('data-testid') || el.getAttribute('aria-label') || el.getAttribute('title');
    if (tid) s += `[${el.getAttribute('data-testid') ? 'data-testid' : el.getAttribute('aria-label') ? 'aria-label' : 'title'}="${tid.slice(0, 40)}"]`;
    const cls = [...el.classList].filter((c) => !/^sc-|^css-|^[a-zA-Z]{5,7}$/.test(c)).slice(0, 2);
    if (cls.length) s += '.' + cls.join('.');
    const parent = el.parentElement;
    if (parent && parent !== document.body) {
      let p = parent.tagName.toLowerCase();
      if (parent.id) p += `#${parent.id}`;
      s = `${p} > ${s}`;
    }
    return s;
  };

  // Fundo efetivo: compõe as camadas de background até achar uma opaca.
  const canvas = (() => {
    const html = parse(getComputedStyle(document.documentElement).backgroundColor);
    const body = document.body ? parse(getComputedStyle(document.body).backgroundColor) : null;
    if (html && html.a > 0) return blend(html, { r: 255, g: 255, b: 255, a: 1 });
    if (body && body.a > 0) return blend(body, { r: 255, g: 255, b: 255, a: 1 });
    return getComputedStyle(document.documentElement).colorScheme.includes('dark') ? { r: 18, g: 18, b: 18, a: 1 } : { r: 255, g: 255, b: 255, a: 1 };
  })();

  function effectiveBg(el) {
    const layers = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') {
        if (/url\(/.test(cs.backgroundImage)) return { unknown: 'imagem de fundo' };
        const stops = (cs.backgroundImage.match(/rgba?\([^)]*\)/g) || []).map(parse).filter(Boolean);
        if (stops.length) {
          const resolveWith = (stop) => { let c = stop.a < 1 ? blend(stop, canvas) : stop; for (let i = layers.length - 1; i >= 0; i--) c = blend(layers[i], c); return c; };
          return { gradient: stops.map(resolveWith) };
        }
      }
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) { layers.push(c); if (c.a >= 0.999) break; }
    }
    let result = canvas;
    for (let i = layers.length - 1; i >= 0; i--) result = blend(layers[i], result);
    return { color: result };
  }

  // Elementos com texto próprio
  const textEls = [];
  const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  let node;
  while ((node = walker.nextNode())) {
    if (!node.nodeValue || !node.nodeValue.trim()) continue;
    const el = node.parentElement;
    if (!el || seen.has(el) || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|OPTION)$/.test(el.tagName) || el.closest('svg')) continue;
    seen.add(el);
    if (!visible(el)) continue;
    textEls.push(el);
  }
  for (const el of document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=file]), textarea, select')) {
    if (visible(el) && !seen.has(el)) { seen.add(el); textEls.push(el); }
  }

  // ---------- CONTRASTE ----------
  const contrast = [];
  for (const el of textEls) {
    const cs = getComputedStyle(el);
    if (cs.webkitTextFillColor && /rgba\(0, 0, 0, 0\)|transparent/.test(cs.webkitTextFillColor)) continue;
    if (el.closest('[disabled],[aria-disabled="true"]') || el.matches(':disabled')) continue;
    const op = opacityChain(el);
    if (op < 0.1) continue;
    const fg0 = parse(cs.color);
    if (!fg0 || fg0.a === 0) continue;
    const bg = effectiveBg(el);
    if (bg.unknown) continue;
    const fg = { ...fg0, a: fg0.a * op };
    const size = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    const need = large ? 3 : 4.5;
    const errBelow = large ? 2.2 : 3;
    const bgs = bg.gradient || [bg.color];
    let worst = Infinity, worstBg = null, worstFg = null;
    for (const b of bgs) {
      const f = blend(fg, b);
      const r = ratio(f, b);
      if (r < worst) { worst = r; worstBg = b; worstFg = f; }
    }
    if (worst < need) {
      const text = (el.value !== undefined && el.tagName !== 'BUTTON' ? el.value : el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50);
      if (!text) continue;
      const r = el.getBoundingClientRect();
      contrast.push({
        severity: worst < errBelow ? 'error' : 'warn',
        selector: describe(el),
        text,
        ratio: Math.round(worst * 100) / 100,
        required: need,
        fg: hex(worstFg),
        bg: hex(worstBg),
        gradient: !!bg.gradient,
        fontSize: size,
        y: Math.round(r.top + window.scrollY),
      });
    }
  }
  contrast.sort((a, b) => a.ratio - b.ratio);

  // ---------- SOBREPOSIÇÃO (elementos fixos sobre texto) ----------
  const vw = document.documentElement.clientWidth || window.innerWidth, vh = window.innerHeight;
  const fixed = [...document.querySelectorAll('body *')].filter((el) => {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed' || !visible(el) || opacityChain(el) < 0.1) return false;
    const r = el.getBoundingClientRect();
    if (r.width * r.height > vw * vh * 0.6) return false; // overlay/modal/backdrop
    if (r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) return false;
    return true;
  });
  const overlaps = [];
  for (const f of fixed) {
    const fr = f.getBoundingClientRect();
    for (const t of textEls) {
      if (f.contains(t) || t.contains(f)) continue;
      const tcs = getComputedStyle(t);
      if (tcs.position === 'fixed' || t.closest('[style*="position: fixed"]')) continue;
      const range = document.createRange();
      const rects = [];
      for (const child of t.childNodes) {
        if (child.nodeType === 3 && child.nodeValue.trim()) { range.selectNodeContents(child); rects.push(...range.getClientRects()); }
      }
      if (!rects.length) rects.push(t.getBoundingClientRect());
      let hits = 0, area = 0;
      for (const tr of rects) {
        const x1 = Math.max(fr.left, tr.left), y1 = Math.max(fr.top, tr.top);
        const x2 = Math.min(fr.right, tr.right), y2 = Math.min(fr.bottom, tr.bottom);
        if (x2 - x1 < 2 || y2 - y1 < 2) continue;
        area += (x2 - x1) * (y2 - y1);
        for (const px of [0.2, 0.5, 0.8]) for (const py of [0.25, 0.5, 0.75]) {
          const x = x1 + (x2 - x1) * px, y = y1 + (y2 - y1) * py;
          if (x < 0 || y < 0 || x >= vw || y >= vh) continue;
          const hit = document.elementFromPoint(x, y);
          if (hit && (hit === f || f.contains(hit))) hits++;
        }
      }
      if (hits > 0 && area >= 12) {
        overlaps.push({
          severity: 'error',
          fixed: describe(f),
          fixedRect: { x: Math.round(fr.left), y: Math.round(fr.top), w: Math.round(fr.width), h: Math.round(fr.height) },
          covers: describe(t),
          text: (t.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50),
          overlapPx: Math.round(area),
          scroll: opts.scrollLabel,
        });
      }
    }
  }

  // ---------- OVERFLOW HORIZONTAL ----------
  const docW = Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0);
  let overflow = null;
  if (docW > vw + 1) {
    const culprits = [];
    for (const el of document.querySelectorAll('body *')) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right <= vw + 1) continue;
      let clipped = false;
      for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX;
        if (ox !== 'visible') { clipped = true; break; }
      }
      if (!clipped && getComputedStyle(el).position !== 'fixed') culprits.push({ selector: describe(el), right: Math.round(r.right), width: Math.round(r.width) });
    }
    culprits.sort((a, b) => a.width - b.width);
    overflow = { severity: 'error', documentWidth: docW, viewport: vw, culprits: culprits.slice(0, 5) };
  }

  // ---------- ALVOS DE TOQUE ----------
  const touch = [];
  if (opts.mobile) {
    const sel = 'a[href], button, [role="button"], input:not([type=hidden]), select, textarea, [onclick], summary';
    for (const el of document.querySelectorAll(sel)) {
      if (!visible(el) || el.matches(':disabled')) continue;
      if (el.tagName === 'A' && el.parentElement && [...el.parentElement.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim().length > 3)) continue; // link dentro de texto
      if (el.matches('input[type=checkbox], input[type=radio]') && el.closest('label')) continue;
      if (el.parentElement && el.parentElement.closest(sel)) continue; // filho de outro alvo
      const r = el.getBoundingClientRect();
      if (r.width < 44 || r.height < 44) {
        touch.push({ severity: 'warn', selector: describe(el), text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) });
      }
    }
  }

  // ---------- FUNDO DA PÁGINA (para validar se o tema foi aplicado) ----------
  const center = document.elementFromPoint(vw / 2, Math.min(vh / 2, 300)) || document.body;
  const pb = effectiveBg(center);
  const pageBgColor = pb.color || (pb.gradient && pb.gradient[0]) || canvas;

  return {
    contrast: contrast.slice(0, 40),
    contrastTotal: contrast.length,
    overlaps,
    overflow,
    touch: touch.slice(0, 25),
    touchTotal: touch.length,
    pageBg: hex(pageBgColor),
    pageBgLum: Math.round(lum(pageBgColor) * 1000) / 1000,
    url: location.href,
    title: document.title,
    textCount: textEls.length,
  };
}
/* eslint-enable no-undef */

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

const slug = (u) => {
  try { const x = new URL(u); return ((x.pathname + x.hash).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home').slice(0, 60); } catch { return 'page'; }
};

async function doLogin(browser, auth) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const base = auth.login.url;
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 45000 });
  for (const step of auth.login.steps || []) {
    if (step.fill) await page.fill(step.fill, String(env(step.value) || ''));
    else if (step.click) await page.click(step.click);
    else if (step.press) await page.press(step.press, step.key || 'Enter');
    else if (step.waitForURL) await page.waitForURL(step.waitForURL, { timeout: 30000 });
    else if (step.waitFor) await page.waitForSelector(step.waitFor, { timeout: 30000 });
  }
  await page.waitForTimeout(800);
  const state = await ctx.storageState();
  await ctx.close();
  return state;
}

async function settle(page, wait) {
  if (wait && /^\d+$/.test(String(wait))) await page.waitForTimeout(Number(wait));
  else if (wait) await page.waitForSelector(wait, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(700); // animações de entrada
}

async function main() {
  const cfg = loadConfig();
  const loaded = loadPlaywright();
  if (!loaded) {
    const msg = 'Playwright não encontrado. Rode uma vez: node visual-check.js --setup (instala em ~/.cache/enterprise-ai-suite, não no projeto).';
    if (asJson) console.log(JSON.stringify({ tool: 'visual-check', version: VERSION, verified: false, setupProblems: [msg] }, null, 2));
    else console.error(`❌ ${msg}`);
    process.exit(2);
  }
  const { chromium } = loaded.pw;
  fs.mkdirSync(cfg.outDir, { recursive: true });

  const report = { tool: 'visual-check', version: VERSION, startedAt: new Date().toISOString(), outDir: cfg.outDir, verified: true, setupProblems: [], pages: [] };
  if (!cfg.themeConfigured && cfg.themes.length > 1) {
    report.notes = ['Tema trocado só via prefers-color-scheme. Se o app guarda o tema em localStorage/API, use --ls-light/--ls-dark ou themes[] no config; o script avisa se o tema não mudou.'];
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (e) {
    const msg = `Chromium não abriu (${e.message.split('\n')[0]}). Rode: node visual-check.js --setup`;
    report.verified = false; report.setupProblems.push(msg);
    finish(report);
    return;
  }

  let storageState;
  try {
    if (cfg.auth.storageState) storageState = path.resolve(cfg.auth.storageState);
    else if (cfg.auth.login) storageState = await doLogin(browser, cfg.auth);
  } catch (e) {
    report.setupProblems.push(`Login automático falhou: ${e.message.split('\n')[0]}`);
  }

  for (const url of cfg.routes) {
    for (const vp of cfg.viewports) {
      for (const theme of cfg.themes) {
        const entry = { url, viewport: vp.name, theme: theme.name, screenshot: null, findings: [], consoleErrors: [] };
        report.pages.push(entry);
        const ctx = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: vp.deviceScaleFactor || 1,
          isMobile: !!vp.isMobile,
          hasTouch: !!vp.hasTouch,
          colorScheme: theme.colorScheme || theme.name,
          storageState,
        });
        const ls = { ...cfg.lsAll, ...(theme.localStorage || {}) };
        if (Object.keys(ls).length) {
          await ctx.addInitScript((entries) => { try { for (const [k, v] of entries) window.localStorage.setItem(k, v); } catch (e) { /* ignore */ } }, Object.entries(ls));
        }
        if (theme.initScript) await ctx.addInitScript(theme.initScript);
        const page = await ctx.newPage();
        page.on('console', (m) => { if (m.type() === 'error') entry.consoleErrors.push(m.text().slice(0, 200)); });
        page.on('pageerror', (e) => entry.consoleErrors.push(`pageerror: ${String(e.message).slice(0, 200)}`));
        try {
          try {
            await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
          } catch (e) {
            if (/ERR_CONNECTION_REFUSED|ERR_NAME_NOT_RESOLVED|ECONNREFUSED/.test(e.message)) throw e;
            await page.goto(url, { waitUntil: 'load', timeout: 30000 });
          }
          if (theme.clickSelector) { await page.click(theme.clickSelector).catch(() => {}); }
          await settle(page, cfg.wait);

          const finalUrl = page.url();
          if (/\/(login|signin|entrar|auth)\b/i.test(new URL(finalUrl).pathname) && !/\/(login|signin|entrar|auth)\b/i.test(new URL(url).pathname)) {
            report.setupProblems.push(`${url} redirecionou para ${finalUrl} — a tela exige login. Configure auth (localStorage com token, storageState ou login.steps).`);
          }

          await page.evaluate(() => window.scrollTo(0, 0));
          const top = await page.evaluate(pageAnalysis, { mobile: vp.width < 768 || !!vp.isMobile, scrollLabel: 'topo' });
          await page.evaluate(() => window.scrollTo(0, document.scrollingElement ? document.scrollingElement.scrollHeight : 0));
          await page.waitForTimeout(300);
          const bottom = await page.evaluate(pageAnalysis, { mobile: false, scrollLabel: 'fim' });
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(150);

          const shot = path.join(cfg.outDir, `${slug(url)}__${vp.name}__${theme.name}.png`);
          await page.screenshot({ path: shot, fullPage: true });
          entry.screenshot = shot;
          entry.pageBg = top.pageBg;
          entry.textElements = top.textCount;

          // validação de tema
          if (theme.name === 'light' && top.pageBgLum < 0.35) report.setupProblems.push(`[${slug(url)} ${vp.name}] tema CLARO pedido, mas o fundo renderizado é ${top.pageBg} (escuro). O tema não foi aplicado — informe como o app troca o tema (--ls-light chave=valor ou themes[] no config).`);
          if (theme.name === 'dark' && top.pageBgLum > 0.45) report.setupProblems.push(`[${slug(url)} ${vp.name}] tema ESCURO pedido, mas o fundo renderizado é ${top.pageBg} (claro). O tema não foi aplicado.`);
          if (top.textCount < 3) report.setupProblems.push(`[${slug(url)} ${vp.name} ${theme.name}] quase nenhum texto renderizado (${top.textCount}) — página em branco, erro ou carregamento lento (use --wait).`);

          for (const c of top.contrast) entry.findings.push({ rule: 'CONTRAST', ...c });
          if (top.contrastTotal > top.contrast.length) entry.findings.push({ rule: 'CONTRAST', severity: 'warn', note: `+${top.contrastTotal - top.contrast.length} ocorrências omitidas` });
          const ovKey = new Set();
          for (const o of [...top.overlaps, ...bottom.overlaps]) {
            const k = `${o.fixed}|${o.covers}`;
            if (ovKey.has(k)) continue;
            ovKey.add(k);
            entry.findings.push({ rule: 'OVERLAP', ...o });
          }
          if (top.overflow) entry.findings.push({ rule: 'H_OVERFLOW', ...top.overflow });
          for (const t of top.touch) entry.findings.push({ rule: 'TOUCH_TARGET', ...t });
          if (top.touchTotal > top.touch.length) entry.findings.push({ rule: 'TOUCH_TARGET', severity: 'warn', note: `+${top.touchTotal - top.touch.length} ocorrências omitidas` });
          for (const ce of entry.consoleErrors.slice(0, 5)) entry.findings.push({ rule: 'CONSOLE_ERROR', severity: 'warn', message: ce });
        } catch (e) {
          const msg = e.message.split('\n')[0];
          if (/ERR_CONNECTION_REFUSED|ECONNREFUSED|ERR_NAME_NOT_RESOLVED/.test(msg)) report.setupProblems.push(`Servidor não respondeu em ${url} — suba o dev server antes (ex.: npm run dev).`);
          else report.setupProblems.push(`[${url} ${vp.name} ${theme.name}] falhou: ${msg}`);
        } finally {
          await ctx.close();
        }
      }
    }
  }
  await browser.close();
  report.setupProblems = [...new Set(report.setupProblems)];
  finish(report);
}

function finish(report) {
  const all = report.pages.flatMap((p) => p.findings.map((f) => ({ ...f, page: `${slug(p.url)} ${p.viewport} ${p.theme}` })));
  report.errors = all.filter((f) => f.severity === 'error').length;
  report.warnings = all.filter((f) => f.severity === 'warn').length;
  if (report.setupProblems.length) report.verified = false;
  report.finishedAt = new Date().toISOString();
  try { fs.writeFileSync(path.join(report.outDir, 'report.json'), JSON.stringify(report, null, 2)); } catch { /* sem pasta */ }

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`👁️  visual-check v${VERSION}`);
    for (const p of report.pages) {
      const errs = p.findings.filter((f) => f.severity === 'error');
      const warns = p.findings.filter((f) => f.severity === 'warn');
      console.log(`\n▶ ${p.url} · ${p.viewport} · ${p.theme}${p.pageBg ? ` · fundo ${p.pageBg}` : ''}`);
      if (p.screenshot) console.log(`  📸 ${p.screenshot}`);
      for (const f of [...errs, ...warns].slice(0, 15)) {
        const icon = f.severity === 'error' ? '❌' : '⚠️ ';
        if (f.rule === 'CONTRAST') console.log(`  ${icon} CONTRAST ${f.ratio ?? ''}:1 (precisa ${f.required ?? ''}) "${f.text ?? f.note}" ${f.fg ?? ''} sobre ${f.bg ?? ''} — ${f.selector ?? ''}`);
        else if (f.rule === 'OVERLAP') console.log(`  ${icon} OVERLAP ${f.fixed} cobre "${f.text}" (${f.overlapPx}px², ${f.scroll})`);
        else if (f.rule === 'H_OVERFLOW') console.log(`  ${icon} H_OVERFLOW página com ${f.documentWidth}px numa tela de ${f.viewport}px; culpados: ${f.culprits.map((c) => c.selector).join(' | ')}`);
        else if (f.rule === 'TOUCH_TARGET') console.log(`  ${icon} TOUCH_TARGET ${f.w ?? ''}x${f.h ?? ''} ${f.selector ?? f.note} "${f.text ?? ''}"`);
        else console.log(`  ${icon} ${f.rule} ${f.message || f.note || ''}`);
      }
      if (errs.length + warns.length > 15) console.log(`  … +${errs.length + warns.length - 15} (ver report.json)`);
    }
    if (report.notes) report.notes.forEach((n) => console.log(`\nℹ️  ${n}`));
    if (report.setupProblems.length) {
      console.log('\n🚫 VERIFICAÇÃO INCOMPLETA — diga isso ao usuário, não declare a tela como verificada:');
      report.setupProblems.forEach((s) => console.log(`   - ${s}`));
    }
    console.log(`\nErros: ${report.errors} · Avisos: ${report.warnings} · Relatório: ${path.join(report.outDir, 'report.json')}`);
    console.log('👉 Abra os screenshots (view_file) e olhe-os de verdade antes de concluir.');
  }
  process.exit(report.setupProblems.length ? 2 : report.errors ? 1 : 0);
}

main().catch((e) => {
  const msg = e.message.split('\n')[0];
  if (asJson) console.log(JSON.stringify({ tool: 'visual-check', version: VERSION, verified: false, setupProblems: [msg] }, null, 2));
  else console.error(`❌ ${msg}`);
  process.exit(2);
});
