#!/usr/bin/env node
/**
 * scripts/publish-release-2.3.1.js
 * Cria a release oficial v2.3.1 na API do GitHub.
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

// 2. Definição da Release Oficial v2.3.1
const releaseData = {
  tag_name: 'v2.3.1',
  target_commitish: '2.3.1',
  name: 'v2.3.1 — 🚀 Desburocratização Radical, Zero Atrito no Chat & Densidade Real de Software',
  body: `# ⚡ Enterprise AI Suite v2.3.1 — Desburocratização Radical & Zero Atrito no Chat

> **Atualização de Pragmatismo e Agilidade:** Remoção de hooks intrusivos no chat, rota rápida (Route A) como padrão sem teatro de processos, densidade real de software corporativo (anti-landing page bloat) e metamorfose arquitetural Master-Detail para mobile.

---

### ⚡ 1. Desburocratização & Fim do "Process Theater"
- **Zero Intromissão no Chat:** Removidos do \`hooks.json\` os hooks \`skill-router\` e \`ui-quality-gate\`. O chat é 100% limpo, sem injeção de avisos ou bloqueios artificiais. Mantido apenas o firewall de comandos destrutivos no SO (\`pre-command-guard.js\`).
- **Via Rápida Pragmática (Route A):** Tarefas cotidianas (ajustes, bugs, estilização) resolvidas diretamente no código com zero cerimônia.
- **Densidade Real de Software:** Proibição de padding inflado e estética de landing page para ferramentas de trabalho. Botões e tipografia com escala sóbria e funcional.
- **Defensive CSS:** Preservação estrita de \`min-width: 0\`, fluxo flexbox e integridade de callbacks e eventos.
- **Metamorfose Master-Detail (\`adapt-screen.js\`):** Conversão automática de multi-colunas desktop em fluxo Master-Detail com botão de retorno e bottom sheets.

---

### 📦 Como Atualizar / Instalar:
\`\`\`bash
# Mudar para a branch 2.3.1:
git checkout 2.3.1
git pull origin 2.3.1

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
