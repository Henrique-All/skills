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
    /drop\s+database/i,
    /drop\s+table/i,
    /truncate\s+table/i,
    /rm\s+-rf\s+[\/\\]/i,
    /rm\s+-rf\s+~/i,
    /rmdir\s+\/s\s+\/q\s+[c-zC-Z]:\\/i,
    /git\s+push\s+.*--force/i,
    /git\s+push\s+.*-f\b/i,
    /prisma\s+migrate\s+reset\s+--force/i,
    /db\s+push\s+--force-reset/i,
    /format\s+[c-zC-Z]:/i,
    /mkfs\b/i,
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
    /git\s+reset\s+--hard/i,
    /git\s+clean\s+-fd/i,
    /docker\s+system\s+prune/i,
    /npx\s+rimraf/i,
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
