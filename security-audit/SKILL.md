---
name: security-audit
description: Use ao auditar segurança antes de deploys, PRs ou após alterar autenticação, rotas, cookies, uploads, dependências, JWT, senhas ou banco de dados. Cobre os 18 pilares DevSecOps (OWASP, supply chain, vazamento de segredos, CORS, menor privilégio) em modo somente-leitura com relatórios estruturados e exit codes bloqueantes.
---

# 🛡️ Security Audit — Motor de Auditoria DevSecOps Universal (18 Pilares)

Esta skill é o **motor especializado de auditoria de segurança e DevSecOps**. Ela analisa de ponta a ponta o código do Back-end, Front-end, APIs e microsserviços, **detecta padrões de risco conhecidos (OWASP Top 10, CWE)**, riscos de supply chain e falhas de configuração em produção.

---

## 📋 Contrato de Execução

- **Modo Somente-Leitura:** Esta skill **jamais altera código** durante a auditoria. Ela apenas detecta, classifica e reporta os achados. Remediações só ocorrem quando o usuário ou o orchestrator solicitar explicitamente.
- **Falsos Positivos Versionados:** Exceções são gerenciadas em `.audit-exceptions.json`. O agente **nunca cria nem edita** esse arquivo sem autorização explícita — somente o desenvolvedor, via PR com revisão. Cada exceção precisa de `expiraEm` (data ISO) e `aprovadoPor` (nome da pessoa). Exceções expiradas voltam a ser achados automaticamente. Exceções **não suprimem achados Críticos de segredo exposto** (Pilar 16).
- **Mascaramento Obrigatório:** Valores de segredos, tokens e chaves são **sempre mascarados** no relatório (`sk-pr****xyz`). Nunca o valor completo é exibido.
- **Verificação Mecânica vs. Revisão Semântica:** Cada pilar indica o que o script verifica automaticamente e o que o agente deve revisar semanticamente no código.

---

## 🎯 Os 18 Pilares da Auditoria de Segurança

```
──── BACKEND & SERVIDORES ──────────────────────────────────────────────
[1.  Build & Tipos]          ──> tsc --noEmit / lint sem erros de sintaxe ou tipo
[2.  Autenticação em Rotas]  ──> Rotas sensíveis exigem middleware de autenticação
[3.  Blindagem do Servidor]  ──> Helmet, Rate Limiting, Cookies seguros (HttpOnly+Secure+SameSite),
                                 CORS restrito com lista branca explícita e logout efetivo
[4.  Tolerância a Falhas]    ──> uncaughtException/unhandledRejection com encerramento controlado
[5.  JWT Robusto]            ──> algorithms explícito, sem fallback de secret, exp obrigatório
[6.  Hash de Senhas]         ──> bcrypt/argon2 com custo >= 10; MD5/SHA1/SHA256 sem salt proibidos
[7.  Validação de Uploads]   ──> Limite de tamanho, lista branca de MIME, nomes sanitizados
[8.  Sem Vazamento em Erros] ──> stack trace e PII nunca expostos em resposta HTTP nem logs
──── FRONTEND & CLIENTES ───────────────────────────────────────────────
[9.  Clientes HTTP]          ──> withCredentials configurado e cancelamento de requisições pendentes
[10. Gestão de Sessão]       ──> Validação via endpoint /auth/me sem expor tokens no localStorage
[11. Proteção de Rotas (UX)] ──> Guards/PrivateRoute presentes (ciente de que a segurança real é no backend)
[12. Headers e CSP]          ──> Content-Security-Policy (evitar unsafe-inline e unsafe-eval)
──── SERVIÇOS ASSÍNCRONOS & BACKGROUND ──────────────────────────────────
[13. Renovação de Token]     ──> Renovação baseada no payload exp decodificado do token
[14. Credenciais & SSRF]     ──> Variáveis de ambiente; URLs de webhooks validadas contra lista branca
──── OWASP & CÓDIGO CRÍTICO ────────────────────────────────────────────
[15. Padrões de Risco OWASP] ──> Detecção de SQLi, XSS, RCE, LFD/Path Traversal e IDOR
[16. Segredos & Higiene Git] ──> Scanner de chaves de API, tokens e .env commitado no repositório
──── SUPPLY CHAIN & INFRA ──────────────────────────────────────────────
[17. CVEs & Dependências]    ──> npm audit / pip-audit / trivy sem vulnerabilidades High/Critical
[18. Banco: Menor Privilégio]──> Aplicação conecta sem privilégios de superusuário (root/postgres/sa)
```

---

## 🚀 Como Executar a Auditoria

A partir da raiz do projeto (funciona em Windows, macOS e Linux):

```bash
# Auditoria completa (pré-deploy / PR)
node scripts/audit.js

# Auditoria seletiva (apenas pilares afetados pela alteração)
node scripts/audit.js --pilares=2,3,5

# Exportar em formato JSON para pipelines ou ferramentas externas
node scripts/audit.js --json
```

### Exit Codes

| Exit Code | Significado | Comportamento no CI |
| :---: | :--- | :--- |
| `0` | Sem achados bloqueantes (pode conter avisos Médio/Baixo) | ✅ Pipeline aprova |
| `1` | Achado Crítico ou Alto detectado | 🛑 Pipeline bloqueia |
| `2` | Erro interno de execução ou script quebrado | 💥 Pipeline quebra |

---

## 📄 Formato do `.audit-exceptions.json`

Arquivo opcional colocado na raiz do projeto analisado:

```json
[
  {
    "id": "CORS_WILDCARD_CREDENTIALS",
    "pilar": 3,
    "arquivo": "src/server.ts",
    "justificativa": "Origem aberta temporária durante homologação em ambiente local isolado.",
    "aprovadoPor": "Carlos Henrique",
    "expiraEm": "2027-01-01"
  }
]
```

> ⚠️ **Regra inviolável:** Exceções com data de `expiraEm` no passado são ignoradas e voltam a bloquear o pipeline. Achados Críticos de segredos commitados no git (Pilar 16) **nunca** são suprimidos por exceções.

---

## 🤝 Integração com o `hybrid-orchestrator`

Quando o `hybrid-orchestrator` executa a verificação na **Seção 7**, ele aciona a auditoria seletiva de acordo com o domínio tocado pela demanda:

| Domínio Alterado | Pilares Acionados |
| :--- | :--- |
| **Autenticação / JWT / Sessão** | `--pilares=2,5,10` |
| **Rotas / Middlewares / Endpoints** | `--pilares=2,15` |
| **Cookies / CORS / CSRF / Headers** | `--pilares=3,12` |
| **Uploads / Armazenamento** | `--pilares=7,15` |
| **Senhas / Credenciais** | `--pilares=6,14,16` |
| **Dependências (npm / pip)** | `--pilares=17` |
| **Banco de Dados / Queries** | `--pilares=15,18` |
| **Pré-deploy / Release / PR** | Auditoria completa (todos os 18 pilares) |
