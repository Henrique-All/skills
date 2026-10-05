#!/usr/bin/env node
/**
 * scripts/craft-audit.js — Auditoria estática de acabamento e TEMA DUPLO (v3)
 *
 * Foco: pegar o que deixa o modo claro (ou escuro) horrível ANTES de entregar.
 *  - Avalia o ramo claro/escuro de ternárias de tema (isLight(theme) ? A : B,
 *    themeSchema === 'light' ? A : B, isDark ? A : B) e calcula contraste WCAG
 *    contra o fundo do próprio bloco ou o fundo da página no tema.
 *  - Texto branco/escuro hardcoded sobre superfície que muda com o tema.
 *  - Superfícies/bordas rgba(255,255,255,≤0.15) que somem no tema claro.
 *  - Tailwind: text-white / bg-white/5 / border-white/10 sem par dark: em projeto dual-theme.
 *
 * Uso:
 *   node craft-audit.js [arquivos|pastas...] [--json] [--dark-only]
 *                       [--light-bg=#f8fafc] [--dark-bg=#0b0b0e] [--min-score=N]
 *
 * exit 1 se houver qualquer achado "error" (ou score < --min-score).
 * Supressão consciente: /* audit-ignore LIGHT_MODE_WHITE_TEXT: motivo *\/
 *
 * Limite honesto: o fundo real depende do DOM. Quando não dá para saber o fundo,
 * a regra vira aviso ou é pulada. Confirme sempre com scripts/visual-check.js.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const sb = require('./lib/style-blocks');

const VERSION = '3.0.0';

const RULES = {
  LIGHT_MODE_WHITE_TEXT: { severity: 'error', penalty: 15, name: 'Texto branco fixo sobre superfície que fica clara no tema claro' },
  DARK_MODE_DARK_TEXT: { severity: 'error', penalty: 15, name: 'Texto escuro fixo sobre superfície que fica escura no tema escuro' },
  LOW_CONTRAST_LIGHT: { severity: 'error', penalty: 10, name: 'Contraste insuficiente no tema CLARO' },
  LOW_CONTRAST_DARK: { severity: 'error', penalty: 10, name: 'Contraste insuficiente no tema ESCURO' },
  LOW_CONTRAST: { severity: 'error', penalty: 10, name: 'Contraste insuficiente (cores fixas)' },
  LIGHT_MODE_GHOST_SURFACE: { severity: 'error', penalty: 10, name: 'Superfície/borda branca translúcida que some no tema claro' },
  HARDCODED_DARK_SURFACE: { severity: 'warn', penalty: 5, name: 'Fundo escuro fixo que não acompanha o tema claro' },
  OUTLINE_NONE_WITHOUT_FOCUS: { severity: 'warn', penalty: 5, name: 'outline removido sem estilo de foco visível' },
  PURPLE_GRADIENT_SLOP: { severity: 'warn', penalty: 3, name: 'Gradiente roxo/índigo/rosa genérico' },
  UNREGULATED_BLUR: { severity: 'warn', penalty: 3, name: 'Blur pesado sobre fundo quase transparente' },
  AI_CLICHE_COPY: { severity: 'warn', penalty: 2, name: 'Copy clichê típica de IA' },
};

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
  console.log(`craft-audit v${VERSION}
Uso: node craft-audit.js [arquivos|pastas...] [--json] [--dark-only] [--light-bg=#hex] [--dark-bg=#hex] [--min-score=N]
  --dark-only     projeto só tem tema escuro (desliga regras de tema claro)
  --light-bg      fundo de página do tema claro (padrão #f8fafc)
  --dark-bg       fundo de página do tema escuro (padrão #0b0b0e)
Regras: ${Object.keys(RULES).join(', ')}`);
  process.exit(0);
}

const asJson = has('--json');
const darkOnly = has('--dark-only');
const minScore = Number(opt('min-score', 0)) || 0;
const PAGE = {
  light: sb.parseColor(opt('light-bg', '#f8fafc')) || { r: 248, g: 250, b: 252, a: 1 },
  dark: sb.parseColor(opt('dark-bg', '#0b0b0e')) || { r: 11, g: 11, b: 14, a: 1 },
};
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
// Cores e tema
// ---------------------------------------------------------------------------

const clean = (v) => String(v || '').replace(/!important/g, '').trim();
const hex = (c) => '#' + [c.r, c.g, c.b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');
// Valor legível para mensagens: troca marcadores __I0__ pelo código da interpolação.
const showValue = (d) => {
  if (!d) return '';
  let i = 0;
  return d.value.replace(/__I\d+__/g, () => {
    const raw = (d.rawInterps[i++] || '').replace(/\s+/g, ' ').trim();
    return '${' + (raw.length > 70 ? raw.slice(0, 67) + '...' : raw) + '}';
  });
};

function composite(fg, bg) {
  if (!fg) return null;
  const a = fg.a === undefined ? 1 : fg.a;
  if (a >= 1 || !bg) return { r: fg.r, g: fg.g, b: fg.b, a: 1 };
  return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
}

const LIGHT_COND = String.raw`(?:isLight\s*\(\s*[\w.]*\s*\)|\bisLight\b|\blight\b|themeSchema\s*===?\s*['"]light['"]|(?:mode|scheme|title|name|colorScheme)\s*===?\s*['"]light['"])`;
const DARK_COND = String.raw`(?:isDark\s*\(\s*[\w.]*\s*\)|\bisDark\b|themeSchema\s*===?\s*['"]dark['"]|(?:mode|scheme|title|name|colorScheme)\s*===?\s*['"]dark['"])`;
const BRANCHES = String.raw`\s*\?\s*(['"\x60])([^'"\x60]*)\1\s*:\s*(['"\x60])([^'"\x60]*)\3`;
const RE_LIGHT = new RegExp(LIGHT_COND + BRANCHES);
const RE_DARK = new RegExp(DARK_COND + BRANCHES);

// Extrai os valores literais de cada tema de uma interpolação.
function themeBranches(raw) {
  if (!raw) return null;
  let m = raw.match(RE_LIGHT);
  if (m) return { light: m[2], dark: m[4] };
  m = raw.match(RE_DARK);
  if (m) return { light: m[4], dark: m[2] };
  return null;
}

const SEMANTIC_TOKEN = /colors?\??\.(primary|secondary|accent|brand|success|danger|error|warning|info|highlight)\w*|gradients?\./i;
const SURFACE_TOKEN = /colors?\??\.(background|surface|card|bg|panel|paper|base|body|elevated|surfaceSecondary|backgroundSecondary)\w*/i;
const TEXT_TOKEN = /colors?\??\.(text|foreground|title|heading)\w*/i;

// Classifica um valor de cor (decl) em: literal | branches | semantic | surface | text | dynamic
function classify(decl) {
  if (!decl) return null;
  if (!decl.dynamic) {
    const v = clean(decl.value);
    if (/^(transparent|inherit|currentcolor|unset|initial|none)$/i.test(v)) return { kind: 'transparent' };
    const c = /gradient/i.test(v) ? sb.allColors(v)[0] : sb.parseColor(v);
    return c ? { kind: 'literal', color: c } : null;
  }
  for (const raw of decl.rawInterps) {
    const br = themeBranches(raw);
    // Ternária de tema dentro de outra condição ($active ? (isLight ? A : B) : C): ramo real desconhecido.
    const questionMarks = (raw.replace(/\?\.|\?\?/g, '').match(/\?/g) || []).length;
    if (br && questionMarks > 1) return { kind: 'dynamic' };
    if (br) {
      const l = sb.parseColor(br.light);
      const d = sb.parseColor(br.dark);
      if (l || d) return { kind: 'branches', light: l, dark: d, raw: br };
    }
  }
  const all = decl.rawInterps.join(' ');
  if (SURFACE_TOKEN.test(all)) return { kind: 'surface' };
  if (SEMANTIC_TOKEN.test(all)) return { kind: 'semantic' };
  if (TEXT_TOKEN.test(all)) return { kind: 'text' };
  return { kind: 'dynamic' };
}

const BG_PROPS = ['background', 'background-color'];

// Fundo efetivo do bloco: o próprio ou o do ancestral mais próximo dentro do mesmo styled.
// Retorna { kind: 'unknown' } quando um css`` condicional pode estar definindo o fundo.
function effectiveBg(block) {
  const chain = [block, ...sb.ancestors(block)];
  for (const b of chain) {
    if (/::?(placeholder|before|after|selection)/.test(b.header || '')) continue;
    let decl = null;
    for (const p of BG_PROPS) decl = sb.getDecl(b, p) || decl;
    const c = classify(decl);
    if (c && c.kind !== 'transparent') return { ...c, decl };
    if (b.hasLooseInterp) return { kind: 'unknown' };
  }
  const root = chain[chain.length - 1];
  if (root.source && root.source.nested) return { kind: 'unknown' };
  return null;
}

// Cor de fundo resolvida em um tema (ou null se desconhecida).
function bgInTheme(bg, theme) {
  if (!bg || bg.kind === 'surface') return PAGE[theme];
  if (bg.kind === 'literal') return composite(bg.color, PAGE[theme]);
  if (bg.kind === 'branches') {
    const c = bg[theme];
    if (!c || c.a < 0.6) return null; // translúcido: depende do que está atrás
    return composite(c, PAGE[theme]);
  }
  return null; // semantic/dynamic/unknown: desconhecido
}

// css`` aninhado só vale em um tema? ('light' | 'dark' | null)
const SCOPE_RE = new RegExp(`(!\\s*)?(${LIGHT_COND}|${DARK_COND})`, 'g');
function sourceScope(source) {
  if (!source || !source.nested || !source.parentInterp) return null;
  const pre = source.parentInterp.slice(0, source.parentInterpPos);
  let last = null;
  let m;
  SCOPE_RE.lastIndex = 0;
  while ((m = SCOPE_RE.exec(pre))) last = m;
  if (!last) return null;
  const isLightCond = new RegExp(`^${LIGHT_COND}$`).test(last[2]);
  const negated = !!last[1];
  const seg = pre.slice(last.index + last[0].length);
  const inElse = /\?[\s\S]*:/.test(seg);
  const inThen = !inElse && /\?|&&/.test(seg);
  if (!inThen && !inElse) return null;
  const positive = isLightCond !== negated; // condição verdadeira significa tema claro?
  return positive === inThen ? 'light' : 'dark';
}

function isExemptHeader(header) {
  return /disabled|::?placeholder|::selection|\[aria-disabled|:disabled/.test(header || '');
}

// ---------------------------------------------------------------------------
// Auditoria de um arquivo
// ---------------------------------------------------------------------------

function auditFile(filePath, ctx) {
  const ext = path.extname(filePath).toLowerCase();
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const lineIndex = sb.buildLineIndex(content);
  const rel = path.relative(process.cwd(), filePath) || filePath;
  const findings = [];

  const add = (ruleId, line, message, suggestion, extra = {}) => {
    if (sb.lineIgnored(lines, line - 1, ruleId)) return;
    const r = RULES[ruleId];
    findings.push({ file: rel, line, ruleId, severity: extra.severity || r.severity, name: r.name, component: extra.component || null, message, suggestion });
  };

  const usesTheme = /isLight|isDark|themeSchema|theme\??\.(mode|colors)|useTheme|prefers-color-scheme|\[data-theme/.test(content);
  // Tela com design escuro fixo e intencional (não lê o tema e pinta fundo escuro opaco).
  const fixedDarkMatch = !usesTheme && content.match(/background(?:-color)?\s*:\s*(#0[0-9a-f]{5}\b|#1[0-9a-f]{5}\b|#000\b|black\b|radial-gradient\([^;]*#0[0-9a-f]{5})/i);
  const fileFixedDark = !!fixedDarkMatch && !/(^|[\s'"`])dark:/.test(content);
  const styledDual = !darkOnly && !fileFixedDark && (usesTheme || ctx.projectDual);
  const twDual = !darkOnly && (/(^|[\s'"`])dark:/.test(content) || ctx.projectDual);
  if (fileFixedDark && ctx.projectDual && !darkOnly) {
    const line = content.slice(0, fixedDarkMatch.index).split('\n').length;
    add('HARDCODED_DARK_SURFACE', line,
      'Esta tela não lê o tema e pinta um fundo escuro fixo — no tema claro ela continua escura (regras de modo claro foram puladas aqui).',
      'Se for intencional (ex.: login com identidade escura), registre /* audit-ignore HARDCODED_DARK_SURFACE: motivo */. Senão, use theme.colors.background/surface.');
  }

  // ---------------- blocos CSS ----------------
  for (const source of sb.extractStyleSources(content, ext)) {
    const root = sb.parseBlocks(source, lineIndex);
    const compName = source.component || null;
    const scope = sourceScope(source);
    const lightRules = styledDual && scope !== 'dark';
    const darkRules = !darkOnly && scope !== 'light';
    const compBlocks = [];
    sb.walk(root, (b) => compBlocks.push(b));
    const compHasFocus = compBlocks.some((b) => /:focus/.test(b.header || '')) ||
      (source.nested && /:focus/.test(content.slice(Math.max(0, source.startOffset - 4000), source.startOffset)));

    for (const block of compBlocks) {
      const ignored = (id) => sb.isIgnored(block, id);
      const header = block.header || '';
      if (/^@keyframes|^(from|to|\d+%)$/.test(header)) continue;
      const exempt = isExemptHeader(header) || sb.ancestors(block).some((a) => isExemptHeader(a.header));

      const colorDecl = sb.getDecl(block, 'color');
      const color = classify(colorDecl);
      const bg = effectiveBg(block);
      const ownBgDecl = sb.getDecl(block, 'background') || sb.getDecl(block, 'background-color');
      const ownBg = classify(ownBgDecl);

      // --- texto branco fixo / texto escuro fixo ---
      if (color && color.kind === 'literal' && !exempt && (styledDual && (sb.isWhiteish(color.color) ? lightRules : darkRules))) {
        const c = color.color;
        const white = sb.isWhiteish(c);
        const dark = c.a >= 0.6 && sb.luminance(c) <= 0.06;
        if ((white || dark) && !ignored(white ? 'LIGHT_MODE_WHITE_TEXT' : 'DARK_MODE_DARK_TEXT')) {
          const ruleId = white ? 'LIGHT_MODE_WHITE_TEXT' : 'DARK_MODE_DARK_TEXT';
          const badTheme = white ? 'light' : 'dark';
          const fix = white
            ? `Use \${({ theme }) => theme.colors.text} ou isLight(theme) ? '#0f172a' : '${colorDecl.value}'.`
            : `Use \${({ theme }) => theme.colors.text} ou isLight(theme) ? '${colorDecl.value}' : '#f8fafc'.`;
          if (!bg || bg.kind === 'surface') {
            add(ruleId, colorDecl.line,
              `color: ${colorDecl.value} fixo ${bg ? `sobre ${showValue(bg.decl)}` : 'sem fundo próprio (herda a superfície da página)'} — no tema ${badTheme === 'light' ? 'claro' : 'escuro'} a superfície muda e o texto ${white ? 'fica branco no branco' : 'some no escuro'}.`,
              fix, { component: compName, severity: bg ? 'error' : 'warn' });
          } else if (bg.kind === 'branches') {
            const b = bgInTheme(bg, badTheme);
            const ratio = b ? sb.contrastRatio(composite(c, b), b) : null;
            if (ratio !== null && ratio < 3) {
              add(ruleId, colorDecl.line,
                `color: ${colorDecl.value} fixo sobre fundo que no tema ${badTheme === 'light' ? 'claro' : 'escuro'} vira ${hex(b)} — contraste ${ratio.toFixed(2)}:1.`,
                fix, { component: compName });
            }
          }
        }
      }

      // --- contraste por tema (ternárias) ---
      if (color && !exempt && !darkOnly) {
        for (const theme of ['light', 'dark']) {
          if ((theme === 'light' && scope === 'dark') || (theme === 'dark' && scope === 'light')) continue;
          const ruleId = theme === 'light' ? 'LOW_CONTRAST_LIGHT' : 'LOW_CONTRAST_DARK';
          if (ignored(ruleId)) continue;
          let fg = null;
          if (color.kind === 'branches') fg = color[theme];
          else if (color.kind === 'literal' && bg && bg.kind === 'branches') fg = color.color;
          if (!fg) continue;
          const b = bgInTheme(bg, theme);
          if (!b) continue;
          const assumed = !bg; // fundo da página presumido (pai pode ter outro fundo)
          const ratio = sb.contrastRatio(composite(fg, b), b);
          const placeholder = /placeholder/.test(header);
          const limitErr = placeholder ? 2.2 : 3;
          const limitWarn = placeholder ? 3 : 4.5;
          if (ratio < limitWarn) {
            const where = theme === 'light' ? 'claro' : 'escuro';
            add(ruleId, colorDecl.line,
              `No tema ${where} o texto fica ${hex(composite(fg, b))} sobre ${hex(b)}${assumed ? ' (fundo da página presumido — o componente não define fundo)' : ''} — contraste ${ratio.toFixed(2)}:1 (mínimo WCAG AA: 4.5:1).`,
              `Ajuste o ramo do tema ${where} (ex.: ${theme === 'light' ? "'#475569' (slate-600) ou '#334155'" : "'#cbd5e1' (slate-300)"}).`,
              { component: compName, severity: ratio < limitErr && !assumed ? 'error' : 'warn' });
          }
        }
      }

      // --- contraste de pares fixos (só com fundo opaco: translúcido depende do que está atrás) ---
      if (color && color.kind === 'literal' && ownBg && ownBg.kind === 'literal' && ownBg.color.a >= 0.9 && !exempt && !ignored('LOW_CONTRAST')) {
        const b = composite(ownBg.color, PAGE.light);
        const ratio = sb.contrastRatio(composite(color.color, b), b);
        if (ratio < 3) {
          add('LOW_CONTRAST', colorDecl.line, `color ${colorDecl.value} sobre ${showValue(ownBgDecl)} — contraste ${ratio.toFixed(2)}:1.`, 'Ajuste uma das cores até ≥ 4.5:1 (texto normal) ou ≥ 3:1 (texto grande/negrito).', { component: compName, severity: ratio < 2 ? 'error' : 'warn' });
        }
      }

      // --- superfícies fantasma / fundo escuro fixo ---
      const onFixedDark = bg && bg.kind === 'literal' && bg.color.a >= 0.9 && sb.luminance(bg.color) < 0.2;
      if (lightRules) {
        for (const d of block.decls) {
          if (d.dynamic) continue;
          const isBg = BG_PROPS.includes(d.prop);
          const isBorder = /^border(-(top|bottom|left|right))?(-color)?$/.test(d.prop);
          if (!isBg && !isBorder) continue;
          const colors = sb.allColors(d.value);
          if (colors.some((c) => sb.isGhostWhite(c)) && !/gradient/.test(d.value) && !onFixedDark && !ignored('LIGHT_MODE_GHOST_SURFACE')) {
            add('LIGHT_MODE_GHOST_SURFACE', d.line,
              `${d.prop}: ${d.value} fixo — branco translúcido some sobre o fundo claro (${hex(PAGE.light)}); o elemento perde a borda/superfície no tema claro.`,
              `Use ternária: isLight(theme) ? '${isBg ? '#ffffff' : '#e2e8f0'}' : '${clean(d.value).replace(/^1px solid\s*/, '')}' (ou um token theme.colors.${isBg ? 'surface' : 'border'}).`,
              { component: compName });
          }
          if (isBg && !ignored('HARDCODED_DARK_SURFACE')) {
            const c = colors[0];
            const overlay = c && c.a < 0.9;
            if (c && !overlay && sb.luminance(c) < 0.03 && !/backdrop|overlay|tooltip|code|pre|kbd|toast/i.test(`${compName} ${header}`)) {
              add('HARDCODED_DARK_SURFACE', d.line,
                `${d.prop}: ${d.value} fixo — continua escuro no tema claro.`,
                'Use theme.colors.surface/background ou isLight(theme) ? <cor clara> : <cor escura>. Se for intencional (ex.: bloco de código), registre audit-ignore com motivo.',
                { component: compName });
            }
          }
        }
      }

      // --- outline sem foco ---
      const outline = sb.getDecl(block, 'outline');
      if (outline && !outline.dynamic && /^(none|0)$/.test(clean(outline.value)) && !/:focus/.test(header) && !compHasFocus && !ignored('OUTLINE_NONE_WITHOUT_FOCUS')) {
        add('OUTLINE_NONE_WITHOUT_FOCUS', outline.line,
          'outline removido e o componente não define :focus/:focus-visible/:focus-within — usuários de teclado perdem a posição do foco.',
          'Adicione &:focus-visible { outline: 2px solid <cor de destaque>; outline-offset: 2px; } (ou box-shadow de anel) no componente.',
          { component: compName });
      }

      // --- gradiente roxo genérico ---
      for (const p of BG_PROPS.concat(['background-image'])) {
        const d = sb.getDecl(block, p);
        if (!d || d.dynamic || !/gradient/.test(d.value) || ignored('PURPLE_GRADIENT_SLOP')) continue;
        const hues = sb.allColors(d.value).map(sb.hsl).filter((h) => h.s > 0.45 && h.l > 0.3 && h.l < 0.75);
        const purple = hues.filter((h) => h.h >= 240 && h.h <= 335);
        if (purple.length >= 2) {
          add('PURPLE_GRADIENT_SLOP', d.line, 'Gradiente roxo→índigo/rosa: a estética padrão de interface gerada por IA.', 'Prefira a cor de destaque da marca sólida, ou um gradiente sutil na mesma matiz (ex.: primary → primary 10% mais escuro).', { component: compName });
        }
      }
    }
  }

  // ---------------- estilos inline ----------------
  if (/\.(tsx|jsx|js|mjs)$/.test(ext) && styledDual) {
    for (const st of sb.extractInlineStyles(content, lineIndex)) {
      const colorP = st.props.find((p) => p.prop === 'color');
      const bgP = st.props.find((p) => p.prop === 'background' || p.prop === 'background-color');
      if (!colorP || !colorP.literal || colorP.themed) continue;
      const c = sb.parseColor(colorP.literal);
      if (!c || !sb.isWhiteish(c) || sb.lineIgnored(lines, colorP.line - 1, 'LIGHT_MODE_WHITE_TEXT')) continue;
      let severity = 'warn';
      if (bgP && bgP.literal) {
        const b = sb.parseColor(bgP.literal) || (sb.allColors(bgP.literal)[0]);
        if (b && b.a >= 0.9) {
          const ratio = sb.contrastRatio(c, b);
          if (ratio >= 3) continue;
          if (ratio >= 1.6) {
            if (!sb.lineIgnored(lines, colorP.line - 1, 'LOW_CONTRAST')) add('LOW_CONTRAST', colorP.line, `style: color ${colorP.literal} sobre ${bgP.literal} — contraste ${ratio.toFixed(2)}:1.`, 'Escureça o fundo (ex.: um tom 700) ou use texto escuro.', { severity: 'warn' });
            continue;
          }
          severity = 'error'; // fundo opaco e claro: branco no branco
        }
      }
      if (bgP && !bgP.literal && SEMANTIC_TOKEN.test(bgP.raw)) continue;
      if (bgP && !bgP.literal && SURFACE_TOKEN.test(bgP.raw)) severity = 'error';
      add('LIGHT_MODE_WHITE_TEXT', colorP.line, `style={{ color: '${colorP.literal}' }} ${bgP ? `sobre ${bgP.raw.slice(0, 60)}` : 'sem fundo no mesmo elemento'} — no tema claro tende a ficar branco no branco.`, "Use theme.colors.text (useTheme) ou isLight ? '#0f172a' : '#fff'. Se o pai tem fundo escuro fixo (ex.: overlay de mídia), registre audit-ignore com o motivo.", { severity });
    }
  }

  // ---------------- Tailwind ----------------
  const classAttrs = /\.(tsx|jsx|js|mjs|html|vue|svelte)$/.test(ext) ? sb.extractClassAttrs(content, lineIndex) : [];
  for (const a of classAttrs) {
    const tokens = sb.classTokens(a.value);
    const bare = tokens.filter((t) => !t.includes(':'));
    const darkTokens = tokens.filter((t) => t.startsWith('dark:'));
    const solidBg = bare.some((t) => /^bg-(black|(\w+)-(5|6|7|8|9)\d{2}|(\w+)-950|gradient-|\[#)/.test(t) && !/\/\d+$/.test(t));

    if (twDual) {
      const whiteTok = bare.find((t) => /^text-(white|(zinc|slate|gray|neutral|stone)-(50|100))$/.test(t));
      if (whiteTok && !solidBg && !darkTokens.some((t) => /^dark:text-/.test(t)) && !sb.lineIgnored(lines, a.line - 1, 'LIGHT_MODE_WHITE_TEXT')) {
        add('LIGHT_MODE_WHITE_TEXT', a.line, `"${whiteTok}" sem fundo sólido escuro no mesmo elemento e sem par dark: — no tema claro fica branco no branco.`, `Use "text-zinc-900 dark:${whiteTok}".`);
      }
      const ghostTok = bare.find((t) => /^(bg|border)-white\/(\[0?\.\d+\]|[0-9]|1[0-5])$/.test(t));
      if (ghostTok && !sb.lineIgnored(lines, a.line - 1, 'LIGHT_MODE_GHOST_SURFACE')) {
        const kind = ghostTok.startsWith('bg') ? 'bg' : 'border';
        add('LIGHT_MODE_GHOST_SURFACE', a.line, `"${ghostTok}" sem prefixo dark: — some no tema claro.`, `Use "${kind === 'bg' ? 'bg-white' : 'border-zinc-200'} dark:${ghostTok}".`);
      }
      const darkBgTok = bare.find((t) => /^bg-(black|(zinc|slate|gray|neutral|stone)-(900|950))$/.test(t));
      if (darkBgTok && !darkTokens.some((t) => /^dark:bg-/.test(t)) && !sb.lineIgnored(lines, a.line - 1, 'HARDCODED_DARK_SURFACE')) {
        add('HARDCODED_DARK_SURFACE', a.line, `"${darkBgTok}" sem variante para o tema claro.`, `Use "bg-white dark:${darkBgTok}".`);
      }
    }

    if (bare.includes('outline-none') && !tokens.some((t) => /^focus(-visible|-within)?:(ring|outline|border|shadow)/.test(t)) && !sb.lineIgnored(lines, a.line - 1, 'OUTLINE_NONE_WITHOUT_FOCUS')) {
      add('OUTLINE_NONE_WITHOUT_FOCUS', a.line, '"outline-none" sem focus-visible:ring/outline no mesmo elemento.', 'Adicione "focus-visible:ring-2 focus-visible:ring-offset-2".');
    }
    const from = tokens.find((t) => /^from-(purple|violet|fuchsia|indigo)-\d+$/.test(t));
    const to = tokens.find((t) => /^(to|via)-(pink|indigo|purple|violet|fuchsia)-\d+$/.test(t));
    if (from && to && !sb.lineIgnored(lines, a.line - 1, 'PURPLE_GRADIENT_SLOP')) {
      add('PURPLE_GRADIENT_SLOP', a.line, `Gradiente "${from} → ${to}": estética padrão de IA.`, 'Use a cor de destaque da marca, sólida ou com gradiente na mesma matiz.');
    }
    if (bare.some((t) => /^backdrop-blur-(md|lg|xl|2xl|3xl)$/.test(t)) && bare.some((t) => /^bg-(white|black)\/(5|10)$/.test(t)) && !sb.lineIgnored(lines, a.line - 1, 'UNREGULATED_BLUR')) {
      add('UNREGULATED_BLUR', a.line, 'Blur pesado sobre fundo 5–10% opaco: vira “vidro” ilegível em cima de conteúdo variado.', 'Use superfície opaca (bg-white dark:bg-zinc-900) com borda de 1px; reserve blur para overlays.');
    }
  }

  // ---------------- copy ----------------
  if (/\.(tsx|jsx|html|vue|svelte)$/.test(ext)) {
    const re = /Elevate your (?:workflow|experience)|Seamless (?:integration|experience)|Next-Gen (?:platform|solution)|Unleash the power of|Supercharge your|Revolucione (?:seu|sua)|Eleve (?:seu|sua) (?:fluxo|experiência)/i;
    lines.forEach((l, i) => {
      if (re.test(l)) add('AI_CLICHE_COPY', i + 1, `Copy genérica: "${l.trim().slice(0, 80)}".`, 'Escreva o benefício concreto para o usuário, em linguagem direta.');
    });
  }

  return { rel, findings };
}

// ---------------------------------------------------------------------------
// Contexto de projeto
// ---------------------------------------------------------------------------

function projectRoots(files) {
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
  return [...roots];
}

// Projeto tem tema claro E escuro? (procura sinais em arquivos de tema/estilo globais)
function detectProjectDual(files) {
  const candidates = ['src/styles/global.ts', 'src/styles/themes', 'src/styles/theme.ts', 'src/theme.ts', 'src/themes', 'src/index.css', 'src/globals.css', 'app/globals.css', 'src/app/globals.css', 'tailwind.config.js', 'tailwind.config.ts'];
  for (const r of projectRoots(files)) {
    for (const c of candidates) {
      const p = path.join(r, c);
      if (!fs.existsSync(p)) continue;
      const list = fs.statSync(p).isDirectory() ? fs.readdirSync(p).map((n) => path.join(p, n)).filter((x) => fs.statSync(x).isFile()) : [p];
      for (const f of list) {
        const t = fs.readFileSync(f, 'utf8');
        if (/darkMode\s*:|prefers-color-scheme|\.dark\s*[{,]|\[data-theme|isLight|themeSchema|light\s*[:=]\s*\{|lightTheme|darkTheme/.test(t)) return true;
      }
    }
  }
  return false;
}

function score(findings) {
  const perRule = {};
  for (const f of findings) perRule[f.ruleId] = (perRule[f.ruleId] || 0) + 1;
  let deduction = 0;
  for (const [id, n] of Object.entries(perRule)) deduction += Math.min(n * RULES[id].penalty, RULES[id].penalty * 3);
  return Math.max(0, 100 - deduction);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const files = [];
const missing = [];
for (const t of targets) collect(path.resolve(process.cwd(), t), files, missing);

const ctx = { projectDual: !darkOnly && detectProjectDual(files) };
const results = files.map((f) => {
  try { return auditFile(f, ctx); } catch (e) { return { rel: path.relative(process.cwd(), f), findings: [], error: e.message }; }
});
const findings = results.flatMap((r) => r.findings);
const errors = findings.filter((f) => f.severity === 'error');
const warnings = findings.filter((f) => f.severity === 'warn');
const finalScore = score(findings);
const parseErrors = results.filter((r) => r.error).map((r) => ({ file: r.rel, error: r.error }));
const failed = errors.length > 0 || (minScore > 0 && finalScore < minScore);

if (asJson) {
  console.log(JSON.stringify({
    tool: 'craft-audit',
    version: VERSION,
    filesScanned: files.length,
    missing,
    dualTheme: ctx.projectDual,
    pageBackgrounds: { light: hex(PAGE.light), dark: hex(PAGE.dark) },
    score: finalScore,
    errors: errors.length,
    warnings: warnings.length,
    passed: !failed,
    findings,
    parseErrors,
    note: 'Análise estática. O contraste final na tela exige visual-check.js nos dois temas.',
  }, null, 2));
  process.exit(failed ? 1 : 0);
}

console.log(`🎨 craft-audit v${VERSION} — ${files.length} arquivo(s) · tema duplo: ${ctx.projectDual ? 'sim' : 'não detectado'}${darkOnly ? ' (--dark-only)' : ''}`);
if (missing.length) console.log(`⚠️  Caminho(s) inexistente(s): ${missing.join(', ')}`);
for (const f of [...errors, ...warnings]) {
  const icon = f.severity === 'error' ? '❌ ERRO ' : '⚠️  AVISO';
  console.log(`\n${icon} [${f.ruleId}] ${f.file}:${f.line}${f.component ? ` (${f.component})` : ''}`);
  console.log(`   ${f.message}`);
  console.log(`   → ${f.suggestion}`);
}
for (const p of parseErrors) console.log(`\n⚠️  Falha ao analisar ${p.file}: ${p.error}`);
console.log(`\nScore: ${finalScore}/100 · erros: ${errors.length} · avisos: ${warnings.length}`);
console.log('ℹ️  Análise estática não vê a tela. Confirme nos dois temas: node scripts/visual-check.js');
process.exit(failed ? 1 : 0);
