#!/usr/bin/env node
/**
 * scripts/switch-version.js
 * Seletor e Instalador de Versões Remotas via GitHub Releases (Zero-Git-Clone).
 * 
 * Uso:
 *   node scripts/switch-version.js                        -> Menu interativo de versões
 *   node scripts/switch-version.js --version=v2.2.0-beta.1 -> Instala direto a Beta
 *   node scripts/switch-version.js --version=v2.1.0        -> Instala direto a Estável
 *   node scripts/switch-version.js --global                -> Aplica instalação globalmente
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const readline = require('readline');

console.log('===============================================================');
console.log('🔄 SELETOR DE VERSÃO REMOTA — ENTERPRISE AI SUITE');
console.log('   (Instalação e troca de versão sem precisar clonar o Git)');
console.log('===============================================================\n');

const rawArgs = process.argv.slice(2);
const versionArg = rawArgs.find(a => a.startsWith('--version='));
const isGlobal = rawArgs.includes('--global') || rawArgs.includes('-g');
const isBoth = rawArgs.includes('--both') || rawArgs.includes('-b');

// Argumentos que serão repassados para o instalador da versão baixada
const forwardedArgs = rawArgs.filter(a => !a.startsWith('--version=') && a !== '--version').join(' ');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'NodeJS-Version-Switcher' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJson(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}: Falha ao consultar GitHub`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Resposta inválida do GitHub'));
        }
      });
    }).on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'NodeJS-Version-Switcher' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} ao baixar arquivo`));
      }
      const fileStream = fs.createWriteStream(dest);
      res.pipe(fileStream);
      fileStream.on('finish', () => fileStream.close(() => resolve()));
    }).on('error', reject);
  });
}

async function run() {
  let targetTag = versionArg ? versionArg.split('=')[1] : null;

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
      const badge = rel.prerelease ? '🚀 [PREVIEW / BETA]' : (index === 1 || !releases[0].prerelease ? '⭐ [ESTÁVEL]' : '📦 [RELEASE]');
      console.log(`  ${index + 1}) ${rel.tag_name.padEnd(16)} ${badge} - ${rel.name}`);
    });

    console.log('\n  0) Cancelar e sair\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

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

  console.log(`\n===============================================================`);
  console.log(`⬇️  Baixando e instalando a versão: [${targetTag}]...`);
  console.log(`===============================================================\n`);

  const tmpDir = path.join(os.tmpdir(), `skills-release-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const zipPath = path.join(tmpDir, `${targetTag}.zip`);
  const downloadUrl = `https://github.com/Henrique-All/skills/archive/refs/tags/${targetTag}.zip`;

  try {
    console.log(`📡 Baixando release de: ${downloadUrl}`);
    await downloadFile(downloadUrl, zipPath);
    console.log(`   ✅ Download concluído com sucesso (${fs.statSync(zipPath).size} bytes)`);

    console.log('📦 Extraindo pacote...');
    execSync(`tar -xf "${zipPath}" -C "${tmpDir}"`, { stdio: 'ignore' });

    // O GitHub extrai para uma pasta nomeada como: skills-<tag-sem-v> ou skills-<tag>
    const subEntries = fs.readdirSync(tmpDir, { withFileTypes: true });
    const extractedFolder = subEntries.find(e => e.isDirectory());
    if (!extractedFolder) {
      throw new Error('Falha ao localizar pasta descompactada.');
    }

    const packageDir = path.join(tmpDir, extractedFolder.name);
    console.log(`📁 Pacote extraído em: ${packageDir}`);

    console.log('\n⚙️  Executando instalador da versão...');
    const installFlags = forwardedArgs || (isGlobal ? '--global' : isBoth ? '--both' : '');
    const callerDir = process.cwd();
    execSync(`node install.js ${installFlags}`, {
      cwd: packageDir,
      env: { ...process.env, TARGET_WORKSPACE: callerDir },
      stdio: 'inherit'
    });

    console.log(`\n===============================================================`);
    console.log(`🎉 VERSÃO [${targetTag}] INSTALADA COM SUCESSO!`);
    console.log(`===============================================================\n`);
  } catch (err) {
    console.error(`\n❌ Falha durante a troca de versão: ${err.message}`);
  } finally {
    // Limpeza da pasta temporária
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {
      // Ignorar erros de limpeza
    }
  }
}

run();
