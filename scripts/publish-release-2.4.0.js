#!/usr/bin/env node
/**
 * scripts/publish-release-2.4.0.js
 * Cria a release oficial v2.4.0 na API do GitHub.
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

// 2. Definição da Release Oficial v2.4.0
const releaseData = {
  tag_name: 'v2.4.0',
  target_commitish: '2.4.0',
  name: 'v2.4.0 — 🛡️ DevSecOps & Red Team Engine (13 Regras de Análise Ofensiva) + Renomeação Anti-Colisão Cloudflare',
  body: `# ⚡ Enterprise AI Suite v2.4.0 — DevSecOps & Red Team Engine

> **Atualização de Segurança Ofensiva & DevSecOps:** Motor de 13 regras determinísticas de Red Team/AppSec com execução 100% em CPU local (< 100ms, 0 tokens), portão de bloqueio em CI/CD e renomeação definitiva para \`devsecops-audit\` eliminando qualquer colisão com a Cloudflare.

---

### 🛡️ 1. Matriz de Detecção Ofensiva (13 Novas Regras Canônicas)
1. **\`RULE_AUTH_HARDCODED_MASTER_PASSWORDS\`** (CRITICAL): Senhas mestres, credenciais dev estáticas e queries de login com correspondência parcial (\`LIKE '%...%'\`).
2. **\`RULE_AUTH_MFA_UNIVERSAL_BYPASS\`** (CRITICAL): Bypasses estáticos em fluxos OTP/2FA (\`code === "999999"\`).
3. **\`RULE_BOLA_IDOR_MISSING_OWNERSHIP_CHECK\`** (HIGH): Endpoints \`:id\` manipulando registros no DB sem validação de posse (\`req.user.id\`).
4. **\`RULE_MASS_ASSIGNMENT_UNSANITIZED_BODY\`** (HIGH): Injeção direta de \`req.body\` em operações de banco sem whitelist Zod (\`.pick()\`, \`.omit()\`).
5. **\`RULE_AUTH_INFO_DISCLOSURE_IN_ERRORS\`** (MEDIUM): Dicas explícitas de senha ou listas de e-mails corporativos válidos em respostas 401/404.
6. **\`RULE_WEBHOOK_MISSING_HMAC_SIGNATURE\`** (HIGH): Webhooks externos sem validação HMAC-SHA256 ou com segredos de fallback.
7. **\`RULE_WEBSOCKET_UNAUTHENTICATED_ROOMS\`** (HIGH): Inscrição em salas Socket.IO sem handshake autenticado ou presença consumindo \`data.userId\` arbitrário.
8. **\`RULE_SSRF_UNVALIDATED_MEDIA_DOWNLOAD\`** (HIGH): Downloads ou fetches HTTP consumindo URLs de terceiros sem bloqueio de redes privadas/metadados da nuvem.
9. **\`RULE_TIMING_ATTACK_STRING_COMPARE\`** (MEDIUM): Operador \`===\` em segredos criptográficos em vez de \`crypto.timingSafeEqual()\`.
10. **\`RULE_STORED_XSS_UNSANITIZED_SVG_UPLOAD\`** (HIGH): Uploads aceitando SVG sem sanitização de \`<script>\` ou sem header \`Content-Disposition: attachment\`.
11. **\`RULE_UNPROTECTED_FILE_DOWNLOAD_ROUTE\`** (HIGH): Rotas de download de anexos servidas publicamente sem middleware de autenticação.
12. **\`RULE_JWT_MISSING_ALGORITHM_OPTION\`** (MEDIUM): Chamadas \`jwt.verify()\` sem declaração explícita de algoritmos autorizados.
13. **\`RULE_TAURI_IPC_UNRESTRICTED_CSP\`** (HIGH): Aplicações desktop Tauri combinando CSP nula (\`"csp": null\`) com permissões ativas de shell.

---

### 🏷️ 2. Resolução Definitiva de Nomes com a Cloudflare
- A skill oficial de segurança passa a se chamar exclusivamente **\`devsecops-audit\`** (e comando \`/devsecops-audit\`).
- Coexistência limpa e sem conflitos com \`cloudflare/security-audit-skill\`.

---

### 📦 Como Atualizar / Instalar:
\`\`\`bash
# Mudar para a branch 2.4.0:
git checkout 2.4.0
git pull origin 2.4.0

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
