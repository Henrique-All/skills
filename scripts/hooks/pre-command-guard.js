#!/usr/bin/env node
/**
 * scripts/hooks/pre-command-guard.js
 * Hook PreToolUse para Antigravity: Intercepta ferramentas antes da execução.
 * Bloqueia operações destrutivas ou arriscadas de terminal.
 */

const fs = require('fs');

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf-8');
  } catch (e) {
    return '';
  }
}

const inputStr = readStdin();
let payload = {};

try {
  if (inputStr.trim()) {
    payload = JSON.parse(inputStr);
  }
} catch (e) {
  // Se não for JSON válido, permite por segurança operacional
  console.log(JSON.stringify({ decision: 'allow' }));
  process.exit(0);
}

const toolCall = payload.toolCall || {};
const toolName = toolCall.name || '';
const args = toolCall.args || {};

// Só analisamos comandos de terminal
if (toolName === 'run_command' && args.CommandLine) {
  const cmd = args.CommandLine.trim();

  // 1. Padrões Terminantemente Proibidos (Hard Deny)
  const hardDenyPatterns = [
    /\bdrop\s+database\b/i,
    /\bdrop\s+table\b/i,
    /\btruncate\s+table\b/i,
    /\brm\s+(?:-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r|-r\s+-f|-f\s+-r)\b\s*(?:[\/\\]|~|\*(?:\s|$)|\.(?:\s|$)|\.\.(?:\s|$))/i,
    /\brmdir\s+\/s\s+\/q\s+[c-zC-Z]:\\/i,
    /\bremove-item\s+.*-recurse.*-force\s+([c-zC-Z]:\\|\/|~|\.(?:\s|$)|\*)/i,
    /\bgit\s+push\b(?=.*(?:\s--force\b|\s-f\b))(?!.*--force-with-lease)(?!.*--force-if-includes)/i,
    /\bprisma\s+migrate\s+reset\b.*--force/i,
    /\bdb\s+push\b.*--force-reset/i,
    /\bformat\s+[c-zC-Z]:/i,
    /\bmkfs\b/i,
  ];

  for (const pattern of hardDenyPatterns) {
    if (pattern.test(cmd)) {
      console.log(
        JSON.stringify({
          decision: 'deny',
          reason: `⛔ [Enterprise Suite Firewall] Operação destrutiva bloqueada: "${cmd}". Este comando viola a Regra 5 (operações destrutivas proibidas).`,
        })
      );
      process.exit(0);
    }
  }

  // 2. Padrões de Alto Impacto (Exigem Confirmação Forçada do Usuário)
  const forceAskPatterns = [
    /\bgit\s+reset\s+--hard\b/i,
    /\bgit\s+clean\s+-[a-zA-Z]*f/i,
    /\bdocker\s+system\s+prune\b/i,
    /\bnpx\s+rimraf\b/i,
  ];

  for (const pattern of forceAskPatterns) {
    if (pattern.test(cmd)) {
      console.log(
        JSON.stringify({
          decision: 'force_ask',
          reason: `⚠️ [Enterprise Suite Firewall] Comando de alto impacto detectado: "${cmd}". Requer aprovação explícita do desenvolvedor.`,
        })
      );
      process.exit(0);
    }
  }
}

// Permitir por padrão
console.log(JSON.stringify({ decision: 'allow' }));
process.exit(0);
