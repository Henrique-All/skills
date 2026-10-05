/**
 * scripts/lib/style-blocks.js
 *
 * Analisador de estilos por BLOCO (não por linha).
 * Extrai CSS de arquivos .css/.scss, de <style> em .html/.vue/.svelte e de
 * template literals do styled-components (styled.x`...`, styled(X)`...`, css`...`,
 * createGlobalStyle`...`). Também extrai objetos inline `style={{ ... }}` do JSX.
 *
 * Por que existe: regras como "position: fixed + top + left" só fazem sentido
 * olhando o bloco inteiro. Ler linha a linha fazia essas regras nunca dispararem.
 *
 * ATENÇÃO: este arquivo existe idêntico em frontend-craftsman/scripts/lib e
 * mobile-converter/scripts/lib (cada skill é instalada de forma independente).
 * O teste do monorepo falha se as duas cópias divergirem.
 */

'use strict';

const STYLE_FILE_EXTS = new Set(['.css', '.scss', '.less']);
const MARKUP_EXTS = new Set(['.html', '.vue', '.svelte']);

// ---------------------------------------------------------------------------
// Utilidades de linha
// ---------------------------------------------------------------------------

function buildLineIndex(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) starts.push(i + 1);
  }
  return starts;
}

function lineOf(lineIndex, offset) {
  let lo = 0;
  let hi = lineIndex.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineIndex[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

// ---------------------------------------------------------------------------
// Varredura de JS: pular strings, comentários e template literals aninhados
// ---------------------------------------------------------------------------

function skipString(src, i, quote) {
  // i aponta para a aspa de abertura
  i++;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\') { i += 2; continue; }
    if (ch === quote) return i + 1;
    if (ch === '\n' && quote !== '`') return i + 1; // string quebrada, aborta
    i++;
  }
  return i;
}

// Retorna o índice logo após o '}' que fecha uma interpolação ${ ... }.
// i aponta para o primeiro caractere depois de '${'.
function skipInterpolation(src, i) {
  let depth = 1;
  while (i < src.length) {
    const ch = src[i];
    const next = src[i + 1];
    if (ch === '/' && next === '/') { const nl = src.indexOf('\n', i); i = nl === -1 ? src.length : nl + 1; continue; }
    if (ch === '/' && next === '*') { const end = src.indexOf('*/', i + 2); i = end === -1 ? src.length : end + 2; continue; }
    if (ch === '"' || ch === "'") { i = skipString(src, i, ch); continue; }
    if (ch === '`') { i = skipTemplate(src, i + 1); continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return i + 1; }
    i++;
  }
  return i;
}

// Pula um template literal. i aponta para o primeiro caractere depois do '`'.
function skipTemplate(src, i) {
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\') { i += 2; continue; }
    if (ch === '`') return i + 1;
    if (ch === '$' && src[i + 1] === '{') { i = skipInterpolation(src, i + 2); continue; }
    i++;
  }
  return i;
}

// Lê o corpo de um template literal e devolve o CSS com interpolações
// substituídas por marcadores (__I0__, __I1__...). Newlines são preservadas
// para que os números de linha continuem corretos.
function readTemplateBody(src, start) {
  let i = start;
  let css = '';
  const interps = [];
  const interpSpans = []; // { from, to, cssPos } offsets no arquivo original
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\') { css += src.slice(i, i + 2); i += 2; continue; }
    if (ch === '`') return { css, interps, interpSpans, end: i + 1 };
    if (ch === '$' && src[i + 1] === '{') {
      const end = skipInterpolation(src, i + 2);
      const raw = src.slice(i + 2, end - 1);
      const id = interps.length;
      interps.push(raw);
      interpSpans.push({ from: i, to: end, cssPos: css.length });
      const newlines = (raw.match(/\n/g) || []).length;
      css += `__I${id}__` + '\n'.repeat(newlines);
      i = end;
      continue;
    }
    css += ch;
    i++;
  }
  return { css, interps, interpSpans, end: i };
}

// Cabeçalhos de bloco abertos em uma posição do CSS (ex.: ['@media (max-width: 768px)']).
function headerChainAt(css, pos) {
  const stack = [];
  let buf = '';
  for (let i = 0; i < pos && i < css.length; i++) {
    const ch = css[i];
    if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end === -1 ? css.length : end + 1;
      continue;
    }
    if (ch === '{') { stack.push(buf.trim().replace(/\s+/g, ' ')); buf = ''; continue; }
    if (ch === '}') { stack.pop(); buf = ''; continue; }
    if (ch === ';') { buf = ''; continue; }
    buf += ch;
  }
  return stack;
}

const THEME_HINT = /\btheme\b|isLight|isDark|\blight\b|\bdark\b|themeSchema|colorScheme|mode\s*===/;

// ---------------------------------------------------------------------------
// Extração de fontes de estilo
// ---------------------------------------------------------------------------

const STYLED_START = /(?:\bstyled(?:\.([a-zA-Z][\w]*)|\(\s*([A-Za-z_$][\w.$]*)[^)]*\))(?:\s*\.attrs\((?:[^()]|\([^()]*\))*\))?(?:\s*<[^`;]*?>)?|\b(css|createGlobalStyle|keyframes))\s*`/g;

function componentNameBefore(src, offset) {
  const before = src.slice(Math.max(0, offset - 160), offset);
  const m = before.match(/(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*$/);
  return m ? m[1] : null;
}

function extractStyleSources(content, ext) {
  const lower = (ext || '').toLowerCase();
  const sources = [];

  if (STYLE_FILE_EXTS.has(lower)) {
    sources.push({ css: content, interps: [], startOffset: 0, component: null, tag: null, kind: 'stylesheet' });
    return sources;
  }

  if (MARKUP_EXTS.has(lower)) {
    const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
    let m;
    while ((m = re.exec(content))) {
      const bodyStart = m.index + m[0].indexOf('>') + 1;
      sources.push({ css: m[1], interps: [], startOffset: bodyStart, component: null, tag: null, kind: 'style-tag' });
    }
  }

  STYLED_START.lastIndex = 0;
  let m;
  const styled = [];
  while ((m = STYLED_START.exec(content))) {
    const bodyStart = m.index + m[0].length;
    const { css, interps, interpSpans, end } = readTemplateBody(content, bodyStart);
    styled.push({
      css,
      interps,
      interpSpans,
      startOffset: bodyStart,
      endOffset: end,
      component: componentNameBefore(content, m.index),
      tag: m[1] || m[2] || null,
      helper: m[3] || null,
      kind: 'styled',
      nested: false,
      contextHeaders: [],
    });
    // Não pula o corpo: css`` aninhado dentro de interpolações também é extraído.
    STYLED_START.lastIndex = m.index + m[0].length;
  }

  // css`` aninhado herda o componente e os @media que envolvem a interpolação.
  for (const s of styled) {
    let parent = null;
    for (const p of styled) {
      if (p === s) continue;
      if (p.startOffset < s.startOffset && p.endOffset >= s.endOffset) {
        if (!parent || p.startOffset > parent.startOffset) parent = p;
      }
    }
    if (!parent) continue;
    s.nested = true;
    s.component = s.component || parent.component;
    s.tag = s.tag || parent.tag;
    const spanIdx = parent.interpSpans.findIndex((sp) => sp.from <= s.startOffset && sp.to >= s.endOffset);
    const span = spanIdx === -1 ? null : parent.interpSpans[spanIdx];
    s.parentRef = parent;
    s.parentCssPos = span ? span.cssPos : null;
    // Texto da interpolação que contém este css`` e a posição dele ali dentro
    // (permite saber se ele está em `isLight(theme) ? css`A` : css`B`` etc.).
    s.parentInterp = span ? parent.interps[spanIdx] : null;
    s.parentInterpPos = span ? s.startOffset - (span.from + 2) : 0;
  }
  // resolve contexto em ordem (pais antes dos filhos, pois aparecem antes no arquivo)
  for (const s of styled) {
    if (!s.parentRef) continue;
    const own = s.parentCssPos === null ? [] : headerChainAt(s.parentRef.css, s.parentCssPos);
    s.contextHeaders = [...s.parentRef.contextHeaders, ...own];
    delete s.parentRef;
  }

  return sources.concat(styled);
}

// ---------------------------------------------------------------------------
// Parser de blocos CSS
// ---------------------------------------------------------------------------

function newBlock(header, parent, line) {
  return { header, parent, line, decls: [], children: [], comments: [], hasLooseInterp: false, contextHeaders: [] };
}

function parseBlocks(source, lineIndex) {
  const { css, startOffset } = source;
  const baseLine = lineOf(lineIndex, startOffset);
  const localIndex = buildLineIndex(css);
  const toLine = (pos) => baseLine + lineOf(localIndex, pos) - 1;

  const root = newBlock('', null, baseLine);
  root.source = source;
  root.contextHeaders = source.contextHeaders || [];
  let cur = root;
  let buf = '';
  let bufStart = -1;

  const flush = () => {
    const text = buf.trim();
    if (text) {
      const colon = text.indexOf(':');
      const isInterpOnly = /^__I\d+__$/.test(text);
      if (isInterpOnly || colon === -1) {
        if (/__I\d+__/.test(text)) cur.hasLooseInterp = true;
      } else {
        const prop = text.slice(0, colon).trim().toLowerCase();
        const value = text.slice(colon + 1).trim().replace(/\s+/g, ' ');
        if (prop && !/\s/.test(prop) && !/__I\d+__/.test(prop)) {
          const interpIds = [...value.matchAll(/__I(\d+)__/g)].map((x) => Number(x[1]));
          const rawInterps = interpIds.map((id) => source.interps[id] || '');
          cur.decls.push({
            prop,
            value,
            line: toLine(bufStart),
            dynamic: interpIds.length > 0,
            themed: rawInterps.some((r) => THEME_HINT.test(r)),
            rawInterps,
          });
        }
      }
    }
    buf = '';
    bufStart = -1;
  };

  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      const stop = end === -1 ? css.length : end + 2;
      cur.comments.push(css.slice(i, stop));
      i = stop - 1;
      continue;
    }
    if (ch === '/' && css[i + 1] === '/' && source.kind !== 'stylesheet') {
      // comentário de linha (scss / styled-components)
      const nl = css.indexOf('\n', i);
      const stop = nl === -1 ? css.length : nl;
      cur.comments.push(css.slice(i, stop));
      i = stop - 1;
      continue;
    }
    if (ch === '{') {
      const header = buf.trim().replace(/\s+/g, ' ');
      const child = newBlock(header, cur, toLine(bufStart === -1 ? i : bufStart));
      child.source = source;
      cur.children.push(child);
      cur = child;
      buf = '';
      bufStart = -1;
      continue;
    }
    if (ch === '}') {
      flush();
      cur = cur.parent || root;
      continue;
    }
    if (ch === ';') {
      flush();
      continue;
    }
    if (bufStart === -1 && !/\s/.test(ch)) bufStart = i;
    buf += ch;
  }
  flush();
  return root;
}

// ---------------------------------------------------------------------------
// Navegação de blocos
// ---------------------------------------------------------------------------

function walk(block, fn, depth = 0) {
  fn(block, depth);
  for (const child of block.children) walk(child, fn, depth + 1);
}

function getDecls(block, prop) {
  return block.decls.filter((d) => d.prop === prop);
}

function getDecl(block, prop) {
  const all = getDecls(block, prop);
  return all.length ? all[all.length - 1] : null;
}

function ancestors(block) {
  const list = [];
  let p = block.parent;
  while (p) { list.push(p); p = p.parent; }
  return list;
}

function isMediaHeader(header) {
  return /^@media\b/i.test(header || '');
}

// Todos os cabeçalhos que envolvem o bloco, incluindo o contexto herdado de css`` aninhado.
function headerChain(block) {
  const chain = [block, ...ancestors(block)];
  const root = chain[chain.length - 1];
  return [...chain.map((b) => b.header), ...(root.contextHeaders || [])];
}

// Bloco está dentro de um @media max-width (contexto mobile)?
function inMobileMedia(block) {
  return headerChain(block).some((h) => isMediaHeader(h) && /max-width/i.test(h));
}

function inDesktopOnlyMedia(block) {
  return headerChain(block).some((h) => isMediaHeader(h) && /min-width/i.test(h) && !/max-width/i.test(h));
}

function containsInterp(block) {
  let found = false;
  walk(block, (b) => {
    if (b.hasLooseInterp || b.decls.some((d) => d.dynamic)) found = true;
  });
  return found;
}

// Diretiva de supressão: /* audit-ignore RULE_ID: motivo */ ou // audit-ignore RULE_ID
function isIgnored(block, ruleId) {
  const chain = [block, ...ancestors(block)];
  return chain.some((b) =>
    b.comments.some((c) => {
      const m = c.match(/audit-ignore\s+([A-Z_,\s]+|all)/i);
      if (!m) return false;
      const ids = m[1].split(/[\s,]+/).filter(Boolean).map((s) => s.toUpperCase());
      return ids.includes('ALL') || ids.includes(ruleId);
    })
  );
}

function lineIgnored(lines, index, ruleId) {
  const here = lines[index] || '';
  const prev = lines[index - 1] || '';
  const re = new RegExp(`audit-ignore\\s+[A-Z_,\\s]*\\b(${ruleId}|all)\\b`, 'i');
  return re.test(here) || re.test(prev);
}

// ---------------------------------------------------------------------------
// Cores e unidades
// ---------------------------------------------------------------------------

const NAMED = {
  white: [255, 255, 255], black: [0, 0, 0], transparent: [0, 0, 0, 0],
  red: [255, 0, 0], blue: [0, 0, 255], green: [0, 128, 0], gray: [128, 128, 128], grey: [128, 128, 128],
  purple: [128, 0, 128], violet: [238, 130, 238], indigo: [75, 0, 130], fuchsia: [255, 0, 255],
};

function parseColor(str) {
  if (!str) return null;
  const s = String(str).trim().toLowerCase();
  let m = s.match(/#([0-9a-f]{3,8})\b/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }
  m = s.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)/);
  if (m) {
    let a = 1;
    if (m[4] !== undefined) a = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }
  m = s.match(/\b(white|black|transparent|red|blue|green|gray|grey|purple|violet|indigo|fuchsia)\b/);
  if (m) {
    const v = NAMED[m[1]];
    return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 };
  }
  return null;
}

function allColors(str) {
  const out = [];
  const re = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi;
  let m;
  while ((m = re.exec(str || ''))) {
    const c = parseColor(m[0]);
    if (c) out.push(c);
  }
  return out;
}

function luminance(c) {
  const f = (v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}

function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function hsl(c) {
  const r = c.r / 255, g = c.g / 255, b = c.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s, l };
}

function isWhiteish(c) {
  return !!c && c.a >= 0.6 && luminance(c) >= 0.8;
}

// Superfície translúcida branca de baixa opacidade: some no fundo claro.
function isGhostWhite(c) {
  return !!c && c.r >= 240 && c.g >= 240 && c.b >= 240 && c.a > 0 && c.a <= 0.15;
}

function toPx(value) {
  if (!value) return null;
  const m = String(value).trim().match(/^(-?[\d.]+)(px|rem|em)?$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!m[2]) return n === 0 ? 0 : null;
  if (m[2] === 'px') return n;
  return n * 16;
}

// Conta trilhas de grid-template-columns; retorna { count, hasFixed, hasFlexible, equal }
function analyzeTracks(value) {
  if (!value) return null;
  const v = value.trim();
  if (/auto-fill|auto-fit/.test(v)) return { count: 0, hasFixed: false, hasFlexible: true, equal: true, auto: true };
  const rep = v.match(/^repeat\(\s*(\d+)\s*,\s*([^)]+(?:\([^)]*\))?[^)]*)\)$/);
  if (rep) return { count: Number(rep[1]), hasFixed: /px|rem/.test(rep[2]) && !/fr|minmax|auto/.test(rep[2]), hasFlexible: /fr|minmax|auto/.test(rep[2]), equal: true };
  const tokens = [];
  let depth = 0, cur = '';
  for (const ch of v) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (/\s/.test(ch) && depth === 0) { if (cur) tokens.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur) tokens.push(cur);
  const fixed = tokens.filter((t) => /^[\d.]+(px|rem|em)$/.test(t));
  const flexible = tokens.filter((t) => /fr|minmax|auto/.test(t));
  return {
    count: tokens.length,
    hasFixed: fixed.length > 0,
    hasFlexible: flexible.length > 0,
    equal: new Set(tokens).size === 1,
  };
}

// ---------------------------------------------------------------------------
// Objetos inline style={{ ... }} do JSX
// ---------------------------------------------------------------------------

function splitTopLevel(str, sep) {
  const parts = [];
  let depth = 0, cur = '', quote = null;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (quote) {
      cur += ch;
      if (ch === '\\') { cur += str[++i] || ''; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; cur += ch; continue; }
    if ('([{'.includes(ch)) depth++;
    if (')]}'.includes(ch)) depth--;
    if (ch === sep && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

function kebab(prop) {
  return prop.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
}

// Valor é literal estático? ("#fff", '#fff', `#fff` sem interpolação)
function literalValue(raw) {
  const v = raw.trim();
  const m = v.match(/^(['"])([^'"]*)\1$/) || v.match(/^`([^`$]*)`$/);
  if (!m) return null;
  return m[2] !== undefined ? m[2] : m[1];
}

function extractInlineStyles(content, lineIndex) {
  const results = [];
  const re = /style=\{\{/g;
  let m;
  while ((m = re.exec(content))) {
    const start = m.index + m[0].length;
    // procurar o fechamento '}}' respeitando aninhamento
    let i = start, depth = 2;
    while (i < content.length && depth > 0) {
      const ch = content[i];
      if (ch === '"' || ch === "'") { i = skipString(content, i, ch); continue; }
      if (ch === '`') { i = skipTemplate(content, i + 1); continue; }
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      i++;
    }
    const body = content.slice(start, i - 2);
    const props = [];
    let offset = start;
    for (const part of splitTopLevel(body, ',')) {
      const colon = part.indexOf(':');
      const partOffset = offset + (part.length - part.trimStart().length);
      offset += part.length + 1;
      if (colon === -1) continue;
      const key = part.slice(0, colon).trim().replace(/^['"]|['"]$/g, '');
      if (!/^[a-zA-Z]+$/.test(key)) continue;
      const raw = part.slice(colon + 1).trim();
      props.push({
        prop: kebab(key),
        raw,
        literal: literalValue(raw),
        themed: THEME_HINT.test(raw) || /\?/.test(raw),
        line: lineOf(lineIndex, partOffset),
      });
    }
    results.push({ line: lineOf(lineIndex, m.index), props });
    re.lastIndex = i;
  }
  return results;
}

// ---------------------------------------------------------------------------
// Atributos className / class (Tailwind)
// ---------------------------------------------------------------------------

// Extrai valores de className="..." / className={`...`} / className={cn(...)} / class="...".
// Retorna { value, line, endLine, tag } onde tag é o elemento JSX/HTML dono do atributo.
function extractClassAttrs(content, lineIndex) {
  const out = [];
  const re = /\b(className|class)\s*=\s*/g;
  let m;
  while ((m = re.exec(content))) {
    const i = m.index + m[0].length;
    const ch = content[i];
    let value = null;
    let end = i;
    if (ch === '"' || ch === "'") {
      end = content.indexOf(ch, i + 1);
      if (end === -1) continue;
      value = content.slice(i + 1, end);
      end += 1;
    } else if (ch === '{') {
      end = skipInterpolation(content, i + 1);
      value = content.slice(i + 1, end - 1);
    } else {
      continue;
    }
    const lt = content.lastIndexOf('<', m.index);
    const tagMatch = lt === -1 ? null : content.slice(lt, m.index).match(/^<([A-Za-z][\w.]*)/);
    out.push({
      value,
      line: lineOf(lineIndex, m.index),
      endLine: lineOf(lineIndex, Math.max(m.index, end - 1)),
      tag: tagMatch ? tagMatch[1] : null,
    });
    re.lastIndex = end;
  }
  return out;
}

// Tokens de classe (ignora aspas, chaves e crases; preserva colchetes do Tailwind arbitrário).
function classTokens(value) {
  return (String(value || '').match(/[^\s'"`{}]+/g) || [])
    .map((t) => t.replace(/^[(,]+|[),]+$/g, ''))
    .filter(Boolean);
}

module.exports = {
  buildLineIndex,
  lineOf,
  extractStyleSources,
  parseBlocks,
  walk,
  getDecl,
  getDecls,
  ancestors,
  headerChain,
  headerChainAt,
  isMediaHeader,
  inMobileMedia,
  inDesktopOnlyMedia,
  containsInterp,
  isIgnored,
  lineIgnored,
  parseColor,
  allColors,
  luminance,
  contrastRatio,
  hsl,
  isWhiteish,
  isGhostWhite,
  toPx,
  analyzeTracks,
  extractInlineStyles,
  extractClassAttrs,
  classTokens,
};
