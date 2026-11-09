#!/usr/bin/env node
/**
 * scripts/hooks/pre-command-guard.js
 * Hook PreToolUse (Antigravity, Claude Code, Cursor):
 * Intercepta comandos de terminal antes da execução, desembrulha shells/wrappers
 * recursivamente e bloqueia operações destrutivas (best-effort defense-in-depth).
 */

const fs = require('fs');

const SUPPORTED_TOOLS = new Set([
  'run_command',
  'bash',
  'sh',
  'zsh',
  'powershell',
  'pwsh',
  'cmd',
  'run_terminal_cmd',
  'execute_command',
  'terminal'
]);

const WRAPPERS = new Set([
  'sudo',
  'doas',
  'env',
  'command',
  'builtin',
  'nohup',
  'time',
  'exec',
  'nice',
  'setsid',
  'stdbuf',
  'timeout',
  'xargs',
  'watch',
  'strace'
]);

// Flags de wrappers que consomem o próximo argumento (ex: sudo -u root, timeout -s 9 10, nice -n 5)
const WRAPPER_FLAGS_WITH_ARG = {
  sudo: new Set(['-u', '-g', '-C', '-D', '-R', '-T', '-h', '-p', '-r', '-t']),
  doas: new Set(['-u', '-C']),
  env: new Set(['-u', '-C', '-S']),
  nice: new Set(['-n']),
  timeout: new Set(['-k', '-s']),
  stdbuf: new Set(['-i', '-o', '-e']),
  xargs: new Set(['-I', '-L', '-n', '-P', '-d', '-a', '-E'])
};

const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh', 'ash', 'csh', 'tcsh']);
const PWSH = new Set(['powershell', 'pwsh', 'powershell.exe', 'pwsh.exe']);
const CMD_EXE = new Set(['cmd', 'cmd.exe']);
const LEADERS = new Set(['(', '{', '!', 'then', 'do', 'else', 'elif', 'if', 'while', 'until', 'case', 'time']);
const SQL_CLIENTS = new Set(['psql', 'mysql', 'mariadb', 'sqlite3', 'sqlcmd', 'mongosh', 'mongo', 'cockroach']);

function safeStr(val) {
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  return '';
}

/**
 * Divide uma linha de comando em subcomandos respeitando aspas simples, duplas e escapes.
 * Separadores reconhecidos fora de aspas: ;, &&, ||, |&, |, &, \r, \n
 */
function splitSubCommands(commandLine) {
  const src = safeStr(commandLine);
  const parts = [];
  let current = '';
  let quote = null;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];

    if (ch === '\\' && quote !== "'" && (next === '"' || next === "'" || next === '\\' || next === ' ')) {
      current += ch + next;
      i++;
      continue;
    }

    if (quote) {
      if (ch === quote) quote = null;
      current += ch;
      continue;
    }

    if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
      continue;
    }

    // Separadores de comando fora de aspas
    if (ch === ';' || ch === '\n' || ch === '\r') {
      if (current.trim()) parts.push(current.trim());
      current = '';
      continue;
    }

    if ((ch === '&' && next === '&') || (ch === '|' && next === '|') || (ch === '|' && next === '&')) {
      if (current.trim()) parts.push(current.trim());
      current = '';
      i++;
      continue;
    }

    if (ch === '|' || ch === '&') {
      // Ignora redirecionamentos de descritor como 2>&1 ou >&2
      const prev = i > 0 ? src[i - 1] : '';
      if (ch === '&' && (prev === '>' || prev === '<' || next === '>')) {
        current += ch;
        continue;
      }
      if (current.trim()) parts.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

/**
 * Tokeniza um subcomando preservando informação sobre aspas.
 */
function tokenize(subCommand) {
  const src = safeStr(subCommand).trim();
  const tokens = [];
  let raw = '';
  let text = '';
  let quote = null;
  let wasQuoted = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];

    if (ch === '\\' && quote !== "'" && (next === '"' || next === "'" || next === '\\' || next === ' ')) {
      raw += ch + next;
      text += next;
      i++;
      continue;
    }

    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        text += ch;
      }
      raw += ch;
      continue;
    }

    if (ch === "'" || ch === '"') {
      quote = ch;
      wasQuoted = true;
      raw += ch;
      continue;
    }

    if (/\s/.test(ch)) {
      if (raw.length > 0 || wasQuoted) {
        tokens.push({ raw, text, quoted: wasQuoted });
        raw = '';
        text = '';
        wasQuoted = false;
      }
      continue;
    }

    raw += ch;
    text += ch;
  }

  if (raw.length > 0 || wasQuoted) {
    tokens.push({ raw, text, quoted: wasQuoted });
  }

  return tokens;
}

function cleanToken(tok) {
  if (!tok) return '';
  const val = typeof tok === 'string' ? tok : tok.text;
  return safeStr(val).trim().toLowerCase();
}

function rawText(tok) {
  if (!tok) return '';
  return typeof tok === 'string' ? tok : safeStr(tok.text);
}

/**
 * Desembrulha recursivamente líderes de bloco, variáveis de ambiente inline,
 * wrappers (sudo, env, command, nohup, timeout, xargs...) e subshells (bash -c, powershell -Command, cmd /c, eval).
 */
function unwrap(tokens, depth = 0) {
  if (depth > 6 || !Array.isArray(tokens) || tokens.length === 0) return [tokens || []];

  const t = tokens.map((tok) => (typeof tok === 'string' ? { raw: tok, text: tok, quoted: false } : { ...tok }));

  while (t.length > 0) {
    // Remove parênteses/chaves colados no início ou fim do token: "(rm" -> "rm", "/)" -> "/"
    const strippedStart = t[0].text.replace(/^[({!]+/, '');
    if (strippedStart !== t[0].text) {
      t[0].text = strippedStart;
      t[0].raw = strippedStart;
      if (!strippedStart) {
        t.shift();
        continue;
      }
    }

    const lastIdx = t.length - 1;
    const strippedEnd = t[lastIdx].text.replace(/[)};]+$/, '');
    if (strippedEnd !== t[lastIdx].text && !t[lastIdx].quoted) {
      t[lastIdx].text = strippedEnd;
      t[lastIdx].raw = strippedEnd;
      if (!strippedEnd) {
        t.pop();
        continue;
      }
    }

    if (t.length === 0) break;
    const low = cleanToken(t[0]);

    // Líderes de bloco (then, do, if, {, ( ...) ou atribuição de variável (FOO=1)
    if (LEADERS.has(low) || (!t[0].quoted && /^[a-z_][a-z0-9_]*=/i.test(t[0].text))) {
      t.shift();
      continue;
    }

    // Wrappers de comando (sudo, env, command, nohup, timeout, nice, xargs...)
    const baseWrapper = low.replace(/^.*[/\\]/, '');
    if (WRAPPERS.has(baseWrapper)) {
      t.shift();
      const flagsWithArg = WRAPPER_FLAGS_WITH_ARG[baseWrapper] || new Set();
      while (t.length > 0) {
        const cur = t[0].text;
        if (cur === '--') {
          t.shift();
          break;
        }
        if ( baseWrapper === 'env' && /^[a-z_][a-z0-9_]*=/i.test(cur) ) {
          t.shift();
          continue;
        }
        if (cur.startsWith('-')) {
          t.shift();
          if (flagsWithArg.has(cur) && t.length > 0) {
            t.shift();
          }
          continue;
        }
        // timeout recebe a duração como primeiro argumento posicional após flags
        if (baseWrapper === 'timeout' && /^\d+(?:\.\d+)?[smhd]?$/i.test(cur)) {
          t.shift();
          break;
        }
        break;
      }
      continue;
    }

    break;
  }

  if (t.length === 0) return [];

  const cmd = cleanToken(t[0]).replace(/^.*[/\\]/, '');
  const rest = t.slice(1);
  const expandInner = (str) =>
    splitSubCommands(String(str || ''))
      .flatMap((sub) => unwrap(tokenize(sub), depth + 1));

  // bash -c "..." / sh -lc "..." / zsh -c "..."
  if (SHELLS.has(cmd)) {
    const idx = rest.findIndex((a) => /^-[a-z]*c$/i.test(a.text));
    if (idx >= 0 && rest[idx + 1]) {
      return expandInner(rest[idx + 1].text);
    }
  }

  // powershell -Command "..." / pwsh -c "..."
  if (PWSH.has(cmd)) {
    const idx = rest.findIndex((a) => /^-(?:c|co|com|comm|comma|comman|command)$/i.test(a.text));
    if (idx >= 0 && rest.length > idx + 1) {
      const innerStr = rest.slice(idx + 1).map((x) => x.text).join(' ');
      return expandInner(innerStr);
    }
    // powershell "Remove-Item ..." sem flag explícita -Command
    const firstPositionalIdx = rest.findIndex((a) => !a.text.startsWith('-'));
    if (firstPositionalIdx >= 0) {
      const innerStr = rest.slice(firstPositionalIdx).map((x) => x.text).join(' ');
      return expandInner(innerStr);
    }
  }

  // cmd /c "..." / cmd.exe /k "..."
  if (CMD_EXE.has(cmd)) {
    const idx = rest.findIndex((a) => /^\/[ck]$/i.test(a.text));
    if (idx >= 0 && rest.length > idx + 1) {
      const innerStr = rest.slice(idx + 1).map((x) => x.text).join(' ');
      return expandInner(innerStr);
    }
  }

  // eval "..."
  if (cmd === 'eval') {
    const innerStr = rest.map((x) => x.text).join(' ');
    return expandInner(innerStr);
  }

  return [t];
}

/**
 * Verifica se um caminho-alvo de deleção é crítico (raiz, diretórios do sistema, home ou wildcard amplo).
 */
function isCriticalTarget(rawTarget) {
  if (!rawTarget || typeof rawTarget !== 'string') return false;
  let p = rawTarget.trim().replace(/^["']|["']$/g, '');
  if (!p) return false;

  // Variáveis de ambiente de home/sistema
  if (/^(?:~|\$home|\$\{home\}|%userprofile%|%systemroot%|%windir%|%appdata%|%localappdata%)(?:[/\\].*)?$/i.test(p)) {
    return true;
  }

  // Normaliza barras múltiplas (ex: // -> /) e barras invertidas
  const norm = p.replace(/\\/g, '/').replace(/\/+/g, '/');
  if (norm === '/' || norm === '.' || norm === '..' || norm === '*' || norm === './*' || norm === '../*') {
    return true;
  }

  const trimmed = norm.replace(/\/+\.?$/, '') || '/';
  if (trimmed === '/' || trimmed === '.' || trimmed === '..') {
    return true;
  }

  // Drives Windows (C:, C:/, C:/*, C:/Windows, C:/Users, D:/...)
  if (/^[a-z]:(?:\/?\*)?$/i.test(trimmed)) return true;
  if (/^[a-z]:\/(?:windows|users|program files|program files \(x86\)|programdata|system32)(?:\/.*)?$/i.test(trimmed)) {
    return true;
  }

  // Diretórios críticos Unix/Linux/macOS
  if (/^\/(?:etc|usr|var|bin|sbin|lib|lib64|boot|home|root|users|dev|proc|sys|opt|system|library|applications)(?:\/.*)?$/i.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Verifica abreviações de parâmetros do PowerShell (ex: -r, -rec, -recurse / -f, -fo, -force).
 */
function isPwshParamPrefix(tokenText, fullParamName, minChars = 1) {
  if (typeof tokenText !== 'string' || typeof fullParamName !== 'string') return false;
  const m = tokenText.match(/^-([a-z]+)$/i);
  if (!m) return false;
  const sub = m[1].toLowerCase();
  return sub.length >= minChars && fullParamName.toLowerCase().startsWith(sub);
}

/**
 * Inspeciona uma lista de tokens já desembrulhados.
 * Retorna { decision: 'deny' | 'force_ask' | 'allow', reason?: string }
 */
function inspectTokens(tokens, originalCmd) {
  if (!tokens || tokens.length === 0) return { decision: 'allow' };

  const cmd = cleanToken(tokens[0]).replace(/^.*[/\\]/, '');
  const args = tokens.slice(1);
  const argTexts = args.map((a) => rawText(a));
  const lowerArgs = argTexts.map((a) => a.toLowerCase());

  // 1. SQL Destrutivo: apenas quando o comando é um SQL client OU começa diretamente por DROP/TRUNCATE
  const fullUnquoted = tokens.filter((t) => !t.quoted).map((t) => t.text).join(' ');
  const allJoined = tokens.map((t) => t.text).join(' ');
  const sqlDestructiveRx = /\b(?:drop\s+(?:database|table|schema)|truncate\s+table)\b/i;

  if ((cmd === 'drop' || cmd === 'truncate') && sqlDestructiveRx.test(fullUnquoted)) {
    return {
      decision: 'deny',
      reason: `⛔ [Enterprise Suite Firewall] Operação SQL destrutiva bloqueada: "${originalCmd}".`
    };
  }
  if (SQL_CLIENTS.has(cmd) && sqlDestructiveRx.test(allJoined)) {
    return {
      decision: 'deny',
      reason: `⛔ [Enterprise Suite Firewall] Comando SQL destrutivo via ${cmd} bloqueado: "${originalCmd}".`
    };
  }

  // 2. Unix rm
  if (cmd === 'rm') {
    let hasRecursive = false;
    let hasForce = false;
    let hasNoPreserveRoot = false;
    const targets = [];

    for (const a of argTexts) {
      if (a === '--recursive') hasRecursive = true;
      else if (a === '--force') hasForce = true;
      else if (a === '--no-preserve-root') hasNoPreserveRoot = true;
      else if (/^-[a-zA-Z]+$/.test(a)) {
        if (/r/i.test(a)) hasRecursive = true;
        if (/f/i.test(a)) hasForce = true;
      } else if (!a.startsWith('-')) {
        targets.push(a);
      }
    }

    if (hasNoPreserveRoot || ((hasRecursive || hasForce) && targets.some(isCriticalTarget))) {
      return {
        decision: 'deny',
        reason: `⛔ [Enterprise Suite Firewall] Deleção recursiva/forçada em caminho crítico bloqueada: "${originalCmd}".`
      };
    }
  }

  // 3. PowerShell Remove-Item (e aliases ri, rm, rmdir, del, erase, rd)
  const isPwshRemove =
    cmd === 'remove-item' ||
    cmd === 'ri' ||
    (cmd === 'del' || cmd === 'erase' || cmd === 'rd' || cmd === 'rmdir' || cmd === 'rm');

  if (isPwshRemove) {
    let hasRecurse = false;
    let hasForce = false;
    let cmdSlashS = false;
    let cmdSlashQOrF = false;
    const targets = [];

    for (let i = 0; i < argTexts.length; i++) {
      const a = argTexts[i];
      if (isPwshParamPrefix(a, 'recurse', 1)) {
        hasRecurse = true;
      } else if (isPwshParamPrefix(a, 'force', 1)) {
        hasForce = true;
      } else if (isPwshParamPrefix(a, 'path', 1) || isPwshParamPrefix(a, 'literalpath', 1)) {
        if (argTexts[i + 1]) {
          targets.push(argTexts[i + 1]);
          i++;
        }
      } else if (/^\/s$/i.test(a)) {
        cmdSlashS = true;
      } else if (/^\/[qf]$/i.test(a)) {
        cmdSlashQOrF = true;
      } else if (!a.startsWith('-') && !a.startsWith('/')) {
        targets.push(a);
      } else if (a.startsWith('/') && a.length > 2) {
        // Caminho Unix começando com / (ex: /etc, /home)
        targets.push(a);
      } else if (a === '/' || a === '//') {
        targets.push(a);
      }
    }

    if ((hasRecurse && hasForce && targets.some(isCriticalTarget)) || ((cmdSlashS || cmdSlashQOrF) && targets.some(isCriticalTarget))) {
      return {
        decision: 'deny',
        reason: `⛔ [Enterprise Suite Firewall] Deleção de caminho crítico do sistema bloqueada: "${originalCmd}".`
      };
    }
  }

  // 4. Git (ignorando flags globais como -C <dir>, -c <k=v>, --git-dir <dir>)
  if (cmd === 'git') {
    const gitGlobalWithArg = new Set(['-c', '-C', '--git-dir', '--work-tree', '--namespace', '--exec-path', '--config-env']);
    let subIdx = -1;
    for (let i = 0; i < argTexts.length; i++) {
      const a = argTexts[i];
      if (gitGlobalWithArg.has(a)) {
        i++; // pula o valor da flag global
        continue;
      }
      if (a.startsWith('-')) continue;
      subIdx = i;
      break;
    }

    if (subIdx >= 0) {
      const gitSub = argTexts[subIdx].toLowerCase();
      const subArgs = argTexts.slice(subIdx + 1);

      if (gitSub === 'push') {
        const hasForceFlag = subArgs.some((a) => a === '--force' || a === '-f' || /^-[a-zA-Z]*f$/.test(a));
        const hasForceWithLease = subArgs.some((a) => a.startsWith('--force-with-lease') || a.startsWith('--force-if-includes'));
        const hasPlusRefspec = subArgs.some((a) => !a.startsWith('-') && /^\+[a-zA-Z0-9_./-]+/.test(a));
        const hasDeleteBranch = subArgs.some((a) => a === '--delete' || a === '-d' || (!a.startsWith('-') && /^:[a-zA-Z0-9_./-]+$/.test(a)));

        if (hasForceFlag || hasPlusRefspec || hasDeleteBranch) {
          if (hasForceWithLease && !hasForceFlag && !hasPlusRefspec && !hasDeleteBranch) {
            return { decision: 'allow' };
          }
          return {
            decision: 'deny',
            reason: `⛔ [Enterprise Suite Firewall] Git force/delete push bloqueado: "${originalCmd}". Utilize --force-with-lease.`
          };
        }
      }

      if (gitSub === 'reset' && subArgs.includes('--hard')) {
        return {
          decision: 'force_ask',
          reason: `⚠️ [Enterprise Suite Firewall] "git reset --hard" detectado: "${originalCmd}". Requer confirmação explícita.`
        };
      }

      if (gitSub === 'clean' && subArgs.some((a) => /^-[a-zA-Z]*f/.test(a) || a === '--force')) {
        return {
          decision: 'force_ask',
          reason: `⚠️ [Enterprise Suite Firewall] "git clean -f" detectado: "${originalCmd}". Requer confirmação explícita.`
        };
      }
    }
  }

  // 5. Prisma (direto ou via npx/pnpm/yarn/bunx)
  const isPrismaDirect = cmd === 'prisma';
  const isPkgRunnerPrisma =
    (cmd === 'npx' || cmd === 'pnpm' || cmd === 'yarn' || cmd === 'bunx') &&
    lowerArgs.includes('prisma');

  if (isPrismaDirect || isPkgRunnerPrisma) {
    const joined = lowerArgs.join(' ');
    if (
      /\bmigrate\s+reset\b/.test(joined) ||
      (/\bdb\s+push\b/.test(joined) && (lowerArgs.includes('--force-reset') || lowerArgs.includes('--accept-data-loss')))
    ) {
      return {
        decision: 'deny',
        reason: `⛔ [Enterprise Suite Firewall] Reset ou perda de dados Prisma bloqueada: "${originalCmd}".`
      };
    }
    if (/\bdb\s+execute\b/.test(joined) && sqlDestructiveRx.test(allJoined)) {
      return {
        decision: 'deny',
        reason: `⛔ [Enterprise Suite Firewall] Execução SQL destrutiva via Prisma bloqueada: "${originalCmd}".`
      };
    }
  }

  // 6. Formatação de disco e escrita direta em bloco (format, mkfs, dd)
  if (cmd === 'format' && argTexts.some((a) => /^[a-zA-Z]:$/.test(a))) {
    return {
      decision: 'deny',
      reason: `⛔ [Enterprise Suite Firewall] Formatação de unidade bloqueada: "${originalCmd}".`
    };
  }
  if (/^mkfs(?:\.[a-z0-9]+)?$/i.test(cmd)) {
    return {
      decision: 'deny',
      reason: `⛔ [Enterprise Suite Firewall] Formatação de sistema de arquivos (${cmd}) bloqueada: "${originalCmd}".`
    };
  }
  if (cmd === 'dd' && argTexts.some((a) => /^of=\/dev\/(?:sd|nvme|vd|hd|disk|loop|mapper)/i.test(a))) {
    return {
      decision: 'deny',
      reason: `⛔ [Enterprise Suite Firewall] Escrita direta em dispositivo de bloco via dd bloqueada: "${originalCmd}".`
    };
  }

  // 7. Alto impacto (force_ask): docker system prune, rimraf
  if (cmd === 'docker' && lowerArgs[0] === 'system' && lowerArgs[1] === 'prune') {
    return {
      decision: 'force_ask',
      reason: `⚠️ [Enterprise Suite Firewall] "docker system prune" detectado: "${originalCmd}". Requer aprovação explícita.`
    };
  }
  if (cmd === 'rimraf' || ((cmd === 'npx' || cmd === 'pnpm' || cmd === 'yarn') && lowerArgs.includes('rimraf'))) {
    if (argTexts.some(isCriticalTarget)) {
      return {
        decision: 'deny',
        reason: `⛔ [Enterprise Suite Firewall] Deleção de caminho crítico via rimraf bloqueada: "${originalCmd}".`
      };
    }
    return {
      decision: 'force_ask',
      reason: `⚠️ [Enterprise Suite Firewall] Comando rimraf detectado: "${originalCmd}". Requer aprovação explícita.`
    };
  }

  return { decision: 'allow' };
}

/**
 * Avalia uma linha de comando completa dividindo e desembrulhando todos os subcomandos.
 */
function evaluateCommand(commandLine) {
  const cmdStr = safeStr(commandLine).trim();
  if (!cmdStr) return { decision: 'allow' };

  const subCommands = splitSubCommands(cmdStr);
  let askResult = null;

  for (const sub of subCommands) {
    const unwrappedList = unwrap(tokenize(sub), 0);
    for (const tokenGroup of unwrappedList) {
      const res = inspectTokens(tokenGroup, cmdStr);
      if (res.decision === 'deny') return res;
      if (res.decision === 'force_ask' && !askResult) askResult = res;
    }
  }

  return askResult || { decision: 'allow' };
}

/**
 * Extrai nome da ferramenta e linha de comando de payloads do Antigravity, Claude Code e Cursor.
 */
function extractToolAndCommand(payload) {
  if (!payload || typeof payload !== 'object') return { toolName: '', command: '' };

  const toolCall = payload.toolCall && typeof payload.toolCall === 'object' ? payload.toolCall : {};
  const toolName = safeStr(
    toolCall.name || payload.tool_name || payload.toolName || ''
  ).trim().toLowerCase();

  const rawArgs = toolCall.args || payload.tool_input || payload.toolInput || payload.input;
  const args = rawArgs && typeof rawArgs === 'object' ? rawArgs : {};
  const command = safeStr(
    args.CommandLine || args.command || args.cmd || args.script || ''
  );

  return { toolName, command };
}

/**
 * Formata resposta compatível com o agente chamador:
 * - Antigravity usa protojson estrito (aceita apenas { decision, reason }, rejeitando campos desconhecidos como hookSpecificOutput).
 * - Claude Code envia payload.tool_name (snake_case) e espera hookSpecificOutput.permissionDecision.
 */
function buildOutput(result, isClaudeCode = false) {
  const decision = result.decision || 'allow';
  if (isClaudeCode) {
    const permissionDecision = decision === 'force_ask' ? 'ask' : decision;
    return {
      decision,
      ...(result.reason ? { reason: result.reason } : {}),
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision,
        ...(result.reason ? { permissionDecisionReason: result.reason } : {})
      }
    };
  }
  const out = { decision };
  if (result.reason) {
    out.reason = result.reason;
  }
  return out;
}

function handlePayload(payload) {
  const isClaudeCode = Boolean(payload && typeof payload === 'object' && payload.tool_name && !payload.toolCall);
  const { toolName, command } = extractToolAndCommand(payload);
  if (!toolName || !SUPPORTED_TOOLS.has(toolName) || !command.trim()) {
    return buildOutput({ decision: 'allow' }, isClaudeCode);
  }
  try {
    const evalResult = evaluateCommand(command);
    return buildOutput(evalResult, isClaudeCode);
  } catch (err) {
    // Fail-closed: se havia um comando de terminal e o parser lançou exceção, nega por segurança
    process.stderr.write(`[Enterprise Suite Firewall Error] ${err.message}\n`);
    return buildOutput({
      decision: 'deny',
      reason: `⛔ [Enterprise Suite Firewall] Falha interna ao inspecionar comando (fail-closed): ${err.message}`
    }, isClaudeCode);
  }
}

if (require.main === module) {
  let inputStr = '';
  try {
    inputStr = fs.readFileSync(0, 'utf-8');
  } catch {
    inputStr = '';
  }

  if (!inputStr.trim()) {
    process.stdout.write(JSON.stringify(buildOutput({ decision: 'allow' })) + '\n');
    process.exit(0);
  }

  let payload;
  try {
    payload = JSON.parse(inputStr);
  } catch (err) {
    process.stderr.write(`[Enterprise Suite Firewall] Payload JSON inválido: ${err.message}\n`);
    process.stdout.write(JSON.stringify(buildOutput({ decision: 'allow' })) + '\n');
    process.exit(0);
  }

  const output = handlePayload(payload);
  if (output.decision === 'deny' && output.reason) {
    process.stderr.write(output.reason + '\n');
  }
  process.stdout.write(JSON.stringify(output) + '\n');
  process.exit(0);
}

module.exports = {
  splitSubCommands,
  tokenize,
  unwrap,
  isCriticalTarget,
  evaluateCommand,
  extractToolAndCommand,
  handlePayload
};
