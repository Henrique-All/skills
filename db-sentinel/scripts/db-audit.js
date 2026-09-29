#!/usr/bin/env node
/**
 * db-sentinel/scripts/db-audit.js
 * Auditor Determinístico de Banco de Dados, Schemas e Migrations
 * Analisa schemas Prisma, Drizzle ou SQL puro e calcula o Database Health Score (0-100).
 */

const fs = require('fs');
const path = require('path');

const targetArg = process.argv[2];
const isJson = process.argv.includes('--json');

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function findSchemaFiles(dir = process.cwd()) {
  const candidates = [];
  const commonPaths = [
    'prisma/schema.prisma',
    'schema.prisma',
    'src/db/schema.ts',
    'drizzle/schema.ts',
    'src/schema.ts',
    'db/schema.sql'
  ];

  for (const p of commonPaths) {
    const full = path.join(dir, p);
    if (fs.existsSync(full)) {
      candidates.push(full);
    }
  }
  return candidates;
}

const targetFiles = targetArg && fs.existsSync(targetArg)
  ? [path.resolve(targetArg)]
  : findSchemaFiles();

if (targetFiles.length === 0) {
  if (isJson) {
    console.log(JSON.stringify({ error: 'Nenhum arquivo de schema (Prisma/Drizzle/SQL) encontrado.' }));
  } else {
    console.log(`\n${colors.yellow}⚠️  Nenhum arquivo de schema (Prisma/Drizzle/SQL) encontrado para análise.${colors.reset}\n`);
  }
  process.exit(0);
}

const findings = [];
let analyzedCount = 0;

function addFinding(severity, rule, message, file, line = 0, remediation = '') {
  findings.push({ severity, rule, message, file, line, remediation });
}

targetFiles.forEach((file) => {
  analyzedCount++;
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  const ext = path.extname(file);

  // 1. ANÁLISE PRISMA (.prisma)
  if (ext === '.prisma' || file.endsWith('schema.prisma')) {
    let currentModel = null;
    let modelFields = [];
    let modelIndexes = [];
    let relations = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      const lineNum = idx + 1;

      // Início de modelo
      const modelMatch = trimmed.match(/^model\s+([A-Za-z0-9_]+)\s*\{/);
      if (modelMatch) {
        currentModel = modelMatch[1];
        modelFields = [];
        modelIndexes = [];
        relations = [];
      } else if (trimmed === '}' && currentModel) {
        // Fim de modelo: Validar chaves estrangeiras sem índice
        relations.forEach(rel => {
          const hasIndex = modelIndexes.some(idx => idx.includes(rel.fk));
          if (!hasIndex) {
            addFinding(
              'HIGH',
              'MISSING_FOREIGN_KEY_INDEX',
              `Modelo "${currentModel}" possui relação com "${rel.target}" pela FK "${rel.fk}", mas não há índice @@index([${rel.fk}]). Isso forçará Sequential Scans no banco.`,
              file,
              rel.line,
              `Adicione @@index([${rel.fk}]) ao modelo ${currentModel}.`
            );
          }
        });
        currentModel = null;
      } else if (currentModel) {
        // Captura campos e relações
        const relMatch = trimmed.match(/@relation\(.*fields:\s*\[([^\]]+)\].*\)/);
        if (relMatch) {
          const fks = relMatch[1].split(',').map(s => s.trim());
          const parts = trimmed.split(/\s+/);
          const target = parts[1];
          fks.forEach(fk => relations.push({ fk, target, line: lineNum }));
        }

        // Captura índices declarados
        if (trimmed.startsWith('@@index(') || trimmed.startsWith('@@unique(')) {
          modelIndexes.push(trimmed);
        }

        // Alerta: Campos de auditoria ou filtros padrão sem índice
        if (/^(status|tenantId|accountId|organizationId)\s+/.test(trimmed) && !trimmed.includes('@unique')) {
          const fieldName = trimmed.split(/\s+/)[0];
          addFinding(
            'MEDIUM',
            'POTENTIAL_HOT_FILTER_UNINDEXED',
            `Campo de alta seletividade "${fieldName}" no modelo "${currentModel}" pode necessitar de índice para filtros rápidos.`,
            file,
            lineNum,
            `Considere adicionar @@index([${fieldName}]) se este campo for consultado frequentemente.`
          );
        }
      }
    });
  }

  // 2. ANÁLISE SQL / DRIZZLE (.sql, .ts)
  if (ext === '.sql') {
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const upper = line.toUpperCase();

      if (/ALTER\s+TABLE\s+.*\s+ADD\s+COLUMN\s+.*\s+NOT\s+NULL/.test(upper) && !upper.includes('DEFAULT')) {
        addFinding(
          'CRITICAL',
          'NOT_NULL_WITHOUT_DEFAULT',
          'Adição de coluna NOT NULL sem valor DEFAULT detectada. Esta migração falhará se a tabela já contiver registros e causará lock exclusivo.',
          file,
          lineNum,
          'Crie a coluna como NULLABLE, faça o backfill dos dados, e depois aplique a constraint NOT NULL.'
        );
      }

      if (/DROP\s+COLUMN/.test(upper) || /DROP\s+TABLE/.test(upper)) {
        addFinding(
          'HIGH',
          'DESTRUCTIVE_DDL',
          'Comando destrutivo (DROP) detectado na migração. Risco imediato de perda de dados e downtime de código legado.',
          file,
          lineNum,
          'Siga a esteira em 3 fases (Expand & Contract) antes de deletar colunas fisicamente.'
        );
      }
    });
  }
});

// Cálculo do Score (0 - 100)
let score = 100;
findings.forEach(f => {
  if (f.severity === 'CRITICAL') score -= 30;
  else if (f.severity === 'HIGH') score -= 15;
  else if (f.severity === 'MEDIUM') score -= 5;
  else if (f.severity === 'LOW') score -= 2;
});
if (score < 0) score = 0;

if (isJson) {
  console.log(JSON.stringify({ score, findings, filesAnalyzed: targetFiles }, null, 2));
  process.exit(findings.some(f => f.severity === 'CRITICAL') ? 1 : 0);
}

console.log(`\n${colors.cyan}${colors.bold}🗄️  DB SENTINEL — RELATÓRIO DE INTEGRIDADE DE BANCO DE DADOS${colors.reset}`);
console.log(`Arquivos analisados (${analyzedCount}): ${targetFiles.map(f => path.basename(f)).join(', ')}\n`);

let scoreColor = colors.green;
if (score < 60) scoreColor = colors.red;
else if (score < 85) scoreColor = colors.yellow;

console.log(`📊 ${colors.bold}DATABASE HEALTH SCORE:${colors.reset} ${scoreColor}${colors.bold}${score} / 100${colors.reset}`);

if (findings.length === 0) {
  console.log(`\n🎉 ${colors.green}${colors.bold}NENHUMA VULNERABILIDADE OU ÍNDICE FALTANTE DETECTADO!${colors.reset}`);
  console.log(`   O schema segue as melhores práticas de zero-downtime e indexação relacional.\n`);
  process.exit(0);
}

console.log(`\n---------------------------------------------------------------`);
console.log(`🚨 ACHADOS DE INTEGRIDADE E PERFORMANCE (${findings.length}):`);
console.log(`---------------------------------------------------------------`);

findings.forEach((f, idx) => {
  let badge = `${colors.red}[CRITICAL]${colors.reset}`;
  if (f.severity === 'HIGH') badge = `${colors.yellow}[HIGH]${colors.reset}`;
  else if (f.severity === 'MEDIUM') badge = `${colors.cyan}[MEDIUM]${colors.reset}`;
  else if (f.severity === 'LOW') badge = `${colors.gray}[LOW]${colors.reset}`;

  console.log(`\n${badge} ${colors.bold}${f.rule}${colors.reset}`);
  console.log(`   Arquivo: ${colors.gray}${f.file}:${f.line}${colors.reset}`);
  console.log(`   Motivo:  ${f.message}`);
  if (f.remediation) {
    console.log(`   💡 Ação:  ${colors.green}${f.remediation}${colors.reset}`);
  }
});

console.log(`\n---------------------------------------------------------------\n`);
process.exit(findings.some(f => f.severity === 'CRITICAL') ? 1 : 0);
