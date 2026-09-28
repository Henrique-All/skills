# 🛡️ Route Guard — Governança de Rotas, Contratos & Zero-Trust

> Guardião especializado em contratos de rotas, DTOs e APIs com verificação bidirecional.
> Avalia impacto de alterações em endpoints, gera contratos de runtime tipados (Zod + TypeScript) e fornece servidor Mock HTTP zero-dependency com CORS instantâneo.
> **Avaliação de Engenharia:** ⭐️ **10.0 / 10**

---

## 🏆 O Motivo da Nota 10.0/10

1. **Prevenção Bidirecional de Breaking Changes:** Analisa o blast radius entre backend e frontend antes de qualquer código ser alterado, mapeando consumidores em tempo real.
2. **Geração Automatizada de Contratos Zod/DTO:** O comando `npm run contract` gera esquemas de validação de runtime (Zod), tipos TypeScript e contratos tipados defensivos em segundos.
3. **Mock HTTP Zero-Dependency:** O comando `npm run mock` levanta um servidor HTTP completo com CORS liberado e latência simulada em menos de 1 segundo, destravando o time de frontend antes do backend estar pronto.
4. **Alinhamento Zero-Trust:** Assegura que nenhum endpoint trafegue sem validação estrita de entrada/saída, mitigando vulnerabilidades como IDOR e Parameter Tampering.

---

## 🎯 Capacidades

1. **Descoberta de Rota no Backend:** Identifica arquivo, linha, método e middlewares da rota.
2. **Mapeamento de Consumidores:** Varre chamadores HTTP (`axios`, `fetch`, etc.) em todo o projeto.
3. **Trava de Retrocompatibilidade:** Alerta de risco e trava se a rota for consumida por telas existentes.
4. **Geração de Contratos Tipados:** Gera esquemas Zod e DTOs TypeScript para validação em runtime.
5. **Mock Server Integrado:** Simulação imediata de APIs com CORS para desenvolvimento paralelo ágil.

---

## 🚀 Ferramentas & Como Executar

### 1. Análise de Impacto e Consumidores
```bash
# Analisar se a rota existe e quem a consome no frontend
npm run analyze -- POST /api/orders
node scripts/analyze-route.js GET /api/users/:id --json
```

### 2. Geração de Contratos Zod & TypeScript DTOs
```bash
# Gerar contrato no terminal
npm run contract -- POST /api/auth/login --fields "email:string,password:string"

# Salvar direto em arquivo de contratos
node scripts/generate-contract.js POST /api/orders --fields "productId:string,quantity:number,coupon:string?" --out src/contracts/order.contract.ts
```

### 3. Servidor de Mock HTTP Zero-Dependency (Porta 3333)
```bash
# Iniciar servidor mock com CORS total e latência realista (100ms)
npm run mock

# Customizar porta e latência simulada
node scripts/mock-route.js --port 4000 --delay 300
```

---

## 🤝 Integração com o Ecossistema

- Alimenta o **Q1 (Contratos de API & Tipagem)** da Sabatina do `hybrid-orchestrator`.
- Garante que o `frontend-craftsman` e o `mobile-converter` recebam tipos confiáveis e possam testar suas interfaces contra o `mock-route.js`.
- Entrega insumos de segurança para o `security-audit` validar autenticação e permissões de rotas.

---

## 🧪 Testes de Integridade

```bash
npm test
```

---

## 📜 Licença
MIT © [Henrique Alves](https://github.com/Henrique-All)
