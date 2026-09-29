#!/usr/bin/env node
/**
 * scripts/hooks/post-write-lint.js
 * Hook PostToolUse para Antigravity: Executado após escrita ou substituição de arquivos.
 */

const fs = require('fs');

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf-8');
  } catch (e) {
    return '';
  }
}

// Consome payload silenciosamente
const inputStr = readStdin();

// O contrato PostToolUse do Antigravity requer um objeto JSON vazio como resposta na stdout
console.log(JSON.stringify({}));
process.exit(0);
