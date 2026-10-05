#!/usr/bin/env node
/**
 * scripts/hooks/skill-router.js — Hook PreInvocation (Antigravity)
 *
 * Problema que resolve: as skills só eram seguidas quando o usuário digitava
 * /front, /mobile, /orch... Este hook lê o pedido do usuário UMA vez por turno,
 * detecta o domínio (UI/tema, mobile, banco, segurança, API) e injeta uma
 * mensagem efêmera dizendo ao agente quais SKILL.md ler e quais verificações
 * são obrigatórias — sem o usuário precisar digitar nada.
 *
 * Fail-open: qualquer erro → "{}".
 */

'use strict';

const fs = require('fs');
const u = require('./lib/hook-utils');

const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const DOMAINS = [
  {
    id: 'ui',
    label: 'UI / tema claro-escuro',
    skill: 'frontend-craftsman',
    re: /\b(tela|telas|layout|css|estilo|styled|componente|front|frontend|ui|ux|design|botao|botoes|modal|card|cores?|tema|modo claro|modo escuro|light ?mode|dark ?mode|contraste|fonte|icone|sidebar|header|cabecalho|rodape|pagina|visual|alinha\w*|centraliz\w*|espacamento|margem|padding|bonit\w*|feio|horrivel|aparencia|animacao|hover|tailwind)\b/,
  },
  {
    id: 'mobile',
    label: 'mobile / responsivo',
    skill: 'mobile-converter',
    re: /\b(mobile|celular|smartphone|iphone|android|responsiv\w*|tablet|touch|toque|tela pequena|hamburguer|hamburger|safe ?area|notch|viewport)\b/,
  },
  {
    id: 'db',
    label: 'banco de dados',
    skill: 'db-sentinel',
    re: /\b(banco|database|sql|migration|migracao|migracoes|schema|indice|index|tabela|query|prisma|drizzle|postgres\w*|mysql|sqlite|firebird|upgrade-\d+)\b/,
  },
  {
    id: 'security',
    label: 'segurança',
    skill: 'security-audit',
    re: /\b(seguranca|security|auth\w*|login|senha|password|jwt|token|cors|xss|csrf|owasp|vulnerab\w*|permiss\w*|cookie|upload|segredo|secret)\b/,
  },
  {
    id: 'api',
    label: 'rotas / contratos de API',
    skill: 'route-guard',
    re: /\b(endpoint|rota|rotas|route|routes|api|controller|contrato|payload|webhook)\b/,
  },
];

u.failOpen(() => {
  const input = u.readStdin();
  const { conversationId, transcriptPath } = input;
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return {};

  const last = u.readLastUserInput(transcriptPath);
  if (!last) return {};

  const state = u.readState(conversationId, 'router');
  if (state.lastUserStep === last.step_index) return {}; // já injetado neste turno
  u.writeState(conversationId, 'router', { lastUserStep: last.step_index, at: Date.now() });

  const text = norm(u.userText(last));
  if (!text || text.startsWith('/orch')) return {}; // /orch tem protocolo próprio
  const hits = DOMAINS.filter((d) => d.re.test(text));
  if (!hits.length) return {};

  const skillLines = hits
    .map((d) => {
      const p = u.findSkillFile(d.skill, 'SKILL.md');
      return p ? `- ${d.label}: leia ${p}` : null;
    })
    .filter(Boolean);
  if (!skillLines.length) return {};

  const ui = hits.some((d) => d.id === 'ui' || d.id === 'mobile');
  const craft = u.findSkillFile('frontend-craftsman', 'scripts/craft-audit.js');
  const mobile = u.findSkillFile('mobile-converter', 'scripts/mobile-audit.js');
  const visual = u.findSkillFile('frontend-craftsman', 'scripts/visual-check.js') || u.findSkillFile('mobile-converter', 'scripts/visual-check.js');

  const lines = [
    `[Enterprise AI Suite · roteamento automático] Domínio(s) detectado(s): ${hits.map((d) => d.label).join(', ')}.`,
    'Se este pedido NÃO envolve alterar código (pergunta/explicação), ignore esta mensagem.',
    'Antes de editar, leia as skills correspondentes (não peça ao usuário para digitar /front, /mobile etc.):',
    ...skillLines,
  ];
  if (ui && craft && mobile && visual) {
    lines.push(
      'Ao terminar QUALQUER alteração visual, antes de responder:',
      `1. node "${craft}" <arquivos alterados> --json   e   node "${mobile}" <arquivos alterados> --json — corrija os "error" nas linhas que você mexeu.`,
      `2. node "${visual}" --url <rota afetada> (tema claro + escuro, mobile 390px + desktop) e ABRA os screenshots com view_file.`,
      '3. Se o visual-check não puder rodar (servidor parado, login, tema não aplicado), diga isso ao usuário com todas as letras. Nunca declare "verificado" sem ter visto a tela.',
      'Um hook de saída (ui-quality-gate) confere isso quando você tentar encerrar.'
    );
  }
  return { injectSteps: [{ ephemeralMessage: lines.join('\n') }] };
});
