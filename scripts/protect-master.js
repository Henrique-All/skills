/**
 * scripts/protect-master.js - Configura Regras de Proteção da Branch Master no GitHub
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
  console.error('Nenhum token encontrado.');
  process.exit(1);
}

const protectionRules = {
  required_status_checks: {
    strict: true,
    contexts: [
      'validate-skills (18.x)',
      'validate-skills (20.x)',
      'validate-skills (22.x)'
    ]
  },
  enforce_admins: false,
  required_pull_request_reviews: {
    dismiss_stale_reviews: true,
    require_code_owner_reviews: false,
    required_approving_review_count: 1
  },
  restrictions: null,
  allow_force_pushes: false,
  allow_deletions: false
};

const payload = JSON.stringify(protectionRules);

const req = https.request({
  hostname: 'api.github.com',
  path: '/repos/Henrique-All/skills/branches/master/protection',
  method: 'PUT',
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
    if (res.statusCode === 200) {
      console.log('🛡️  Sucesso! Branch master está agora PROTEGIDA no GitHub:');
      console.log('   - Exigência de Pull Request com pelo menos 1 aprovação;');
      console.log('   - Invalidação de reviews se novos commits forem adicionados;');
      console.log('   - Exigência dos testes do GitHub Actions (Node 18, 20 e 22) passando;');
      console.log('   - Proibição absoluta de Force Pushes (git push --force);');
      console.log('   - Proibição de exclusão da branch master.');
    } else {
      console.error(`❌ Erro ao proteger branch: HTTP ${res.statusCode}`);
      console.error(data);
    }
  });
});

req.on('error', (err) => {
  console.error('Erro de rede:', err.message);
});

req.write(payload);
req.end();
