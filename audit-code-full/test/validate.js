#!/usr/bin/env node
/**
 * audit-code-full/test/validate.js
 * Teste automatizado de integridade da skill audit-code-full e seus 4 subagentes paralelos.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const skillDir = path.resolve(__dirname, '..');
const monorepoRoot = path.resolve(skillDir, '..');

const requiredFiles = [
  'SKILL.md',
  'install.js',
  'audit-code-full.mdc',
  'AGENTS.md',
  'README.md',
  'package.json',
  'scripts/audit-full.js',
  'scripts/worker-agent.js'
];

const requiredAgents = [
  'qa-crawler.agent.md',
  'qa-bruteforce.agent.md',
  'qa-ui-palette.agent.md',
  'qa-button-action.agent.md'
];

console.log('🧪 Validando arquivos da skill audit-code-full e seus 4 subagentes...\n');

for (const file of requiredFiles) {
  const filePath = path.join(skillDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Arquivo obrigatório não encontrado: ${file}`);
    process.exit(1);
  }
  const stats = fs.statSync(filePath);
  console.log(`✅ ${file} (${stats.size} bytes)`);
}

// Valida frontmatter do SKILL.md
const skillMd = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
if (!skillMd.startsWith('---') || !skillMd.includes('name: audit-code-full')) {
  console.error('❌ Frontmatter inválido no SKILL.md');
  process.exit(1);
}
console.log('✅ SKILL.md: Frontmatter válido e nome correspondente.');

// Valida os 4 agentes dedicados em agents/
for (const agentFile of requiredAgents) {
  const agentPath = path.join(monorepoRoot, 'agents', agentFile);
  if (!fs.existsSync(agentPath)) {
    console.error(`❌ Subagente da skill ausente em agents/: ${agentFile}`);
    process.exit(1);
  }
  const content = fs.readFileSync(agentPath, 'utf8');
  if (!content.startsWith('---') || !content.includes('name: qa-')) {
    console.error(`❌ Frontmatter YAML inválido em agents/${agentFile}`);
    process.exit(1);
  }
  console.log(`✅ Subagente verificado: agents/${agentFile}`);
}

// Teste de execução real dos 4 agentes em paralelo + code-map final em diretório sandbox isolado
const tmpSandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-code-full-test-'));

try {
  fs.mkdirSync(path.join(tmpSandbox, 'src', 'components'), { recursive: true });
  fs.mkdirSync(path.join(tmpSandbox, 'src', 'api'), { recursive: true });
  fs.mkdirSync(path.join(tmpSandbox, 'src', 'styles'), { recursive: true });

  // 1. Paleta oficial do projeto sandbox
  fs.writeFileSync(
    path.join(tmpSandbox, 'src', 'styles', 'theme.ts'),
    [
      'export const theme = {',
      '  primary: "#2563eb",',
      '  emerald: "#10b981"',
      '};'
    ].join('\n'),
    'utf8'
  );

  // 2. Componente UI com botão funcional, botão morto, botão vazio e cor fora da paleta
  const openTag = '<';
  const closeTag = '>';
  const uiFixtureLines = [
    'export function CheckoutScreen() {',
    '  const handlePay = () => fetch("/api/pay");',
    '  return (',
    `    ${openTag}div style={{ borderColor: "#ff00aa" }}${closeTag}`,
    `      ${openTag}button onClick={handlePay}${closeTag}Pagar Agora${openTag}/button${closeTag}`,
    `      ${openTag}button${closeTag}Botao Sem Funcao${openTag}/button${closeTag}`,
    `      ${openTag}Button onClick={() => {}}${closeTag}Botao Vazio${openTag}/Button${closeTag}`,
    `      ${openTag}a href="#"${closeTag}Link Morto${openTag}/a${closeTag}`,
    `    ${openTag}/div${closeTag}`,
    '  );',
    '}'
  ];
  fs.writeFileSync(
    path.join(tmpSandbox, 'src', 'components', 'CheckoutScreen.tsx'),
    uiFixtureLines.join('\n'),
    'utf8'
  );

  // 3. Rota de API com vulnerabilidades de bruteforce (JSON.parse sem try/catch e dereference profundo)
  fs.writeFileSync(
    path.join(tmpSandbox, 'src', 'api', 'orders.ts'),
    [
      'export async function createOrder(req, res) {',
      '  const parsed = JSON.parse(req.body.rawPayload);',
      '  const customerName = req.body.customer.profile.fullName;',
      '  return res.json({ parsed, customerName });',
      '}'
    ].join('\n'),
    'utf8'
  );

  const rawOut = execSync(
    `node "${path.join(skillDir, 'scripts', 'audit-full.js')}" "${tmpSandbox}" --json`,
    { encoding: 'utf8' }
  );
  const report = JSON.parse(rawOut);

  // Verifica Agente 1: qa-crawler
  if (!report.agents?.crawler || report.agents.crawler.filesWalked < 3) {
    throw new Error('Agente 1 (qa-crawler) não percorreu todos os arquivos do sandbox!');
  }

  // Verifica Agente 2: qa-bruteforce
  const hasUnsafeJson = report.findings.some((f) => f.ruleId === 'BRUTEFORCE_UNSAFE_JSON_PARSE');
  const hasNullDeref = report.findings.some((f) => f.ruleId === 'BRUTEFORCE_NULL_DEREFERENCE_RISK');
  if (!hasUnsafeJson || !hasNullDeref) {
    throw new Error('Agente 2 (qa-bruteforce) falhou em detectar JSON.parse sem try/catch ou dereference profundo!');
  }

  // Verifica Agente 3: qa-ui-palette
  const hasOffPalette = report.findings.some((f) => f.ruleId === 'UI_OFF_PALETTE_COLOR');
  if (!hasOffPalette) {
    throw new Error('Agente 3 (qa-ui-palette) falhou em detectar cor fora da paleta oficial (#ff00aa)!');
  }

  // Verifica Agente 4: qa-button-action
  const hasDeadBtn = report.findings.some((f) => f.ruleId === 'DEAD_BUTTON_NO_ACTION');
  const hasEmptyBtn = report.findings.some((f) => f.ruleId === 'DEAD_BUTTON_EMPTY_HANDLER');
  const hasDeadLink = report.findings.some((f) => f.ruleId === 'DEAD_ANCHOR_LINK');
  if (!hasDeadBtn || !hasEmptyBtn || !hasDeadLink) {
    throw new Error('Agente 4 (qa-button-action) falhou em detectar botões sem ação ou handlers vazios!');
  }

  // Verifica geração final do code-map (.code-map/INDEX.md e .code-map/graph.json)
  const indexMapPath = path.join(tmpSandbox, '.code-map', 'INDEX.md');
  const graphMapPath = path.join(tmpSandbox, '.code-map', 'graph.json');
  if (!fs.existsSync(indexMapPath) || !fs.existsSync(graphMapPath)) {
    throw new Error('O passo final do code-map (.code-map/INDEX.md e graph.json) não foi gerado!');
  }

  console.log('✅ Execução paralela dos 4 agentes (crawler, bruteforce, ui-palette, button-action) validada!');
  console.log('✅ Geração final obrigatória do .code-map/INDEX.md e .code-map/graph.json validada!');
} finally {
  fs.rmSync(tmpSandbox, { recursive: true, force: true });
}

console.log('\n🎉 Todos os componentes da skill audit-code-full e seus 4 agentes validados com 100% de integridade!');

