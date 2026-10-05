#!/usr/bin/env node
/**
 * scripts/publish-release-2.2.1.js
 * Cria a release oficial v2.2.1 na API do GitHub.
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

// 2. Definição da Release Oficial v2.2.1
const releaseData = {
  tag_name: 'v2.2.1',
  target_commitish: '2.2.1',
  name: 'v2.2.1 — ⚡ Enterprise AI Suite: Pipeline Determinístico do /orch & Flags de Escopo',
  body: `# ⚡ Enterprise AI Suite v2.2.1 — Release de Correção & Governança Determinística

> **Atualização crítica do Orquestrador Mestre (\`/orch\`):** Execução unificada em CPU local com **0 tokens de leitura gastos**, eliminação de viés de front-end e suporte completo a flags de escopo direto.

---

### 🐛 Correções & Estabilização Crítica

#### 1. 🚀 Pipeline Determinístico Unificado Local (\`bin/orch.js run\` / \`scripts/orch-pipeline.js\`)
- Elimina a dependência de "leitura de arquivos no chat da LLM", executando as 6 auditorias diretamente na CPU da máquina local via AST e análise estática em ~2 segundos com **zero tokens de LLM gastos**.
- Impede o viés de palavra-chave que fazia o modelo acionar exclusivamente o front-end ao identificar termos como *"design"*, *"botão"* ou *"layout"*.

#### 2. 🎯 Suporte a Flags Diretas de Escopo
A Cartografia 360° (**S1**) é mantida compulsoriamente como fundação arquitetural de contexto (AST).
- \`--front\` / \`--ui\`: Executa **S1 (Cartografia)** ➔ **S3 (UI Craftsman)** + **S4 (Mobile Converter)**.
- \`--mobile\`: Executa **S1 (Cartografia)** ➔ **S4 (Mobile Converter)**.
- \`--db\`: Executa **S1 (Cartografia)** ➔ **S5 (DB Sentinel)** + **S6 (Falsifier Concorrência)**.
- \`--sec\`: Executa **S1 (Cartografia)** ➔ **S2 (DevSecOps 18 Pilares OWASP / RBAC)**.
- \`--api\`: Executa **S1 (Cartografia)** ➔ **S2 (Segurança)** + **S6 (Falsifier Concorrência)**.
- \`--test\`: Executa **S1 (Cartografia)** ➔ **Test Forge (Test Audit)**.
- *(Sem flags)*: Executa compulsoriamente todas as 6 skills (Governança Total).

#### 3. 📄 Fim do Paredão de Texto no Chat
- O pipeline grava o plano detalhado, scorecard e checklist de governança diretamente em \`.plan/PLAN.md\`. O chat recebe apenas um resumo executivo de 5 a 8 linhas e o link direto para o arquivo.

#### 4. 🛠️ Correção no \`db-audit.js\`
- Corrigido erro \`EISDIR\` ao passar diretório raiz no argumento do scanner de banco de dados.

#### 5. 🌐 Sincronização Global das Diretrizes
- Atualizado \`GEMINI.md\` global e \`SKILL.md\` em todas as instâncias locais e globais do Antigravity, Claude Code e Cursor.

---

### 📦 Como Atualizar / Instalar:
\`\`\`bash
# Mudar para a branch 2.2.1:
git checkout 2.2.1

# Ou instalar a release diretamente:
npx https://github.com/Henrique-All/skills#2.2.1
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
