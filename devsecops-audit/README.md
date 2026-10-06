# 🛡️ DevSecOps Audit — Motor de Auditoria DevSecOps Universal (18 Pilares)

> Motor especializado de auditoria de segurança de código, supply chain e conformidade OWASP.
> Projetado para atuar em modo somente-leitura com relatórios estruturados e exit codes determinísticos para pipelines de CI/CD.

---

## 🎯 Os 18 Pilares Auditados

1. **Build & Tipagem:** `tsc --noEmit` sem erros de tipo ou sintaxe.
2. **Autenticação em Rotas:** Verificação de middlewares de auth em endpoints protegidos.
3. **Blindagem do Servidor:** Helmet, Rate Limiting, Cookies seguros (`httpOnly`, `secure`, `sameSite`), CORS restrito.
4. **Tolerância a Falhas:** Captura e encerramento limpo em `uncaughtException` e `unhandledRejection`.
5. **JWT Robusto:** Algoritmos declarados explicitamente, sem fallback de secret estático, expiração obrigatória.
6. **Hash de Senhas:** bcrypt (custo >= 10) ou argon2; proibição de MD5/SHA sem salt.
7. **Validação de Uploads:** Limites de tamanho (`fileSize`), lista branca de MIME e isolamento de paths (anti-LFD).
8. **Sem Vazamento em Erros:** Stack trace e PII nunca expostos em respostas HTTP nem em logs públicos.
9. **Clientes HTTP Frontend:** `withCredentials` configurado e cancelamento de requisições pendentes.
10. **Gestão de Sessão:** Verificação via endpoint seguro (`/auth/me`) sem expor tokens confidenciais em `localStorage`.
11. **Proteção de Rotas no Frontend:** Guards de rota/PrivateRoute como controle de UX (com segurança real no backend).
12. **Headers & CSP:** Políticas de Content-Security-Policy (evitar `unsafe-inline` e `unsafe-eval`).
13. **Serviços Assíncronos & Workers:** Renovação de tokens baseada no campo `exp` decodificado do JWT.
14. **Credenciais & Anti-SSRF:** Credenciais via `.env` e validação de URLs externas contra lista de hosts autorizados.
15. **Padrões de Risco OWASP:** Detecção de SQLi, XSS (`dangerouslySetInnerHTML`), RCE, LFD e IDOR/BOLA.
16. **Segredos & Higiene Git:** Scanner regex de chaves de API, chaves privadas e verificação de `.env` rastreado no Git.
17. **Supply Chain & CVEs:** `npm audit --omit=dev` e checagem de lockfiles com integridade.
18. **Banco de Dados: Menor Privilégio:** Aplicação conectando sem permissões de superusuário (`root`, `postgres`, `sa`).

### ⚡ Detecções Avançadas de Lógica de Negócio (AppSec Ofensivo & Red Team)
- 🔑 **`RULE_AUTH_HARDCODED_MASTER_PASSWORDS`** (CRITICAL): Senhas mestres (`devMasterPasswords = [...]`), plaintext `===` e `LIKE '%${email}%'`.
- 🛡️ **`RULE_AUTH_MFA_UNIVERSAL_BYPASS`** (CRITICAL): Bypass de segundo fator com OTP estático (`code === "999999"` / `DEV_UNIVERSAL_CODE`).
- 🎯 **`RULE_BOLA_IDOR_MISSING_OWNERSHIP_CHECK`** (HIGH): Endpoints `:id` com consultas ao DB sem validação de propriedade (`req.user.id`).
- 📦 **`RULE_MASS_ASSIGNMENT_UNSANITIZED_BODY`** (HIGH): Mutações no banco repassando `req.body` sem whitelist Zod (`.pick()`, `.omit()`).
- 🚨 **`RULE_AUTH_INFO_DISCLOSURE_IN_ERRORS`** (MEDIUM): Dicas de senha ou enumeração de e-mails corporativos em erros 401/404.
- 🔗 **`RULE_WEBHOOK_MISSING_HMAC_SIGNATURE`** (HIGH): Webhooks externos sem validação criptográfica HMAC (`createHmac`) ou com fallback estático.
- 🔌 **`RULE_WEBSOCKET_UNAUTHENTICATED_ROOMS`** (HIGH): Entrada em salas Socket.IO ou presença confiando em `data.userId` arbitrário.
- 🌐 **`RULE_SSRF_UNVALIDATED_MEDIA_DOWNLOAD`** (HIGH): `axios.get(url)` ou `fetch(url)` de URLs externas sem bloqueio de redes privadas/locais.
- ⏱️ **`RULE_TIMING_ATTACK_STRING_COMPARE`** (MEDIUM): Comparação de secrets/hashes com `===` em vez de `crypto.timingSafeEqual()`.
- 🖼️ **`RULE_STORED_XSS_UNSANITIZED_SVG_UPLOAD`** (HIGH): Uploads aceitando SVG sem sanitização de `<script>` nem header attachment.
- 📁 **`RULE_UNPROTECTED_FILE_DOWNLOAD_ROUTE`** (HIGH): Rotas Express de download de anexos sem middleware de autenticação.
- 🗝️ **`RULE_JWT_MISSING_ALGORITHM_OPTION`** (MEDIUM): `jwt.verify()` sem opção explícita `{ algorithms: ['HS256'] }`.
- 🖥️ **`RULE_TAURI_IPC_UNRESTRICTED_CSP`** (HIGH): `tauri.conf.json` com `"csp": null` combinado com permissões ativas de shell.

---

## 🚀 Como Executar

```bash
# 1. Auditoria completa dos 18 pilares
node scripts/audit.js

# 2. Correção automática de vulnerabilidades triviais (Autofix):
node scripts/audit.js --fix

# 3. Exportação no padrão SARIF 2.1.0 (compatível com GitHub Code Scanning):
node scripts/audit.js --sarif

# 4. Auditoria seletiva por pilares
node scripts/audit.js --pilares=2,3,5

# 5. Exportação JSON estruturada
node scripts/audit.js --json

# 6. Instalar Git Pre-Commit Hook para blindar commits:
node scripts/install-hook.js
```

---

## 🤝 Integração com o `hybrid-orchestrator`

Esta skill atua como validador da **Seção 7 do Hybrid Orchestrator**. Ao modificar domínios sensíveis (Auth, Cookies, Uploads, Senhas, Banco), o orchestrator aciona o `audit.js` com os pilares relevantes.

---

## 📜 Licença
MIT © [Henrique Alves](https://github.com/Henrique-All)
