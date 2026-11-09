#!/usr/bin/env node
/**
 * scripts/switch-version.js
 * Seletor e Instalador de Versões Remotas via GitHub Releases (Zero-Git-Clone).
 *
 * Uso:
 *   node scripts/switch-version.js                                   -> Menu interativo de versões
 *   node scripts/switch-version.js --version=v2.8.0                  -> Instala direto a versão informada
 *   node scripts/switch-version.js --version=v2.8.0 --sha256=<hash>  -> Verifica o SHA-256 do pacote tar.gz
 *   node scripts/switch-version.js --version=v2.8.0 --dry-run        -> Valida parâmetros e URLs sem baixar
 *   node scripts/switch-version.js --global                          -> Aplica instalação globalmente
 */

const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const readline = require('readline');

const ALLOWED_HOSTS = new Set([
  'api.github.com',
  'github.com',
  'codeload.github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com'
]);

const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT_MS = 30000;
const MAX_JSON_BYTES = 5 * 1024 * 1024;      // 5 MB
const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;  // 50 MB

function validateUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    throw new Error('URL inválida: valor vazio ou tipo inválido.');
  }
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`URL inválida: ${rawUrl}`);
  }
  if (parsed.protocol !== 'https:') {
    throw new Error(`Protocolo inválido (${parsed.protocol}). Apenas HTTPS é aceito.`);
  }
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    throw new Error(`Host inválido ou não autorizado para download/consulta: ${parsed.hostname}`);
  }
  return parsed.toString();
}

function validateTagFormat(tag) {
  const clean = typeof tag === 'string' ? tag.trim() : '';
  if (!/^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(clean)) {
    throw new Error(`Formato de tag inválido: "${clean}". Use ex: v2.8.0 ou v2.2.0-beta.1`);
  }
  return clean;
}

function validateSha256Arg(sha256Flag) {
  if (sha256Flag === undefined || sha256Flag === null || sha256Flag === false) return null;
  if (typeof sha256Flag !== 'string') {
    throw new Error('Argumento --sha256 inválido: deve conter exatamente 64 caracteres hexadecimais.');
  }
  if (!sha256Flag.startsWith('--sha256')) return null;
  const idx = sha256Flag.indexOf('=');
  const val = idx >= 0 ? sha256Flag.slice(idx + 1).trim().toLowerCase() : '';
  if (!/^[0-9a-f]{64}$/.test(val)) {
    throw new Error('Argumento --sha256 inválido: deve conter exatamente 64 caracteres hexadecimais.');
  }
  return val;
}

function buildSafeEnv(callerDir) {
  const allowKeys = [
    'PATH',
    'Path',
    'HOME',
    'USERPROFILE',
    'APPDATA',
    'LOCALAPPDATA',
    'TEMP',
    'TMP',
    'TMPDIR',
    'SYSTEMROOT',
    'SystemRoot',
    'ComSpec',
    'WINDIR',
    'NODE_ENV',
    'LANG',
    'LC_ALL'
  ];
  const env = { TARGET_WORKSPACE: callerDir };
  for (const k of allowKeys) {
    if (process.env[k] !== undefined) {
      env[k] = process.env[k];
    }
  }
  return env;
}

function verifyNoSymlinksOrTraversal(rootDir) {
  if (typeof rootDir !== 'string' || !rootDir.trim() || !fs.existsSync(rootDir)) return;
  const resolvedRoot = path.resolve(rootDir);
  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const ent of entries) {
      const fullPath = path.join(currentDir, ent.name);
      const resolvedFull = path.resolve(fullPath);
      if (resolvedFull !== resolvedRoot && !resolvedFull.startsWith(resolvedRoot + path.sep)) {
        throw new Error(`Entrada fora do diretório de extração detectada: ${ent.name}`);
      }
      const st = fs.lstatSync(fullPath);
      if (st.isSymbolicLink()) {
        throw new Error(`Symlink não permitido no pacote extraído: ${fullPath}`);
      }
      if (st.isDirectory()) {
        walk(fullPath);
      }
    }
  }
  walk(resolvedRoot);
}

function fetchJson(rawUrl, redirects = 0) {
  return new Promise((resolve, reject) => {
    let safeUrl;
    try {
      safeUrl = validateUrl(rawUrl);
    } catch (e) {
      return reject(e);
    }
    if (redirects > MAX_REDIRECTS) {
      return reject(new Error('Limite máximo de redirecionamentos excedido.'));
    }

    const req = https.get(
      safeUrl,
      { headers: { 'User-Agent': 'NodeJS-Version-Switcher' }, timeout: REQUEST_TIMEOUT_MS },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          try {
            const nextUrl = new URL(res.headers.location, safeUrl).toString();
            return fetchJson(nextUrl, redirects + 1).then(resolve, reject);
          } catch (e) {
            return reject(e);
          }
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}: Falha ao consultar GitHub`));
        }

        let size = 0;
        const chunks = [];
        res.on('data', (chunk) => {
          size += chunk.length;
          if (size > MAX_JSON_BYTES) {
            req.destroy(new Error('Resposta JSON excede o limite de tamanho permitido.'));
            return;
          }
          chunks.push(chunk);
        });
        res.on('error', reject);
        res.on('end', () => {
          try {
            const text = Buffer.concat(chunks).toString('utf-8');
            resolve(JSON.parse(text));
          } catch {
            reject(new Error('Resposta JSON inválida recebida do GitHub.'));
          }
        });
      }
    );

    req.on('timeout', () => req.destroy(new Error('Timeout ao consultar API do GitHub.')));
    req.on('error', reject);
  });
}

function downloadFileWithHash(rawUrl, dest, redirects = 0) {
  return new Promise((resolve, reject) => {
    let safeUrl;
    try {
      safeUrl = validateUrl(rawUrl);
    } catch (e) {
      return reject(e);
    }
    if (redirects > MAX_REDIRECTS) {
      return reject(new Error('Limite máximo de redirecionamentos excedido no download.'));
    }

    const req = https.get(
      safeUrl,
      { headers: { 'User-Agent': 'NodeJS-Version-Switcher' }, timeout: REQUEST_TIMEOUT_MS },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          try {
            const nextUrl = new URL(res.headers.location, safeUrl).toString();
            return downloadFileWithHash(nextUrl, dest, redirects + 1).then(resolve, reject);
          } catch (e) {
            return reject(e);
          }
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} ao baixar arquivo`));
        }

        const hash = crypto.createHash('sha256');
        const out = fs.createWriteStream(dest);
        let size = 0;

        res.on('data', (chunk) => {
          size += chunk.length;
          if (size > MAX_ARCHIVE_BYTES) {
            req.destroy(new Error('Pacote excede o limite máximo de 50 MB.'));
            return;
          }
          hash.update(chunk);
        });

        res.on('error', reject);
        out.on('error', reject);
        out.on('finish', () => {
          out.close(() => resolve({ sha256: hash.digest('hex'), bytes: size }));
        });
        res.pipe(out);
      }
    );

    req.on('timeout', () => req.destroy(new Error('Timeout no download do pacote.')));
    req.on('error', reject);
  });
}

async function run() {
  console.log('===============================================================');
  console.log('🔄 SELETOR DE VERSÃO REMOTA — ENTERPRISE AI SUITE');
  console.log('   (Instalação e troca de versão sem precisar clonar o Git)');
  console.log('===============================================================\n');

  const rawArgs = process.argv.slice(2);
  const versionArg = rawArgs.find((a) => a.startsWith('--version='));
  const sha256Arg = rawArgs.find((a) => a === '--sha256' || a.startsWith('--sha256='));
  const isDryRun = rawArgs.includes('--dry-run');
  const isGlobal = rawArgs.includes('--global') || rawArgs.includes('-g');
  const isBoth = rawArgs.includes('--both') || rawArgs.includes('-b');

  let expectedSha256 = null;
  try {
    expectedSha256 = validateSha256Arg(sha256Arg);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }

  // Filtra apenas flags conhecidas do instalador para encaminhamento seguro
  const allowedForwardFlags = new Set(['--global', '-g', '--local', '-l', '--both', '-b', '--plugin-only', '--force']);
  const forwardedArgs = rawArgs.filter((a) => allowedForwardFlags.has(a));

  // Suporta tanto --version=v2.8.0 quanto argumento posicional v2.8.0
  const positionalTag = rawArgs.find((a) => !a.startsWith('-'));
  let targetTag = versionArg ? versionArg.slice('--version='.length) : positionalTag || null;

  if (!targetTag) {
    console.log('📡 Buscando releases disponíveis no GitHub (Henrique-All/skills)...\n');
    let releases = [];
    try {
      releases = await fetchJson('https://api.github.com/repos/Henrique-All/skills/releases');
    } catch (err) {
      console.error(`❌ Não foi possível carregar as releases: ${err.message}`);
      process.exit(1);
    }

    if (!Array.isArray(releases) || releases.length === 0) {
      console.error('❌ Nenhuma release encontrada no repositório.');
      process.exit(1);
    }

    console.log('📦 Versões disponíveis para instalação:');
    releases.forEach((rel, index) => {
      const badge = rel.prerelease
        ? '🚀 [PREVIEW / BETA]'
        : index === 1 || !releases[0].prerelease
        ? '⭐ [ESTÁVEL]'
        : '📦 [RELEASE]';
      console.log(`  ${index + 1}) ${String(rel.tag_name || '').padEnd(16)} ${badge} - ${rel.name || ''}`);
    });

    console.log('\n  0) Cancelar e sair\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      rl.question(`👉 Digite o número da versão que deseja instalar (1-${releases.length}): `, (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    });

    const chosenIndex = parseInt(answer, 10);
    if (Number.isNaN(chosenIndex) || chosenIndex === 0) {
      console.log('Operação cancelada.');
      process.exit(0);
    }

    if (chosenIndex < 1 || chosenIndex > releases.length) {
      console.error('❌ Opção inválida.');
      process.exit(1);
    }

    targetTag = releases[chosenIndex - 1].tag_name;
  }

  try {
    targetTag = validateTagFormat(targetTag);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }

  const downloadUrl = validateUrl(`https://github.com/Henrique-All/skills/archive/refs/tags/${targetTag}.tar.gz`);

  if (isDryRun) {
    console.log('🧪 [DRY-RUN] Validação concluída (nenhum arquivo foi baixado):');
    console.log(`   - Tag validada:   ${targetTag}`);
    console.log(`   - URL de pacote:  ${downloadUrl}`);
    console.log(`   - SHA-256 exigido: ${expectedSha256 || '(não especificado)'}`);
    process.exit(0);
  }

  console.log(`\n===============================================================`);
  console.log(`⬇️  Baixando e instalando a versão: [${targetTag}]...`);
  console.log(`===============================================================\n`);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-release-'));
  const tarPath = path.join(tmpDir, `${targetTag}.tar.gz`);

  try {
    console.log(`📡 Baixando pacote (.tar.gz) de: ${downloadUrl}`);
    const { sha256, bytes } = await downloadFileWithHash(downloadUrl, tarPath);
    console.log(`   ✅ Download concluído (${bytes} bytes)`);
    console.log(`   🔒 SHA-256 calculado: ${sha256}`);

    if (expectedSha256 && sha256.toLowerCase() !== expectedSha256.toLowerCase()) {
      throw new Error(
        `Verificação de integridade SHA-256 falhou!\n   Esperado: ${expectedSha256}\n   Obtido:   ${sha256}`
      );
    }
    if (expectedSha256) {
      console.log('   ✅ Checksum SHA-256 verificado com sucesso!');
    }

    console.log('📦 Extraindo pacote (.tar.gz)...');
    execFileSync('tar', ['-xzf', tarPath, '-C', tmpDir], { stdio: 'pipe' });

    // Verifica que nenhum arquivo extraído contém symlinks ou escapa de tmpDir
    verifyNoSymlinksOrTraversal(tmpDir);

    const subEntries = fs.readdirSync(tmpDir, { withFileTypes: true });
    const extractedFolder = subEntries.find((e) => e.isDirectory());
    if (!extractedFolder) {
      throw new Error('Falha ao localizar pasta descompactada.');
    }

    const packageDir = path.join(tmpDir, extractedFolder.name);
    const installScript = path.join(packageDir, 'install.js');
    if (!fs.existsSync(installScript)) {
      throw new Error('install.js não encontrado no pacote extraído.');
    }

    console.log(`📁 Pacote extraído em: ${packageDir}`);
    console.log('\n⚙️  Executando instalador da versão em ambiente restrito...');

    const installArgs = ['install.js'];
    if (forwardedArgs.length > 0) {
      installArgs.push(...forwardedArgs);
    } else if (isGlobal) {
      installArgs.push('--global');
    } else if (isBoth) {
      installArgs.push('--both');
    }

    const callerDir = process.cwd();
    execFileSync(process.execPath, installArgs, {
      cwd: packageDir,
      env: buildSafeEnv(callerDir),
      stdio: 'inherit'
    });

    console.log(`\n===============================================================`);
    console.log(`🎉 VERSÃO [${targetTag}] INSTALADA COM SUCESSO!`);
    console.log(`===============================================================\n`);
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignora erros de limpeza temporária
    }
  }
}

if (require.main === module) {
  run().catch((err) => {
    console.error(`\n❌ Falha durante a troca de versão: ${err.message}`);
    process.exit(1);
  });
}

module.exports = {
  run,
  validateUrl,
  validateTagFormat,
  validateSha256Arg,
  buildSafeEnv,
  verifyNoSymlinksOrTraversal,
  fetchJson,
  downloadFileWithHash
};
