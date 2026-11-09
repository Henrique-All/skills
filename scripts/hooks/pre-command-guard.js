#!/usr/bin/env node
/**
 * scripts/hooks/pre-command-guard.js
 * Hook PreToolUse: Firewall determinístico de segurança de comandos no SO.
 * Intercepta comandos destrutivos antes de sua execução pelo agente.
 */

const fs = require('fs');

const SUPPORTED_TOOLS = new Set(['run_command', 'execute_command', 'bash']);

const CRITICAL_TARGETS = new Set([
  '/',
  '/*',
  '\\',
  '\\*',
  '.',
  './',
  './*',
  '.\\',
  '.\\*',
  '..',
  '../',
  '../*',
  '..\\',
  '..\\*',
  '*',
  '~',
  '~/',
  '~/*',
  '$home',
  '${home}',
  '$pwd',
  '${pwd}',
  '$env:userprofile',
  '$env:homedrive',
  'c:',
  'c:\\',
  'c:/',
  'c:\\*',
  'c:/*'
]);

function splitSubCommands(rawCmd) {
  const segments = [];
  // Extrai conteúdo de $(...) e `...`
  const subshellRegex = /\$\(([^)]+)\)|`([^`]+)`/g;
  let m;
  while ((m = subshellRegex.exec(rawCmd)) !== null) {
    segments.push(m[1] || m[2]);
  }
  const all = [rawCmd, ...segments];
  const out = [];
  for (const chunk of all) {
    const parts = chunk.split(/\s*(?:;|&&|\|\||\|+|\r?\n)\s*/);
    for (const p of parts) {
      const trimmed = p.trim();
      if (trimmed) out.push(trimmed);
    }
  }
  return out;
}

function stripSudoPrefix(subCmd) {
  let tokens = subCmd.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
  while (tokens.length > 0 && tokens[0].toLowerCase() === 'sudo') {
    tokens.shift();
    while (tokens.length > 0 && tokens[0].startsWith('-')) {
      const flag = tokens.shift();
      // -u <user>, -g <group>, -h <host>, -p <prompt>, -C <num> consomem argumento seguinte
      if (/^-[ughpC]$/.test(flag) && tokens.length > 0) {
        tokens.shift();
      }
    }
  }
  return tokens;
}

function cleanToken(tok) {
  return tok.replace(/^["']+|["']+$/g, '').trim().toLowerCase();
}

function isCriticalTarget(tok) {
  const cleaned = cleanToken(tok);
  if (CRITICAL_TARGETS.has(cleaned)) return true;
  if (/^[a-z]:[\\/](?:\*)?$/i.test(cleaned)) return true;
  return false;
}

function inspectSubCommand(subCmd) {
  const tokens = stripSudoPrefix(subCmd);
  if (tokens.length === 0) return null;

  const cmd = cleanToken(tokens[0]).replace(/^.*[/\\]/, '');
  const args = tokens.slice(1);

  // 1. rm (Unix / Git Bash)
  if (cmd === 'rm') {
    let hasRecursive = false;
    let hasForce = false;
    const targets = [];

    for (const arg of args) {
      const raw = arg.replace(/^["']+|["']+$/g, '');
      if (raw === '--recursive') {
        hasRecursive = true;
      } else if (raw === '--force') {
        hasForce = true;
      } else if (raw.startsWith('-') && !raw.startsWith('--') && raw.length > 1) {
        if (/r/i.test(raw)) hasRecursive = true;
        if (/f/i.test(raw)) hasForce = true;
      } else if (!raw.startsWith('-')) {
        targets.push(arg);
      }
    }

    if (hasRecursive && hasForce && targets.some(isCriticalTarget)) {
      return 'Exclusão recursiva forçada de diretório crítico (raiz, home ou workspace atual)';
    }
  }

  // 2. PowerShell Remove-Item / ri / del / erase
  if (['remove-item', 'ri', 'del', 'erase'].includes(cmd)) {
    let hasRecurse = false;
    let hasForce = false;
    const targets = [];

    for (const arg of args) {
      const lower = cleanToken(arg);
      if (/^-(?:recurse|r)$/i.test(lower)) {
        hasRecurse = true;
      } else if (/^-(?:force|fo)$/i.test(lower)) {
        hasForce = true;
      } else if (!lower.startsWith('-')) {
        targets.push(arg);
      }
    }

    if (hasRecurse && hasForce && targets.some(isCriticalTarget)) {
      return 'PowerShell Remove-Item recursivo forçado em caminho crítico';
    }
  }

  // 3. Windows cmd rmdir / rd (/s /q em qualquer ordem)
  if (cmd === 'rmdir' || cmd === 'rd') {
    const lowerArgs = args.map(cleanToken);
    const hasS = lowerArgs.some(a => a === '/s' || a === '-s' || a.includes('/s'));
    const hasQ = lowerArgs.some(a => a === '/q' || a === '-q' || a.includes('/q'));
    const targets = args.filter(a => !cleanToken(a).startsWith('/') && !cleanToken(a).startsWith('-'));
    if (hasS && hasQ && targets.some(isCriticalTarget)) {
      return 'Comando rmdir /s /q em unidade ou caminho crítico';
    }
  }

  // 4. git push --force / -f (avaliado isoladamente por subcomando)
  if (cmd === 'git' && cleanToken(args[0] || '') === 'push') {
    const pushArgs = args.slice(1).map(cleanToken);
    const hasSafeLease = pushArgs.some(a => a.startsWith('--force-with-lease') || a.startsWith('--force-if-includes'));
    const hasRawForce = pushArgs.some(a => a === '-f' || a === '--force' || /^-[a-z]*f[a-z]*$/.test(a));
    if (hasRawForce && !hasSafeLease) {
      return 'Git push --force puro bloqueado (use --force-with-lease se necessário)';
    }
  }

  // 5. Prisma migrate reset --force / -f
  if (/\bprisma\s+migrate\s+reset\b/i.test(subCmd) && /(?:\s--force\b|\s-f\b)/i.test(subCmd)) {
    return 'Reset forçado de banco de dados Prisma sem confirmação';
  }

  // 6. Drizzle-kit drop
  if (/\bdrizzle-kit\s+drop\b/i.test(subCmd)) {
    return 'Drop de tabelas via Drizzle Kit';
  }

  return null;
}

function evaluatePayload(payload) {
  const toolName = payload?.toolCall?.name || payload?.tool_name || '';
  const args = payload?.toolCall?.args || payload?.tool_input || {};
  const cmdLine = String(args.CommandLine || args.command || args.cmd || '');

  if (SUPPORTED_TOOLS.has(toolName) && cmdLine) {
    // Checagens globais independentes de subcomando (SQL DDL destrutivo e formatação de disco)
    const globalPatterns = [
      {
        regex: /\b(?:DROP\s+(?:TABLE|DATABASE)|TRUNCATE\s+TABLE)\b/i,
        reason: 'Operação SQL destrutiva detectada (DROP/TRUNCATE TABLE/DATABASE)'
      },
      {
        regex: /\b(?:format\s+[a-z]:|mkfs(?:\.[a-z0-9]+)?\s+)/i,
        reason: 'Formatação de disco/partição detectada'
      }
    ];

    for (const rule of globalPatterns) {
      if (rule.regex.test(cmdLine)) {
        return {
          decision: 'deny',
          reason: `🛑 [ENTERPRISE AI SUITE FIREWALL] Comando bloqueado por segurança: ${rule.reason}.\nComando interceptado: "${cmdLine}"\nSolicite confirmação explícita ao usuário antes de executar operações destrutivas.`
        };
      }
    }

    // Checagem por subcomando isolado (impede bypass via ;, &&, |, $(), sudo)
    const subCommands = splitSubCommands(cmdLine);
    for (const sub of subCommands) {
      const blockReason = inspectSubCommand(sub);
      if (blockReason) {
        return {
          decision: 'deny',
          reason: `🛑 [ENTERPRISE AI SUITE FIREWALL] Comando bloqueado por segurança: ${blockReason}.\nComando interceptado: "${cmdLine}"\nSolicite confirmação explícita ao usuário antes de executar operações destrutivas.`
        };
      }
    }
  }

  return { decision: 'allow' };
}

if (require.main === module) {
  try {
    const rawInput = fs.readFileSync(0, 'utf-8');
    if (!rawInput || !rawInput.trim()) {
      process.stdout.write(JSON.stringify({ decision: 'allow' }));
      process.exit(0);
    }

    const payload = JSON.parse(rawInput);
    const result = evaluatePayload(payload);
    process.stdout.write(JSON.stringify(result));
  } catch (err) {
    // Fallback gracioso em caso de payload inesperado
    process.stdout.write(JSON.stringify({ decision: 'allow' }));
  }
}

module.exports = { evaluatePayload, inspectSubCommand, splitSubCommands };
