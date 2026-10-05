#!/usr/bin/env node
/**
 * scripts/mobile-audit.js — Auditoria estática de ergonomia mobile (v3)
 *
 * Analisa CSS por BLOCO (styled-components, .css/.scss, <style>) e classes
 * Tailwind por ATRIBUTO. Versões anteriores liam linha a linha, o que deixava
 * regras como "botão fixo no topo" e "colunas empilhadas" mortas.
 *
 * Uso:
 *   node mobile-audit.js [arquivos|pastas...] [--json] [--fix] [--min-score=N] [--strict]
 *
 * Saída:
 *   exit 1 se houver qualquer achado de severidade "error"
 *   (ou score < --min-score; --strict equivale a --min-score=85).
 *
 * Supressão consciente (com motivo):
 *   /* audit-ignore STACKED_COLUMNS: lista some via estado no componente pai *\/
 *
 * Limite honesto: análise estática NÃO enxerga sobreposição real nem contraste
 * final na tela. Para isso use scripts/visual-check.js (Playwright).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const sb = require('./lib/style-blocks');

const VERSION = '3.0.0';

const RULES = {
  STACKED_COLUMNS: { severity: 'error', penalty: 15, name: 'Layout multi-coluna empilhado no mobile sem Master-Detail' },
  GRID_FIXED_OVERFLOW: { severity: 'error', penalty: 15, name: 'Grid com colunas fixas que estouram a tela do celular' },
  SAFE_AREA_BOTTOM: { severity: 'error', penalty: 15, name: 'Elemento fixo na base sem env(safe-area-inset-bottom)' },
  VIEWPORT_100VH: { severity: 'error', penalty: 10, name: '100vh/h-screen sem fallback dvh/svh' },
  IOS_INPUT_ZOOM: { severity: 'error', penalty: 10, name: 'Campo de formulário com fonte < 16px (zoom automático no iOS)' },
  FIXED_WIDTH_SPILL: { severity: 'error', penalty: 10, name: 'Largura fixa maior que a tela do celular' },
  FIXED_NAV_COLLISION: { severity: 'warn', penalty: 5, name: 'Botão fixo flutuante pode cobrir título/texto' },
  SMALL_TOUCH_TARGET: { severity: 'warn', penalty: 5, name: 'Alvo de toque menor que 44x44px' },
  UNRESPONSIVE_TABLE: { severity: 'warn', penalty: 5, name: 'Tabela sem rolagem horizontal ou versão em cards' },
  VIEWPORT_FIT_COVER: { severity: 'warn', penalty: 5, name: 'meta viewport sem viewport-fit=cover' },
  PWA_THEME_COLOR: { severity: 'warn', penalty: 2, name: 'HTML sem meta theme-color' },
};

const PHONE_WIDTH = 390;
const MAX_SAFE_WIDTH = 360;

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const opt = (name, def) => {
  const a = argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : def;
};

if (has('--help') || has('-h')) {
  console.log(`mobile-audit v${VERSION}
Uso: node mobile-audit.js [arquivos|pastas...] [--json] [--fix] [--min-score=N] [--strict]
  --json         saída JSON (para hooks e orquestrador)
  --fix          aplica apenas correções seguras (100vh→dvh, viewport-fit, Tailwind)
  --min-score=N  também falha se score < N (--strict = 85)
Regras: ${Object.keys(RULES).join(', ')}`);
  process.exit(0);
}

const asJson = has('--json');
const shouldFix = has('--fix');
const minScore = Number(opt('min-score', has('--strict') ? 85 : 0)) || 0;
const targets = argv.filter((a) => !a.startsWith('-'));
if (targets.length === 0) targets.push('.');

const EXTS = new Set(['.tsx', '.jsx', '.ts', '.js', '.mjs', '.html', '.vue', '.svelte', '.css', '.scss', '.less']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', 'out', 'vendor']);

function collect(p, out, missing) {
  if (!fs.existsSync(p)) { missing.push(p); return; }
  const st = fs.statSync(p);
  if (st.isFile()) {
    if (EXTS.has(path.extname(p).toLowerCase()) && !/\.d\.ts$|\.min\.js$/.test(p)) out.push(p);
    return;
  }
  for (const name of fs.readdirSync(p)) {
    if (SKIP_DIRS.has(name) || name.startsWith('.')) continue;
    collect(path.join(p, name), out, missing);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const clean = (v) => String(v || '').replace(/!important/g, '').trim();
const pxOf = (d) => (d && !d.dynamic ? sb.toPx(clean(d.value)) : null);
const isLiteral = (d) => !!d && !d.dynamic;

function fixedTrackSum(value) {
  let sum = 0;
  const v = clean(value);
  const rep = v.match(/^repeat\(\s*(\d+)\s*,\s*(.+)\)$/);
  if (rep) {
    const inner = fixedTrackSum(rep[2]);
    return inner * Number(rep[1]);
  }
  const re = /minmax\(\s*([\d.]+)(px|rem)\s*,[^)]*\)|(?:^|\s)([\d.]+)(px|rem)(?=\s|$)/g;
  let m;
  while ((m = re.exec(v))) {
    const n = parseFloat(m[1] || m[3]);
    const unit = m[2] || m[4];
    sum += unit === 'rem' ? n * 16 : n;
  }
  return sum;
}

function largestFixedTrack(value) {
  let max = 0;
  const re = /([\d.]+)(px|rem)/g;
  let m;
  while ((m = re.exec(clean(value)))) max = Math.max(max, m[2] === 'rem' ? parseFloat(m[1]) * 16 : parseFloat(m[1]));
  return max;
}

function isSingleTrack(value) {
  const v = clean(value);
  return /^(1fr|100%|auto|minmax\(\s*0\s*,\s*1fr\s*\)|repeat\(\s*1\s*,[^)]*\))$/.test(v);
}

function bareTokens(tokens) {
  return tokens.filter((t) => !t.includes(':'));
}

// ---------------------------------------------------------------------------
// Auditoria de um arquivo
// ---------------------------------------------------------------------------

function auditFile(filePath, globalCtx) {
  const ext = path.extname(filePath).toLowerCase();
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const lineIndex = sb.buildLineIndex(content);
  const rel = path.relative(process.cwd(), filePath) || filePath;
  const findings = [];
  const fixes = [];

  const add = (ruleId, line, message, suggestion, extra = {}) => {
    if (sb.lineIgnored(lines, line - 1, ruleId)) return;
    const r = RULES[ruleId];
    findings.push({
      file: rel,
      line,
      ruleId,
      severity: extra.severity || r.severity,
      name: r.name,
      component: extra.component || null,
      message,
      suggestion,
    });
  };

  // ---------------- blocos CSS ----------------
  const sources = sb.extractStyleSources(content, ext);
  const comps = new Map();
  for (const source of sources) {
    const root = sb.parseBlocks(source, lineIndex);
    const key = source.component || `@${root.line}`;
    if (!comps.has(key)) comps.set(key, { name: source.component, tag: source.tag, roots: [] });
    comps.get(key).roots.push(root);
  }

  const compBlocks = (comp) => {
    const list = [];
    for (const r of comp.roots) sb.walk(r, (b) => list.push(b));
    return list;
  };

  // @media mobile com display:none / display dinâmico em QUALQUER lugar do arquivo
  let fileHasMobileHiding = false;
  for (const comp of comps.values()) {
    for (const b of compBlocks(comp)) {
      if (!sb.inMobileMedia(b)) continue;
      const d = sb.getDecl(b, 'display');
      if (d && (d.dynamic || /none/.test(d.value))) fileHasMobileHiding = true;
    }
  }

  for (const comp of comps.values()) {
    const blocks = compBlocks(comp);
    const mobileBlocks = blocks.filter((b) => sb.inMobileMedia(b));
    const compName = comp.name || null;
    const tag = (comp.tag || '').toLowerCase();
    const mobileOverride = (props, pred) =>
      mobileBlocks.some((b) => b.decls.some((d) => props.includes(d.prop) && (d.dynamic || pred(d))));

    for (const block of blocks) {
      const ignored = (id) => sb.isIgnored(block, id);
      const desktopOnly = sb.inDesktopOnlyMedia(block);
      const inMobile = sb.inMobileMedia(block);
      const header = block.header || '';
      // Bloco é o próprio elemento do componente (raiz, &:hover, @media...) e não um filho (.icon, span...)
      const isSelfBlock = [block, ...sb.ancestors(block)].every((b) => !b.header || /^@media/.test(b.header) || /^&(?:[:.[]|$)/.test(b.header.trim()));

      // VIEWPORT_100VH
      if (!ignored('VIEWPORT_100VH')) {
        for (const d of block.decls) {
          if (!['height', 'min-height', 'max-height'].includes(d.prop) || !/\b100vh\b/.test(d.value)) continue;
          const hasFallback = block.decls.some((o) => o.prop === d.prop && /\d+(dvh|svh|lvh)\b|fill-available/.test(o.value));
          if (hasFallback) continue;
          add('VIEWPORT_100VH', d.line,
            `${d.prop}: ${d.value} — no Safari/Chrome mobile 100vh inclui a área da barra de endereço e corta o rodapé.`,
            `Mantenha a linha e adicione logo abaixo: ${d.prop}: ${d.value.replace(/100vh/g, '100dvh')};`,
            { component: compName });
          const text = lines[d.line - 1] || '';
          if ((text.match(/100vh/g) || []).length === 1 && new RegExp(`\\b${d.prop}\\s*:`).test(text) && /;\s*\r?$/.test(text)) {
            const indent = (text.match(/^\s*/) || [''])[0];
            const eol = text.endsWith('\r') ? '\r' : '';
            fixes.push({ ruleId: 'VIEWPORT_100VH', line: d.line, type: 'insertAfter', text: `${indent}${d.prop}: ${d.value.replace(/100vh/g, '100dvh')};${eol}` });
          }
        }
      }

      if (desktopOnly) continue;

      const pos = sb.getDecl(block, 'position');
      const isFixed = isLiteral(pos) && /\bfixed\b/.test(pos.value);

      // SAFE_AREA_BOTTOM
      if (isFixed && !ignored('SAFE_AREA_BOTTOM')) {
        const bottom = sb.getDecl(block, 'bottom');
        const top = sb.getDecl(block, 'top');
        const inset = sb.getDecl(block, 'inset');
        const insetParts = isLiteral(inset) ? clean(inset.value).split(/\s+/) : null;
        const bottomZero = (pxOf(bottom) === 0) || (insetParts && insetParts.length >= 3 && sb.toPx(insetParts[2]) === 0 && sb.toPx(insetParts[0]) !== 0);
        const overlay = pxOf(top) === 0 || (insetParts && insetParts.length === 1 && sb.toPx(insetParts[0]) === 0);
        if (bottomZero && !overlay) {
          const all = blocks.flatMap((b) => b.decls);
          const hasSafe = all.some((d) => /safe-area-inset-bottom/.test(d.value));
          const dynamicPadding = block.decls.some((d) => d.dynamic && /^(padding|padding-bottom|bottom|inset)$/.test(d.prop));
          if (!hasSafe && !dynamicPadding) {
            add('SAFE_AREA_BOTTOM', (bottom || inset).line,
              'Elemento fixo colado na base sem respeitar a barra Home do iPhone — botões ficam sob o indicador.',
              'Adicione padding-bottom: max(12px, env(safe-area-inset-bottom)); e garanta viewport-fit=cover no meta viewport.',
              { component: compName });
          }
        }
      }

      // FIXED_NAV_COLLISION
      if (isFixed && !ignored('FIXED_NAV_COLLISION')) {
        const top = pxOf(sb.getDecl(block, 'top'));
        const left = pxOf(sb.getDecl(block, 'left'));
        const right = pxOf(sb.getDecl(block, 'right'));
        const width = pxOf(sb.getDecl(block, 'width'));
        const height = pxOf(sb.getDecl(block, 'height'));
        const widthDecl = sb.getDecl(block, 'width');
        const fullBar = (left === 0 && right === 0) || (isLiteral(widthDecl) && /100(%|vw)/.test(widthDecl.value));
        const small = (width !== null && width <= 72) || (height !== null && height <= 72) || (/button|^a$/.test(tag) && isSelfBlock) || /button/.test(header);
        if (top !== null && top < 120 && (left !== null || right !== null) && !fullBar && small) {
          const side = left !== null ? 'left' : 'right';
          const needed = (left !== null ? left : right) + (width || 44) + 4;
          const compensated = globalCtx.compensations.some((c) => c.side === side && c.value >= needed);
          if (!compensated) {
            add('FIXED_NAV_COLLISION', (sb.getDecl(block, 'top') || pos).line,
              `Botão fixo em top:${top}px/${side}:${left !== null ? left : right}px. Nenhum padding-${side} ≥ ${needed}px foi encontrado em @media mobile nos arquivos auditados — ele provavelmente cobre o título do cabeçalho.`,
              `No breakpoint em que o botão aparece, dê ao cabeçalho/título padding-${side}: ${needed}px (ou min-height + padding-top se ele ficar acima). Confirme com visual-check.js (mede sobreposição real).`,
              { component: compName });
          }
        }
      }

      // FIXED_WIDTH_SPILL
      if (!ignored('FIXED_WIDTH_SPILL')) {
        for (const prop of ['width', 'min-width']) {
          const d = sb.getDecl(block, prop);
          const px = pxOf(d);
          if (px === null || px <= MAX_SAFE_WIDTH) continue;
          if (prop === 'width' && sb.getDecl(block, 'max-width')) continue;
          if (!inMobile && mobileOverride(['width', 'min-width', 'max-width', 'display'], () => true)) continue;
          if (/@keyframes|^from$|^to$|%$/.test(header)) continue;
          add('FIXED_WIDTH_SPILL', d.line,
            `${prop}: ${px}px é maior que a largura útil de um celular (~${PHONE_WIDTH}px) e gera rolagem horizontal.`,
            prop === 'width' ? `Use width: 100%; max-width: ${px}px;` : `Remova o min-width no @media (max-width: 768px) ou troque por min-width: min(${px}px, 100%);`,
            { component: compName });
        }
      }

      // GRID_FIXED_OVERFLOW + STACKED_COLUMNS (apenas no contexto base)
      const gtc = sb.getDecl(block, 'grid-template-columns');
      if (!inMobile && isLiteral(gtc)) {
        const tracks = sb.analyzeTracks(clean(gtc.value));
        const fixedSum = fixedTrackSum(gtc.value);
        const collapse = mobileBlocks.find((b) => b.decls.some((d) =>
          (d.prop === 'grid-template-columns' && (d.dynamic || isSingleTrack(d.value))) ||
          (d.prop === 'flex-direction' && /column/.test(d.value)) ||
          (d.prop === 'display' && !d.dynamic && /^(flex|block)/.test(clean(d.value)))));
        const anyOverride = mobileOverride(['grid-template-columns', 'display', 'grid-template-areas', 'flex-direction'], () => true);

        if (fixedSum > MAX_SAFE_WIDTH && !anyOverride && !ignored('GRID_FIXED_OVERFLOW')) {
          add('GRID_FIXED_OVERFLOW', gtc.line,
            `grid-template-columns: ${gtc.value} soma ${Math.round(fixedSum)}px fixos e não há override em @media mobile — estoura a tela.`,
            'No mobile, mostre UMA coluna por vez (Master-Detail): esconda as colunas inativas com display:none controlado por estado e ofereça botão Voltar (≥44px).',
            { component: compName });
        }

        const shell = tracks && !tracks.auto && tracks.count >= 2 && !tracks.equal &&
          (largestFixedTrack(gtc.value) >= 240 || (tracks.count >= 3 && fixedSum >= 400));
        if (shell && collapse && !ignored('STACKED_COLUMNS')) {
          const compHides = blocks.some((b) => {
            const d = sb.getDecl(b, 'display');
            return (sb.inMobileMedia(b) && d && (d.dynamic || /none/.test(d.value))) || (sb.inMobileMedia(b) && b.hasLooseInterp);
          });
          if (!compHides) {
            const decl = collapse.decls.find((d) => ['grid-template-columns', 'flex-direction', 'display'].includes(d.prop));
            add('STACKED_COLUMNS', decl ? decl.line : collapse.line,
              `Layout de ${tracks.count} colunas (${gtc.value}) vira uma pilha vertical em "${collapse.header}" e nenhuma coluna é escondida neste componente — no celular o usuário rola por lista + conteúdo + detalhes empilhados.`,
              'Aplique Master-Detail: no @media mobile mostre só a coluna ativa (display:none nas demais, controlado por estado/prop), com botão Voltar ≥44px e altura 100dvh. Se o ocultamento acontece em outro arquivo, confirme com visual-check.js e registre /* audit-ignore STACKED_COLUMNS: motivo */.',
              { component: compName, severity: fileHasMobileHiding ? 'warn' : 'error' });
          }
        }
      }

      // IOS_INPUT_ZOOM
      const isField = (/^(input|textarea|select)$/.test(tag) && isSelfBlock) || /(^|[\s,>+~])(input|textarea|select)\b/.test(header);
      if (isField && !/checkbox|radio|range|color|file/.test(header) && !ignored('IOS_INPUT_ZOOM')) {
        const fs_ = sb.getDecl(block, 'font-size');
        const px = pxOf(fs_);
        if (px !== null && px < 16) {
          const overridden = (!inMobile && mobileOverride(['font-size'], (d) => (pxOf(d) || 0) >= 16)) || globalCtx.globalFieldFont;
          if (!overridden) {
            add('IOS_INPUT_ZOOM', fs_.line,
              `font-size: ${fs_.value} em campo de formulário — o iOS Safari dá zoom na página ao focar campos com fonte < 16px.`,
              'Use font-size: 16px no mobile (ex.: @media (max-width: 768px) { font-size: 16px; }).',
              { component: compName });
          }
        }
      }

      // SMALL_TOUCH_TARGET
      const isButton = (/^(button|a)$/.test(tag) && isSelfBlock) || /(^|[\s,>+~&])button\b/.test(header);
      if (isButton && !inMobile && !ignored('SMALL_TOUCH_TARGET')) {
        const h = pxOf(sb.getDecl(block, 'height'));
        const w = pxOf(sb.getDecl(block, 'width'));
        const minH = pxOf(sb.getDecl(block, 'min-height'));
        const small = (h !== null && h < 44 && (minH === null || minH < 44)) && (w === null || w < 44 || h < 36);
        if (small) {
          const overridden = mobileOverride(['height', 'min-height', 'width', 'min-width', 'padding'], (d) => (pxOf(d) || 0) >= 44 || d.prop === 'padding');
          if (!overridden) {
            const d = sb.getDecl(block, 'height');
            add('SMALL_TOUCH_TARGET', d.line,
              `Botão com ${w !== null ? `${w}x` : 'altura '}${h}px — abaixo de 44x44px (Apple HIG / WCAG 2.5.5).`,
              'No @media mobile use min-width: 44px; min-height: 44px; (o ícone pode continuar pequeno).',
              { component: compName });
          }
        }
      }
    }
  }

  // ---------------- estilos inline ----------------
  if (/\.(tsx|jsx|js|mjs)$/.test(ext)) {
    for (const st of sb.extractInlineStyles(content, lineIndex)) {
      for (const p of st.props) {
        if (/^(height|min-height|max-height)$/.test(p.prop) && p.literal && /\b100vh\b/.test(p.literal)) {
          const hasFallback = st.props.some((o) => o.prop === p.prop && o !== p && /dvh|svh/.test(o.raw));
          if (!hasFallback) add('VIEWPORT_100VH', p.line, `style={{ ${p.prop}: '${p.literal}' }} — 100vh corta o conteúdo no mobile.`, `Use '${p.literal.replace(/100vh/g, '100dvh')}'.`);
        }
      }
    }
  }

  // ---------------- Tailwind (className) ----------------
  const classAttrs = /\.(tsx|jsx|js|mjs|html|vue|svelte)$/.test(ext) ? sb.extractClassAttrs(content, lineIndex) : [];
  const responsiveHiding = /(^|[\s'"`])(sm|md|lg|xl|2xl):hidden\b|(^|[\s'"`])hidden\b[^'"`]*\b(sm|md|lg|xl|2xl):(block|flex|grid|inline)/.test(content);

  const replaceInRange = (from, to, re, replacer, ruleId) => {
    for (let i = from - 1; i < Math.min(lines.length, to); i++) {
      if (re.test(lines[i])) {
        fixes.push({ ruleId, line: i + 1, type: 'replaceLine', text: lines[i].replace(re, replacer) });
        return true;
      }
    }
    return false;
  };

  for (const a of classAttrs) {
    const tokens = sb.classTokens(a.value);
    const bare = bareTokens(tokens);
    const tag = (a.tag || '').toLowerCase();
    const T = (t) => tokens.includes(t);
    const B = (t) => bare.includes(t);

    // VIEWPORT_100VH
    const screenTok = bare.find((t) => /^(min-|max-)?h-screen$/.test(t));
    if (screenTok && !tokens.some((t) => /(^|:)(min-|max-)?h-(dvh|svh|lvh)$|h-\[100(dvh|svh)\]/.test(t)) && !sb.lineIgnored(lines, a.line - 1, 'VIEWPORT_100VH')) {
      const prefix = screenTok.replace('h-screen', '');
      add('VIEWPORT_100VH', a.line, `"${screenTok}" usa 100vh — corta o conteúdo atrás da barra do navegador mobile.`, `Adicione "${prefix}h-dvh" depois de "${screenTok}".`);
      replaceInRange(a.line, a.endLine, new RegExp(`(^|[\\s'"\`])${prefix}h-screen(?=[\\s'"\`]|$)`), `$1${prefix}h-screen ${prefix}h-dvh`, 'VIEWPORT_100VH');
    }

    // SAFE_AREA_BOTTOM
    if (B('fixed') && B('bottom-0') && !B('top-0') && !B('inset-0') && !tokens.some((t) => /safe/.test(t))) {
      add('SAFE_AREA_BOTTOM', a.line, 'Barra fixa na base (fixed bottom-0) sem safe area — fica sob o indicador Home do iPhone.', 'Adicione pb-[env(safe-area-inset-bottom)] (ou pb-[max(12px,env(safe-area-inset-bottom))]) e viewport-fit=cover.');
      if (!bare.some((t) => /^(p|py|pb)-/.test(t))) {
        replaceInRange(a.line, a.endLine, /(^|[\s'"`])bottom-0(?=[\s'"`]|$)/, '$1bottom-0 pb-[env(safe-area-inset-bottom)]', 'SAFE_AREA_BOTTOM');
      }
    }

    // IOS_INPUT_ZOOM
    if (/^(input|textarea|select)$/.test(tag)) {
      const smallText = bare.find((t) => t === 'text-xs' || t === 'text-sm' || /^text-\[(1[0-5]|[0-9])px\]$/.test(t));
      const hasBase = bare.some((t) => /^text-(base|lg|xl|\[1[6-9]px\]|\[[2-9]\dpx\])$/.test(t));
      if (smallText && !hasBase && !/checkbox|radio/.test(a.value)) {
        add('IOS_INPUT_ZOOM', a.line, `<${tag}> com "${smallText}" — o iOS dá zoom ao focar campos com fonte < 16px.`, `Use "text-base md:${smallText}".`);
        if (smallText === 'text-sm' || smallText === 'text-xs') {
          replaceInRange(a.line, a.endLine, new RegExp(`(^|[\\s'"\`])${smallText}(?=[\\s'"\`]|$)`), `$1text-base md:${smallText}`, 'IOS_INPUT_ZOOM');
        }
      }
    }

    // SMALL_TOUCH_TARGET
    if (tag === 'button' || (tag === 'a' && /role=["']button/.test(lines[a.line - 1] || ''))) {
      const sizeTok = bare.find((t) => /^(h|size)-(4|5|6|7|8|9|10)$/.test(t));
      const big = bare.some((t) => /^(min-h|h|size)-(11|12|14|16)$|^min-h-\[(4[4-9]|[5-9]\d)px\]$/.test(t));
      if (sizeTok && !big) {
        add('SMALL_TOUCH_TARGET', a.line, `<button> com "${sizeTok}" (< 44px).`, 'Adicione min-h-11 min-w-11 (44px) no mobile; use md: para reduzir no desktop se necessário.');
      }
    }

    // FIXED_WIDTH_SPILL
    const wTok = bare.find((t) => { const m = t.match(/^(w|min-w)-\[(\d+)px\]$/); return m && Number(m[2]) > MAX_SAFE_WIDTH; });
    if (wTok && !bare.some((t) => /^(max-w-full|w-full|max-w-\[\d+vw\]|max-w-\[100%\])$/.test(t))) {
      const px = wTok.match(/\[(\d+)px\]/)[1];
      add('FIXED_WIDTH_SPILL', a.line, `"${wTok}" excede a largura do celular (~${PHONE_WIDTH}px).`, `Use "w-full max-w-[${px}px]".`);
    }

    // FIXED_NAV_COLLISION
    if (B('fixed') && bare.some((t) => /^top-(0|1|2|3|4|5|6)$|^top-\[\d+px\]$/.test(t)) && bare.some((t) => /^(left|right)-/.test(t)) && !(B('left-0') && B('right-0')) && !B('inset-x-0') && !B('w-full') && (tag === 'button' || bare.some((t) => /^(size|w|h)-(8|9|10|11|12)$/.test(t)))) {
      add('FIXED_NAV_COLLISION', a.line, 'Botão fixo no topo (fixed top-* left/right-*) — costuma cobrir o título do cabeçalho no mobile.', 'Dê ao cabeçalho padding do lado do botão (ex.: pl-14 no mobile) e confirme com visual-check.js.');
    }

    // STACKED_COLUMNS (shell com colunas fixas arbitrárias)
    const gridTok = tokens.find((t) => /^(md|lg|xl|2xl):grid-cols-\[[^\]]*\d+px[^\]]*\]$/.test(t));
    if (gridTok && !responsiveHiding) {
      add('STACKED_COLUMNS', a.line, `"${gridTok}" vira pilha vertical abaixo do breakpoint e não há "hidden md:block"/"md:hidden" no arquivo.`, 'Master-Detail: mostre só a coluna ativa no mobile (hidden/block por estado) com botão Voltar ≥44px.', { severity: 'warn' });
    }
  }

  // ---------------- tabelas ----------------
  if (/\.(tsx|jsx|html|vue|svelte)$/.test(ext)) {
    const idx = lines.findIndex((l) => /<table[\s>]/.test(l));
    if (idx !== -1) {
      const siblingStyles = ['styles.ts', 'styles.js', 'styles.tsx', 'style.ts'].map((n) => path.join(path.dirname(filePath), n)).filter((p) => fs.existsSync(p)).map((p) => fs.readFileSync(p, 'utf8')).join('\n');
      const ok = /overflow-x\s*:\s*(auto|scroll)|overflow\s*:\s*auto|overflow-x-(auto|scroll)|overflow-auto/.test(content + siblingStyles) || /md:table|md:hidden/.test(content);
      if (!ok) add('UNRESPONSIVE_TABLE', idx + 1, '<table> sem container com rolagem horizontal nem versão em cards para mobile.', 'Envolva em um container com overflow-x: auto (e -webkit-overflow-scrolling: touch) ou renderize cards no mobile.');
    }
  }

  // ---------------- HTML ----------------
  if (ext === '.html') {
    const vIdx = lines.findIndex((l) => /<meta[^>]+name=["']viewport["']/.test(l));
    if (vIdx !== -1 && !/viewport-fit=cover/.test(lines[vIdx])) {
      add('VIEWPORT_FIT_COVER', vIdx + 1, 'Sem viewport-fit=cover o iOS ignora env(safe-area-inset-*).', 'Acrescente ", viewport-fit=cover" ao content do meta viewport.');
      if (/content="[^"]*"/.test(lines[vIdx])) fixes.push({ ruleId: 'VIEWPORT_FIT_COVER', line: vIdx + 1, type: 'replaceLine', text: lines[vIdx].replace(/content="([^"]*)"/, 'content="$1, viewport-fit=cover"') });
    }
    const hIdx = lines.findIndex((l) => /<head[\s>]/.test(l));
    if (hIdx !== -1 && !/name=["']theme-color["']/.test(content)) {
      add('PWA_THEME_COLOR', hIdx + 1, 'Sem meta theme-color a barra de status não acompanha o tema.', 'Use duas: <meta name="theme-color" media="(prefers-color-scheme: light)" content="<fundo claro>"> e outra para dark.');
    }
  }

  return { rel, filePath, findings, fixes };
}

// Paddings compensatórios (padding-left/right em @media mobile) e override global de
// font-size em campos, lidos nos arquivos auditados + estilos globais do projeto.
function collectGlobalContext(files) {
  const out = [];
  let globalFieldFont = false;
  for (const f of files) {
    let content;
    try { content = fs.readFileSync(f, 'utf8'); } catch { continue; }
    const li = sb.buildLineIndex(content);
    for (const s of sb.extractStyleSources(content, path.extname(f))) {
      sb.walk(sb.parseBlocks(s, li), (b) => {
        if (/(^|[\s,])(input|textarea|select)\b/.test(b.header || '') && (s.helper === 'createGlobalStyle' || s.kind !== 'styled')) {
          const fsz = sb.getDecl(b, 'font-size');
          if (fsz && !fsz.dynamic && (sb.toPx(clean(fsz.value)) || 0) >= 16 && /!important/.test(fsz.value)) globalFieldFont = true;
        }
        if (!sb.inMobileMedia(b)) return;
        for (const d of b.decls) {
          if (d.dynamic) continue; // valor dinâmico não comprova compensação
          const v = clean(d.value);
          if (d.prop === 'padding-left' || d.prop === 'padding-inline-start') out.push({ side: 'left', value: sb.toPx(v) || 0 });
          if (d.prop === 'padding-right' || d.prop === 'padding-inline-end') out.push({ side: 'right', value: sb.toPx(v) || 0 });
          if (d.prop === 'padding') {
            const p = v.split(/\s+/).map((x) => sb.toPx(x) || 0);
            const right = p.length > 1 ? p[1] : p[0];
            const left = p.length === 4 ? p[3] : right;
            out.push({ side: 'left', value: left }, { side: 'right', value: right });
          }
        }
      });
    }
    const tw = content.match(/(?:^|[\s'"`])(?:max-md:|max-lg:)?p[lr]-(\d+)/g) || [];
    for (const t of tw) {
      const m = t.match(/p([lr])-(\d+)/);
      out.push({ side: m[1] === 'l' ? 'left' : 'right', value: Number(m[2]) * 4 });
    }
  }
  return { compensations: out, globalFieldFont };
}

// Estilos globais do projeto (não são auditados, só consultados para overrides).
const GLOBAL_STYLE_CANDIDATES = [
  'src/styles/global.ts', 'src/styles/global.js', 'src/styles/globals.ts', 'src/styles/GlobalStyles.ts',
  'src/styles/global.css', 'src/styles/globals.css', 'src/index.css', 'src/App.css', 'src/globals.css',
  'app/globals.css', 'styles/globals.css', 'src/app/globals.css',
];

function projectGlobalFiles(files) {
  const roots = new Set();
  for (const f of files) {
    let dir = path.dirname(f);
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'package.json'))) { roots.add(dir); break; }
      const up = path.dirname(dir);
      if (up === dir) break;
      dir = up;
    }
  }
  const out = [];
  for (const r of roots) {
    for (const c of GLOBAL_STYLE_CANDIDATES) {
      const p = path.join(r, c);
      if (fs.existsSync(p)) out.push(p);
    }
  }
  return out;
}

function score(findings) {
  const perRule = {};
  for (const f of findings) perRule[f.ruleId] = (perRule[f.ruleId] || 0) + 1;
  let deduction = 0;
  for (const [id, n] of Object.entries(perRule)) {
    const p = RULES[id].penalty;
    deduction += Math.min(n * p, p * 3);
  }
  return Math.max(0, 100 - deduction);
}

function runAudit(files) {
  const ctxFiles = [...new Set([...files, ...projectGlobalFiles(files)])];
  const globalCtx = collectGlobalContext(ctxFiles);
  return files.map((f) => {
    try { return auditFile(f, globalCtx); } catch (e) {
      return { rel: path.relative(process.cwd(), f), filePath: f, findings: [], fixes: [], error: e.message };
    }
  });
}

function applyFixes(results) {
  const applied = [];
  for (const r of results) {
    if (!r.fixes.length) continue;
    const content = fs.readFileSync(r.filePath, 'utf8');
    const lines = content.split('\n');
    const seen = new Set();
    const sorted = [...r.fixes].sort((a, b) => b.line - a.line);
    for (const fx of sorted) {
      const key = `${fx.line}:${fx.type}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (fx.type === 'insertAfter') lines.splice(fx.line, 0, fx.text);
      else lines[fx.line - 1] = fx.text;
      applied.push({ file: r.rel, line: fx.line, ruleId: fx.ruleId });
    }
    fs.writeFileSync(r.filePath, lines.join('\n'), 'utf8');
  }
  return applied;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const files = [];
const missing = [];
for (const t of targets) collect(path.resolve(process.cwd(), t), files, missing);

let results = runAudit(files);
let fixed = [];
if (shouldFix) {
  fixed = applyFixes(results);
  if (fixed.length) results = runAudit(files);
}

const findings = results.flatMap((r) => r.findings);
const errors = findings.filter((f) => f.severity === 'error');
const warnings = findings.filter((f) => f.severity === 'warn');
const finalScore = score(findings);
const parseErrors = results.filter((r) => r.error).map((r) => ({ file: r.rel, error: r.error }));
const failed = errors.length > 0 || (minScore > 0 && finalScore < minScore);

if (asJson) {
  console.log(JSON.stringify({
    tool: 'mobile-audit',
    version: VERSION,
    filesScanned: files.length,
    missing,
    score: finalScore,
    errors: errors.length,
    warnings: warnings.length,
    passed: !failed,
    findings,
    fixed,
    parseErrors,
    note: 'Análise estática. Sobreposição real e layout final exigem visual-check.js.',
  }, null, 2));
  process.exit(failed ? 1 : 0);
}

console.log(`📱 mobile-audit v${VERSION} — ${files.length} arquivo(s)`);
if (missing.length) console.log(`⚠️  Caminho(s) inexistente(s): ${missing.join(', ')}`);
for (const f of fixed) console.log(`🔧 corrigido ${f.file}:${f.line} [${f.ruleId}]`);
for (const f of [...errors, ...warnings]) {
  const icon = f.severity === 'error' ? '❌ ERRO ' : '⚠️  AVISO';
  console.log(`\n${icon} [${f.ruleId}] ${f.file}:${f.line}${f.component ? ` (${f.component})` : ''}`);
  console.log(`   ${f.message}`);
  console.log(`   → ${f.suggestion}`);
}
for (const p of parseErrors) console.log(`\n⚠️  Falha ao analisar ${p.file}: ${p.error}`);
console.log(`\nScore: ${finalScore}/100 · erros: ${errors.length} · avisos: ${warnings.length}`);
console.log('ℹ️  Análise estática não vê a tela. Para sobreposição/overflow reais: node scripts/visual-check.js');
process.exit(failed ? 1 : 0);
