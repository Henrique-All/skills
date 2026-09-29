#!/usr/bin/env node
/**
 * scripts/publish-preview-release.js
 * Cria a release v2.2.0-beta.1 (Pre-release / Preview) na API do GitHub.
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

// 2. Definição da Pre-release
const previewRelease = {
  tag_name: 'v2.2.0-beta.1',
  target_commitish: '2.2.0',
  name: 'v2.2.0-beta.1 — 🚀 Enterprise AI Suite: Plugin Oficial, Subagentes & Hooks (Preview Beta)',
  body: `# 🚀 Enterprise AI Suite v2.2.0-beta.1 (Preview / Beta Pública)

> **Esta é uma release de pré-visualização (PREVIEW / BETA) para testes da nova arquitetura de Plugin Oficial e Subagentes do Google Antigravity.**
> Desenvolvida na branch \`2.2.0\` para quem deseja testar o ecossistema de ponta antes da release final na branch principal.

---

### 🌟 O Que Há de Novo nesta Versão Preview

#### 1. 📦 Manifesto Oficial do Plugin Antigravity (\`plugin.json\`)
- O monorepo agora pode ser empacotado e instalado nativamente como o plugin **\`enterprise-ai-suite\`** (v2.2.0).
- Instalação centralizada em um único comando: \`npm run install:plugin:global\` ou \`npm run install:plugin\`.

#### 2. 🤖 Enxame de Subagentes Especialistas de Contexto Limpo (\`agents/\`)
- **\`cartographer.agent.md\`**: Exploração arquitetural 360° em modo estrito *Read-Only*, economizando até 90% dos tokens da sessão principal.
- **\`route-guard.agent.md\`**: Prevenção de breaking changes de API, schemas Zod e cálculo de Blast Radius.
- **\`ui-craftsman.agent.md\`**: Design Engineering anti-slop, molas elásticas do Framer Motion e ergonomia mobile (Bottom Sheets, 44px+).
- **\`falsifier.agent.md\`**: Red Teamer adversário que ataca o plano na fase pré-código com 5 vetores de estresse.
- **\`security-auditor.agent.md\`**: Portão DevSecOps dos 18 pilares OWASP com exportação SARIF.

#### 3. 🛑 Firewall de Segurança Reativo no Sistema Operacional (\`hooks.json\`)
- **\`pre-command-guard.js\`**: Intercepta a ferramenta de terminal (\`run_command\`) antes de executar e bloqueia no SO comandos destrutivos (\`DROP TABLE\`, \`rm -rf /\`, \`Remove-Item -Recurse -Force\`, \`git push --force\`, \`prisma migrate reset\`).
- **\`post-write-lint.js\`**: Validação silenciosa de integridade pós-escrita de arquivos.

#### 4. ⚡ Novo Comando Mestre \`/orch\`
- O atalho mais rápido para disparar o ecossistema com governança total:
  - \`/orch <demanda>\`: Governança completa com Sabatina 4Q e Trava no Turno 1.
  - \`/orch --fast <demanda>\`: Execução cirúrgica direta em Rota A.
- Todos os comandos e skills individuais continuam 100% disponíveis (\`/frontend-craftsman\`, \`/mobile-converter\`, \`/repo-cartographer\`, \`/route-guard\`, \`/security-audit\`, \`/hybrid-orchestrator\`).

---

### 🧪 Como Testar a Versão Beta:
\`\`\`bash
# 1. Clone ou mude para a branch 2.2.0:
git checkout 2.2.0

# 2. Instale o plugin no Antigravity:
npm run install:plugin:global

# Ou instale tudo em todos os ambientes (Antigravity, Claude, Cursor):
npm run install:all

# 3. Valide o pipeline de testes:
npm test
\`\`\``,
  draft: false,
  prerelease: true
};

function createRelease(rel) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(rel);
    const req = https.request({
      hostname: 'api.github.com',
      path: '/repos/Henrique-All/skills/releases',
      method: 'POST',
      headers: {
        'User-Agent': 'NodeJS-Agent',
        'Authorization': 'token ' + token,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          const json = JSON.parse(data);
          console.log(`\n🎉 Pre-release [${rel.tag_name}] criada com sucesso!`);
          console.log(`🔗 URL da Release: ${json.html_url}`);
          console.log(`🏷️  Tag: ${json.tag_name} (Pre-release: ${json.prerelease})`);
          resolve(json);
        } else if (res.statusCode === 422) {
          console.log(`ℹ️  Release [${rel.tag_name}] já existe no GitHub.`);
          resolve(null);
        } else {
          console.error(`❌ Falha ao criar release [${rel.tag_name}]: HTTP ${res.statusCode}`);
          console.error(data);
          resolve(null);
        }
      });
    });

    req.on('error', (err) => {
      console.error(`❌ Erro de rede na release [${rel.tag_name}]:`, err.message);
      resolve(null);
    });

    req.write(payload);
    req.end();
  });
}

createRelease(previewRelease);
