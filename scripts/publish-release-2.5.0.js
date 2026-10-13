#!/usr/bin/env node
/**
 * scripts/publish-release-2.5.0.js
 * Cria a release oficial v2.5.0 na API do GitHub.
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

// 2. Definição da Release Oficial v2.5.0
const releaseData = {
  tag_name: 'v2.5.0',
  target_commitish: '2.5.0',
  name: 'v2.5.0 — 🚀 Blindagem Estrutural 360°, Cobertura Real dos 18 Pilares OWASP, Drizzle ORM & Zero Duplicidade de Skills',
  body: `# ⚡ Enterprise AI Suite v2.5.0 — Blindagem Estrutural 360° & DevSecOps 18 Pilares

> **Atualização Completa de Arquitetura, Segurança e Qualidade:** Cobertura mecânica real dos 18 pilares OWASP no \`devsecops-audit\`, suporte nativo a Drizzle ORM (\`.ts\`) no \`db-sentinel\`, detecção real de ciclos e Mermaid no \`repo-cartographer\`, suporte Next.js App Router e NestJS no \`route-guard\`, asserções ativas 100/100 no \`test-forge\` e desduplicação automática de skills no Antigravity.

---

### 🛡️ 1. Infraestrutura, Firewall & Desduplicação do Plugin
- **Firewall Inteligente (\`pre-command-guard.js\`):** Liberação explícita de \`git push --force-with-lease\` e \`--force-if-includes\`, mantendo bloqueio estrito para \`--force\` / \`-f\` e ampliando proteção contra \`rm -rf .\`, \`rm -rf *\` e \`rm -fr /\`.
- **Desduplicação Automática (\`install.js\`):** Empacotamento de \`bin/orch.js\` dentro do plugin oficial (\`.agents/plugins/enterprise-ai-suite\` e \`~/.gemini/config/plugins/enterprise-ai-suite\`) e remoção automática de cópias avulsas redundantes em \`.agents/skills/\` e \`~/.gemini/config/skills/\`.

---

### 🗺️ 2. Cartógrafo Arquitetural (\`repo-cartographer\`) & Pipeline \`/orch\`
- **Correção de Ciclos, IDs e Mermaid (\`cartographer.js\`):**
  - \`traceDependencies()\` retorna \`{ nodes, edges, cycles }\`, corrigindo a exportação de diagramas \`--mermaid\`.
  - \`detectCycles()\` preserva arestas para nós já visitados na pilha DFS, detectando ciclos reais de importação.
  - \`getNodeId()\` evita colisões de IDs em arquivos \`index.ts\`, \`route.ts\` e \`page.tsx\`.
  - \`initCodeMap()\` descobre e indexa automaticamente os entrypoints do projeto.
- **Orquestrador \`/orch\` (\`orch-pipeline.js\`):** Suporte a caminhos com espaços/apóstrofos, tratamento estrito de exit codes no \`db-sentinel\` e \`falsifier\` e inclusão da auditoria \`test-forge\` (\`test-audit.js\`) na etapa 7.

---

### 🔒 3. DevSecOps 18 Pilares (\`devsecops-audit\`) & Banco de Dados (\`db-sentinel\`)
- **Cobertura Completa dos 18 Pilares (\`audit.js\`):**
  - **Pilar 4:** \`COOKIE_INSECURE_FLAGS\` (\`res.cookie\` / \`cookies().set\` sem \`httpOnly: true\` ou \`sameSite\`).
  - **Pilar 9:** \`FRONTEND_TOKEN_IN_LOCALSTORAGE\` e \`FRONTEND_REVERSE_TABNABBING\` (\`target="_blank"\` sem \`rel="noopener noreferrer"\`).
  - **Pilar 11:** \`COMMAND_INJECTION_RISK\` (\`exec\` / \`execSync\` / \`spawn(..., { shell: true })\` com interpolação dinâmica).
  - **Pilar 13:** \`SUPPLY_CHAIN_UNPINNED_DEPENDENCY\` (\`"*"\` / \`"latest"\` / \`http:\`) e \`SUPPLY_CHAIN_SUSPICIOUS_LIFECYCLE\` (\`preinstall\` / \`postinstall\` executando \`curl\`/\`wget\`/\`bash\`).
  - **Pilar 17:** \`SENSITIVE_DATA_IN_LOGS\` (vazamento de senhas, tokens, secrets e CPF/cartão em logs).
- **Janelas de Contexto (\`localWindow\`) & Pilar 16 Irrevogável:** Checagens de \`BOLA/IDOR\`, \`Mass Assignment\`, \`Webhook HMAC\` e \`SSRF\` agora avaliam a janela da função/handler atual, e segredos do Pilar 16 não podem mais ser suprimidos via \`.audit-exceptions.json\`.
- **Suporte Real a Drizzle ORM (\`.ts\`) & Seeds Consistentes (\`db-sentinel\`):** \`db-audit.js\` analisa tabelas \`pgTable\`/\`mysqlTable\`/\`sqliteTable\` e pastas de migrations (\`prisma/migrations\`, \`drizzle\`), enquanto \`generate-seed.js\` filtra relações virtuais \`1:N\` (\`Order[]\`) e vincula FKs ao ID real do model pai.

---

### 🧪 4. Test Forge, Falsifier, Snapshot & Route Guard
- **Test Forge Score 100/100:** \`forge-api-test.js\` gera asserções Supertest ativas (sem \`expect(true).toBe(true)\`) e \`forge-e2e.js\` remove \`defaultBrowserType\` ao usar \`test.use()\` dentro de \`test.describe()\` com validação de touch targets \`>= 44px\`.
- **Falsifier & Snapshot (\`hybrid-orchestrator\`):** Fim dos falsos positivos com \`Set.delete()\`/\`Object.create()\` no Vetor 4 e proteção completa de arquivos \`untracked\` (\`git stash push -u\`) no \`--save\` e \`--rollback\`.
- **Route Guard Multi-Framework (\`analyze-route.js\`):** Suporte nativo a rotas Next.js App Router (\`app/.../route.ts\`), controllers NestJS (\`@Controller\`) e interpolação de parâmetros dinâmicos (\`:id\` / \`\${id}\`) no frontend.

---

### 📦 Como Atualizar / Instalar:
\`\`\`bash
# Mudar para a branch 2.5.0:
git checkout 2.5.0
git pull origin 2.5.0

# Sincronizar local e globalmente:
node install.js --both
\`\`\`
`,
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
