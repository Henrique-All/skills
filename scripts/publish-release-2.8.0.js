#!/usr/bin/env node
/**
 * scripts/publish-release-2.8.0.js
 * Cria ou atualiza a release oficial v2.8.0 na API do GitHub.
 */

const { execSync } = require('child_process');
const https = require('https');

let token = '';
try {
  const gcmOut = execSync('git credential fill', { input: 'protocol=https\nhost=github.com\n\n', encoding: 'utf-8' });
  const passLine = gcmOut.split('\n').find((l) => l.startsWith('password='));
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
  tag_name: 'v2.8.0',
  target_commitish: '2.8.0',
  name: 'v2.8.0 — 🕵️‍♂️ Audit-Code-Full: QA Brute-Force 360° (4 Agentes + Execução Real em VM + IA Paralela + Code-Map Final)',
  body: `# ⚡ Enterprise AI Suite v2.8.0 — Audit-Code-Full (QA Brute-Force 360° com 4 Agentes Paralelos)

> **Engenharia de QA Exaustiva com 4 Agentes Paralelos (Workers Node.js + Subagentes de IA), Fuzzing Real em Sandbox VM (\`node:vm\`), Auditoria de Paleta UI Dual-Theme, Inspeção Funcional de Botões e Geração Automática do \`code-map\` Final.**

---

### 🕵️‍♂️ 1. Nova Skill \`audit-code-full\` & Enxame de 4 Subagentes de QA
- **Arquitetura Híbrida de Dupla Camada (Workers Node.js + 4 Subagentes de IA em Paralelo):**
  1. 🕷️ **\`qa-crawler\` (\`agents/qa-crawler.agent.md\`):** Percorre 100% dos arquivos do projeto classificando-os nas 6 camadas arquiteturais (UI, Estado, API, Backend, Banco, Infra) e extraindo símbolos exportados e rotas.
  2. 💥 **\`qa-bruteforce\` (\`agents/qa-bruteforce.agent.md\`):** Executa **Runtime Brute-Force Fuzzing real em sandbox isolada (\`node:vm\`)**, invocando funções exportadas com 11 payloads extremos (\`null\`, \`undefined\`, \`NaN\`, \`""\`, \`"{bad_json"\`, \`-1\`, \`0\`, \`Number.MAX_SAFE_INTEGER\`, \`{}\`, \`[]\`, \`Object.create(null)\`), além de análise estática de resiliência (\`JSON.parse\` sem \`try/catch\`, rotas assíncronas sem tratamento, dereference profundo e divisões sem guarda).
  3. 🎨 **\`qa-ui-palette\` (\`agents/qa-ui-palette.agent.md\`):** Audita o código de UI contra a paleta de cores oficial do projeto (\`UI_OFF_PALETTE_COLOR\`) e valida contraste Dual-Theme Light/Dark (\`UI_LIGHT_MODE_WHITE_TEXT\`, \`UI_GENERIC_AI_GRADIENT\`).
  4. 🔘 **\`qa-button-action\` (\`agents/qa-button-action.agent.md\`):** Inspeciona todos os \`<button>\`, \`<Button>\`, \`<IconButton>\` e links interativos, bloqueando botões sem ação (\`DEAD_BUTTON_NO_ACTION\`), handlers vazios (\`onClick={() => {}}\` / \`console.log\` -> \`DEAD_BUTTON_EMPTY_HANDLER\`) e âncoras mortas (\`href="#"\` -> \`DEAD_ANCHOR_LINK\`).
- **Contexto Estruturado para Agentes de IA (\`.code-map/ai-agents-dispatch.json\`):** Gera manifesto pronto para despacho simultâneo dos 4 subagentes de IA (\`invoke_subagent\`) sobre a árvore já estruturada.
- **Sincronização Final Obrigatória do \`code-map\`:** Ao concluir os 4 agentes, executa e sincroniza \`.code-map/INDEX.md\`, \`.code-map/graph.json\` e \`.code-map/audit-full-report.json\`.

---

### ⚡ 2. Integração Nativa no \`/orch\` (\`orch qa\` & \`--qa\`) e Blindagem 100/100 do Monorepo
- **Novos atalhos no CLI Mestre (\`bin/orch.js\` & \`scripts/orch-pipeline.js\`):**
  - \`node bin/orch.js qa [dir]\`: Dispara diretamente a suíte \`audit-code-full\` e sincroniza o \`.code-map/\`.
  - \`node bin/orch.js run [dir] --qa\`: Executa S1 (Cartografia) + S8 (\`audit-code-full\`) dentro do pipeline unificado.
- **Blindagem Defensiva do Núcleo Compartilhado (\`shared/suite-core.js\` & \`shared/style-blocks.js\`):** Todas as funções exportadas do ecossistema foram blindadas contra entradas nulas, tipos primitivos inesperados e objetos sem protótipo (\`Object.create(null)\`), atingindo **Score Global 100/100 (0 alertas)** em 1.310 execuções reais em VM.
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
      res.on('data', (chunk) => { data += chunk; });
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

