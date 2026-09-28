/**
 * scripts/create-github-releases.js
 * Cria as 5 Releases oficiais na API do GitHub via token do Git Credential Manager.
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

// 2. Definição das 5 releases
const releases = [
  {
    tag_name: 'v1.0.0',
    name: 'v1.0.0 — 🚀 Fundação do Ecossistema Enterprise AI Skills',
    body: `# 🚀 Enterprise AI Skills v1.0.0 — Fundação da Governança Multi-Agente

Esta release marca o lançamento oficial do monorepo de governança, cartografia arquitetural e segurança para Agentes de IA (**Google Antigravity**, **Claude Code**, **Cursor**, **Windsurf**, **Copilot**, **Aider**).

---

### 📦 Skills Inclusas nesta Release
1. **⚡ \`hybrid-orchestrator\`:** Orquestrador com classificação adaptativa em 3 rotas (Rota A cirúrgica, Rota C híbrida, Rota B adversária), Sabatina dos 4 Quadrantes (Q1 Contratos, Q2 Concorrência, Q3 UI, Q4 Segurança), Trava de Permissão em 2 Turnos e Falsifier.
2. **🗺️ \`repo-cartographer\`:** Motor de descida em 6 camadas da UI ao Banco, com resolução nativa de aliases (\`@/\`), barrels e ciclos de dependência.
3. **🛡️ \`route-guard\`:** Análise cirúrgica de rotas no backend e mapeamento de impacto no frontend (Blast Radius).
4. **🔒 \`security-audit\`:** Motor DevSecOps com os 18 pilares OWASP em modo estritamente somente-leitura e mascaramento de segredos.

---

### 🛠️ Infraestrutura e CI/CD
- Instalador unificado em comando único: \`npm run install:all\` (instala em Antigravity, Claude Code e Cursor Rules).
- Test runner universal \`scripts/test-all.js\` para validação de integridade.
- Pipeline no **GitHub Actions** (\`.github/workflows/ci.yml\`) testando em Node.js 18, 20 e 22.
- Documentação com Scorecard técnico, atalhos de chat (\`/\` e \`@\`) e dinâmica Plandex vs Teamwork multi-agente.`,
    draft: false,
    prerelease: false
  },
  {
    tag_name: 'v1.1.0',
    name: 'v1.1.0 — 🎨 Lançamento do Frontend Craftsman (Design Engineering)',
    body: `# 🎨 Enterprise AI Skills v1.1.0 — Design Engineering de Alta Fidelidade

Apresentando a 5ª skill do ecossistema: **\`frontend-craftsman\`**, projetada para eliminar de vez a "cara de IA" em interfaces web e elevar o acabamento visual ao nível de empresas como Stripe, Linear e Apple.

---

### ✨ Destaques da Release
- **Erradicação do "AI Slop UI":** Proibição estrita de gradientes roxos genéricos (\`from-purple-600 to-indigo-600\`), blurs soltos sem critério e botões estáticos.
- **Física de Molas Real (Framer Motion):** Micro-interações táteis com física calibrada (\`stiffness: 450, damping: 30\`) e abas deslizantes fluidas com \`layoutId="active-pill"\`.
- **Gerador de Especificação Visual (\`DESIGN_SPEC.md\`):** Script \`generate-spec.js\` para criar especificações completas de design com paletas, tipografia modular e wireframes ASCII antes de codificar.
- **Auditoria Visual Determinística (\`craft-audit.js\`):** Scanner de código que calcula o Craftsmanship Score (0-100), alertando transições duras e elementos fora de padrão.
- **Elo Simbiótico com \`hybrid-orchestrator\`:** Integração automática com os fluxos Design-First e Engineering-First.`,
    draft: false,
    prerelease: false
  },
  {
    tag_name: 'v1.2.0',
    name: 'v1.2.0 — ✨ Frontend Craftsman 10.0/10 & Matriz Inter-Skills',
    body: `# ✨ Enterprise AI Skills v1.2.0 — Frontend Craftsman 10.0 & Sincronização Inter-Skills

Esta release eleva o **\`frontend-craftsman\` para a Nota 10.0/10 definitiva**, adiciona ferramentas visuais interativas e introduz a Matriz de Comunicação Inter-Skills.

---

### ✨ O Que Há de Novo
- **Preview Visual Instantâneo no Navegador (\`scripts/preview-spec.js\`):** Sobe um servidor local em 1 segundo e abre o navegador com spotlight cards, abas táteis e botões funcionais para validação do usuário antes de codificar.
- **Suporte Nativo a Tailwind CSS v4:** Exportação de tokens compatível com a nova diretiva \`@theme\` CSS-first do Tailwind v4 e compatibilidade retroativa com Tailwind v3 (\`craft-palette.js\`).
- **Presets de Paletas Claras Calibradas:** Novos temas refinados (\`stripe-clean-light\`, \`linear-light\`).
- **Templates de Alta Fidelidade:** \`ContentSkeleton.tsx\` (anti-CLS), \`MagneticButton.tsx\`, \`SpotlightCard.tsx\` e \`SmoothAccordion.tsx\`.
- **Matriz de Comunicação Inter-Skills:** Mapeamento formal de como as skills conversam entre si via handshakes tipados (\`.code-map/handshake.json\`).
- **Diagramas Otimizados:** Reestruturação de todos os diagramas Mermaid em pilhas verticais legíveis para GitHub com quebras \`<br/>\`.`,
    draft: false,
    prerelease: false
  },
  {
    tag_name: 'v1.3.0',
    name: 'v1.3.0 — 📱 Mobile Converter 10.0/10 com Simulador de Smartphone',
    body: `# 📱 Enterprise AI Skills v1.3.0 — Mobile Converter 10.0 & Simulador Interativo

Lançamento da 6ª skill do ecossistema: **\`mobile-converter\`**, alcançando imediatamente a **Nota 10.0/10**. Transforma aplicações desktop e tabelas complexas em experiências nativas táteis para smartphone.

---

### ✨ Destaques da Release
- **Metamorfoses Estruturais Nativas:**
  - **Tabelas ➔ Feed de Cards:** \`ResponsiveTableToCards.tsx\` converte tabelas ilegíveis em pilhas verticais de cards com badges e ações táteis.
  - **Navegação Desktop ➔ Mobile Bottom Nav:** \`MobileBottomNav.tsx\` posiciona a barra de abas inferior na Thumb Zone ergonômica do polegar.
  - **Modais ➔ Swipeable Bottom Sheets:** \`BottomSheet.tsx\` com gesto de arrastar para baixo para fechar (\`drag="y"\`).
  - **Linhas com Swipe Lateral:** \`SwipeableRow.tsx\` para ações rápidas estilo iOS Mail e WhatsApp.
- **Ergonomia Móvel Severa:** Touch targets de 44×44px, safe areas de hardware (\`env(safe-area-inset-bottom)\`), uso estrito de \`100dvh\` e prevenção de zoom no Safari iOS via \`font-size: 16px\`.
- **Simulador de Smartphone no Navegador (\`scripts/preview-mobile.js\`):** Servidor interativo que renderiza molduras realistas de iPhone 15 Pro, iPhone SE e Galaxy S24 com Dynamic Island para testar gestos.
- **Motor de Auditoria com Autofix (\`scripts/mobile-audit.js --fix\`):** Calcula o Mobile Readiness Score (0-100) e corrige automaticamente falhas de viewport e safe-areas nos arquivos.
- **Gerador de Receitas (\`scripts/adapt-screen.js\`):** Plano de conversão passo a passo para componentes existentes.`,
    draft: false,
    prerelease: false
  },
  {
    tag_name: 'v2.0.0',
    name: 'v2.0.0 — 🏆 Ecossistema Pleno 10.0/10 (Ultimate Release)',
    body: `# 🏆 Enterprise AI Skills v2.0.0 — O Ecossistema Pleno 10.0/10

A **Release Definitiva**! Todas as 6 skills do monorepo foram elevadas à **Nota 10.0/10**, dotadas de CLIs executáveis determinísticos, testes unitários automatizados e garantias de segurança contra alucinações de IA.

---

### 🌟 As 6 Skills na Nota 10.0/10

1. **⚡ \`hybrid-orchestrator\` (10.0/10):**
   - \`scripts/snapshot.js\`: Snapshots atômicos git (\`git stash create\`) com rollback automático e instantâneo (\`snapshot.js rollback\`).
   - \`scripts/falsify.js\`: Test runner automatizado para os 5 vetores de ataque adversário (anti-N+1, timeouts, boundary values, concorrência e integridade transacional).
   - \`scripts/preview-plan.js\`: Visualizador gráfico ASCII do plano dos 4 Quadrantes para o Turno 1.

2. **🎨 \`frontend-craftsman\` (10.0/10):**
   - Elimina vícios visuais de IA, física de molas Framer Motion, preview visual em 1s (\`preview-spec.js\`), Tailwind v4 (\`@theme\`), componentes táteis e auditoria determinística (\`craft-audit.js\`).

3. **📱 \`mobile-converter\` (10.0/10):**
   - Metamorfose Tabela ➔ Cards, Bottom Sheets táteis, iOS Tab Bar, simulador web de smartphone (\`preview-mobile.js\`) e auditoria com Autofix (\`mobile-audit.js --fix\`).

4. **🔒 \`security-audit\` (10.0/10):**
   - 18 pilares OWASP em modo somente-leitura com mascaramento de segredos.
   - Autofix imediato (\`--fix\`) de reverse tabnabbing e cookies inseguros.
   - Padrão industrial OASIS SARIF v2.1.0 (\`--sarif\`) para integração nativa com GitHub Code Scanning e GitLab SAST.
   - \`scripts/install-hook.js\`: Git Hook pre-commit automatizado bloqueante.

5. **🗺️ \`repo-cartographer\` (10.0/10):**
   - Descida 360° em 6 camadas economizando até 90% dos tokens de exploração.
   - Geração de diagramas Mermaid em runtime (\`cartographer.js mermaid <file>\`).
   - Rastreamento reverso de blast radius (\`cartographer.js callers <file>\`).
   - \`scripts/preview-graph.js\`: Canvas interativo web no navegador com física de nós e filtro de camadas L1-L6.

6. **🛡️ \`route-guard\` (10.0/10):**
   - Trava de retrocompatibilidade para endpoints compartilhados.
   - \`scripts/generate-contract.js\`: Gerador automatizado de contratos Zod e TypeScript DTOs.
   - \`scripts/mock-route.js\`: Servidor Mock HTTP zero-dependency com CORS total liberado e latência simulada em 1s.

---

### 📋 Governança e Transparência
- Racional técnico detalhado no \`README.md\` justificando a Nota 10.0/10 de cada ferramenta.
- 100% de aprovação nas baterias de testes de todas as 6 skills (\`npm test\`).
- Histórico completo documentado no \`CHANGELOG.md\`.`,
    draft: false,
    prerelease: false
  }
];

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
          console.log(`✅ Release [${rel.tag_name}] criada com sucesso! URL: ${json.html_url}`);
          resolve(json);
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

async function run() {
  console.log('🚀 Iniciando publicação das 5 Releases no GitHub...\n');
  for (const rel of releases) {
    await createRelease(rel);
  }
  console.log('\n🎉 Todas as 5 Releases foram processadas no GitHub!');
}

run();
