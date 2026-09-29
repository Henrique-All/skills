#!/usr/bin/env node
/**
 * scripts/mobile-audit.js - Motor Determinístico de Auditoria Mobile (com Autofix)
 * Analisa arquivos .tsx, .jsx, .html, .vue e .css em busca de anti-patterns mobile.
 * Calcula o Mobile Readiness Score (0 a 100) e suporta correção automática com --fix.
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const isStrict = args.includes('--strict');
const shouldFix = args.includes('--fix');
const targetArg = args.find((a) => !a.startsWith('--')) || '.';

const SUPPORTED_EXTS = ['.tsx', '.jsx', '.html', '.vue', '.css'];

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const stat = fs.statSync(dirPath);
  if (!stat.isDirectory()) {
    return [dirPath];
  }

  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    if (file === 'node_modules' || file.startsWith('.') || file === 'dist' || file === 'build') return;
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else if (SUPPORTED_EXTS.includes(path.extname(fullPath))) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

const files = getAllFiles(path.resolve(process.cwd(), targetArg));

if (files.length === 0) {
  console.log('ℹ️  Nenhum arquivo relevante (.tsx, .jsx, .html, .vue, .css) encontrado para auditoria mobile.');
  process.exit(0);
}

console.log('===============================================================');
console.log('📱 MOBILE CRAFTSMANSHIP & READINESS AUDIT (10.0 EDITION)');
if (shouldFix) console.log('🔧 MODO AUTOFIX ATIVADO: Correções automáticas serão aplicadas');
console.log('===============================================================');
console.log(`🔍 Analisando ${files.length} arquivo(s)...\n`);

let totalDeductions = 0;
const violations = [];
const filesModified = new Set();

const RULES = [
  {
    id: 'VIEWPORT_FIT_COVER',
    penalty: 15,
    name: 'Meta Viewport sem viewport-fit=cover (iOS desativa Safe Areas)',
    check: (line, content, ext) => {
      if (ext === '.html' && line.includes('<meta') && line.includes('viewport') && !line.includes('viewport-fit=cover')) {
        return 'No iOS Safari, variáveis env(safe-area-inset-*) são ignoradas a menos que o HTML contenha viewport-fit=cover.';
      }
      return null;
    },
    fix: (line, ext) => {
      if (ext === '.html' && line.includes('<meta') && line.includes('viewport') && !line.includes('viewport-fit=cover')) {
        return line.replace(/content="([^"]+)"/, 'content="$1, viewport-fit=cover"');
      }
      return line;
    }
  },
  {
    id: 'VIEWPORT_100VH',
    penalty: 15,
    name: 'Uso de 100vh/h-screen sem dvh (Bug Safari/Chrome mobile)',
    check: (line, content) => {
      if ((line.includes('100vh') || line.includes('h-screen')) && !line.includes('dvh') && !line.includes('svh')) {
        return 'Substitua "100vh" ou "h-screen" por "100dvh" ou "min-h-dvh" para evitar sobreposição da barra de navegação móvel.';
      }
      return null;
    },
    fix: (line) => {
      return line
        .replace(/\bh-screen\b/g, 'min-h-screen min-h-dvh')
        .replace(/100vh/g, '100dvh');
    }
  },
  {
    id: 'SAFE_AREA_BOTTOM',
    penalty: 20,
    name: 'Elemento fixado na base sem padding de Safe Area',
    check: (line, content) => {
      if ((line.includes('fixed bottom-0') || line.includes('bottom: 0')) && 
          !line.includes('safe-area-inset-bottom') && 
          !content.includes('safe-area-inset-bottom')) {
        return 'Adicione padding para a barra Home do iPhone: pb-[env(safe-area-inset-bottom)] ou padding-bottom: max(16px, env(safe-area-inset-bottom)).';
      }
      return null;
    },
    fix: (line) => {
      if (line.includes('fixed bottom-0') && !line.includes('safe-area-inset-bottom')) {
        return line.replace('fixed bottom-0', 'fixed bottom-0 pb-[env(safe-area-inset-bottom)]');
      }
      return line;
    }
  },
  {
    id: 'IOS_INPUT_ZOOM',
    penalty: 15,
    name: 'Input com fonte < 16px (Provoca auto-zoom no iOS Safari)',
    check: (line) => {
      const isInput = line.includes('<input') || line.includes('<select') || line.includes('<textarea');
      if (isInput && (line.includes('text-xs') || line.includes('text-sm')) && !line.includes('text-base')) {
        return 'Inputs mobile devem ter no mínimo 16px (text-base md:text-sm) para impedir o zoom automático forçado do iOS Safari.';
      }
      return null;
    },
    fix: (line) => {
      const isInput = line.includes('<input') || line.includes('<select') || line.includes('<textarea');
      if (isInput && line.includes('text-sm') && !line.includes('text-base')) {
        return line.replace('text-sm', 'text-base md:text-sm');
      }
      return line;
    }
  },
  {
    id: 'UNRESPONSIVE_TABLE',
    penalty: 20,
    name: 'Tabela HTML sem adaptação para mobile (Quebra viewport)',
    check: (line, content) => {
      if (line.includes('<table') && !content.includes('overflow-x-auto') && !content.includes('md:table')) {
        return 'Tabelas devem estar envoltas em container com "overflow-x-auto" ou convertidas em cards táteis no mobile (hidden md:table / md:hidden).';
      }
      return null;
    }
  },
  {
    id: 'SMALL_TOUCH_TARGET',
    penalty: 10,
    name: 'Botão/Link com área de toque inferior a 44x44px',
    check: (line) => {
      const isButton = line.includes('<button') || (line.includes('<a') && line.includes('role="button"'));
      if (isButton && (line.includes('p-1 ') || line.includes('p-0.5') || line.includes('h-6 ') || line.includes('h-7 '))) {
        if (!line.includes('min-h-[44px]') && !line.includes('min-h-[48px]')) {
          return 'Touch targets no celular devem ter no mínimo 44x44px (Apple HIG). Adicione min-h-[44px] min-w-[44px] ou padding generoso.';
        }
      }
      return null;
    }
  },
  {
    id: 'FIXED_WIDTH_SPILL',
    penalty: 20,
    name: 'Largura fixa grande que estoura telas de smartphone (< 390px)',
    check: (line) => {
      const match = line.match(/(?:w|min-w)-\[(\d+)px\]/);
      if (match) {
        const px = parseInt(match[1], 10);
        if (px > 360 && !line.includes('max-w-full') && !line.includes('w-full')) {
          return `Largura fixa de ${px}px excede a largura de smartphones padrão (~390px). Use w-full max-w-[${px}px].`;
        }
      }
      return null;
    }
  },
  {
    id: 'PWA_THEME_COLOR',
    penalty: 10,
    name: 'HTML sem meta tag theme-color (Barra de status desarmônica)',
    check: (line, content, ext) => {
      if (ext === '.html' && line.includes('<head') && !content.includes('name="theme-color"')) {
        return 'Adicione <meta name="theme-color" content="#09090b"> no <head> para colorir a barra de status no iOS e Android.';
      }
      return null;
    },
    fix: (line, ext) => {
      if (ext === '.html' && line.includes('<head>')) {
        return line + '\n    <meta name="theme-color" content="#09090b">';
      }
      return line;
    }
  },
  {
    id: 'PWA_IOS_CAPABLE',
    penalty: 5,
    name: 'HTML sem suporte a Web App standalone iOS (apple-mobile-web-app-capable)',
    check: (line, content, ext) => {
      if (ext === '.html' && line.includes('<head') && !content.includes('apple-mobile-web-app-capable')) {
        return 'Adicione <meta name="apple-mobile-web-app-capable" content="yes"> para permitir execução full-screen no iOS.';
      }
      return null;
    }
  }
];

files.forEach((filePath) => {
  const relPath = path.relative(process.cwd(), filePath);
  const ext = path.extname(filePath);
  let content = fs.readFileSync(filePath, 'utf-8');
  let lines = content.split('\n');
  let fileChanged = false;

  lines.forEach((line, index) => {
    RULES.forEach((rule) => {
      const issue = rule.check(line, content, ext);
      if (issue) {
        if (shouldFix && rule.fix) {
          const fixedLine = rule.fix(line, ext);
          if (fixedLine !== line) {
            lines[index] = fixedLine;
            fileChanged = true;
            console.log(`🔧 [AUTO-FIX] ${relPath}:${index + 1} -> ${rule.name}`);
            return;
          }
        }

        violations.push({
          file: relPath,
          lineNum: index + 1,
          ruleId: rule.id,
          penalty: rule.penalty,
          name: rule.name,
          snippet: line.trim().substring(0, 80),
          suggestion: issue
        });
        totalDeductions += rule.penalty;
      }
    });
  });

  if (fileChanged) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    filesModified.add(relPath);
  }
});

const score = Math.max(0, 100 - totalDeductions);

console.log('\n---------------------------------------------------------------');
console.log(`📊 PONTUAÇÃO FINAL DE READINESS MOBILE: ${score}/100`);
if (filesModified.size > 0) {
  console.log(`✨ Arquivos corrigidos automaticamente: ${filesModified.size}`);
}
console.log('---------------------------------------------------------------\n');

if (violations.length === 0) {
  console.log('✨ PARABÉNS! Nenhuma violação mobile encontrada.');
  console.log('✅ Interface 100% pronta para telas mobile (iOS e Android).\n');
  process.exit(0);
}

console.log(`⚠️  Foram detectadas ${violations.length} oportunidade(s) de melhoria:\n`);

violations.forEach((v, i) => {
  console.log(`${i + 1}. [${v.ruleId}] -${v.penalty} pts`);
  console.log(`   📁 Arquivo: ${v.file}:${v.lineNum}`);
  console.log(`   🏷️  Regra: ${v.name}`);
  console.log(`   📄 Linha: "${v.snippet}"`);
  console.log(`   💡 Solução: ${v.suggestion}\n`);
});

if (score < 85) {
  console.log('🚨 ATENÇÃO: O Score Mobile ficou abaixo de 85/100.');
  console.log('Dica: Execute com --fix para aplicar correções automáticas:');
  console.log(`  node scripts/mobile-audit.js ${targetArg} --fix\n`);
  if (isStrict) {
    process.exit(1);
  }
} else {
  console.log('🎉 Score satisfatório (≥ 85/100). Interface com excelente ergonomia mobile.\n');
}
