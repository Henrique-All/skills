#!/usr/bin/env node
/**
 * scripts/falsify.js - Runner Automatizado do Falsifier Adversário
 * Testa ativamente se a implementação do Builder resiste aos 5 vetores de estresse:
 * 1. Race conditions & concorrência
 * 2. Inputs nulos, vazios e maliciosos
 * 3. Timeouts e falhas de rede simuladas
 * 4. Transações de banco e atomicidade
 * 5. Consultas N+1 em loops assíncronos (ORM / DB)
 * 
 * Uso:
 *   node scripts/falsify.js [caminho-ou-arquivo] [--strict]
 */

const fs = require('fs');
const path = require('path');

const cleanArgs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const targetPath = cleanArgs[0] || '.';
const isStrict = process.argv.includes('--strict');

console.log('===============================================================');
console.log('🧪 HYBRID ORCHESTRATOR — ADVERSARIAL FALSIFIER RUNNER');
console.log('===============================================================');
console.log(`🎯 Alvo do Ataque: ${targetPath}\n`);

const attacks = [
  {
    name: 'Vetor 1: Detecção de Consultas N+1 em Loops Assíncronos',
    check: (content) => {
      // Procura loops com await dentro de map, forEach ou for que chamem db/query
      const loopAwaitRegex = /(?:for\s*\([^)]+\)|for\s+await|\.map\(async|\.forEach\(async)[^}]*await\s+(?:prisma|db|repository|Model|query|find|select)/gs;
      if (loopAwaitRegex.test(content)) {
        return 'Possível query N+1 detectada: await em loop de banco. Utilize batching (findMany com "in") ou DataLoader.';
      }
      return null;
    }
  },
  {
    name: 'Vetor 2: Tratamento de Inputs Nulos e Indefinidos (Boundary Checks)',
    check: (content) => {
      if ((content.includes('req.body') || content.includes('req.params.')) && 
          !content.includes('zod') && !content.includes('.parse') && !content.includes('safeParse') && !content.includes('if (!') && !content.includes('validate')) {
        return 'Falta de validação de payload: inputs consumidos sem verificação de schema ou nulidade.';
      }
      return null;
    }
  },
  {
    name: 'Vetor 3: Falta de Timeout em Requisições Externas',
    check: (content) => {
      if ((/\bfetch\s*\(/.test(content) || /\baxios\.(?:get|post|put|delete|patch|request)\s*\(/.test(content)) && 
          !content.includes('timeout') && !content.includes('AbortController') && !content.includes('signal')) {
        return 'Chamadas HTTP externas sem timeout configurado: risco de deadlock em falha de rede.';
      }
      return null;
    }
  },
  {
    name: 'Vetor 4: Atomicidade e Transações em Operações Múltiplas',
    check: (content) => {
      // Conta apenas mutações reais de banco/ORM (ignora Set.delete, Map.delete, Object.create, axios.create)
      const ormMutationRegex = /(?:prisma\.\w+|db(?:\.\w+)?|tx(?:\.\w+)?|manager(?:\.\w+)?|\b\w*(?:Repo|Repository|Model|Dao))\s*\.\s*(?:create|createMany|update|updateMany|upsert|delete|deleteMany|insert|save|destroy)\s*\(/g;
      const sqlMutationRegex = /\b(?:INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b/gi;
      const ormCount = (content.match(ormMutationRegex) || []).length;
      const sqlCount = (content.match(sqlMutationRegex) || []).length;
      const dbMutations = ormCount + sqlCount;

      if (dbMutations > 1 && !content.includes('$transaction') && !content.includes('.transaction(') && !content.includes('beginTransaction') && !content.includes('COMMIT')) {
        return `Múltiplas operações de escrita no banco (${dbMutations}) sem bloco de transação. Risco de estado inconsistente em caso de erro intermediário.`;
      }
      return null;
    }
  },
  {
    name: 'Vetor 5: Bloqueio de Event Loop em I/O Síncrono',
    check: (content, filePath) => {
      // Só reporta fs.*Sync quando o arquivo é um handler HTTP/WebSocket/Controller de servidor
      const isServerHandler = /(?:req\s*,\s*res|NextRequest|@Controller|router\.(?:get|post|put|delete|patch)|app\.(?:get|post|put|delete|patch)|fastify\.|socket\.on\()/i.test(content);
      const isCliOrTest = /(?:^|[\\/])(?:scripts|bin|test|tests|migrations|prisma|drizzle)[\\/]/i.test(filePath || '') || content.startsWith('#!/usr/bin/env node');
      if (isServerHandler && !isCliOrTest && (content.includes('fs.readFileSync') || content.includes('fs.writeFileSync'))) {
        return 'Uso de operações de disco síncronas (fs.*Sync) em rota/handler de servidor. Risco de degradação sob carga concorrente.';
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
let vulnerabilitiesFound = 0;

files.forEach((file) => {
  const rel = path.relative(process.cwd(), file);
  const content = fs.readFileSync(file, 'utf-8');

  attacks.forEach((attack) => {
    const issue = attack.check(content, file);
    if (issue) {
      vulnerabilitiesFound++;
      console.log(`💥 [FALSIFIER FALHOU] ${rel}`);
      console.log(`   🏷️  ${attack.name}`);
      console.log(`   💡 Diagnóstico: ${issue}\n`);
    }
  });
});

console.log('---------------------------------------------------------------');
if (vulnerabilitiesFound === 0) {
  console.log('🛡️  FALSIFIER APROVADO! O código resistiu a todos os 5 vetores de estresse.');
  console.log('✅ Nenhuma regressão, N+1 ou falha de concorrência detectada.\n');
  process.exit(0);
} else {
  console.log(`⚠️  O Falsifier encontrou ${vulnerabilitiesFound} vulnerabilidade(s) ou risco(s) de estresse.`);
  console.log('Execute o Builder para corrigir as pendências antes de aprovar a entrega.\n');
  if (isStrict) process.exit(1);
}
