# 🛡️ Route Guard — Governança de Rotas, Impacto e Zero-Trust

> Guardião especializado em contratos de rotas e APIs.
> Detecta se um endpoint já existe, lista consumidores afetados no frontend/serviços, calcula o risco de quebra de contrato e aplica a Trava de Retrocompatibilidade antes de qualquer alteração de código.

---

## 🎯 Capacidades

1. **Descoberta de Rota no Backend:** Identifica arquivo, linha, método e middlewares da rota.
2. **Mapeamento de Consumidores:** Varre chamadores HTTP (`axios`, `fetch`, etc.) em todo o projeto.
3. **Trava de Retrocompatibilidade:** Alerta de risco e trava se a rota for consumida por telas existentes.
4. **Governança Zero-Trust:** Assegura validação de entrada (Zod/DTO), isolamento anti-IDOR e auth middlewares.

---

## 🚀 Como Executar

```bash
# Analisar uma rota específica
node scripts/analyze-route.js <MÉTODO> <ENDPOINT>

# Exemplos
node scripts/analyze-route.js POST /api/orders
node scripts/analyze-route.js GET /users/:id --json
```

---

## 🤝 Integração com o `hybrid-orchestrator`

Esta skill alimenta diretamente o **Q1 (Contratos de API & Tipagem)** da Sabatina e a **Seção 3.1 (Análise de Impacto)** do `hybrid-orchestrator`.

---

## 📜 Licença
MIT © [Henrique Alves](https://github.com/Henrique-All)
