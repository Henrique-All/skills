#!/usr/bin/env node
/**
 * test-forge/scripts/test-audit.js (v2.0)
 * Auditor Determinístico de Qualidade de Testes (Anti-Mock Slop)
 * Analisa testes e calcula o Test Quality Score (0-100), alertando mocks excessivos,
 * asserções vazias, .only esquecido e sleeps fixos (waitForTimeout).
 */

const fs = require('fs');
const path = require('path');

const cleanArgs = process.argv.slice(2).filter(a => !a.startsWith('--'));
const targetDir = cleanArgs[0] ? path.resolve(cleanArgs[0]) : process.cwd();
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

function findTestFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  if (!fs.statSync(dir).isDirectory()) {
    return /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(dir) ? [dir] : [];
  }

  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const e of entries) {
      if (['node_modules', '.git', 'dist', 'build', '.agents'].includes(e.name)) continue;
      const full = path.join(current, e.name);
      if (e.isDirectory()) {
        walk(full);
      } else if (/\.(test|spec)\.(ts|js|tsx|jsx)$/.test(e.name)) {
        results.push(full);
      }
    }
  }
  walk(dir);
  return results;
}

const testFiles = findTestFiles(targetDir);

if (testFiles.length === 0) {
  if (isJson) {
    console.log(JSON.stringify({ score: 0, error: 'Nenhum arquivo de teste (.test/.spec) encontrado.' }));
  } else {
    console.log(`\n${colors.yellow}⚠️  Nenhum arquivo de teste (.test/.spec) encontrado em: ${targetDir}${colors.reset}\n`);
  }
  process.exit(0);
}

const findings = [];
let totalMocks = 0;
let totalAsserts = 0;

testFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  let fileMocks = 0;
  let fileAsserts = 0;

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;

    if (/vi\.mock\(|jest\.mock\(|\.spyOn\(/.test(trimmed)) {
      fileMocks++;
      totalMocks++;
    }

    if (/expect\(|assert\(/.test(trimmed)) {
      fileAsserts++;
      totalAsserts++;
    }

    if (/expect\((true|false|1|0)\)\.to(Be|Equal)\((true|false|1|0)\)/.test(trimmed)) {
      findings.push({
        severity: 'HIGH',
        rule: 'TRIVIAL_ASSERTION',
        file,
        line: lineNum,
        message: 'Asserção trivial/falsa detectada. O teste não valida o retorno real da função.'
      });
    }

    if (/\b(?:describe|it|test)\.only\s*\(/.test(trimmed)) {
      findings.push({
        severity: 'HIGH',
        rule: 'FOCUSED_TEST_ONLY',
        file,
        line: lineNum,
        message: 'Uso de .only() detectado — silencia o restante da suíte de testes no CI.'
      });
    }

    if (/\.waitForTimeout\s*\(\s*\d{3,}\s*\)/.test(trimmed)) {
      findings.push({
        severity: 'MEDIUM',
        rule: 'HARDCODED_SLEEP',
        file,
        line: lineNum,
        message: 'Uso de waitForTimeout() fixo torna o teste lento e flaky; prefira auto-waiting com expect(locator).'
      });
    }
  });

  if (fileAsserts === 0) {
    findings.push({
      severity: 'HIGH',
      rule: 'NO_ASSERTIONS',
      file,
      line: 1,
      message: 'Arquivo de teste sem nenhuma asserção ativa (expect/assert).'
    });
  }

  if (fileMocks >= 4 && fileAsserts <= 3) {
    findings.push({
      severity: 'MEDIUM',
      rule: 'MOCK_HEAVY_SLOP',
      file,
      line: 1,
      message: `Arquivo excessivamente mockado (${fileMocks} mocks para ${fileAsserts} asserções). Considere migrar para teste de integração real.`
    });
  }
});

let score = 100;
findings.forEach(f => {
  if (f.severity === 'HIGH') score -= 20;
  else if (f.severity === 'MEDIUM') score -= 10;
});
if (score < 0) score = 0;

if (isJson) {
  console.log(JSON.stringify({ score, totalFiles: testFiles.length, totalMocks, totalAsserts, findings }, null, 2));
  process.exit(0);
}

console.log(`\n${colors.cyan}${colors.bold}🧪 TEST FORGE v2.0 — AUDITORIA DE QUALIDADE DE TESTES${colors.reset}`);
console.log(`Arquivos de teste analisados (${testFiles.length}): Total de asserções: ${totalAsserts} | Mocks: ${totalMocks}\n`);

let scoreColor = colors.green;
if (score < 60) scoreColor = colors.red;
else if (score < 85) scoreColor = colors.yellow;

console.log(`📊 ${colors.bold}TEST QUALITY SCORE:${colors.reset} ${scoreColor}${colors.bold}${score} / 100${colors.reset}`);

if (findings.length === 0) {
  console.log(`\n🎉 ${colors.green}${colors.bold}PARABÉNS! NENHUM MOCK FANTASMA OU ASSERÇÃO TRIVIAL DETECTADA.${colors.reset}\n`);
  process.exit(0);
}

console.log(`\n---------------------------------------------------------------`);
console.log(`🚨 ALERTAS DE QUALIDADE DE TESTES (${findings.length}):`);
console.log(`---------------------------------------------------------------`);

findings.forEach(f => {
  let badge = f.severity === 'HIGH' ? `${colors.red}[HIGH]` : `${colors.yellow}[MEDIUM]`;
  console.log(`\n${badge}${colors.reset} ${path.basename(f.file)}:${f.line}`);
  console.log(`   ${f.message}`);
});
console.log(`\n---------------------------------------------------------------\n`);
