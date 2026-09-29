---
name: test-forge
description: Engenharia de Testes Automatizados de Alta Fidelidade (Anti-Mock Slop). Gera testes de integração de API reais (Supertest/Vitest) e testes E2E táteis (Playwright) com validação mobile.
---

# 🧪 Test Forge — Engenharia de Testes Reais & Anti-Mock Fantasma (Nota: 10.0/10)

O **Test Forge** é o padrão industrial definitivo de engenharia de testes para Agentes de IA. Ele elimina os "testes cosméticos" e os "mocks fantasmas" (testes gerados por IA que mockam todas as funções e não validam nenhum comportamento real da aplicação).

---

## 🛑 Os 4 Vícios de IA em Testes Automatizados (Anti-Patterns):
1. **Mock Fantasma:** Mockar todas as camadas do sistema até o ponto em que o teste valida apenas se `expect(true).toBe(true)`. Se a rota quebrar, o teste continua passando.
2. **Ausência de Cenários Adversários:** Testar apenas o "caminho feliz" (Happy Path 200 OK), ignorando entradas maliciosas, dados ausentes (400), credenciais inválidas (401) e concorrência (409).
3. **Mocks de Banco que Divergem do Schema:** Mocks que retornam estruturas antigas que não condizem com o Prisma/Drizzle real.
4. **Testes E2E sem Ergonomia Mobile:** Testar apenas telas desktop de 1920x1080 e esquecer como a tela se comporta em celulares reais (390px, Safe Areas e gestos táteis).

---

## 💡 Como o Test Forge Opera:

### 1. O Triângulo de Ouro dos Testes Reais:
- **Nível 1 (Integração de Rotas Real):** Testa requisições HTTP reais com `Supertest` ou injetor de rotas, validando schemas Zod e status codes HTTP.
- **Nível 2 (E2E Tátil com Playwright):** Abre o navegador em viewport mobile (`iPhone 15 Pro`), clica nos botões táteis (44px+) e testa o fechamento de BottomSheets por arrasto (`drag`).
- **Nível 3 (Unitário Puro):** Apenas para funções de negócio puras (ex: cálculo de frete, regras tributárias, algoritmos).

### 2. Gerador de Testes de Rota (`scripts/forge-api-test.js`):
Gera uma suíte completa de integração para qualquer endpoint (Ex: `POST /api/orders`):
- `[200/201]` Payload válido e retorno com formato esperado;
- `[400]` Payload inválido (campo obrigatório ausente, tipo incorreto);
- `[401]` Requisição sem header de autorização (Bearer token);
- `[409]` Cenário de duplicidade ou race condition.

### 3. Gerador E2E Playwright (`scripts/forge-e2e.js`):
Cria specs Playwright configuradas para:
- Emulação de smartphone (`devices['iPhone 15 Pro']`);
- Checagem de touch targets mínimos de 44x44px;
- Validação de que não há scroll horizontal em 375px.

### 4. Auditor Determinístico de Testes (`scripts/test-audit.js`):
Calcula o **Test Quality Score (0–100)** da base de código:
- Detecta mocks excessivos em relação às asserções;
- Detecta asserções vazias ou triviais;
- Alerta ausência de testes de integração.

---

## 💻 Comandos e Ferramentas (CLI):
```bash
# 1. Gerar teste de integração de API completo:
node test-forge/scripts/forge-api-test.js POST /api/orders --out test/orders.integration.test.ts

# 2. Gerar teste E2E tátil para Playwright (Mobile + Desktop):
node test-forge/scripts/forge-e2e.js /checkout --out e2e/checkout.spec.ts

# 3. Auditar a qualidade e robustez dos testes existentes:
node test-forge/scripts/test-audit.js test/

# 4. Validar integridade da skill:
cd test-forge && npm test
```
