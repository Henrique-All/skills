#!/usr/bin/env node
/**
 * scripts/falsify.js - Runner Automatizado do Falsifier Adversário (v2.7.0)
 * Testa ativamente se a implementação do Builder resiste aos 8 vetores de estresse:
 * 1. Consultas N+1 em loops assíncronos (ORM / DB)
 * 2. Inputs nulos, vazios e maliciosos (Boundary Checks)        -> avaliado POR FUNÇÃO/ROTA
 * 3. Timeouts e falhas de rede em chamadas externas
 * 4. Transações de banco e atomicidade em mutações múltiplas     -> avaliado POR FUNÇÃO/ROTA
 * 5. Bloqueio de Event Loop em I/O síncrono em servidores
 * 6. Condição de Corrida Read-Modify-Write (Lost Update / Double-Spend)
 * 7. Vazamento de Memória e Listeners Órfãos em useEffect
 * 8. Exceções Engolidas Silenciosamente (Empty Catch Block)
 *
 * Uso:
 *   node scripts/falsify.js [caminho-ou-arquivo] [--strict] [--json]
 *                           [--changed] [--baseline[=arquivo]] [--update-baseline] [--sarif[=arquivo]]
 *
 * Supressão inline (motivo obrigatório):
 *   // audit-ignore-next-line LOST_UPDATE_RACE_CONDITION: saldo protegido por lock distribuído no gateway
 */

const fs = require('fs');
const path = require('path');
const core = require('./lib/suite-core');

const FALSIFY_VERSION = '2.7.0';
const argv = process.argv.slice(2);
const cleanArgs = argv.filter((a) => !a.startsWith('--'));
const targetPath = cleanArgs[0] || '.';
const isStrict = argv.includes('--strict');
const isJson = argv.includes('--json');
const commonOpts = core.parseCommonArgs(argv);
const isSarifStdout = commonOpts.sarif === true;
const quiet = isJson || Boolean(commonOpts.sarif);

if (!quiet) {
  console.log('===============================================================');
  console.log('🧪 HYBRID ORCHESTRATOR — ADVERSARIAL FALSIFIER RUNNER (8 VETORES)');
  console.log('===============================================================');
  console.log(`🎯 Alvo do Ataque: ${targetPath}\n`);
}

function findLineNumber(content, regex, baseLine = 1) {
  const m = regex.exec(content);
  if (!m || typeof m.index !== 'number') return baseLine;
  return baseLine + content.slice(0, m.index).split('\n').length - 1;
}

const VALIDATION_MARKERS = /\.(?:parse|safeParse|parseAsync|validate|validateSync)\s*\(|\bif\s*\(\s*!|\bz\.|\bzod\b|[Ss]chema\b|\bJoi\.|\byup\.|ValidationPipe|class-validator|typeof\s+\w+(?:\.\w+)*\s*[!=]==/;
const TRANSACTION_MARKERS = /\$transaction|\.transaction\s*\(|beginTransaction|\bCOMMIT\b|startSession|withTransaction/;
const ORM_MUTATION_REGEX = /(?:prisma\.\w+|db(?:\.\w+)?|tx(?:\.\w+)?|manager(?:\.\w+)?|\b\w*(?:Repo|Repository|Model|Dao))\s*\.\s*(?:create|createMany|update|updateMany|upsert|delete|deleteMany|insert|save|destroy)\s*\(/g;
const SQL_MUTATION_REGEX = /\b(?:INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b/gi;

const attacks = [
  {
    id: 'N_PLUS_ONE_LOOP',
    severity: 'HIGH',
    name: 'Vetor 1: Detecção de Consultas N+1 em Loops Assíncronos',
    check: (content) => {
      const loopAwaitRegex = /(?:for\s*\([^)]+\)|for\s+await|\.map\(async|\.forEach\(async)[^}]*await\s+(?:prisma|db|repository|Model|query|find|select)/s;
      if (loopAwaitRegex.test(content)) {
        return [{
          line: findLineNumber(content, loopAwaitRegex),
          message: 'Possível query N+1 detectada: await em loop de banco. Utilize batching (findMany com "in") ou DataLoader.'
        }];
      }
      return [];
    }
  },
  {
    id: 'UNVALIDATED_PAYLOAD_BOUNDARY',
    severity: 'HIGH',
    name: 'Vetor 2: Tratamento de Inputs Nulos e Indefinidos (Boundary Checks)',
    // Escopo POR FUNÇÃO: uma validação em outra rota do mesmo arquivo não mascara esta.
    check: (content) => {
      const issues = [];
      for (const block of core.splitHandlers(content)) {
        if (block.isPreamble) continue;
        const usesInput = /req\.body\b|req\.params\.|req\.query\.|await\s+request\.json\s*\(/.test(block.text);
        if (!usesInput) continue;
        if (VALIDATION_MARKERS.test(block.text)) continue;
        issues.push({
          line: findLineNumber(block.text, /req\.(?:body|params\.|query\.)|request\.json/, block.startLine),
          message: 'Falta de validação de payload nesta função/rota: inputs consumidos sem schema (zod/Joi/yup) ou checagem de nulidade.'
        });
      }
      return issues;
    }
  },
  {
    id: 'EXTERNAL_HTTP_NO_TIMEOUT',
    severity: 'MEDIUM',
    name: 'Vetor 3: Falta de Timeout em Requisições Externas',
    check: (content) => {
      const httpRegex = /\bfetch\s*\(|\baxios\.(?:get|post|put|delete|patch|request)\s*\(/;
      if (
        httpRegex.test(content) &&
        !content.includes('timeout') &&
        !content.includes('AbortController') &&
        !content.includes('signal')
      ) {
        return [{
          line: findLineNumber(content, httpRegex),
          message: 'Chamadas HTTP externas sem timeout configurado: risco de deadlock em falha de rede.'
        }];
      }
      return [];
    }
  },
  {
    id: 'NON_ATOMIC_MULTI_MUTATION',
    severity: 'HIGH',
    name: 'Vetor 4: Atomicidade e Transações em Operações Múltiplas',
    // Escopo POR FUNÇÃO: duas funções com 1 escrita cada não são "operação múltipla".
    check: (content) => {
      const issues = [];
      for (const block of core.splitHandlers(content)) {
        if (block.isPreamble) continue;
        const ormCount = (block.text.match(ORM_MUTATION_REGEX) || []).length;
        const sqlCount = (block.text.match(SQL_MUTATION_REGEX) || []).length;
        const dbMutations = ormCount + sqlCount;
        if (dbMutations > 1 && !TRANSACTION_MARKERS.test(block.text)) {
          issues.push({
            line: block.startLine,
            message: `Função com ${dbMutations} escritas no banco sem bloco de transação. Risco de estado inconsistente em caso de erro intermediário.`
          });
        }
      }
      return issues;
    }
  },
  {
    id: 'SYNC_IO_EVENT_LOOP_BLOCK',
    severity: 'MEDIUM',
    name: 'Vetor 5: Bloqueio de Event Loop em I/O Síncrono',
    check: (content, filePath) => {
      const isServerHandler = /(?:req\s*,\s*res|NextRequest|@Controller|router\.(?:get|post|put|delete|patch)|app\.(?:get|post|put|delete|patch)|fastify\.|socket\.on\()/i.test(content);
      if (isServerHandler && !core.isCliOrTest(filePath, content) && (content.includes('fs.readFileSync') || content.includes('fs.writeFileSync'))) {
        return [{
          line: findLineNumber(content, /fs\.(?:readFileSync|writeFileSync)/),
          message: 'Uso de operações de disco síncronas (fs.*Sync) em rota/handler de servidor. Risco de degradação sob carga concorrente.'
        }];
      }
      return [];
    }
  },
  {
    id: 'LOST_UPDATE_RACE_CONDITION',
    severity: 'CRITICAL',
    name: 'Vetor 6: Condição de Corrida Read-Modify-Write (Lost Update / Double-Spend)',
    check: (content) => {
      const rmwRegex = /await\s+(?:prisma\.\w+|db\.\w+|\w+Repo(?:sitory)?)\.(?:findUnique|findFirst|findById)\s*\([\s\S]{1,450}?await\s+(?:prisma\.\w+|db\.\w+|\w+Repo(?:sitory)?)\.update\s*\(\s*\{[\s\S]{1,300}?\b(?:balance|saldo|credits|stock|estoque|quantity|amount)\s*:\s*\w+\.(?:balance|saldo|credits|stock|estoque|quantity|amount)\s*[+-]/i;
      if (
        rmwRegex.test(content) &&
        !/(?:increment\s*:|decrement\s*:|\$transaction|FOR\s+UPDATE|version\s*:)/i.test(content)
      ) {
        return [{
          line: findLineNumber(content, rmwRegex),
          message: 'Padrão Read-Modify-Write não-atômico em saldo/estoque detectado (Lost Update / Double-Spend). Use { increment / decrement }, lock pessimista (SELECT ... FOR UPDATE) ou controle de concorrência otimista (version).'
        }];
      }
      return [];
    }
  },
  {
    id: 'EFFECT_MEMORY_LEAK',
    severity: 'MEDIUM',
    name: 'Vetor 7: Vazamento de Memória e Listeners Órfãos em Effects',
    check: (content) => {
      const issues = [];
      const effectRx = /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[[^\]]*\]\s*\)/g;
      let m;
      while ((m = effectRx.exec(content)) !== null) {
        const block = m[0];
        const hasSubscription = /\b(?:addEventListener|setInterval|new\s+IntersectionObserver|new\s+ResizeObserver|new\s+MutationObserver)\s*\(/.test(block);
        const hasCleanup = /return\s+(?:\(\s*\)\s*=>|function)|removeEventListener|clearInterval|\.disconnect\s*\(/.test(block);
        if (hasSubscription && !hasCleanup) {
          issues.push({
            line: content.slice(0, m.index).split('\n').length,
            message: 'useEffect registra listener/timer/observer sem função de cleanup no return. Risco de memory leak e handlers duplicados.'
          });
        }
      }
      return issues;
    }
  },
  {
    id: 'SWALLOWED_EXCEPTION',
    severity: 'MEDIUM',
    name: 'Vetor 8: Exceção Engolida Silenciosamente (Empty Catch Block)',
    check: (content, filePath) => {
      if (core.isCliOrTest(filePath, content)) return [];
      const emptyCatchRegex = /catch\s*(?:\([^)]*\))?\s*\{\s*(?:\/\/[^\n]*\s*)*\}/g;
      const issues = [];
      let m;
      while ((m = emptyCatchRegex.exec(content)) !== null) {
        issues.push({
          line: content.slice(0, m.index).split('\n').length,
          message: 'Bloco catch vazio engole exceção silenciosamente sem log estruturado, rethrow ou retorno de erro explícito.'
        });
      }
      return issues;
    }
  }
];

function collectFiles(target) {
  const abs = path.resolve(process.cwd(), target);
  if (!fs.existsSync(abs)) return [];
  if (!fs.statSync(abs).isDirectory()) return [abs];
  return core.walkFiles(abs, { extensions: /\.(?:ts|tsx|js|jsx|mjs|cjs)$/ });
}

const files = collectFiles(targetPath);
const rawFindings = [];

files.forEach((file) => {
  const rel = path.relative(process.cwd(), file).replace(/\\/g, '/');
  let content = '';
  try { content = fs.readFileSync(file, 'utf-8'); } catch { return; }

  attacks.forEach((attack) => {
    const issues = attack.check(content, file) || [];
    issues.forEach((issue) => {
      rawFindings.push({
        file: rel,
        line: issue.line || 1,
        rule: attack.id,
        vector: attack.name,
        severity: attack.severity,
        message: issue.message
      });
    });
  });
});

// Núcleo comum: --changed, supressão inline com motivo, baseline e SARIF
const processed = core.postProcess(rawFindings, {
  projectDir: process.cwd(),
  toolName: 'falsifier',
  version: FALSIFY_VERSION,
  argv
});
const findings = processed.findings;
const vulnerabilitiesFound = findings.length;

if (commonOpts.sarif) {
  if (isSarifStdout) console.log(JSON.stringify(processed.meta.sarif, null, 2));
  process.exit(vulnerabilitiesFound > 0 && isStrict ? 1 : 0);
}

if (isJson) {
  console.log(
    JSON.stringify(
      {
        version: FALSIFY_VERSION,
        targetPath,
        passed: vulnerabilitiesFound === 0,
        vectorsFailed: vulnerabilitiesFound,
        suppressed: processed.meta.suppressed.length,
        baselined: processed.meta.baselined,
        findings
      },
      null,
      2
    )
  );
  process.exit(vulnerabilitiesFound > 0 && isStrict ? 1 : 0);
}

findings.forEach((f) => {
  console.log(`💥 [FALSIFIER FALHOU] ${f.file}:${f.line}`);
  console.log(`   🏷️  ${f.vector}`);
  console.log(`   💡 Diagnóstico: ${f.message}\n`);
});

console.log('---------------------------------------------------------------');
if (processed.meta.suppressed.length > 0) {
  console.log(`🔕 ${processed.meta.suppressed.length} achado(s) suprimido(s) inline com motivo registrado.`);
}
if (processed.meta.baselined > 0) {
  console.log(`📌 ${processed.meta.baselined} achado(s) já conhecido(s) ocultado(s) pelo baseline.`);
}
if (vulnerabilitiesFound === 0) {
  console.log('🛡️  FALSIFIER APROVADO! O código resistiu a todos os 8 vetores de estresse.');
  console.log('✅ Nenhuma regressão, N+1, Lost Update ou falha de concorrência detectada.\n');
  process.exit(0);
} else {
  console.log(`⚠️  O Falsifier encontrou ${vulnerabilitiesFound} vulnerabilidade(s) ou risco(s) de estresse.`);
  console.log('Execute o Builder para corrigir as pendências antes de aprovar a entrega.\n');
  if (isStrict) process.exit(1);
}
