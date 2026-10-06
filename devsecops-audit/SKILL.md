---
name: devsecops-audit
description: Use ao auditar segurança antes de deploys, PRs ou após alterar autenticação, rotas, cookies, uploads, dependências, JWT, senhas ou banco de dados. Cobre os 18 pilares DevSecOps (OWASP, supply chain, vazamento de segredos, CORS, menor privilégio) em modo somente-leitura com relatórios estruturados e exit codes bloqueantes.
---

# 🛡️ DevSecOps Audit — Motor de Auditoria DevSecOps Universal (18 Pilares)

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
[2.  Autenticação & MFA]     ──> Middlewares em rotas sensíveis, anti-backdoors, sem senhas mestres e sem bypass de MFA
[3.  Blindagem do Servidor]  ──> Helmet, Rate Limiting, Cookies seguros (HttpOnly+Secure+SameSite),
                                 CORS restrito com lista branca explícita e logout efetivo
[4.  Tolerância a Falhas]    ──> uncaughtException/unhandledRejection com encerramento controlado
[5.  JWT Robusto]            ──> algorithms explícito, sem fallback de secret, exp obrigatório
[6.  Hash de Senhas]         ──> bcrypt/argon2 com custo >= 10; proibição estrita de comparação em plaintext (===)
[7.  Uploads & Downloads]    ──> Limite de tamanho, MIME whitelist, proteção contra download de anexos desprotegido
[8.  Sem Vazamento em Erros] ──> Sem stack trace, sem enumeração de contas corporativas e sem senhas em mensagens de erro
──── FRONTEND & CLIENTES ───────────────────────────────────────────────
[9.  Clientes HTTP]          ──> withCredentials configurado e cancelamento de requisições pendentes
[10. Gestão de Sessão]       ──> Validação via endpoint /auth/me sem expor tokens no localStorage
[11. Proteção de Rotas (UX)] ──> Guards/PrivateRoute presentes (ciente de que a segurança real é no backend)
[12. Headers, CSP & IPC]     ──> Content-Security-Policy web e restrição obrigatória de shell no Tauri (anti-RCE)
──── SERVIÇOS ASSÍNCRONOS & BACKGROUND ──────────────────────────────────
[13. Renovação de Token]     ──> Renovação baseada no payload exp decodificado do token
[14. Webhooks & SSRF]        ──> Validação criptográfica de webhooks via HMAC-SHA256, sem segredo estático de fallback
──── OWASP & CÓDIGO CRÍTICO ────────────────────────────────────────────
[15. Padrões OWASP & Sockets]──> Detecção de SQLi, XSS, RCE, IDOR e autorização estrita em salas Socket.IO (anti-BOLA)
[16. Segredos & Higiene Git] ──> Scanner de chaves de API, tokens e .env commitado no repositório
──── SUPPLY CHAIN & INFRA ──────────────────────────────────────────────
[17. CVEs & Dependências]    ──> npm audit / pip-audit / trivy sem vulnerabilidades High/Critical
[18. Banco: Menor Privilégio]──> Aplicação conecta sem privilégios de superusuário (root/postgres/sa)
```

---

## ⚡ Detecções Avançadas de Lógica de Negócio & AppSec Ofensivo

O motor mecânico do `devsecops-audit` possui regras determinísticas de varredura profunda que superam ferramentas genéricas de SAST:

| Regra / ID | Severidade | Pilar | Vetor de Ataque Mitigado |
| :--- | :---: | :---: | :--- |
| **`RULE_AUTH_HARDCODED_MASTER_PASSWORDS`** | 🔴 **CRITICAL** | 2 / 6 | Arrays de senhas mestres/dev (`devMasterPasswords = [...]`), comparação de senha em texto plano (`user.password === password`) e consultas de login com `LIKE '%${email}%'`. |
| **`RULE_AUTH_MFA_UNIVERSAL_BYPASS`** | 🔴 **CRITICAL** | 2 | Condicionais em fluxos de 2FA/MFA que aceitam códigos estáticos fixos (`code === "999999"` ou `DEV_UNIVERSAL_CODE`) sem validação de HMAC/Token real. |
| **`RULE_BOLA_IDOR_MISSING_OWNERSHIP_CHECK`** | 🟠 **HIGH** | 15 | Endpoints REST consumindo `:id` sem validar propriedade do usuário (`req.user.id`) ou permissão de administrador na consulta (BOLA/IDOR). |
| **`RULE_MASS_ASSIGNMENT_UNSANITIZED_BODY`** | 🟠 **HIGH** | 15 | Atualizações e inserções no banco repassando `req.body` diretamente sem schemas Zod de whitelist (`.pick()`, `.omit()`) ou DTOs explícitos. |
| **`RULE_AUTH_INFO_DISCLOSURE_IN_ERRORS`** | 🟡 **MEDIUM** | 8 | Respostas de erro HTTP (401/404) que listam e-mails corporativos válidos para enumeração de contas ou fornecem dicas explícitas de senha aos usuários. |
| **`RULE_WEBHOOK_MISSING_HMAC_SIGNATURE`** | 🟠 **HIGH** | 14 | Rotas de webhook (Meta WhatsApp, Stripe, Mercado Pago) sem validação de assinatura criptográfica HMAC (`createHmac`) ou com secrets em fallback estático. |
| **`RULE_WEBSOCKET_UNAUTHENTICATED_ROOMS`** | 🟠 **HIGH** | 2 / 15 | Inscrição em salas Socket.IO (`join_ticket`, `join_room`) sem autenticação no handshake ou eventos de presença confiando em `data.userId` enviado pelo cliente. |
| **`RULE_SSRF_UNVALIDATED_MEDIA_DOWNLOAD`** | 🟠 **HIGH** | 10 | Chamadas `axios.get(url)` ou `fetch(url)` que consomem URLs fornecidas pelo usuário sem validação e bloqueio de faixas de IP locais/internas (SSRF). |
| **`RULE_TIMING_ATTACK_STRING_COMPARE`** | 🟡 **MEDIUM** | 6 | Comparação de tokens sensíveis, secrets ou hashes HMAC usando operadores simples `===` ou `==` em vez de `crypto.timingSafeEqual(bufA, bufB)`. |
| **`RULE_STORED_XSS_UNSANITIZED_SVG_UPLOAD`** | 🟠 **HIGH** | 7 | Regras de upload que aceitam o tipo MIME `image/svg+xml` sem sanitização contra tags `<script>` ou sem forçar o header `Content-Disposition: attachment`. |
| **`RULE_UNPROTECTED_FILE_DOWNLOAD_ROUTE`** | 🟠 **HIGH** | 7 | Rotas Express de download de arquivos ou anexos (`/attachments/:filename`) registradas sem middleware de autenticação (`verifyToken`). |
| **`RULE_JWT_MISSING_ALGORITHM_OPTION`** | 🟡 **MEDIUM** | 5 | Chamadas `jwt.verify(token, secret)` sem a opção explícita `{ algorithms: ['HS256'] }`, prevenindo ataques de confusão de algoritmo. |
| **`RULE_TAURI_IPC_UNRESTRICTED_CSP`** | 🟠 **HIGH** | 12 | Configurações do Tauri (`tauri.conf.json`) com `"csp": null` combinado com a capacidade `"shell:default"` ou execução de comandos (risco de RCE). |

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
