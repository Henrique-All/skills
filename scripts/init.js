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

// A. Pasta .code-map e Indexação 360° da Cartografia (graph.json + INDEX.md)
const codeMapDir = path.join(targetDir, '.code-map');
const graphJsonPath = path.join(codeMapDir, 'graph.json');
const indexMdPath = path.join(codeMapDir, 'INDEX.md');
let needsCartographyInit = isForce || !fs.existsSync(graphJsonPath) || !fs.existsSync(indexMdPath);
if (!needsCartographyInit && fs.existsSync(graphJsonPath)) {
  try {
    const g = JSON.parse(fs.readFileSync(graphJsonPath, 'utf-8'));
    if (!g.nodes || g.nodes.length === 0) needsCartographyInit = true;
  } catch {
    needsCartographyInit = true;
  }
}

if (needsCartographyInit) {
  if (!fs.existsSync(codeMapDir)) fs.mkdirSync(codeMapDir, { recursive: true });
  const cartCandidates = [
    path.resolve(__dirname, '..', 'repo-cartographer', 'scripts', 'cartographer.js'),
    path.resolve(__dirname, '..', 'skills', 'repo-cartographer', 'scripts', 'cartographer.js')
  ];
  const cartScript = cartCandidates.find((c) => fs.existsSync(c));
  if (cartScript) {
    try {
      const { execSync } = require('child_process');
      execSync(`node "${cartScript}" init "${targetDir}"`, { cwd: targetDir, stdio: 'pipe' });
      console.log(`   ✅ ${colors.green}[MAPEADO]${colors.reset} Cartografia 360° gerada em .code-map/INDEX.md e .code-map/graph.json`);
    } catch {
      fs.writeFileSync(path.join(codeMapDir, '.gitkeep'), '');
      console.log(`   ✅ ${colors.green}[CRIADO]${colors.reset} Diretório .code-map/ preparado`);
    }
  } else {
    fs.writeFileSync(path.join(codeMapDir, '.gitkeep'), '');
    console.log(`   ✅ ${colors.green}[CRIADO]${colors.reset} Diretório .code-map/ para cache de alta performance`);
  }
} else {
  console.log(`   ℹ️  Cartografia .code-map/ (INDEX.md + graph.json) já existente e populada`);
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
    version: "2.5.1",
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

// C. audit.config.json para DevSecOps Audit
const auditConfigPath = path.join(targetDir, 'audit.config.json');
if (!fs.existsSync(auditConfigPath) || isForce) {
  const targetScanDirs = ["src", "app", "pages", "server", "lib"].filter(d => fs.existsSync(path.join(targetDir, d)));
  const excludeDirs = ["node_modules", "dist", "build", ".next", ".git", ".agents", ".code-map"];
  const auditConfig = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    version: "2.5.1",
    autoDetect: true,
    scanDirectories: targetScanDirs.length > 0 ? targetScanDirs : ["."],
    exclude: excludeDirs,
    pilaresAtivos: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
    bloquearCommitEm: ["CRITICO", "ALTO"],
    autofixSeguro: true,
    rules: {
      minBcryptRounds: 10,
      secretsScan: {
        ignorePaths: excludeDirs,
        regexPatterns: [
          "AKIA[0-9A-Z]{16}",
          "AIza[0-9A-Za-z\\-_]{35}",
          "-----BEGIN (?:RSA |EC )?PRIVATE KEY-----",
          "ghp_[0-9a-zA-Z]{36}",
          "sk-proj-[a-zA-Z0-9_-]{30,}"
        ]
      }
    },
    exceptionsFile: ".audit-exceptions.json"
  };

  fs.writeFileSync(auditConfigPath, JSON.stringify(auditConfig, null, 2));
  console.log(`   ✅ ${colors.green}[CRIADO]${colors.reset} audit.config.json configurado com os 18 pilares OWASP`);
} else {
  console.log(`   ℹ️  audit.config.json já existente`);
}

// D. AGENTS.md na raiz do projeto (carregado nativamente por Antigravity, Claude Code, Cursor e Copilot)
const agentsMdPath = path.join(targetDir, 'AGENTS.md');
const cartographyDirective = `# 🗺️ Diretriz de Cartografia 360° (Enterprise AI Suite)

## 1. PASSO ZERO OBRIGATÓRIO: Olhar a Cartografia Primeiro (Proibido Dar Voltas)
- Antes de executar buscas às cegas (\`grep_search\`, \`find_by_name\`, \`list_dir\` em cascata), **leia imediatamente \`.code-map/INDEX.md\`** (ou \`.code-map/graph.json\`) usando \`view_file\`.
- Use os caminhos das 6 camadas (UI → Estado → API → Backend → Banco → Infra) já mapeados lá para abrir diretamente os arquivos exatos da demanda.
- Para filtrar um termo no grafo: \`node "$env:USERPROFILE\\.gemini\\config\\plugins\\enterprise-ai-suite\\skills\\repo-cartographer\\scripts\\cartographer.js" query "<termo>"\`

## 2. PASSO FINAL OBRIGATÓRIO: Atualizar a Cartografia ao Concluir
- Sempre que criar, remover ou editar arquivos que alterem imports, rotas, componentes ou schemas, **atualize o mapa antes de encerrar a tarefa** rodando:
  \`node "$env:USERPROFILE\\.gemini\\config\\plugins\\enterprise-ai-suite\\skills\\repo-cartographer\\scripts\\cartographer.js" init .\`
`;

if (!fs.existsSync(agentsMdPath)) {
  fs.writeFileSync(agentsMdPath, cartographyDirective, 'utf-8');
  console.log(`   ✅ ${colors.green}[CRIADO]${colors.reset} AGENTS.md na raiz do projeto (avisa a IA sobre o .code-map/ automaticamente)`);
} else {
  const existingAgents = fs.readFileSync(agentsMdPath, 'utf-8');
  if (!existingAgents.includes('.code-map/INDEX.md')) {
    fs.writeFileSync(agentsMdPath, cartographyDirective + '\n---\n\n' + existingAgents, 'utf-8');
    console.log(`   ✅ ${colors.green}[ATUALIZADO]${colors.reset} AGENTS.md injetado com a regra de Cartografia-First & Sync Final`);
  } else {
    console.log(`   ℹ️  AGENTS.md já contém a diretriz de Cartografia-First`);
  }
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
console.log(`   🔒 ${colors.cyan}/devsecops-audit Audite o projeto contra os 18 pilares DevSecOps pré-deploy${colors.reset}\n`);
