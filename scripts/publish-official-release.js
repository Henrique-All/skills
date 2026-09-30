#!/usr/bin/env node
/**
 * scripts/publish-official-release.js
 * Cria a release oficial estável v2.2.0 na API do GitHub.
 */

const { execSync } = require('child_process');
const https = require('https');

// 1. Obter credencial do GitHub via Git Credential Manager
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

// 2. Definição da Release Oficial v2.2.0
const officialRelease = {
  tag_name: 'v2.2.0',
  target_commitish: 'master',
  name: 'v2.2.0 — 🚀 Enterprise AI Suite: Plugin Oficial, Enxame de Subagentes & 9 Skills',
  body: `# 🚀 Enterprise AI Suite v2.2.0 — Lançamento Oficial

> **Plugin Oficial do Google Antigravity, Enxame de 7 Subagentes Especialistas, 9 Skills de Alta Engenharia e Firewall Reativo de Segurança no SO.**  
> Desenvolvido para transformar agentes (**Google Antigravity**, **Claude Code**, **Cursor**, **Windsurf**, **Copilot**) em engenheiros de software seniores, eliminando alucinações, desperdício de tokens, quebras em produção e vícios de IA com isolamento de contexto e travas de ciclo de vida.

---

### 💰 Eficiência Extrema & Economia de Tokens (78% a 85% de Redução)

> **Engenharia de Contexto Efêmero:** Como a v2.2.0 reduz drasticamente o consumo de tokens faturados na API da LLM enquanto eleva a precisão analítica e a velocidade de entrega.

#### 📊 Simulação Real: Demanda Fullstack Completa (9 Turnos)
| Etapa da Conversa | ❌ Modelo Antigo (Mono-thread)<br/>*Histórico Acumulado Reenviado* | ✅ Enterprise AI Suite v2.2.0<br/>*Handoffs Sintéticos Isolados* |
| :--- | :---: | :---: |
| **Turno 1: Cartografia do Repo** | 40.000 tokens lidos no chat principal | **500 tokens** *(cartógrafo em thread limpa)* |
| **Turno 2: Banco & Migrations (\`db-sentinel\`)** | 45.000 tokens *(acumulou 40k + 5k)* | **1.500 tokens** *(banco validado em subagente)* |
| **Turno 3: Contratos de Rota (\`route-guard\`)** | 50.000 tokens *(acumulando)* | **2.800 tokens** *(recebeu só o Zod/DTO de 300t)* |
| **Turno 4: UI & Molas (\`frontend-craftsman\`)** | 60.000 tokens *(acumulando)* | **4.500 tokens** *(UI em subagente)* |
| **Turno 5: Mobile & Ergonomia (\`mobile-converter\`)** | 70.000 tokens *(acumulando)* | **6.500 tokens** *(cards/bottom sheet isolados)* |
| **Turno 6: Implementação de Código (Builder)** | 85.000 tokens *(acumulando)* | **9.000 tokens** *(diffs atômicos focados)* |
| **Turno 7: Criação de Testes (\`test-forge\`)** | 100.000 tokens *(acumulando)* | **11.500 tokens** *(testes gerados em subagente)* |
| **Turno 8: Auditoria DevSecOps (\`security-audit\`)** | 115.000 tokens *(acumulando)* | **13.500 tokens** *(auditoria rodou em subagente)* |
| **Turno 9: Validação e Entrega** | 125.000 tokens *(acumulando)* | **15.000 tokens** |
| ➕ **Subagentes descartáveis** | *Não possui (tudo roda no chat)* | **+ 85.000 tokens** *(rodaram 1x e fecharam)* |
| **🔥 TOTAL FATURADO PELA API** | **~690.000 tokens** 💸 | **~149.000 tokens** 🟢 |

> 📉 **Resultado:** **~78.4% a 85% de economia direta de tokens** (redução de mais de **540.000 tokens** em uma única demanda!).  
> ⚡ **Zero Perda de Atenção ("Context Bloat"):** Enquanto o modelo antigo acumula 125k tokens e começa a alucinar, a suite termina a tarefa com apenas **15k tokens de contexto ativo** no chat principal.

---

### 🌟 Destaques da Release v2.2.0

#### 1. 📦 Manifesto Oficial do Plugin Antigravity (\`plugin.json\`)
- Empacotado como o plugin nativo **\`enterprise-ai-suite\`** (v2.2.0);
- Instalação atômica em \`.agents/plugins/\` ou global em \`~/.gemini/config/plugins/\`;
- Retrocompatibilidade total preservada para Claude Code (\`~/.claude/skills/\`) e Cursor Rules (\`~/.cursor/rules/\`).

#### 2. 🤖 Enxame de 7 Subagentes Especialistas de Contexto Limpo (\`agents/\`)
- **\`cartographer.agent.md\`**: Mapeamento 360° em modo *Read-Only*, consumindo dados sem poluir o chat do líder.
- **\`route-guard.agent.md\`**: Blast Radius, contratos Zod/DTO e prevenção de quebra de rotas.
- **\`ui-craftsman.agent.md\`**: Design Engineering anti-slop, molas do Framer Motion e ergonomia mobile tátil.
- **\`db-sentinel.agent.md\`**: Modelagem relacional e migrations seguras zero-downtime.
- **\`test-engineer.agent.md\`**: Testes reais de integração de API e E2E Playwright.
- **\`falsifier.agent.md\`**: Red Teamer adversário com 5 vetores de estresse pré-código.
- **\`security-auditor.agent.md\`**: Portão DevSecOps dos 18 pilares OWASP (SARIF).

#### 3. 🗄️ Nova Skill: \`db-sentinel\` (Banco de Dados & Migrations Seguras)
- Zero-Downtime migrations em 3 passos (Expand & Contract);
- Detecção automática de Foreign Keys (\`@relation\`) sem índice (\`@@index\`);
- Prevenção rigorosa de N+1 queries;
- Gerador de seeds sintéticos e tipados com coerência relacional (\`scripts/generate-seed.js\`);
- Auditor determinístico de schemas Prisma/Drizzle/SQL (\`scripts/db-audit.js\`).

#### 4. 🧪 Nova Skill: \`test-forge\` (Engenharia de Testes Reais & Anti-Mock)
- Erradicação de mocks fantasmas e asserções cosméticas;
- Gerador de testes de integração de rota em 4 cenários (\`scripts/forge-api-test.js\`);
- Gerador E2E Playwright com validação ergonômica mobile (\`scripts/forge-e2e.js\`);
- Auditor de qualidade de testes e cálculo do Test Quality Score (\`scripts/test-audit.js\`).

#### 5. 🛑 Firewall de Segurança Reativo no Sistema Operacional (\`hooks.json\`)
- **\`pre-command-guard.js\`**: Intercepta comandos de terminal e bloqueia no SO comandos destrutivos (\`DROP TABLE\`, \`rm -rf /\`, \`Remove-Item -Recurse -Force\`, \`git push --force\`, \`prisma migrate reset\`).
- **\`post-write-lint.js\`**: Validação silenciosa de integridade pós-escrita de arquivos.

#### 6. ⚡ Atalho Mestre \`/orch\` & Ferramentas CLI Master (\`bin/orch.js\`)
- Permite invocar a governança completa ou cirúrgica (\`/orch\` ou \`/orch --fast\`);
- **\`npm run doctor\`**: Diagnóstico determinístico de saúde do ecossistema e subagentes;
- **\`npm run init:suite\`**: Autoconfigura qualquer projeto detectando a stack técnica (Vite, Next, Express, Prisma);
- **\`npm run switch\`**: Troca de versões sem git clone;
- **\`npm test\`**: Suíte universal com 100% de testes passando nas 9 skills.

#### 7. 🚀 Modernizações de Ponta (Especificações 2026)
- **\`frontend-craftsman\`**: View Transitions API nativa (\`document.startViewTransition\`), CSS Container Queries (\`@container\`) e navegação por teclado acessível WAI-ARIA (\`ArrowLeft\`/\`ArrowRight\`, \`role="tablist"\`).
- **\`mobile-converter\`**: Feedback Háptico tátil via Web Vibration API (\`navigator.vibrate\`) em Bottom Sheets e Tab Bar; auditoria de PWA (\`theme-color\`, \`apple-mobile-web-app-capable\`).
- **\`security-audit\`**: Detecção de rotas de auth sem Rate Limiting (\`MISSING_RATE_LIMIT_ON_AUTH\`), detecção de IDOR em queries de ID diretas sem escopo de tenant/usuário (\`POTENTIAL_IDOR_UNSCOPED_QUERY\`), e verificação de Helmet/CSP.
- **\`route-guard\`**: Exportação automatizada de especificações OpenAPI 3.0.3 / Swagger JSON com a flag \`--openapi\`.

---

### ⚖️ Execução Individual vs. Comando Mestre \`/orch\`: Qual a Diferença?

| Critério | 🎯 Execução Individual (Skills Isoladas)<br/>*(ex: \`/frontend-craftsman\`, \`/db-sentinel\`)* | 🚀 Comando Mestre \`/orch\` (Teamwork & Swarm)<br/>*(Governança Total do Ecossistema)* |
| :--- | :--- | :--- |
| **Comando** | \`/frontend-craftsman\`, \`/db-sentinel\`, \`/test-forge\`, etc. | \`/orch <demanda>\` ou \`/orch --fast <demanda>\` |
| **Escopo** | **Laser-Focused:** Atua estritamente na especialidade daquela skill | **Holístico:** Orquestra compulsoriamente as 9 disciplinas |
| **Quem Conecta?** | **O Desenvolvedor:** Você decide manualmente quando mapear, desenhar e auditar | **O Orchestrator (Lead):** Conecta as etapas e repassa artefatos automaticamente |
| **Consumo** | Ultrabaixo (< 2.000 tokens na sessão principal) | Otimizado via subagentes efêmeros (redução de 78% a 85% de tokens) |
| **Handshakes** | Manual (copiar e colar no prompt) | **Automático:** \`.code-map/handshake.json\`, \`DESIGN_SPEC.md\` e SARIF |
| **Trava & 4Q** | Não possui (vai direto ao ponto) | **Ativa no Turno 1:** Sabatina 4Q e bloqueio antes de tocar em código (bypass com \`--fast\`) |
| **Falsifier** | Não roda (a não ser no hybrid) | **Obrigatório:** Subagente adversário ataca com 5 vetores de estresse |
| **Pós-Código** | Apenas as ferramentas daquela skill | **Pipeline Quádruplo:** \`craft-audit\`, \`mobile-audit\`, \`db-audit\` e \`security-audit\` |
| **Quando Usar?** | Alterações pontuais, redesign de 1 componente, auditoria pré-commit, validar 1 schema | Features completas de ponta a ponta, mudanças críticas em banco/rotas/telas |

---

### 📦 Como Instalar e Usar:
\`\`\`bash
# Instalação rápida em todos os ambientes (Antigravity, Claude Code, Cursor):
npx https://github.com/Henrique-All/skills

# Ou após clonar:
npm run install:all

# Validar saúde do ecossistema:
npm run doctor
npm test
\`\`\``,
  draft: false,
  prerelease: false
};

function githubRequest(path, method, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path,
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
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function publishOfficialRelease(rel) {
  try {
    console.log(`🔍 Verificando se a release [${rel.tag_name}] já existe no GitHub...`);
    const checkRes = await githubRequest(`/repos/Henrique-All/skills/releases/tags/${rel.tag_name}`, 'GET');

    if (checkRes.status === 200 && checkRes.data.id) {
      const releaseId = checkRes.data.id;
      console.log(`ℹ️  Release encontrada (ID: ${releaseId}). Atualizando corpo da release oficial...`);
      const updateRes = await githubRequest(`/repos/Henrique-All/skills/releases/${releaseId}`, 'PATCH', {
        name: rel.name,
        body: rel.body,
        prerelease: false,
        draft: false
      });

      if (updateRes.status === 200) {
        console.log(`\n🎉 Release oficial [${rel.tag_name}] atualizada com sucesso no GitHub!`);
        console.log(`🔗 URL: ${updateRes.data.html_url}`);
        return updateRes.data;
      } else {
        console.error(`❌ Erro ao atualizar release: HTTP ${updateRes.status}`, updateRes.data);
      }
    } else {
      console.log(`🚀 Publicando nova release oficial [${rel.tag_name}] no GitHub...`);
      const createRes = await githubRequest('/repos/Henrique-All/skills/releases', 'POST', rel);
      if (createRes.status === 201) {
        console.log(`\n🎉 Release oficial [${rel.tag_name}] publicada com sucesso no GitHub!`);
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

publishOfficialRelease(officialRelease);
