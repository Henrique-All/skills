#!/usr/bin/env node
/**
 * scripts/publish-release-2.5.1.js
 * Cria a release oficial v2.5.1 na API do GitHub.
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
  tag_name: 'v2.5.1',
  target_commitish: '2.5.1',
  name: 'v2.5.1 — 🗺️ Cartografia-First (Passo Zero Anti-Voltas), Índice Instantâneo INDEX.md & Auto-Sync Invisível PostToolUse',
  body: `# ⚡ Enterprise AI Suite v2.5.1 — Cartografia-First (Anti-Voltas) & Auto-Sync

> **Correção de Navegação & Ciclo Completo da Cartografia 360°:** Elimina as buscas cegas em projetos já mapeados introduzindo o índice de leitura de 1 turno (\`.code-map/INDEX.md\`), o subcomando \`cartographer.js query <termo>\`, o hook invisível \`PostToolUse\` (\`post-edit-cartography.js\`) que atualiza o mapa sozinho a cada edição de arquivo e a injeção automática de \`AGENTS.md\` na raiz do projeto via \`orch init\`.

---

### 🗺️ 1. Índice Arquitetural Instantâneo (\`.code-map/INDEX.md\`) & Consulta Rápida (\`query\`)
- **Geração Automática do \`.code-map/INDEX.md\` (\`cartographer.js\`):** Toda execução de \`init\` ou \`trace\` consolida um resumo Markdown ultracompacto (~80 linhas) agrupando **Top Hubs (arquivos mais conectados)**, as **6 Camadas (UI, Estado, API, Backend, Banco, Infra)** e o **Mapa de Fluxo Direto (\`Quem Chama Quem\`)**.
- **Novo Subcomando \`cartographer.js query <termo>\`:** Filtra nós instantaneamente no grafo e exibe quem chama (\`⬅️ In\`) e quem é chamado (\`➡️ Out\`), inicializando o mapa sozinho se estiver vazio.
- **Descoberta Fullstack & Monorepo (\`discoverProjectSeeds\`):** Varredura ampliada para incluir \`frontend/src\`, \`frontend/app\`, \`backend/src\`, \`client/src\`, \`server/src\`, \`apps/*\` e \`packages/*\`, além de refinamento em \`classifyLayer()\` para evitar falsos positivos na Camada 2 (\`state\`).

---

### 🔄 2. Governança de Ciclo Completo: Olhar Primeiro (Passo Zero) & Atualizar ao Finalizar (Passo Final)
- **Hook Silencioso \`PostToolUse\` (\`scripts/hooks/post-edit-cartography.js\`):** Intercepta \`write_to_file\`, \`replace_file_content\` e \`multi_replace_file_content\`, reindexando \`.code-map/INDEX.md\` e \`.code-map/graph.json\` automaticamente em background (0 tokens, 0 mensagens no chat) sempre que arquivos são criados ou editados.
- **Auto-Indexação Real e Injeção de \`AGENTS.md\` (\`scripts/init.js\`):** O comando \`orch init\` agora executa o \`cartographer.js init\` de imediato (eliminando pastas \`.code-map/\` vazias) e injeta o \`AGENTS.md\` na raiz do projeto.
- **Regras Globais e Skills Sincronizadas:** Atualizados \`GEMINI.md\`, \`rules/01-zero-trust.md\`, \`hybrid-orchestrator\` e \`repo-cartographer\` com o ciclo obrigatório de leitura no Passo Zero e atualização no Passo Final.
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
