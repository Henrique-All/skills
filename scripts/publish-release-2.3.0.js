#!/usr/bin/env node
/**
 * scripts/publish-release-2.3.0.js
 * Cria a release oficial v2.3.0 na API do GitHub.
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

// 2. Definição da Release Oficial v2.3.0
const releaseData = {
  tag_name: 'v2.3.0',
  target_commitish: '2.2.1',
  name: 'v2.3.0 — 🎨 Dual-Theme (Modo Claro + Escuro), Master-Detail Mobile & Fim dos Comandos Avulsos',
  body: `# ⚡ Enterprise AI Suite v2.3.0 — Dual-Theme, Master-Detail & Fim dos Comandos Avulsos

> **Grande Atualização de Design Engineering e Autonomia:** Coerência obrigatória de Modo Claro e Escuro, eliminação de falsos positivos nos testes mobile, metamorfose Master-Detail e protocolo unificado que dispensa o acionamento manual de comandos avulsos.

---

### 🎨 1. Frontend Craftsman: Auditoria e Garantia Dual-Theme (Modo Claro + Escuro)
- **Suporte Nativo a TypeScript (\`.ts\`):** Todos os arquivos de estilo (*styled-components*, design tokens) agora são compulsoriamente auditados.
- **Novas Regras Determinísticas (\`craft-audit.js\`):**
  - \`LIGHT_MODE_WHITE_TEXT\`: Bloqueia \`color: #fff\` ou \`color: white\` estático sem condicional de tema, impedindo texto invisível (branco sobre fundo claro).
  - \`LIGHT_MODE_GHOST_SURFACE\`: Bloqueia cartões translúcidos \`rgba(255, 255, 255, 0.0x)\` que somem no fundo claro (\`#F8FAFC\`).
  - \`HARDCODED_DARK_SURFACE\`: Bloqueia fundos pretos estáticos que não respondem à alternância de tema.
- **Pilar 3 no Anti-AI Slop:** Documentado no [rules/02-anti-ai-slop.md](file:///c:/Users/chalves/Documents/Projetos/skill's/rules/02-anti-ai-slop.md) a obrigatoriedade de contraste WCAG AA em ambos os temas.

---

### 📱 2. Mobile Converter: Metamorfose Master-Detail & Clearance Seguro
- **Suporte Nativo a \`.ts\`:** Varredura estrita em componentes e folhas de estilo TypeScript.
- **Nova Regra \`FIXED_NAV_COLLISION\`:** Detecta botões fixos no topo/esquerda (ex: menu hambúrguer) e exige \`padding-left: 52px+\` no cabeçalho mobile para evitar sobreposição de títulos.
- **Nova Regra \`DESKTOP_STACKED_SLOP\`:** Bloqueia empilhamento vertical descuidado de colunas desktop em telas de chat/atendimento.
- **Pilar 4.f (Metamorfose Master-Detail de Chat/Inboxes):** Exibição da lista de conversas quando nenhum chat estiver selecionado e área de mensagem em tela cheia com botão tátil de retorno (\`← Voltar\`) ao abrir um atendimento.

---

### ⚡ 3. Fim dos Comandos Avulsos — Modo Maestro Proativo (Diretrizes Globais v2.3.0)
- **Proibição de Comandos Avulsos:** O agente não exige mais que o usuário digite \`/front\`, \`/mobile\` ou \`/orch\` para aplicar as melhores práticas.
- **Governança Unificada em Qualquer Turno:** Ao tocar no front-end, o agente aplica compulsoriamente Dual-Theme (Dark + Light), ergonomia mobile e resolução direta no código.

---

### 📦 Como Atualizar / Instalar:
\`\`\`bash
# Mudar para a branch 2.2.1:
git checkout 2.2.1
git pull origin 2.2.1

# Ou instalar/sincronizar local e globalmente:
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
