#!/usr/bin/env node
/**
 * scripts/hooks/post-edit-cartography.js
 * Hook PostToolUse silencioso (Zero Intromissão no Chat / Zero Tokens).
 * Sempre que a IA cria ou edita arquivos (write_to_file, replace_file_content, multi_replace_file_content)
 * em um projeto que possui .code-map/, atualiza automaticamente .code-map/graph.json e .code-map/INDEX.md.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf-8');
  } catch {
    return '';
  }
}

const inputStr = readStdin();
let payload = {};
try {
  if (inputStr.trim()) {
    payload = JSON.parse(inputStr);
  }
} catch {
  console.log(JSON.stringify({}));
  process.exit(0);
}

try {
  const workspacePaths = Array.isArray(payload.workspacePaths) ? payload.workspacePaths : [];
  const projectDir = workspacePaths[0] || process.cwd();
  const codeMapDir = path.join(projectDir, '.code-map');

  // Só reindexa se o projeto já utiliza cartografia (.code-map/)
  if (fs.existsSync(codeMapDir)) {
    const cartCandidates = [
      path.resolve(__dirname, '..', '..', 'repo-cartographer', 'scripts', 'cartographer.js'),
      path.resolve(__dirname, '..', '..', 'skills', 'repo-cartographer', 'scripts', 'cartographer.js')
    ];
    const cartScript = cartCandidates.find((c) => fs.existsSync(c));
    if (cartScript) {
      execSync(`node "${cartScript}" init "${projectDir}"`, {
        cwd: projectDir,
        stdio: 'ignore',
        timeout: 8000
      });
    }
  }
} catch {
  // Falha silenciosa para nunca interromper o fluxo do agente
}

// PostToolUse exige retorno de objeto JSON vazio {} (zero mensagens no chat)
console.log(JSON.stringify({}));
process.exit(0);
