#!/usr/bin/env node
/**
 * bin/orch.js
 * CLI Master do Enterprise AI Suite (v2.2.0)
 * Permite acionar diagnósticos, inicialização de projetos, cockpit visual e trocas de versão.
 */

const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const command = args[0] || 'help';

const commands = {
  doctor: path.join(rootDir, 'scripts', 'doctor.js'),
  init: path.join(rootDir, 'scripts', 'init.js'),
  cockpit: path.join(rootDir, 'scripts', 'cockpit.js'),
  switch: path.join(rootDir, 'scripts', 'switch-version.js'),
  test: path.join(rootDir, 'scripts', 'test-all.js'),
  audit: path.join(rootDir, 'security-audit', 'scripts', 'audit.js')
};

function printHelp() {
  console.log(`
⚡ ENTERPRISE AI SUITE — CLI MASTER (v2.2.0)

Uso:
  orch <comando> [opções]
  node bin/orch.js <comando> [opções]

Comandos Disponíveis:
  🩺 doctor            Executa diagnóstico completo de ambiente e subagentes
  ⚙️  init              Inicializa e calibra o projeto detectando a stack
  🖥️  cockpit           Abre a central gráfica unificada no navegador
  🔄 switch [versao]   Troca a versão da suite sem precisar clonar via git
  🧪 test              Roda a bateria de testes automatizados do ecossistema
  🔒 audit             Executa a auditoria DevSecOps dos 18 pilares OWASP

Exemplos:
  orch doctor
  orch init --force
  orch cockpit --port=3456
  orch switch v2.2.0-beta.1
`);
}

if (command === 'help' || command === '--help' || command === '-h') {
  printHelp();
  process.exit(0);
}

const targetScript = commands[command];

if (!targetScript) {
  console.error(`❌ Comando desconhecido: "${command}"\n`);
  printHelp();
  process.exit(1);
}

const subArgs = args.slice(1);
const child = spawn(process.execPath, [targetScript, ...subArgs], {
  stdio: 'inherit',
  cwd: process.cwd()
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
