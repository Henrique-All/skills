# 🛡️ Security Audit — Motor de Auditoria DevSecOps Universal (18 Pilares)

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
