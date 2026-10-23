#!/usr/bin/env node
/**
 * scripts/publish-release-2.7.0.js
 * Cria a release oficial v2.7.0 na API do GitHub.
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
  tag_name: 'v2.7.0',
  target_commitish: '2.7.0',
  name: 'v2.7.0 — 🎯 Precisão Antes de Volume: CVE ciente do lockfile, OSV.dev, Baseline, --changed, Supressão com Motivo, SARIF Universal & Cartografia Incremental',
  body: `# ⚡ Enterprise AI Suite v2.7.0 — Precisão Antes de Volume

> **Foco em Zero Falsos Positivos, Adoção em Projetos Reais e Contexto Enxuto:** Radar de CVE ciente do lockfile (\`npm\`/\`pnpm\`/\`yarn\`), consulta opt-in ao \`OSV.dev\` (\`--online\`), \`--baseline\` / \`--update-baseline\` com proteção de segredos e \`fingerprintKey\` estável, \`--changed\`, supressão inline com motivo obrigatório, exportação SARIF 2.1.0 universal, Falsifier com escopo por função/rota, \`/orch\` compatível com o plugin instalado e Cartografia incremental por \`mtime\`.

---

### 🐛 1. Correções Confirmadas (bugs da v2.6.0)
- **Falso positivo de CVE (\`devsecops-audit\`):** o radar comparava o range do \`package.json\` (\`^1.5.0\`) em vez da versão instalada. Agora lê \`package-lock.json\` (v1/v2/v3), \`pnpm-lock.yaml\` (v6/v9) e \`yarn.lock\` (v1/berry). Sem lockfile, o alerta é rebaixado para \`MEDIUM\` ("possível") em vez de bloquear o pipeline. O \`--fix\` também só reescreve o range quando a versão instalada é vulnerável.
- **Evidência ilegível:** \`maskSecret()\` era aplicado a toda evidência (\`"axi****.0"\`). Agora só regras que podem conter segredos são mascaradas.
- **CI não rodava nas releases:** \`ci.yml\` passa a disparar em branches \`X.Y*\`, tags \`v*\` e todo pull request, e ganha o job \`security-sarif\` que publica os achados na aba Security do GitHub.
- **Versões inconsistentes:** 5 skills ainda estavam em \`1.0.0\`. Novo \`scripts/sync-versions.js\` alinha tudo à versão raiz e o \`npm test\` falha se houver divergência.
- **Cartografia enganosa:** \`install.js\` era classificado como "API" e \`scripts/hooks/*.js\` como "Estado". Testes, instaladores, scripts e \`shared/\` agora vão para a Camada 6. O INDEX passa a mostrar o caminho real da CLI (não mais \`.agents/plugins/...\` fixo).
- **Truncamento silencioso:** quando o limite de varredura é atingido, \`graph.json\` registra \`metadata.truncated\` e o INDEX exibe o aviso **Mapa PARCIAL**.
- **Falsifier com escopo de arquivo:** os Vetores 2 (validação de payload) e 4 (atomicidade) avaliam separadamente cada função declarada com \`function\`, cada arrow atribuída a \`const\`/\`let\`/\`var\` sem tipo de retorno, cada método com a assinatura em uma linha e cada rota \`router/app.METHOD(\`. Um \`if (!\` em outra rota não mascara mais a falta de validação, e duas funções com uma escrita cada não contam como "operação múltipla".
- **\`--fix\` honesto (\`devsecops-audit\`):** cada correção vale só para a linha (ou o pacote) do próprio achado, e o arquivo só é gravado quando o conteúdo muda. O \`--fix\` só remove do relatório o que de fato corrigiu; o CVE continua até o lockfile ter uma versão segura.
- **\`/orch\` no plugin instalado:** o pipeline e o \`orch audit\` funcionam no plugin instalado (procuram as skills em \`skills/<nome>/\`), marcam etapas sem script como **NÃO EXECUTADO** e saem com \`0\` (ok), \`1\` (achados bloqueantes) ou \`2\` (etapa não executada ou falha).
- **Line endings:** novo \`.gitattributes\` (\`eol=lf\`) elimina os avisos LF/CRLF.

---

### 🎯 2. Precisão & Adoção em Projetos Reais (todos os auditores)
- **Núcleo comum \`shared/suite-core.js\`:** varredura com \`.gitignore\`, \`splitHandlers()\`, fingerprint, baseline, supressão inline e SARIF em uma única fonte, copiada para cada skill por \`scripts/sync-shared.js\` (as skills continuam instaláveis de forma avulsa no Claude Code e Cursor). \`style-blocks.js\` e \`visual-check.js\` também passaram para \`shared/\`.
- **\`--baseline\` / \`--update-baseline\`:** grava \`.audit-baseline.json\` e, a partir daí, só achados novos aparecem. Segredos (Pilar 16) nunca entram no baseline e continuam no relatório e no exit code, inclusive durante \`--update-baseline\`.
- **Fingerprint estável:** achados sem linha própria (npm audit, OSV, tsc) e o radar offline usam \`fingerprintKey\` (pacote@versão + IDs dos advisories; no tsc, o conjunto de erros). Um CVE novo depois do baseline continua aparecendo, mesmo apontando para a mesma linha do lockfile.
- **\`--changed\`:** filtra o relatório para arquivos alterados ou não rastreados no git; a varredura continua completa.
- **Supressão inline com motivo obrigatório:** \`// audit-ignore-next-line REGRA: motivo\` (ou \`// audit-ignore REGRA: motivo\` na mesma linha). Sem motivo, a supressão é ignorada; as supressões aplicadas aparecem no relatório.
- **\`--sarif\` em todos os auditores:** \`craft-audit\`, \`mobile-audit\`, \`db-audit\`, \`test-audit\` e \`falsify\` passam a exportar SARIF 2.1.0 com \`partialFingerprints\`.
- **\`--online\` (OSV.dev, opt-in):** consulta até 1000 pares nome@versão do lockfile por execução na API pública do OSV.dev (envia apenas nome e versão) e busca a severidade de até 40 vulnerabilidades; as demais aparecem como MEDIUM. Tem timeout e volta automática para o radar offline. Novo achado \`SUPPLY_CHAIN_OSV_CVE\`, sem repetir pacotes que o radar offline ou o \`npm audit\` já reportaram.
- **Pipeline \`/orch\`:** repassa \`--changed\`, \`--baseline\`, \`--update-baseline\` e \`--online\` para todos os auditores.

---

### 🧪 3. Fixtures Negativas (testes de "não pode gritar à toa")
- \`devsecops-audit/test/precision.check.js\`, \`db-sentinel/test/precision.check.js\`, \`test-forge/test/precision.check.js\` e novos cenários em \`hybrid-orchestrator\` e \`repo-cartographer\` garantem 0 achados em código correto, além de validar supressão, baseline, SARIF, escopo por função, cache incremental e aviso de mapa parcial.
- \`devsecops-audit/test/precision.check.js\` também cobre segredo durante \`--update-baseline\`, CVE novo do \`npm audit\` depois do baseline e o \`--fix\` que só remove o que corrigiu.
- \`shared/test/suite-core.check.js\` testa o núcleo direto (baseline com achados protegidos e \`fingerprintKey\`), e \`orch/test/installed-layout.check.js\` instala o plugin numa pasta temporária e roda o \`/orch\` da cópia instalada (etapas encontradas, \`NÃO EXECUTADO\` e exit codes 0/1/2).

---

### ⚡ 4. Desempenho & Contexto
- **Cartografia incremental:** nós com \`mtime\` inalterado são reaproveitados sem reler o arquivo, o que permitiu subir os limites de 160/250 para 800 sementes / 2.000 nós (ajustável via \`CARTOGRAPHER_MAX_FILES\`).
- **SKILL.md enxutos:** \`hybrid-orchestrator\` (28→10 KB) e \`frontend-craftsman\` (20→7 KB) mantêm só o núcleo, com o conteúdo detalhado movido integralmente para \`references/*.md\`, carregados sob demanda.
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
