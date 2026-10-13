#!/usr/bin/env node
/**
 * test-forge/scripts/forge-api-test.js
 * Gerador de Testes de Integração de API Reais (Anti-Mock Slop)
 * Gera suíte com 4 cenários rigorosos: 200/201 Sucesso, 400 Bad Request, 401 Não Autorizado, 404/409 Limite.
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
let outFileVal = null;
const outEqArg = args.find(a => a.startsWith('--out='));
const outIdx = args.indexOf('--out');
if (outEqArg) {
  outFileVal = outEqArg.split('=')[1];
} else if (outIdx >= 0 && args[outIdx + 1]) {
  outFileVal = args[outIdx + 1];
}

const positionalArgs = args.filter((a, i) => !a.startsWith('--') && (outIdx < 0 || i !== outIdx + 1));
const method = (positionalArgs[0] || 'GET').toUpperCase();
const route = positionalArgs[1] || '/api/example';
const defaultFilename = `${route.replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+/, '')}.integration.test.ts`;
const outPath = outFileVal ? path.resolve(outFileVal) : path.resolve(process.cwd(), 'test', defaultFilename);

const httpMethod = method.toLowerCase();
const successStatus = method === 'POST' ? 201 : 200;
const validPayloadLine = method !== 'GET' ? `\n      .send({ title: 'Item de Teste', quantity: 2 })` : '';

const testContent = `/**
 * ${path.basename(outPath)}
 * Teste de Integração Real gerado pelo Test Forge (Enterprise AI Suite)
 * Valida requisições HTTP reais sem mocks fantasmas.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
// Importe a instância real da sua aplicação Express / Fastify / NestJS:
import { app } from '../src/app';

describe('Integration Test: ${method} ${route}', () => {
  const authToken = 'Bearer demo-test-token-header';

  // 1. Caminho Feliz (${successStatus})
  it('deve responder com sucesso quando o payload for válido', async () => {
    const res = await request(app)
      .${httpMethod}('${route}')
      .set('Authorization', authToken)${validPayloadLine};

    expect(res.status).toBe(${successStatus});
    expect(res.body).toBeDefined();
  });
${method !== 'GET' ? `
  // 2. Erro de Validação de Schema (400)
  it('deve responder 400 Bad Request quando campos obrigatórios estiverem ausentes', async () => {
    const res = await request(app)
      .${httpMethod}('${route}')
      .set('Authorization', authToken)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
` : ''}
  // 3. Bloqueio de Autenticação (401)
  it('deve rejeitar com 401 Unauthorized quando não houver token de autenticação', async () => {
    const res = await request(app)
      .${httpMethod}('${route}');

    expect(res.status).toBe(401);
  });

  // 4. Cenário de Limite / Não Encontrado (404 ou 409)
  it('deve tratar adequadamente registros inexistentes ou conflitos', async () => {
    const res = await request(app)
      .${httpMethod}('${route}/registro-inexistente-999')
      .set('Authorization', authToken);

    expect([404, 409, 400, 422]).toContain(res.status);
  });
});
`;

const destDir = path.dirname(outPath);
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

fs.writeFileSync(outPath, testContent);
console.log(`\n✅ Teste de integração de API gerado com sucesso em: ${outPath}`);
console.log(`   Endpoint coberto: [${method}] ${route}\n`);
