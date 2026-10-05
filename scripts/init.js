#!/usr/bin/env node
/**
 * scripts/init.js
 * Autoconfiguração Inteligente por Detecção de Stack para Enterprise AI Suite
 * Analisa a base de código do projeto atual e calibra as configurações de rotas,
 * cartografia, mobile e DevSecOps sob medida para o framework detectado.
 */

const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2] && !process.argv[2].startsWith('--')
  ? path.resolve(process.argv[2])
  : process.cwd();

const isForce = process.argv.includes('--force');

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  magenta: '\x1b[35m'
};

console.log(`\n${colors.cyan}${colors.bold}⚙️  ENTERPRISE AI SUITE — INICIALIZADOR DE PROJETO (INIT)${colors.reset}`);
console.log(`${colors.gray}Analisando stack tecnológica em: ${targetDir}${colors.reset}\n`);

// 1. Detecção de Stack
const stack = {
  packageJson: null,
  isTypeScript: false,
  frontend: null,
  styling: null,
  backend: null,
  orm: null,
  pathAliases: {}
};

const pkgPath = path.join(targetDir, 'package.json');
if (fs.existsSync(pkgPath)) {
  try {
    stack.packageJson = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const allDeps = {
      ...(stack.packageJson.dependencies || {}),
      ...(stack.packageJson.devDependencies || {})
    };

    // Frontend Framework
    if (allDeps['next']) stack.frontend = 'Next.js';
    else if (allDeps['vite']) stack.frontend = 'Vite';
    else if (allDeps['react']) stack.frontend = 'React';
    else if (allDeps['vue']) stack.frontend = 'Vue';
    else if (allDeps['@angular/core']) stack.frontend = 'Angular';

    // Styling & UI
    if (allDeps['tailwindcss']) {
      stack.styling = allDeps['tailwindcss'].startsWith('4') || allDeps['tailwindcss'].startsWith('^4')
        ? 'Tailwind CSS v4 (@theme)'
        : 'Tailwind CSS v3';
    }
    if (allDeps['framer-motion']) stack.motion = 'Framer Motion (Física de Molas)';

    // Backend
    if (allDeps['@nestjs/core']) stack.backend = 'NestJS';
    else if (allDeps['express']) stack.backend = 'Express';
    else if (allDeps['fastify']) stack.backend = 'Fastify';
    else if (allDeps['koa']) stack.backend = 'Koa';

    // ORM / Banco
    if (allDeps['prisma'] || allDeps['@prisma/client']) stack.orm = 'Prisma';
    else if (allDeps['drizzle-orm']) stack.orm = 'Drizzle';
    else if (allDeps['typeorm']) stack.orm = 'TypeORM';
    else if (allDeps['mongoose']) stack.orm = 'Mongoose';
  } catch (e) {
    console.warn(`${colors.yellow}⚠️  Não foi possível parsear package.json: ${e.message}${colors.reset}`);
  }
}

// Detecção TypeScript & Aliases
const tsConfigPath = path.join(targetDir, 'tsconfig.json');
if (fs.existsSync(tsConfigPath)) {
  stack.isTypeScript = true;
  try {
    const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf-8'));
    const paths = tsConfig.compilerOptions?.paths || {};
    stack.pathAliases = paths;
  } catch (e) {}
}

// 2. Exibição da Stack Identificada
console.log(`🔍 ${colors.bold}Stack Identificada:${colors.reset}`);
console.log(`   • Linguagem:     ${stack.isTypeScript ? colors.green + 'TypeScript' : colors.yellow + 'JavaScript'}${colors.reset}`);
console.log(`   • Front-end:     ${stack.frontend ? colors.cyan + stack.frontend : colors.gray + 'Não detectado'}${colors.reset}`);
console.log(`   • Estilização:   ${stack.styling ? colors.cyan + stack.styling : colors.gray + 'CSS padrão'}${colors.reset}`);
console.log(`   • Animações:     ${stack.motion ? colors.green + stack.motion : colors.gray + 'Nenhuma biblioteca de molas'}${colors.reset}`);
console.log(`   • Back-end:      ${stack.backend ? colors.cyan + stack.backend : (stack.frontend === 'Next.js' ? colors.cyan + 'Next.js API Routes / Server Actions' : colors.gray + 'Não detectado')}${colors.reset}`);
console.log(`   • ORM / Dados:   ${stack.orm ? colors.cyan + stack.orm : colors.gray + 'Não detectado'}${colors.reset}`);

// 3. Criação de Pastas e Configurações Recomendadas
console.log(`\n📦 ${colors.bold}Aplicando Calibração Automática...${colors.reset}`);

// A. Pasta .code-map para cache da Cartografia
const codeMapDir = path.join(targetDir, '.code-map');
if (!fs.existsSync(codeMapDir)) {
  fs.mkdirSync(codeMapDir, { recursive: true });
  fs.writeFileSync(path.join(codeMapDir, '.gitkeep'), '');
  console.log(`   ✅ ${colors.green}[CRIADO]${colors.reset} Diretório .code-map/ para cache de alta performance`);
} else {
  console.log(`   ℹ️  Diretório .code-map/ já existente`);
}

// B. route-guard.config.json
const routeGuardConfigPath = path.join(targetDir, 'route-guard.config.json');
if (!fs.existsSync(routeGuardConfigPath) || isForce) {
  let routesDir = 'src/routes';
  if (stack.frontend === 'Next.js') routesDir = 'app/api';
  else if (stack.backend === 'NestJS') routesDir = 'src';
  else if (stack.backend === 'Express') routesDir = 'src/routes';

  const routeGuardConfig = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    version: "2.3.0",
    routesDirectory: routesDir,
    clientScanDirectories: ["src", "app", "components", "pages"].filter(d => fs.existsSync(path.join(targetDir, d))),
    framework: stack.backend || stack.frontend || "custom",
    strictZeroTrust: true,
    preventBreakingChanges: true
  };

  fs.writeFileSync(routeGuardConfigPath, JSON.stringify(routeGuardConfig, null, 2));
  console.log(`   ✅ ${colors.green}[CRIADO]${colors.reset} route-guard.config.json calibrado para ${stack.backend || stack.frontend || 'projeto'}`);
} else {
  console.log(`   ℹ️  route-guard.config.json já existente`);
}

// C. audit.config.json para Security Audit
const auditConfigPath = path.join(targetDir, 'audit.config.json');
if (!fs.existsSync(auditConfigPath) || isForce) {
  const targetScanDirs = ["src", "app", "pages", "server", "lib"].filter(d => fs.existsSync(path.join(targetDir, d)));
  const auditConfig = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    version: "2.3.0",
    scanDirectories: targetScanDirs.length > 0 ? targetScanDirs : ["."],
    exclude: ["node_modules", "dist", ".next", ".git", ".agents", ".code-map"],
    pilaresAtivos: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
    bloquearCommitEm: ["CRITICO", "ALTO"],
    autofixSeguro: true
  };

  fs.writeFileSync(auditConfigPath, JSON.stringify(auditConfig, null, 2));
  console.log(`   ✅ ${colors.green}[CRIADO]${colors.reset} audit.config.json configurado com os 18 pilares OWASP`);
} else {
  console.log(`   ℹ️  audit.config.json já existente`);
}

// 4. Orientações de Produtividade no Chat
console.log(`\n🎉 ${colors.green}${colors.bold}PROJETO INICIALIZADO COM SUCESSO NO ENTERPRISE AI SUITE!${colors.reset}`);
console.log(`\n💡 ${colors.bold}Exemplos de Prompts Recomendados para esta Stack:${colors.reset}`);
if (stack.frontend) {
  console.log(`   🎨 ${colors.cyan}/orch Crie a nova tela de listagem e detalhes com paleta Linear, física de molas e adaptação mobile${colors.reset}`);
}
if (stack.backend || stack.frontend === 'Next.js') {
  console.log(`   🛡️ ${colors.cyan}/route-guard Analise o impacto antes de alterar endpoints da API${colors.reset}`);
}
console.log(`   ⚡ ${colors.cyan}/orch --fast <tarefa cirúrgica rápida sem burocracia>${colors.reset}`);
console.log(`   🔒 ${colors.cyan}/security-audit Audite o projeto contra os 18 pilares DevSecOps pré-deploy${colors.reset}\n`);
