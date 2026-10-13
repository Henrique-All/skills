#!/usr/bin/env node
/**
 * db-sentinel/scripts/db-audit.js
 * Auditor Determinístico de Banco de Dados, Schemas e Migrations
 * Analisa schemas Prisma, Drizzle ou SQL puro e calcula o Database Health Score (0-100).
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function collectSqlFilesRecursively(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        results = results.concat(collectSqlFilesRecursively(full));
      } else if (ent.name.endsWith('.sql')) {
        results.push(full);
      }
    }
  } catch (e) {}
  return results;
}

function findSchemaFiles(dir = process.cwd()) {
  const candidates = [];
  const commonPaths = [
    'prisma/schema.prisma',
    'schema.prisma',
    'src/db/schema.ts',
    'drizzle/schema.ts',
    'src/schema.ts',
    'db/schema.ts',
    'db/schema.sql'
  ];

  for (const p of commonPaths) {
    const full = path.join(dir, p);
    if (fs.existsSync(full)) {
      candidates.push(full);
    }
  }

  const migrationDirs = [
    'prisma/migrations',
    'drizzle',
    'migrations',
    'supabase/migrations',
    'db/migrations'
  ];

  for (const mDir of migrationDirs) {
    const fullMDir = path.join(dir, mDir);
    for (const sqlFile of collectSqlFilesRecursively(fullMDir)) {
      if (!candidates.includes(sqlFile)) {
        candidates.push(sqlFile);
      }
    }
  }

  return candidates;
}

const cleanArgs = process.argv.slice(2).filter(a => !a.startsWith('--'));
const targetArg = cleanArgs[0];
const isJson = process.argv.includes('--json');

const targetFiles = targetArg && fs.existsSync(targetArg)
  ? (fs.statSync(targetArg).isDirectory() ? findSchemaFiles(path.resolve(targetArg)) : [path.resolve(targetArg)])
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
    let modelIndexes = [];
    let inlineUniqueFields = new Set();
    let relations = [];
    let hotFilterFields = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      const lineNum = idx + 1;
      if (trimmed.startsWith('//')) return;

      // Início de modelo
      const modelMatch = trimmed.match(/^model\s+([A-Za-z0-9_]+)\s*\{/);
      if (modelMatch) {
        currentModel = modelMatch[1];
        modelIndexes = [];
        inlineUniqueFields = new Set();
        relations = [];
        hotFilterFields = [];
      } else if (trimmed === '}' && currentModel) {
        // Fim de modelo: Validar chaves estrangeiras sem índice
        relations.forEach(rel => {
          const hasBlockIndex = modelIndexes.some(idxStr => idxStr.includes(rel.fk));
          const hasInlineUnique = inlineUniqueFields.has(rel.fk);
          if (!hasBlockIndex && !hasInlineUnique) {
            addFinding(
              'HIGH',
              'MISSING_FOREIGN_KEY_INDEX',
              `Modelo "${currentModel}" possui relação com "${rel.target}" pela FK "${rel.fk}", mas não há índice @@index([${rel.fk}]) nem @unique. Isso forçará Sequential Scans no banco.`,
              file,
              rel.line,
              `Adicione @@index([${rel.fk}]) ao modelo ${currentModel}.`
            );
          }
        });

        // Validar campos de filtro frequente sem índice no modelo
        hotFilterFields.forEach(hf => {
          const hasBlockIndex = modelIndexes.some(idxStr => idxStr.includes(hf.fieldName));
          const hasInlineUnique = inlineUniqueFields.has(hf.fieldName);
          if (!hasBlockIndex && !hasInlineUnique) {
            addFinding(
              'MEDIUM',
              'POTENTIAL_HOT_FILTER_UNINDEXED',
              `Campo de alta seletividade "${hf.fieldName}" no modelo "${currentModel}" pode necessitar de índice para filtros rápidos.`,
              file,
              hf.line,
              `Considere adicionar @@index([${hf.fieldName}]) se este campo for consultado frequentemente.`
            );
          }
        });

        currentModel = null;
      } else if (currentModel) {
        // Captura @unique ou @id inline no próprio campo
        const fieldParts = trimmed.split(/\s+/);
        const fieldName = fieldParts[0];
        if (fieldName && !fieldName.startsWith('@@') && (trimmed.includes('@unique') || trimmed.includes('@id'))) {
          inlineUniqueFields.add(fieldName);
        }

        // Captura campos e relações
        const relMatch = trimmed.match(/@relation\(.*fields:\s*\[([^\]]+)\].*\)/);
        if (relMatch) {
          const fks = relMatch[1].split(',').map(s => s.trim());
          const target = (fieldParts[1] || '').replace(/[?[\]]/g, '');
          fks.forEach(fk => relations.push({ fk, target, line: lineNum }));
        }

        // Captura índices declarados no bloco do modelo
        if (trimmed.startsWith('@@index(') || trimmed.startsWith('@@unique(') || trimmed.startsWith('@@id(')) {
          modelIndexes.push(trimmed);
        }

        // Registra campos de auditoria ou filtros padrão para checar no fechamento do model
        if (/^(status|tenantId|accountId|organizationId)\s+/.test(trimmed)) {
          hotFilterFields.push({ fieldName, line: lineNum });
        }
      }
    });
  }

  // 2. ANÁLISE DRIZZLE ORM (.ts)
  if (ext === '.ts') {
    // Detecta tabelas Drizzle: pgTable / mysqlTable / sqliteTable
    const tableRegex = /(?:pgTable|mysqlTable|sqliteTable)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*\{([\s\S]*?)\}(?:\s*,\s*\(([^)]*)\)\s*=>\s*([\s\S]*?))?\)/g;
    let tMatch;
    while ((tMatch = tableRegex.exec(content)) !== null) {
      const tableName = tMatch[1];
      const columnsBlock = tMatch[2] || '';
      const indexesBlock = tMatch[4] || '';
      const tableStartLine = content.slice(0, tMatch.index).split('\n').length;

      const colLines = columnsBlock.split('\n');
      colLines.forEach((colLine, cIdx) => {
        const trimmedCol = colLine.trim();
        if (trimmedCol.startsWith('//')) return;
        const colMatch = trimmedCol.match(/^([A-Za-z0-9_]+)\s*:\s*.*?\breferences\s*\(/);
        if (colMatch) {
          const colPropName = colMatch[1];
          const isInlineUnique = /\.unique\s*\(/.test(trimmedCol) || /\.primaryKey\s*\(/.test(trimmedCol);
          const isIndexedInTable = new RegExp(`(?:index|uniqueIndex)\\s*\\([^)]*\\)\\s*\\.on\\s*\\([^)]*\\b${colPropName}\\b`).test(indexesBlock);
          if (!isInlineUnique && !isIndexedInTable) {
            addFinding(
              'HIGH',
              'MISSING_FOREIGN_KEY_INDEX',
              `Tabela Drizzle "${tableName}" possui FK "${colPropName}" com .references(), mas sem index().on(table.${colPropName}).`,
              file,
              tableStartLine + cIdx,
              `Adicione index('${tableName}_${colPropName}_idx').on(table.${colPropName}) no 3º argumento de ${tableName}.`
            );
          }
        }
      });
    }
  }

  // 3. ANÁLISE SQL & MIGRATIONS (.sql e SQL embarcado em .ts)
  if (ext === '.sql' || ext === '.ts') {
    const reportedNotNullLines = new Set();
    const reportedDropLines = new Set();

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();
      if (trimmed.startsWith('--') || trimmed.startsWith('//') || trimmed.startsWith('*')) return;
      const upper = line.toUpperCase();

      if (/ALTER\s+TABLE\s+.*\s+ADD\s+(?:COLUMN\s+)?.*\s+NOT\s+NULL/.test(upper) && !upper.includes('DEFAULT')) {
        reportedNotNullLines.add(lineNum);
        addFinding(
          'CRITICAL',
          'NOT_NULL_WITHOUT_DEFAULT',
          'Adição de coluna NOT NULL sem valor DEFAULT detectada. Esta migração falhará se a tabela já contiver registros e causará lock exclusivo.',
          file,
          lineNum,
          'Crie a coluna como NULLABLE, faça o backfill dos dados, e depois aplique a constraint NOT NULL.'
        );
      }

      if ((/DROP\s+COLUMN\b/.test(upper) || /DROP\s+TABLE\b/.test(upper)) && !/DROP\s+TABLE\s+IF\s+EXISTS\s+#/i.test(upper)) {
        reportedDropLines.add(lineNum);
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

    // Suporte a instruções SQL multi-linha em arquivos .sql
    if (ext === '.sql') {
      const statements = content.split(';');
      let charOffset = 0;
      for (const stmt of statements) {
        const cleanStmt = stmt
          .split('\n')
          .filter(l => !l.trim().startsWith('--'))
          .join(' ')
          .toUpperCase();
        const stmtLine = content.slice(0, charOffset).split('\n').length;
        charOffset += stmt.length + 1;

        if (
          /ALTER\s+TABLE\s+\S+\s+ADD\s+(?:COLUMN\s+)?\S+\s+[^;]*\bNOT\s+NULL\b/.test(cleanStmt) &&
          !/\bDEFAULT\b/.test(cleanStmt) &&
          !Array.from(reportedNotNullLines).some(l => Math.abs(l - stmtLine) <= 5)
        ) {
          addFinding(
            'CRITICAL',
            'NOT_NULL_WITHOUT_DEFAULT',
            'Adição multi-linha de coluna NOT NULL sem valor DEFAULT detectada.',
            file,
            stmtLine,
            'Crie a coluna como NULLABLE, faça o backfill dos dados, e depois aplique a constraint NOT NULL.'
          );
        }
      }
    }
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
