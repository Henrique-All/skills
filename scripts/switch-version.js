#!/usr/bin/env node
/**
 * scripts/switch-version.js
 * Seletor e Instalador Seguro de Versões Remotas via GitHub Releases (Zero-Git-Clone).
 *
 * Uso:
 *   node scripts/switch-version.js                                    -> Menu interativo de versões
 *   node scripts/switch-version.js --version=v2.2.0-beta.1 --yes      -> Instala direto a tag validada
 *   node scripts/switch-version.js v2.1.0 --dry-run                   -> Simula validação e download sem executar
 *   node scripts/switch-version.js --version=v2.1.0 --sha256=<hex>    -> Verifica integridade SHA-256 do pacote
 */

const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const readline = require('readline');

const ALLOWED_GITHUB_HOSTS = new Set([
  'api.github.com',
  'github.com',
  'codeload.github.com',
  'objects.githubusercontent.com'
]);

const ALLOWED_FORWARD_FLAGS = new Set([
  '--global',
  '-g',
  '--both',
  '-b',
  '--plugin-only',
  '--dry-run',
  '--no-backup',
  '--keep-duplicates',
  '--target=all',
  '--target=gemini',
  '--target=claude',
  '--target=codex',
  '--target=opencode',
  '--target=cursor'
]);

function isValidVersionTag(tag) {
  if (typeof tag !== 'string' || !tag.trim()) return false;
  return /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(tag.trim());
}

function validateUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`URL bloqueada por formato inválido: ${rawUrl}`);
  }
  if (parsed.protocol !== 'https:') {
    throw new Error(`URL bloqueada (apenas HTTPS permitido): ${rawUrl}`);
  }
  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '169.254.169.254' ||
    !ALLOWED_GITHUB_HOSTS.has(host)
  ) {
    throw new Error(`Host não autorizado na allowlist GitHub: ${host}`);
  }
  return parsed.toString();
}

const validateGitHubUrl = validateUrl;

function fetchJson(rawUrl) {
  const safeUrl = validateUrl(rawUrl);
  return new Promise((resolve, reject) => {
    https.get(safeUrl, { headers: { 'User-Agent': 'NodeJS-Version-Switcher' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJson(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}: Falha ao consultar GitHub`));
      }
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('Resposta JSON inválida do GitHub'));
        }
      });
    }).on('error', reject);
  });
}

function downloadFileWithHash(rawUrl, dest) {
  const safeUrl = validateUrl(rawUrl);
  return new Promise((resolve, reject) => {
    https.get(safeUrl, { headers: { 'User-Agent': 'NodeJS-Version-Switcher' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFileWithHash(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} ao baixar arquivo`));
      }
      const hash = crypto.createHash('sha256');
      const fileStream = fs.createWriteStream(dest);
      res.on('data', chunk => hash.update(chunk));
      res.pipe(fileStream);
      fileStream.on('finish', () => fileStream.close(() => resolve(hash.digest('hex'))));
      fileStream.on('error', reject);
    }).on('error', reject);
  });
}

function extractArchiveSafe(zipPath, destDir) {
  if (process.platform === 'win32') {
    try {
      execFileSync('tar', ['-xf', zipPath, '-C', destDir], { stdio: 'ignore' });
      return;
    } catch {
      execFileSync(
        'powershell',
        [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          'Expand-Archive -LiteralPath $env:SUITE_ZIP_PATH -DestinationPath $env:SUITE_DEST_DIR -Force'
        ],
        {
          env: { ...process.env, SUITE_ZIP_PATH: zipPath, SUITE_DEST_DIR: destDir },
          stdio: 'ignore'
        }
      );
      return;
    }
  }
  execFileSync('tar', ['-xf', zipPath, '-C', destDir], { stdio: 'ignore' });
}

async function run() {
  console.log('===============================================================');
  console.log('🔄 SELETOR DE VERSÃO REMOTA — ENTERPRISE AI SUITE');
  console.log('   (Instalação e troca de versão com verificação de integridade)');
  console.log('===============================================================\n');

  const rawArgs = process.argv.slice(2);
  const versionFlag = rawArgs.find(a => a.startsWith('--version='));
  const sha256Flag = rawArgs.find(a => a.startsWith('--sha256='));
  const expectedSha256 = sha256Flag ? sha256Flag.split('=')[1].trim().toLowerCase() : null;
  const isDryRun = rawArgs.includes('--dry-run');
  const isYes = rawArgs.includes('--yes') || rawArgs.includes('-y');

  // Suporta tanto --version=<tag> quanto argumento posicional <tag>
  const positionalTag = rawArgs.find(a => !a.startsWith('-'));
  let targetTag = versionFlag ? versionFlag.split('=')[1] : positionalTag || null;

  const safeForwardFlags = rawArgs.filter(a => ALLOWED_FORWARD_FLAGS.has(a));
  if (isDryRun && !safeForwardFlags.includes('--dry-run')) {
    safeForwardFlags.push('--dry-run');
  }

  if (!targetTag) {
    console.log('📡 Buscando releases disponíveis no GitHub (Henrique-All/skills)...\n');
    let releases = [];
    try {
      releases = await fetchJson('https://api.github.com/repos/Henrique-All/skills/releases');
    } catch (err) {
      console.error(`❌ Não foi possível carregar as releases: ${err.message}`);
      process.exit(1);
    }

    if (!releases || releases.length === 0) {
      console.error('❌ Nenhuma release encontrada no repositório.');
      process.exit(1);
    }

    console.log('📦 Versões disponíveis para instalação:');
    releases.forEach((rel, index) => {
      const badge = rel.prerelease ? '🚀 [PREVIEW / BETA]' : (index === 0 ? '⭐ [ESTÁVEL]' : '📦 [RELEASE]');
      console.log(`  ${index + 1}) ${String(rel.tag_name).padEnd(16)} ${badge} - ${rel.name}`);
    });

    console.log('\n  0) Cancelar e sair\n');

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise((resolve) => {
      rl.question('👉 Digite o número da versão que deseja instalar (1-' + releases.length + '): ', (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    });

    const chosenIndex = parseInt(answer, 10);
    if (isNaN(chosenIndex) || chosenIndex === 0) {
      console.log('Operação cancelada.');
      process.exit(0);
    }

    if (chosenIndex < 1 || chosenIndex > releases.length) {
      console.error('❌ Opção inválida.');
      process.exit(1);
    }

    targetTag = releases[chosenIndex - 1].tag_name;
  }

  if (!isValidVersionTag(targetTag)) {
    console.error(`❌ Formato de versão inválido ou inseguro: "${targetTag}". Use semver (ex: v2.8.0 ou v2.2.0-beta.1).`);
    process.exit(1);
  }

  const normalizedTag = targetTag.startsWith('v') ? targetTag : `v${targetTag}`;
  const downloadUrl = validateUrl(`https://github.com/Henrique-All/skills/archive/refs/tags/${normalizedTag}.zip`);

  if (isDryRun) {
    console.log(`🔍 [DRY-RUN] Tag validada: ${normalizedTag}`);
    console.log(`🔍 [DRY-RUN] URL verificada na allowlist: ${downloadUrl}`);
    console.log(`🔍 [DRY-RUN] Flags encaminhadas ao instalador: ${safeForwardFlags.join(' ') || '(padrão local)'}`);
    return;
  }

  // Confirmação explícita antes de baixar e executar código remoto quando sem --yes
  if (!isYes && process.stdin.isTTY) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const confirm = await new Promise((resolve) => {
      rl.question(`⚠️  Deseja baixar e executar o instalador da versão [${normalizedTag}] do GitHub? (s/N): `, (ans) => {
        rl.close();
        resolve(ans.trim().toLowerCase());
      });
    });
    if (confirm !== 's' && confirm !== 'sim' && confirm !== 'y' && confirm !== 'yes') {
      console.log('Operação cancelada pelo usuário.');
      process.exit(0);
    }
  } else if (!isYes && !process.stdin.isTTY) {
    console.error('❌ Execução não-interativa requer confirmação explícita via flag --yes (ou --dry-run para simular).');
    process.exit(1);
  }

  console.log(`\n===============================================================`);
  console.log(`⬇️  Baixando e verificando a versão: [${normalizedTag}]...`);
  console.log(`===============================================================\n`);

  // Verifica integridade da referência de tag na API do GitHub
  try {
    const refData = await fetchJson(`https://api.github.com/repos/Henrique-All/skills/git/ref/tags/${normalizedTag}`);
    const refSha = refData?.object?.sha;
    if (refSha) {
      console.log(`🔐 Tag verificada no GitHub (${normalizedTag} -> SHA ${refSha.slice(0, 12)})`);
    }
  } catch (err) {
    console.warn(`⚠️  Aviso: Não foi possível consultar metadados da tag via API (${err.message}). Prosseguindo com download HTTPS.`);
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-release-'));
  const zipPath = path.join(tmpDir, `${normalizedTag}.zip`);

  try {
    console.log(`📡 Baixando release de: ${downloadUrl}`);
    const actualSha256 = await downloadFileWithHash(downloadUrl, zipPath);
    console.log(`   ✅ Download concluído (${fs.statSync(zipPath).size} bytes)`);
    console.log(`   🔒 SHA-256 do pacote: ${actualSha256}`);

    if (expectedSha256 && actualSha256 !== expectedSha256) {
      throw new Error(`Falha de integridade SHA-256! Esperado: ${expectedSha256}, obtido: ${actualSha256}`);
    }

    console.log('📦 Extraindo pacote de forma segura (execFileSync)...');
    extractArchiveSafe(zipPath, tmpDir);

    const subEntries = fs.readdirSync(tmpDir, { withFileTypes: true });
    const extractedFolder = subEntries.find(e => e.isDirectory());
    if (!extractedFolder) {
      throw new Error('Falha ao localizar pasta descompactada.');
    }

    const packageDir = path.join(tmpDir, extractedFolder.name);
    const installerScript = path.join(packageDir, 'install.js');
    if (!fs.existsSync(installerScript)) {
      throw new Error('install.js não encontrado dentro do pacote baixado.');
    }

    console.log(`📁 Pacote extraído em: ${packageDir}`);
    console.log('\n⚙️  Executando instalador da versão...');

    const callerDir = process.cwd();
    execFileSync(process.execPath, [installerScript, ...safeForwardFlags], {
      cwd: packageDir,
      env: { ...process.env, TARGET_WORKSPACE: callerDir },
      stdio: 'inherit'
    });

    console.log(`\n===============================================================`);
    console.log(`🎉 VERSÃO [${normalizedTag}] INSTALADA COM SUCESSO!`);
    console.log(`===============================================================\n`);
  } catch (err) {
    console.error(`\n❌ Falha durante a troca de versão: ${err.message}`);
    process.exitCode = 1;
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignorar erros de limpeza temporária
    }
  }
}

if (require.main === module) {
  run();
}

module.exports = { isValidVersionTag, validateUrl, validateGitHubUrl };
