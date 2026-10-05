#!/usr/bin/env node
/**
 * scripts/adapt-screen.js - Gerador Arquitetural de Adaptação Mobile (v3.0.0)
 *
 * Analisa telas desktop complexas (especialmente chats, inboxes, dashboards e tabelas)
 * e gera o plano arquitetural obrigatório de conversão mobile nativa (Master-Detail,
 * Bottom Sheets, Touch Targets e Viewport Dinâmico), erradicando a preguiça de apenas
 * empilhar colunas verticalmente.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const targetFile = process.argv[2];

if (!targetFile) {
  console.log('Uso: node adapt-screen.js <caminho-do-arquivo.tsx> [--json]');
  process.exit(1);
}

const asJson = process.argv.includes('--json');
const fullPath = path.resolve(process.cwd(), targetFile);

if (!fs.existsSync(fullPath)) {
  console.error(`❌ Arquivo não encontrado: ${targetFile}`);
  process.exit(1);
}

const content = fs.readFileSync(fullPath, 'utf-8');
const fileName = path.basename(fullPath);

// Análise Heurística da Estrutura
const isChatOrInbox = /chat|ticket|inbox|atendimento|conversa|message|mensagem/i.test(content) ||
                      /selected|activeChat|activeTicket|conversaAtiva|currentId/i.test(content);

const hasMultiColumns = /grid-template-columns|flex-direction:\s*row|display:\s*flex[^}]*gap|flex:\s*[1-9]/i.test(content) ||
                        /col-span|w-1\/[234]|w-2\/3|grid-cols-[2-9]/i.test(content);

const hasStackedFallbackOnly = /@media[^{]*\(\s*max-width[^{]*\)\s*\{[^}]*flex-direction:\s*column/i.test(content) ||
                              /flex-col\s+md:flex-row/i.test(content);

const hasBackButton = /onBack|voltar|handleBack|goBack|arrow-left|ArrowLeft|ChevronLeft|setSelect(ed)?Chat\(null\)|setSelect(ed)?Ticket\(null\)/i.test(content);

const hasTable = /<table\b/i.test(content);
const has100vh = /100vh\b|h-screen\b/i.test(content) && !/100dvh|h-dvh/i.test(content);
const hasFixedBottom = /(fixed\s+bottom-0|position:\s*fixed[^}]*bottom:\s*0)/i.test(content) && !/safe-area-inset-bottom/i.test(content);
const hasSmallFontInput = /font-size:\s*(1[0-3]px|0\.[78]rem)|text-(xs|sm)\b[^'"`]*<(input|textarea|select)/i.test(content);
const hasFixedHeaderBtn = /(top:\s*(?:1[0-6]px|[0-9]px)[^}]*left:\s*(?:1[0-6]px|[0-9]px)|fixed\s+top-[1-4]\s+left-[1-4])/i.test(content);

const plan = {
  file: targetFile,
  architecture: isChatOrInbox ? 'MASTER_DETAIL_REQUIRED' : hasMultiColumns ? 'MULTI_COLUMN_RESPONSIVE' : 'STANDARD_RESPONSIVE',
  actions: [],
  codeBoilerplate: null
};

// 1. MASTER-DETAIL PARA CHAT / INBOX / MULTI-COLUNA
if (isChatOrInbox || (hasMultiColumns && hasStackedFallbackOnly)) {
  plan.actions.push({
    severity: 'CRITICAL',
    title: 'Arquitetura Master-Detail Obrigatória (Anti-Empilhamento)',
    reason: 'Layout de atendimento/chat multi-coluna. Empilhar colunas verticalmente no celular obriga o usuário a rolar dezenas de mensagens para conseguir ver o chat.',
    solution: 'Exiba apenas a lista de conversas quando nenhum chat estiver selecionado. Ao clicar em uma conversa, oculte a lista e mostre o chat em tela cheia (100dvh) com botão "← Voltar" no topo (área de toque >= 44x44px).'
  });

  if (!hasBackButton) {
    plan.actions.push({
      severity: 'CRITICAL',
      title: 'Botão de Retorno (Back Button) Ausente',
      reason: 'No celular, uma vez dentro da conversa em tela cheia, o usuário não tem como retornar à lista de atendimentos.',
      solution: 'Adicione um botão "← Voltar" no cabeçalho mobile do chat que reseta o estado de seleção (ex.: onBack={() => setSelectedChat(null)}).'
    });
  }

  plan.codeBoilerplate = `
// 📱 BOILERPLATE SUGERIDO: Arquitetura Master-Detail para ${fileName}
// Estado de navegação móvel:
const [mobileActiveView, setMobileActiveView] = useState<'list' | 'chat' | 'details'>('list');

// Sincronize com a seleção:
useEffect(() => {
  if (selectedId) {
    setMobileActiveView('chat');
  }
}, [selectedId]);

// No JSX:
<Container>
  {/* Coluna 1: Lista (visível no desktop, no mobile só se não estiver no chat) */}
  <SidebarColumn style={{ display: isMobile && mobileActiveView !== 'list' ? 'none' : 'flex' }}>
    <ConversationsList onSelect={(item) => {
      setSelectedId(item.id);
      setMobileActiveView('chat');
    }} />
  </SidebarColumn>

  {/* Coluna 2: Chat em tela cheia no mobile */}
  <ChatColumn style={{ display: isMobile && mobileActiveView !== 'chat' ? 'none' : 'flex' }}>
    {/* Cabeçalho Mobile com Botão Voltar */}
    {isMobile && (
      <MobileHeader>
        <BackButton onClick={() => { setSelectedId(null); setMobileActiveView('list'); }}>
          ← Voltar
        </BackButton>
        <Title>{activeTitle}</Title>
        <InfoButton onClick={() => setMobileActiveView('details')}>ℹ️ Detalhes</InfoButton>
      </MobileHeader>
    )}
    <MessagesArea />
  </ChatColumn>
</Container>
`;
}

// 2. TABELA HORIZONTAL
if (hasTable) {
  plan.actions.push({
    severity: 'HIGH',
    title: 'Metamorfose de Tabela para Cards Táteis',
    reason: 'Tabelas horizontais não cabem em telas de 390px e causam scroll horizontal feio ou quebra de colunas.',
    solution: 'Renderize a tabela apenas no desktop (hidden md:table). No celular, renderize um feed de cards com badges e botões de ação rápida no rodapé de cada card.'
  });
}

// 3. 100VH -> 100DVH
if (has100vh) {
  plan.actions.push({
    severity: 'HIGH',
    title: 'Substituição de 100vh por 100dvh',
    reason: '100vh no iOS Safari/Chrome móvel inclui a altura da barra do navegador, cortando a caixa de digitação/rodapé da tela.',
    solution: 'Adicione height: 100dvh (ou min-height: 100dvh) mantendo 100vh como fallback retrocompatível.'
  });
}

// 4. SAFE AREA BOTTOM
if (hasFixedBottom) {
  plan.actions.push({
    severity: 'HIGH',
    title: 'Safe Area na Base (env(safe-area-inset-bottom))',
    reason: 'Elementos fixos no rodapé colidem com a barra Home gestual do iPhone.',
    solution: 'Adicione padding-bottom: max(12px, env(safe-area-inset-bottom)); e garanta viewport-fit=cover.'
  });
}

// 5. AUTO-ZOOM NO IOS
if (hasSmallFontInput) {
  plan.actions.push({
    severity: 'MEDIUM',
    title: 'Prevenção de Auto-Zoom no iOS Safari',
    reason: 'Inputs com fonte < 16px fazem o navegador dar zoom automático na tela toda ao focar o campo.',
    solution: 'Defina font-size: 16px no mobile (ex: @media (max-width: 768px) { font-size: 16px; }).'
  });
}

// 6. CLEARANCE DE ELEMENTOS FIXOS
if (hasFixedHeaderBtn) {
  plan.actions.push({
    severity: 'MEDIUM',
    title: 'Clearance de Botão Fixo no Topo (Menu Hambúrguer)',
    reason: 'Botão flutuante no topo/esquerda colide com o título da página no mobile.',
    solution: 'No cabeçalho mobile, adicione padding-left: 64px para dar espaço ao botão sem sobreposição.'
  });
}

if (asJson) {
  console.log(JSON.stringify(plan, null, 2));
  process.exit(0);
}

console.log('===============================================================');
console.log(`📱 PLANO CIRÚRGICO DE ADAPTAÇÃO MOBILE: ${fileName}`);
console.log(`🏛️  Arquitetura Recomendada: ${plan.architecture}`);
console.log('===============================================================\n');

if (plan.actions.length === 0) {
  console.log('✅ Componente simples sem colisões ou estruturas multi-coluna complexas.');
} else {
  plan.actions.forEach((act, idx) => {
    const icon = act.severity === 'CRITICAL' ? '🚨' : act.severity === 'HIGH' ? '⚠️' : '💡';
    console.log(`${icon} [${idx + 1}/${plan.actions.length}] ${act.title} (${act.severity})`);
    console.log(`   Motivo:   ${act.reason}`);
    console.log(`   Solução:  ${act.solution}\n`);
  });

  if (plan.codeBoilerplate) {
    console.log('---------------------------------------------------------------');
    console.log('📝 BOILERPLATE ARQUITETURAL RECOMENDADO:');
    console.log(plan.codeBoilerplate);
    console.log('---------------------------------------------------------------\n');
  }
}
