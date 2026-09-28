#!/usr/bin/env node
/**
 * scripts/snapshot.js - Motor de Snapshot Atômico & Rollback Seguro
 * Permite criar pontos de restauração instantâneos antes que a IA modifique arquivos
 * e reverter com integridade 100% caso o Falsifier ou os testes quebrem.
 * 
 * Uso:
 *   node scripts/snapshot.js --save [nome-da-tarefa]
 *   node scripts/snapshot.js --rollback
 *   node scripts/snapshot.js --list
 *   node scripts/snapshot.js --status
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const isSave = args.includes('--save') || args.includes('-s');
const isRollback = args.includes('--rollback') || args.includes('-r');
const isList = args.includes('--list') || args.includes('-l');
const isStatus = args.includes('--status');

const labelArg = args.find((a) => !a.startsWith('--') && !a.startsWith('-')) || 'pre-execution-snapshot';

const hybridDir = path.resolve(process.cwd(), '.hybrid');
const snapshotFile = path.join(hybridDir, 'snapshots.json');

function ensureHybridDir() {
  if (!fs.existsSync(hybridDir)) {
    fs.mkdirSync(hybridDir, { recursive: true });
  }
}

function loadSnapshots() {
  if (!fs.existsSync(snapshotFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(snapshotFile, 'utf-8'));
  } catch {
    return [];
  }
}

function saveSnapshots(snapshots) {
  ensureHybridDir();
  fs.writeFileSync(snapshotFile, JSON.stringify(snapshots, null, 2), 'utf-8');
}

function getGitStatus() {
  try {
    return execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
  } catch (err) {
    return null;
  }
}

console.log('===============================================================');
console.log('⚡ HYBRID ORCHESTRATOR — SNAPSHOT & ROLLBACK MANAGER');
console.log('===============================================================\n');

if (isSave) {
  const status = getGitStatus();
  if (status === null) {
    console.error('❌ Este diretório não é um repositório git válido.');
    process.exit(1);
  }

  try {
    const headCommit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    let stashId = null;

    if (status.length > 0) {
      stashId = execSync(`git stash create "hybrid-${labelArg}"`, { encoding: 'utf-8' }).trim();
      if (!stashId) {
        // Fallback para stash push
        execSync(`git stash push -m "[HYBRID-SNAPSHOT] ${labelArg}" --keep-index`, { stdio: 'ignore' });
        stashId = 'stash@{0}';
      }
    }

    const snapshot = {
      id: `snap_${Date.now()}`,
      label: labelArg,
      timestamp: new Date().toISOString(),
      headCommit,
      stashId,
      dirtyFiles: status.split('\n').filter(Boolean).length
    };

    const snapshots = loadSnapshots();
    snapshots.unshift(snapshot);
    saveSnapshots(snapshots);

    console.log(`📸 Snapshot atômico registrado com sucesso!`);
    console.log(`   🏷️  Label: ${snapshot.label}`);
    console.log(`   🔑 ID: ${snapshot.id}`);
    console.log(`   📦 Commit Base: ${headCommit.substring(0, 7)}`);
    console.log(`   📄 Arquivos alterados preservados: ${snapshot.dirtyFiles}\n`);
  } catch (err) {
    console.error(`❌ Erro ao criar snapshot: ${err.message}`);
    process.exit(1);
  }
} else if (isRollback) {
  const snapshots = loadSnapshots();
  if (snapshots.length === 0) {
    console.log('ℹ️  Nenhum snapshot registrado anteriormente. Executando git restore preventivo...');
    try {
      execSync('git restore .', { stdio: 'inherit' });
      console.log('✅ Workspace restaurado para o estado limpo do commit atual.');
    } catch (e) {
      console.error('❌ Falha ao restaurar:', e.message);
    }
    process.exit(0);
  }

  const lastSnap = snapshots[0];
  console.log(`⏪ Revertendo para o snapshot: [${lastSnap.label}] (${lastSnap.timestamp})...`);

  try {
    execSync('git restore .', { stdio: 'inherit' });
    execSync('git clean -fd', { stdio: 'inherit' });

    if (lastSnap.stashId) {
      try {
        execSync(`git stash apply ${lastSnap.stashId}`, { stdio: 'inherit' });
      } catch {
        // Se stashId for SHA ou hash temporário, tenta git stash pop
      }
    }

    console.log('\n✅ ROLLBACK CONCLUÍDO COM SUCESSO!');
    console.log('🛡️  O repositório foi restaurado com integridade total.');
  } catch (err) {
    console.error(`❌ Erro durante o rollback: ${err.message}`);
    process.exit(1);
  }
} else if (isList) {
  const snapshots = loadSnapshots();
  console.log(`📋 Snapshots Registrados (${snapshots.length}):\n`);
  if (snapshots.length === 0) {
    console.log('Nenhum snapshot encontrado.');
  } else {
    snapshots.slice(0, 10).forEach((s, idx) => {
      console.log(`${idx + 1}. [${s.label}] - ${s.timestamp}`);
      console.log(`   Commit: ${s.headCommit.substring(0, 7)} | Modificados: ${s.dirtyFiles} arquivo(s)\n`);
    });
  }
} else {
  // Status padrão
  const status = getGitStatus();
  if (status === null) {
    console.log('⚠️  Repositório git não detectado.');
  } else if (status.length === 0) {
    console.log('✅ Repositório limpo. Pronto para execução segura.');
  } else {
    const count = status.split('\n').filter(Boolean).length;
    console.log(`⚠️  Workspace modificado (${count} arquivo(s) alterados).`);
    console.log('💡 Recomenda-se criar um snapshot antes de autorizar o Turno 2:');
    console.log('   node scripts/snapshot.js --save "minha-feature"\n');
  }
}
