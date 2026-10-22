#!/usr/bin/env node
/**
 * scripts/falsify.js - Runner Automatizado do Falsifier Adversário (v2.6.0)
 * Testa ativamente se a implementação do Builder resiste aos 8 vetores de estresse:
 * 1. Consultas N+1 em loops assíncronos (ORM / DB)
 * 2. Inputs nulos, vazios e maliciosos (Boundary Checks)
 * 3. Timeouts e falhas de rede em chamadas externas
 * 4. Transações de banco e atomicidade em mutações múltiplas
 * 5. Bloqueio de Event Loop em I/O síncrono em servidores
 * 6. Condição de Corrida Read-Modify-Write (Lost Update / Double-Spend)
 * 7. Vazamento de Memória e Listeners Órfãos em useEffect
 * 8. Exceções Engolidas Silenciosamente (Empty Catch Block)
 *
 * Uso:
 *   node scripts/falsify.js [caminho-ou-arquivo] [--strict] [--json]
 */

const fs = require('fs');
const path = require('path');

const cleanArgs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const targetPath = cleanArgs[0] || '.';
const isStrict = process.argv.includes('--strict');
const isJson = process.argv.includes('--json');

if (!isJson) {
  console.log('===============================================================');
  console.log('🧪 HYBRID ORCHESTRATOR — ADVERSARIAL FALSIFIER RUNNER (8 VETORES)');
  console.log('===============================================================');
  console.log(`🎯 Alvo do Ataque: ${targetPath}\n`);
}

function findLineNumber(content, regex) {
  const m = regex.exec(content);
  if (!m || typeof m.index !== 'number') return 1;
  return content.slice(0, m.index).split('\n').length;
}

const attacks = [
  {
    id: 'N_PLUS_ONE_LOOP',
    severity: 'HIGH',
    name: 'Vetor 1: Detecção de Consultas N+1 em Loops Assíncronos',
    check: (content) => {
      const loopAwaitRegex = /(?:for\s*\([^)]+\)|for\s+await|\.map\(async|\.forEach\(async)[^}]*await\s+(?:prisma|db|repository|Model|query|find|select)/s;
      if (loopAwaitRegex.test(content)) {
        return {
          line: findLineNumber(content, loopAwaitRegex),
          message: 'Possível query N+1 detectada: await em loop de banco. Utilize batching (findMany com "in") ou DataLoader.'
        };
      }
      return null;
    }
  },
  {
    id: 'UNVALIDATED_PAYLOAD_BOUNDARY',
    severity: 'HIGH',
    name: 'Vetor 2: Tratamento de Inputs Nulos e Indefinidos (Boundary Checks)',
    check: (content) => {
      if (
        (content.includes('req.body') || content.includes('req.params.')) &&
        !content.includes('zod') &&
        !content.includes('.parse') &&
        !content.includes('safeParse') &&
        !content.includes('if (!') &&
        !content.includes('validate')
      ) {
        return {
          line: findLineNumber(content, /req\.(?:body|params\.)/),
          message: 'Falta de validação de payload: inputs consumidos sem verificação de schema ou nulidade.'
        };
      }
      return null;
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
        return {
          line: findLineNumber(content, httpRegex),
          message: 'Chamadas HTTP externas sem timeout configurado: risco de deadlock em falha de rede.'
        };
      }
      return null;
    }
  },
  {
    id: 'NON_ATOMIC_MULTI_MUTATION',
    severity: 'HIGH',
    name: 'Vetor 4: Atomicidade e Transações em Operações Múltiplas',
    check: (content) => {
      const ormMutationRegex = /(?:prisma\.\w+|db(?:\.\w+)?|tx(?:\.\w+)?|manager(?:\.\w+)?|\b\w*(?:Repo|Repository|Model|Dao))\s*\.\s*(?:create|createMany|update|updateMany|upsert|delete|deleteMany|insert|save|destroy)\s*\(/g;
      const sqlMutationRegex = /\b(?:INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b/gi;
      const ormCount = (content.match(ormMutationRegex) || []).length;
      const sqlCount = (content.match(sqlMutationRegex) || []).length;
      const dbMutations = ormCount + sqlCount;

      if (
        dbMutations > 1 &&
        !content.includes('$transaction') &&
        !content.includes('.transaction(') &&
        !content.includes('beginTransaction') &&
        !content.includes('COMMIT')
      ) {
        return {
          line: findLineNumber(content, /(?:prisma\.\w+|db(?:\.\w+)?)\s*\.\s*(?:create|update|delete|insert)|\b(?:INSERT\s+INTO|UPDATE\s+\w+\s+SET)/i),
          message: `Múltiplas operações de escrita no banco (${dbMutations}) sem bloco de transação. Risco de estado inconsistente em caso de erro intermediário.`
        };
      }
      return null;
    }
  },
  {
    id: 'SYNC_IO_EVENT_LOOP_BLOCK',
    severity: 'MEDIUM',
    name: 'Vetor 5: Bloqueio de Event Loop em I/O Síncrono',
    check: (content, filePath) => {
      const isServerHandler = /(?:req\s*,\s*res|NextRequest|@Controller|router\.(?:get|post|put|delete|patch)|app\.(?:get|post|put|delete|patch)|fastify\.|socket\.on\()/i.test(content);
      const isCliOrTest = /(?:^|[\\/])(?:scripts|bin|test|tests|migrations|prisma|drizzle)[\\/]/i.test(filePath || '') || content.startsWith('#!/usr/bin/env node');
      if (isServerHandler && !isCliOrTest && (content.includes('fs.readFileSync') || content.includes('fs.writeFileSync'))) {
        return {
          line: findLineNumber(content, /fs\.(?:readFileSync|writeFileSync)/),
          message: 'Uso de operações de disco síncronas (fs.*Sync) em rota/handler de servidor. Risco de degradação sob carga concorrente.'
        };
      }
      return null;
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
        return {
          line: findLineNumber(content, rmwRegex),
          message: 'Padrão Read-Modify-Write não-atômico em saldo/estoque detectado (Lost Update / Double-Spend). Use { increment / decrement }, lock pessimista (SELECT ... FOR UPDATE) ou controle de concorrência otimista (version).'
        };
      }
      return null;
    }
  },
  {
    id: 'EFFECT_MEMORY_LEAK',
    severity: 'MEDIUM',
    name: 'Vetor 7: Vazamento de Memória e Listeners Órfãos em Effects',
    check: (content) => {
      const effectBlocks = content.match(/useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[[^\]]*\]\s*\)/g) || [];
      for (const block of effectBlocks) {
        const hasSubscription = /\b(?:addEventListener|setInterval|new\s+IntersectionObserver|new\s+ResizeObserver)\s*\(/.test(block);
        const hasCleanup = /return\s+(?:\(\s*\)\s*=>|function)|removeEventListener|clearInterval|\.disconnect\s*\(/.test(block);
        if (hasSubscription && !hasCleanup) {
          return {
            line: findLineNumber(content, /useEffect\s*\(/),
            message: 'useEffect registra listener/timer/observer (addEventListener, setInterval, Observer) sem função de cleanup no return. Risco de memory leak e handlers duplicados.'
          };
        }
      }
      return null;
    }
  },
  {
    id: 'SWALLOWED_EXCEPTION',
    severity: 'MEDIUM',
    name: 'Vetor 8: Exceção Engolida Silenciosamente (Empty Catch Block)',
    check: (content, filePath) => {
      const isCliOrTest = /(?:^|[\\/])(?:scripts|bin|test|tests|migrations|prisma|drizzle)[\\/]/i.test(filePath || '') || content.startsWith('#!/usr/bin/env node');
      if (isCliOrTest) return null;
      const emptyCatchRegex = /catch\s*(?:\([^)]*\))?\s*\{\s*(?:\/\/[^\n]*\s*)*\}/;
      if (emptyCatchRegex.test(content)) {
        return {
          line: findLineNumber(content, emptyCatchRegex),
          message: 'Bloco catch vazio engole exceção silenciosamente sem log estruturado, rethrow ou retorno de erro explícito.'
        };
      }
      return null;
    }
  }
];

function scanFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const stat = fs.statSync(dir);
  if (!stat.isDirectory()) return [dir];

  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.') || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanFiles(full));
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

const files = scanFiles(path.resolve(process.cwd(), targetPath));
const findings = [];

files.forEach((file) => {
  const rel = path.relative(process.cwd(), file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf-8');

  attacks.forEach((attack) => {
    const issue = attack.check(content, file);
    if (issue) {
      const message = typeof issue === 'string' ? issue : issue.message;
      const line = typeof issue === 'object' && issue.line ? issue.line : 1;
      findings.push({
        file: rel,
        line,
        rule: attack.id,
        vector: attack.name,
        severity: attack.severity,
        message
      });
      if (!isJson) {
        console.log(`💥 [FALSIFIER FALHOU] ${rel}:${line}`);
        console.log(`   🏷️  ${attack.name}`);
        console.log(`   💡 Diagnóstico: ${message}\n`);
      }
    }
  });
});

const vulnerabilitiesFound = findings.length;

if (isJson) {
  console.log(
    JSON.stringify(
      {
        targetPath,
        passed: vulnerabilitiesFound === 0,
        vectorsFailed: vulnerabilitiesFound,
        findings
      },
      null,
      2
    )
  );
  if (vulnerabilitiesFound > 0 && isStrict) process.exit(1);
  process.exit(0);
}

console.log('---------------------------------------------------------------');
if (vulnerabilitiesFound === 0) {
  console.log('🛡️  FALSIFIER APROVADO! O código resistiu a todos os 8 vetores de estresse.');
  console.log('✅ Nenhuma regressão, N+1, Lost Update ou falha de concorrência detectada.\n');
  process.exit(0);
} else {
  console.log(`⚠️  O Falsifier encontrou ${vulnerabilitiesFound} vulnerabilidade(s) ou risco(s) de estresse.`);
  console.log('Execute o Builder para corrigir as pendências antes de aprovar a entrega.\n');
  if (isStrict) process.exit(1);
}
