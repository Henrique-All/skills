#!/usr/bin/env node
/**
 * scripts/publish-release-2.6.0.js
 * Cria a release oficial v2.6.0 na API do GitHub.
 */

const { execSync } = require('child_process');
const https = require('https');

let token = '';
try {
  const gcmOut = execSync('git credential fill', { input: 'protocol=https\nhost=github.com\n\n', encoding: 'utf-8' });
  const passLine = gcmOut.split('\n').find(l => l.startsWith('password='));
  if (passLine) {
    token = passLine.replace('password=', '').trim();
  }
} catch (e) {
  console.error('Erro ao obter token do GCM:', e.message);
  process.exit(1);
}

if (!token) {
  console.error('Nenhum token encontrado no Git Credential Manager.');
  process.exit(1);
}

console.log('🔑 Token do GitHub obtido com sucesso!');

const releaseData = {
  tag_name: 'v2.6.0',
  target_commitish: '2.6.0',
  name: 'v2.6.0 — 🎨 Design Engineering Multi-Engine (120fps / 0 Re-renders), Psicologia de UX, Mobile 4.0, DB Sentinel 2.0, Route Guard 2.0 & Test Forge 2.0',
  body: `# ⚡ Enterprise AI Suite v2.6.0 — Design Engineering Multi-Engine, UX Psychology & Fullstack Hardening

> **Evolução Completa das Skills de Front-end, Mobile, Banco, Contratos e Testes:** Orquestração Multi-Engine de Animações a 120fps / 0 Re-renders (Motion v12, GSAP Flip/ScrollTrigger, AutoAnimate, Lenis, View Transitions API), 16 Templates Dual-Theme prontos para produção, detecção de queries N+1 e Float em dinheiro no \`db-sentinel\`, suporte a Next.js Server Actions e tRPC no \`route-guard\` e testes de concorrência (\`Promise.all\`) + Dual-Theme no \`test-forge\`.

---

### 🎨 1. Frontend Craftsman v4.0 — UI, UX & Orquestração Multi-Engine de Animações
- **Matriz Multi-Engine de Animações (120fps / Zero Re-renders):** Suporte integrado para **Motion (Framer Motion v12)** (\`useMotionValue\`, \`useSpring\`, \`useMotionTemplate\`, \`layoutId\`, \`LayoutGroup\`, \`AnimatePresence\`), **GSAP** (\`useGSAP\`, \`contextSafe\`, \`Flip\`, \`ScrollTrigger\`), **AutoAnimate** (\`useAutoAnimate\` de 1 linha para listas CRUD), **Lenis Smooth Scroll** (\`data-lenis-prevent\`) e **CSS Nativo Moderno** (\`document.startViewTransition\` com reveal circular e \`@starting-style\`).
- **Engenharia de UX & Psicologia de Produto:** Arquitetura obrigatória dos **5 Estados de Tela** (Content-Aware Skeleton, Empty State com CTA, Filtered Empty State, Error Retry e Populated State), **Limiar de Doherty (< 400ms Optimistic UI)**, **UX Defensiva** (\`HoldToConfirmButton\` em vez de \`window.confirm\`), **Keyboard-First (\`⌘K\`)** e **Micro-Tipografia Funcional (\`tabular-nums\`, \`text-balance\`)**.
- **Catálogo de 10 Templates Dual-Theme & 0 Re-renders (\`frontend-craftsman/templates/\`):**
  - Refatorados (\`SpotlightCard.tsx\`, \`MagneticButton.tsx\`, \`AnimatedTabs.tsx\`, \`SmoothAccordion.tsx\`, \`ContentSkeleton.tsx\` + \`EmptyStateCard\`) para **Light/Dark Mode coerente** e **0 re-renders no movimento do ponteiro**.
  - 5 Novos Templates Criados: \`CommandPalette.tsx\` (\`⌘K\`), \`MorphingDialog.tsx\` (\`layoutId\`), \`SpringNumberTicker.tsx\` (\`useSpring\` + \`tabular-nums\`), \`StackedToast.tsx\` (pilha 3D estilo Sonner) e \`HoldToConfirmButton.tsx\` (segurar por 1.2s).
- **Auditor Estático \`craft-audit.js v4.0.0\`:** 4 novas regras determinísticas (\`TRANSITION_ALL_SLOP\`, \`POINTER_STATE_THRASH\`, \`NATIVE_DIALOG_SLOP\` e \`MISSING_TABULAR_NUMS\`).

---

### 📱 2. Mobile Converter v4.0 — Master-Detail, Pull-to-Refresh, Snap Points & Teclado Virtual
- **Novos Templates Mobile (\`mobile-converter/templates/\`):** Adicionados \`MasterDetailShell.tsx\` (container responsivo que impede empilhamento vertical em telas de Chat/Atendimento/Inbox) e \`PullToRefresh.tsx\` (gesto elástico na GPU com feedback háptico).
- **Refatoração Dual-Theme & \`visualViewport\`:** \`BottomSheet.tsx\` suporta múltiplos \`snapPoints\` e ajuste automático para o teclado virtual do iOS/Android via \`window.visualViewport\`; todos os 6 templates atingem **Score 100/100** tanto no \`mobile-audit.js\` quanto no \`craft-audit.js\`.

---

### 🗄️ 3. DB Sentinel v2.0 — Detecção de N+1 em Loops, Paginação & Precisão Financeira
- **Novas Regras em \`db-audit.js v2.0\`:**
  - \`N_PLUS_ONE_LOOP_QUERY\`: Detecta queries ORM (\`await prisma/db/tx\`) dentro de loops \`for\`, \`.map(async)\` e \`.forEach(async)\`.
  - \`UNBOUNDED_FIND_MANY\`: Detecta \`.findMany()\` sem \`take\` ou \`cursor\` (prevenção de OOM).
  - \`FLOAT_FOR_MONEY\`: Bloqueia \`Float\` / \`real\` / \`doublePrecision\` em colunas financeiras (\`price\`, \`amount\`, \`total\`, \`balance\`), exigindo \`Decimal\` ou \`Int\` em centavos.

---

### 🛡️ 4. Route Guard v2.0 & 🧪 Test Forge v2.0
- **Route Guard v2.0 (\`analyze-route.js\`):** Mapeamento estendido para **Next.js Server Actions (\`'use server'\`)** e **tRPC Procedures (\`publicProcedure\`/\`protectedProcedure\`)**, além de alertas automáticos de \`MISSING_SCHEMA_VALIDATION\`, \`MISSING_IDEMPOTENCY_KEY\` (em rotas financeiras/pedidos) e \`MISSING_RATE_LIMIT\` (em rotas de autenticação).
- **Test Forge v2.0 (\`forge-api-test.js\`, \`forge-e2e.js\`, \`test-audit.js\`):** Geração automática de teste de **Rajada de Concorrência (\`Promise.all\` + \`Idempotency-Key\`)** em rotas de escrita, E2E Playwright validando **Light Mode + Dark Mode (\`emulateMedia\`) + navegação por teclado (\`Tab\`/\`Escape\`)** e detecção de \`.only()\` esquecido e \`waitForTimeout()\` fixo.

---

### ⚡ 5. Hybrid Orchestrator (8 Vetores), DevSecOps v2.6, Repo Cartographer (\`orphans\`) & Pipeline \`/orch\`
- **Hybrid Orchestrator (\`falsify.js v2.6.0\`):** Falsifier expandido de 5 para **8 Vetores de Estresse** (\`LOST_UPDATE_RACE_CONDITION\` para Read-Modify-Write em saldos/estoques, \`EFFECT_MEMORY_LEAK\` para listeners/timers sem cleanup em \`useEffect\` e \`SWALLOWED_EXCEPTION\` para \`catch\` vazio), além de saída estruturada \`--json\`.
- **DevSecOps Audit (\`audit.js v2.6.0\`):** Radar Híbrido de CVEs & Supply Chain no Pilar 13 (\`SUPPLY_CHAIN_KNOWN_CVE\` offline instantâneo para \`next\` CVE-2025-29927, \`axios\`, \`jsonwebtoken\`, \`express\`, \`ws\`, \`lodash\`, \`crypto-js\`, \`multer\`, \`minimist\`, \`vm2\` + auto-patch no \`--fix\`, \`SUPPLY_CHAIN_NPM_AUDIT_CVE\` integrando \`npm audit --json\`, e \`SUPPLY_CHAIN_MISSING_LOCKFILE\`), detecção de **Vazamento de Segredo em Variável Pública de Frontend** (\`FRONTEND_PUBLIC_ENV_SECRET_LEAK\` em \`NEXT_PUBLIC_*\`/\`VITE_*\`/\`REACT_APP_*\`), **Prompt LLM sem Limite de Tamanho** (\`AI_UNBOUNDED_PROMPT_INPUT\`) e novos padrões de segredos (\`sk-ant-api03-\`, \`whsec_\`, \`xoxb-\`).
- **Repo Cartographer (\`cartographer.js orphans\`):** Novo subcomando \`orphans [--json]\` que detecta módulos órfãos (Dead Code com \`inDegree === 0\`) excluindo entrypoints naturais, rotas Next.js, CLIs e testes.
- **Pipeline Unificado \`/orch\` (\`scripts/orch-pipeline.js\`):** Consolida a tabela **\`1.1 Top Apontamentos Detectados (Arquivo:Linha)\`** diretamente no \`.plan/PLAN.md\` cruzando os achados dos 6 motores locais.
`,
  draft: false,
  prerelease: false
};

function githubRequest(pathUrl, method, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path: pathUrl,
      method,
      headers: {
        'User-Agent': 'NodeJS-Agent',
        'Authorization': 'token ' + token,
        'Accept': 'application/vnd.github.v3+json',
        ...(payload ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (payload) req.write(payload);
    req.end();
  });
}

async function publishRelease(rel) {
  try {
    console.log(`🔍 Verificando se a release [${rel.tag_name}] já existe no GitHub...`);
    const checkRes = await githubRequest(`/repos/Henrique-All/skills/releases/tags/${rel.tag_name}`, 'GET');

    if (checkRes.status === 200 && checkRes.data.id) {
      const releaseId = checkRes.data.id;
      console.log(`ℹ️  Release encontrada (ID: ${releaseId}). Atualizando...`);
      const updateRes = await githubRequest(`/repos/Henrique-All/skills/releases/${releaseId}`, 'PATCH', {
        name: rel.name,
        body: rel.body,
        target_commitish: rel.target_commitish,
        prerelease: false,
        draft: false
      });

      if (updateRes.status === 200) {
        console.log(`\n🎉 Release [${rel.tag_name}] atualizada com sucesso no GitHub!`);
        console.log(`🔗 URL: ${updateRes.data.html_url}`);
        return updateRes.data;
      } else {
        console.error(`❌ Erro ao atualizar release: HTTP ${updateRes.status}`, updateRes.data);
      }
    } else {
      console.log(`🚀 Publicando nova release [${rel.tag_name}] no GitHub...`);
      const createRes = await githubRequest('/repos/Henrique-All/skills/releases', 'POST', rel);
      if (createRes.status === 201) {
        console.log(`\n🎉 Release [${rel.tag_name}] publicada com sucesso no GitHub!`);
        console.log(`🔗 URL: ${createRes.data.html_url}`);
        return createRes.data;
      } else {
        console.error(`❌ Falha ao criar release: HTTP ${createRes.status}`, createRes.data);
      }
    }
  } catch (err) {
    console.error('❌ Erro na requisição GitHub:', err.message);
  }
}

publishRelease(releaseData);
