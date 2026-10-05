#!/usr/bin/env node
/**
 * scripts/craft-audit.js - Analisador e Auditor de Artesanato Visual (Anti-AI Slop)
 * Varre a base de código do front-end e identifica vícios de interface gerada por IA.
 * 
 * Uso:
 *   node scripts/craft-audit.js [diretório]
 *   node scripts/craft-audit.js src/
 *   node scripts/craft-audit.js --json
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const isJson = args.includes('--json');
const targetArg = args.find((a) => !a.startsWith('--')) || '.';
const targetPath = path.resolve(process.cwd(), targetArg);

const EXTENSIONS = new Set(['.tsx', '.jsx', '.vue', '.html', '.css', '.svelte', '.js', '.ts']);

// Regras de Detecção de "AI Slop"
const RULES = [
  {
    id: 'PURPLE_NEON_SLOP',
    name: 'Gradiente Roxo-Neon Clichê de IA',
    severity: 'HIGH',
    penalty: 15,
    regex: /(?:from-purple-\d+|from-violet-\d+|to-indigo-\d+|to-pink-\d+|#7c3aed|#8b5cf6|#6366f1.*#ec4899)/i,
    message: 'Gradiente roxo-neon/índigo genérico detectado. Use paleta monocromática refinada (Zinc/Slate) com apenas 1 cor de destaque proposital.',
    suggestion: 'Substitua por fundo neutro profundo (bg-zinc-900) e uma borda sutil com destaque acentuado único (ex: amber-500 ou emerald-500).'
  },
  {
    id: 'LIGHT_MODE_WHITE_TEXT',
    name: 'Texto Branco Hardcoded Incompatível com Light Mode',
    severity: 'HIGH',
    penalty: 15,
    regex: /(?:color:\s*['"]?#(?:fff|ffffff)['"]?|color:\s*white)/i,
    message: 'Texto branco (#fff/white) hardcoded sem condicional de tema. Em Light Mode o texto fica completamente invisível ou ilegível.',
    suggestion: 'Substitua por theme.colors.text ou condicional isLight(theme) ? "#0f172a" : "#fff", ou classe Tailwind text-zinc-900 dark:text-white.'
  },
  {
    id: 'LIGHT_MODE_GHOST_SURFACE',
    name: 'Superfície Fantasma em Fundo Claro (rgba branca fraca)',
    severity: 'MEDIUM',
    penalty: 10,
    regex: /(?:background:\s*rgba\(255,\s*255,\s*255,\s*0\.0\d\)|border:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.0\d\))/i,
    message: 'Superfície ou borda com rgba(255,255,255, 0.0x) hardcoded. No Light Mode (#F8FAFC) o card desaparece e fica sem contraste.',
    suggestion: 'Use theme.colors.surface ou isLight(theme) ? "#ffffff" : theme.colors.surface com borda #e2e8f0 no tema claro.'
  },
  {
    id: 'HARDCODED_DARK_SURFACE',
    name: 'Fundo Escuro Hardcoded sem Suporte a Modo Claro',
    severity: 'HIGH',
    penalty: 15,
    regex: /(?:background(?:-color)?:\s*['"]?#(?:0b0b0e|0f172a|1a1a24|18181b|09090b)['"]?)/i,
    message: 'Fundo escuro hardcoded sem token de tema. O componente não responderá à troca para Light Mode.',
    suggestion: 'Utilize ${({ theme }) => theme.colors.background} ou classe bg-white dark:bg-zinc-900.'
  },
  {
    id: 'UNREGULATED_BLUR',
    name: 'Glassmorphism / Blur Sem Critério',
    severity: 'MEDIUM',
    penalty: 10,
    regex: /(?:backdrop-blur-md|backdrop-blur-lg|backdrop-blur-xl)\s+bg-white\/[0-1]0/i,
    message: 'Uso de backdrop-blur excessivo sem hierarquia de superfície.',
    suggestion: 'Prefira superfícies opacas em camadas (bg-zinc-900/90) com borda de 1px (border-white/[0.08]) e inner-highlight (shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]).'
  },
  {
    id: 'MISSING_TACTILE_FEEDBACK',
    name: 'Botão Sem Feedback Tátil',
    severity: 'MEDIUM',
    penalty: 8,
    regex: /<button\b(?![^>]*(?:whileTap|active:scale|active:translate|:active))[^>]*className=["'][^"']*\b(?:bg-|border-)[^"']*["']/i,
    message: 'Botão interativo sem estado de compressão ou feedback tátil no clique.',
    suggestion: 'Adicione micro-interação tátil com Framer Motion: whileTap={{ scale: 0.98 }} ou classe Tailwind active:scale-95.'
  },
  {
    id: 'HARD_LINEAR_TRANSITION',
    name: 'Transição Artificial e Dura (Sem Física de Molas)',
    severity: 'LOW',
    penalty: 5,
    regex: /transition-all\s+duration-(?:300|500|700)\s+(?:ease-in-out|ease-linear)/i,
    message: 'Transição linear ou genérica detectada em micro-interação.',
    suggestion: 'Substitua por física de molas (Spring Physics) do Framer Motion: transition={{ type: "spring", stiffness: 400, damping: 30 }}.'
  },
  {
    id: 'OUTLINE_NONE_WITHOUT_RING',
    name: 'Acessibilidade de Foco Comprometida',
    severity: 'HIGH',
    penalty: 12,
    regex: /outline-none(?![^"']*(?:focus-visible:ring|focus:ring))/i,
    message: 'Elemento removeu o outline padrão sem fornecer anel de foco acessível (focus-visible).',
    suggestion: 'Inclua sempre focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2.'
  },
  {
    id: 'AI_CLICHE_COPY',
    name: 'Copy Artificial / Frases Típicas de IA',
    severity: 'LOW',
    penalty: 5,
    regex: /(?:Elevate your (?:workflow|experience)|Seamless (?:integration|experience)|Next-Gen (?:platform|solution)|Unleash the power of|Supercharge your)/i,
    message: 'Frase clichê frequentemente gerada por modelos de linguagem.',
    suggestion: 'Substitua por texto claro, funcional e direto focado no benefício real para o usuário.'
  }
];

function scanFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;

  const stat = fs.statSync(dir);
  if (stat.isFile()) {
    if (EXTENSIONS.has(path.extname(dir))) results.push(dir);
    return results;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === 'build') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(scanFiles(fullPath));
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const findings = [];

  lines.forEach((line, index) => {
    // Janela de contexto multiline (3 linhas antes e 3 linhas depois) para spans de JSX
    const contextSnippet = lines
      .slice(Math.max(0, index - 3), Math.min(lines.length, index + 4))
      .join(' ');

    RULES.forEach((rule) => {
      // Para acessibilidade e feedback tátil, testar se a regra é satisfeita no contexto próximo
      if (rule.id === 'OUTLINE_NONE_WITHOUT_RING') {
        if (/outline-none/i.test(line) && !/focus-visible:ring|focus:ring/i.test(contextSnippet)) {
          findings.push({
            ruleId: rule.id,
            name: rule.name,
            severity: rule.severity,
            penalty: rule.penalty,
            line: index + 1,
            snippet: line.trim().slice(0, 120),
            message: rule.message,
            suggestion: rule.suggestion
          });
        }
        return;
      }

      if (rule.id === 'MISSING_TACTILE_FEEDBACK') {
        if (/<(?:button|motion\.button)\b/i.test(line)) {
          // Analisa o bloco do botão nas próximas 12 linhas (evitando corte prematuro no '>' de arrow functions)
          const tagBlock = lines.slice(index, Math.min(lines.length, index + 12)).join(' ');

          if (!/(?:whileTap|active:scale|active:translate|active:bg|active:border|:active)/i.test(tagBlock)) {
            findings.push({
              ruleId: rule.id,
              name: rule.name,
              severity: rule.severity,
              penalty: rule.penalty,
              line: index + 1,
              snippet: line.trim().slice(0, 120),
              message: rule.message,
              suggestion: rule.suggestion
            });
          }
        }
        return;
      }

      if (rule.regex.test(line)) {
        findings.push({
          ruleId: rule.id,
          name: rule.name,
          severity: rule.severity,
          penalty: rule.penalty,
          line: index + 1,
          snippet: line.trim().slice(0, 120),
          message: rule.message,
          suggestion: rule.suggestion
        });
      }
    });
  });

  return findings;
}

// Execução Principal
const files = scanFiles(targetPath);
const allFindings = [];

files.forEach((file) => {
  const findings = auditFile(file);
  if (findings.length > 0) {
    allFindings.push({
      file: path.relative(process.cwd(), file).replace(/\\/g, '/'),
      findings
    });
  }
});

const totalPenalty = allFindings.reduce((acc, f) => {
  return acc + f.findings.reduce((sum, item) => sum + item.penalty, 0);
}, 0);

const rawScore = Math.max(0, 100 - totalPenalty);
const score = files.length === 0 ? 100 : rawScore;

if (isJson) {
  console.log(JSON.stringify({
    target: targetPath,
    scannedFiles: files.length,
    score,
    passed: score >= 85,
    findings: allFindings
  }, null, 2));
  process.exit(score >= 85 ? 0 : 1);
}

console.log('===============================================================');
console.log('🎨 FRONTEND CRAFTSMAN — AUDITORIA DE ARTESANATO VISUAL (ANTI-AI)');
console.log('===============================================================\n');
console.log(`📁 Alvo analisado: ${targetPath}`);
console.log(`📄 Arquivos de interface verificados: ${files.length}\n`);

if (allFindings.length === 0) {
  console.log('✨ NENHUM VÍCIO DE IA ENCONTRADO!');
  console.log('🏆 Craftsmanship Score: 100/100 (Acabamento Artesanal de Alto Nível)\n');
  process.exit(0);
}

console.log('⚠️  VÍCIOS DE INTERFACE ENCONTRADOS:');
console.log('---------------------------------------------------------------');

allFindings.forEach(({ file, findings }) => {
  console.log(`\n📌 Arquivo: ${file}`);
  findings.forEach((f) => {
    const icon = f.severity === 'HIGH' ? '🔴' : f.severity === 'MEDIUM' ? '🟡' : '🔵';
    console.log(`   ${icon} [Linha ${f.line}] ${f.name} (-${f.penalty} pts)`);
    console.log(`      Snippet: "${f.snippet}"`);
    console.log(`      Problema: ${f.message}`);
    console.log(`      💡 Solução Craftsman: ${f.suggestion}\n`);
  });
});

console.log('===============================================================');
console.log(`📊 CRAFTSMANSHIP SCORE: ${score}/100`);
if (score >= 90) {
  console.log('🟢 Status: EXCELENTE. Acabamento artesanal nível Linear/Apple.');
} else if (score >= 70) {
  console.log('🟡 Status: ACEITÁVEL. Contém alguns clichês de IA que podem ser polidos.');
} else {
  console.log('🔴 Status: REPROVADO. A interface apresenta alta incidência de vícios de IA.');
}
console.log('===============================================================\n');

process.exit(score >= 85 ? 0 : 1);
