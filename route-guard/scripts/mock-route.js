#!/usr/bin/env node
/**
 * scripts/mock-route.js - Servidor de Mock HTTP Zero-Dependency & Zero-Trust
 * 
 * Sobe um servidor de mock em 1 segundo com CORS total e respostas realistas
 * para permitir desenvolvimento paralelo de frontend sem bloqueio pelo backend.
 * 
 * Uso:
 *   node mock-route.js
 *   node mock-route.js POST /api/users --port 3333
 *   node mock-route.js --delay 300 --status 201
 */

const http = require('http');
const url = require('url');

const args = process.argv.slice(2);
const flags = {};
const cleanArgs = [];

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    if (args[i + 1] && !args[i + 1].startsWith('--')) {
      flags[key] = args[i + 1];
      i++;
    } else {
      flags[key] = true;
    }
  } else {
    cleanArgs.push(arg);
  }
}

const PORT = parseInt(flags.port || '3333', 10);
const DELAY = parseInt(flags.delay || '100', 10);
const DEFAULT_STATUS = parseInt(flags.status || '200', 10);

function generateRealisticMock(pathname, method) {
  const segments = pathname.split('/').filter(s => s && s !== 'api' && s !== 'v1' && s !== 'v2');
  const entity = segments[0] || 'item';
  const id = segments[1] || 'mock-' + Math.floor(Math.random() * 8999 + 1000);

  if (pathname.includes('/auth') || pathname.includes('/login')) {
    return {
      token: 'jwt_mock_' + Math.random().toString(36).substring(2),
      user: {
        id: 'usr_mock_1',
        email: 'user@empresa.com',
        role: 'ADMIN'
      }
    };
  }

  if (method === 'GET' && !segments[1]) {
    // Listagem
    return [
      { id: `${entity}_1`, name: `${entity} Exemplo Alpha`, status: 'ACTIVE', createdAt: new Date().toISOString() },
      { id: `${entity}_2`, name: `${entity} Exemplo Beta`, status: 'PENDING', createdAt: new Date().toISOString() }
    ];
  }

  return {
    id,
    resource: entity,
    name: `${entity} Demo ${id}`,
    status: method === 'POST' ? 'CREATED' : 'UPDATED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const start = Date.now();

  // CORS Headers universais
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    setTimeout(() => {
      let parsedBody = null;
      try {
        if (body) parsedBody = JSON.parse(body);
      } catch (e) {}

      let status = DEFAULT_STATUS;
      if (req.method === 'POST' && DEFAULT_STATUS === 200) status = 201;

      const mockData = generateRealisticMock(parsedUrl.pathname, req.method);
      const responsePayload = {
        success: status >= 200 && status < 300,
        data: mockData,
        echoInput: parsedBody,
        timestamp: new Date().toISOString(),
        _mock: {
          server: 'Route Guard Mock Server',
          endpoint: parsedUrl.pathname,
          method: req.method,
          latencyMs: Date.now() - start
        }
      };

      res.setHeader('Content-Type', 'application/json');
      res.writeHead(status);
      res.end(JSON.stringify(responsePayload, null, 2));

      const duration = Date.now() - start;
      const statusColor = status >= 400 ? '❌' : (status >= 300 ? '⚠️' : '✅');
      console.log(`${statusColor} [${req.method}] ${parsedUrl.pathname} -> ${status} (${duration}ms)`);
    }, DELAY);
  });
});

server.listen(PORT, () => {
  console.log('===============================================================');
  console.log('🛡️  ROUTE GUARD — SERVIDOR DE MOCK HTTP ZERO-TRUST');
  console.log('===============================================================');
  console.log(`🚀 Mock Server ativo em: http://localhost:${PORT}`);
  console.log(`⏱️  Latência simulada:   ${DELAY}ms`);
  console.log(`🌐 CORS habilitado:      Access-Control-Allow-Origin: *`);
  console.log(`🎯 Status padrão:        ${DEFAULT_STATUS}`);
  console.log('---------------------------------------------------------------');
  console.log('Rotas prontas para consumo:');
  console.log(`  - GET    http://localhost:${PORT}/api/users`);
  console.log(`  - POST   http://localhost:${PORT}/api/orders`);
  console.log(`  - GET    http://localhost:${PORT}/api/products/123`);
  console.log('Pressione CTRL+C para encerrar.\n');
});

// Tratamento de shutdown limpo
process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando mock server Route Guard...');
  server.close(() => process.exit(0));
});

module.exports = server;
