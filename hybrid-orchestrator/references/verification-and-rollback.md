# Diffs, Snapshot/Rollback, Descoberta de Comandos e Auditorias

> Referência carregada sob demanda pelo `SKILL.md` do Hybrid Orchestrator (Seções 6, 7 e 8 originais, movidas na íntegra).

## 6. Diffs

- **Se o agente edita arquivos:** aplique as mudanças e mostre com `git diff`. Não reescreva manualmente um patch que possa divergir do que foi gravado.
- **Se o agente não tem escrita:** entregue patch em formato unificado (`diff --git a/... b/...`), um bloco por arquivo, pronto para `git apply`.
- Mantenha cada diff pequeno e reversível. Mudanças independentes ficam em blocos separados.

### 6.1 Snapshot e Rollback Atômico

Nas Rotas B e C, antes de aplicar o primeiro diff:
1. **Snapshot de Segurança:** Cheque `git status --porcelain`. Em seguida, registre o snapshot do estado atual com `git stash create` ou capture o HEAD para ter uma âncora de reversão garantida.
2. **Falha Crítica / Abort:** Se o ciclo de Falsificação revelar falhas arquiteturais insolúveis após o limite de iterações, ou se os testes quebrarem de forma irrecuperável, o agente **não deve** tentar aplicar correções cumulativas gerando código espaguete.
3. **Rollback Mecânico:** Execute a reversão atômica dos arquivos tocados nesta demanda (`git restore <arquivos>` ou `git checkout -- <arquivos>`), devolvendo o repositório ao estado estável anterior e informando o usuário com precisão.

---

## 7. Descoberta de comandos e auditoria de segurança

1. Procure os comandos do projeto nesta ordem: `README` / `CONTRIBUTING`, workflows de CI (`.github/workflows`, `.gitlab-ci.yml`), `Makefile` / `justfile`, scripts do `package.json`, `tox.ini` / `pyproject.toml`.
2. **Monorepos & Workspaces (Blast Radius):**
   - Detecte se há monorepo (`turbo.json`, `pnpm-workspace.yaml`, `lerna.json`, `nx.json` ou `"workspaces"` no `package.json` raiz).
   - Se a alteração tocar um pacote compartilhado (`shared`, `core`, `types`) consumido por outras aplicações, o teste NÃO pode rodar isolado apenas no pacote. Execute a verificação transversal dos dependentes: `turbo run test --filter=...^...`, `pnpm -r test` ou `npm run test --workspaces`.
3. **Higiene de Performance & Banco (Anti-N+1):** Em alterações que tocam banco ou serviços assíncronos, inspecione se laços (`for`, `map`, `while`) realizam queries ou requisições HTTP individuais por item. Em caso positivo, exija carregamento em lote (`IN (...)`, `include`/`eager loading` do ORM ou bulk API).
4. Use a tabela abaixo apenas como fallback:

| Ecossistema | Indicadores | Build / tipos / lint | Testes |
| :--- | :--- | :--- | :--- |
| Node / TypeScript | `package.json`, `tsconfig.json` | `npx tsc --noEmit`, script `lint` | script `test`, `npx vitest run`, `npx jest` |
| Python | `pyproject.toml`, `requirements.txt` | `mypy .`, `ruff check .` | `pytest` |
| Go | `go.mod` | `go build ./...`, `go vet ./...` | `go test -race ./...` |
| Rust | `Cargo.toml` | `cargo check`, `cargo clippy` | `cargo test` |
| .NET | `*.csproj`, `*.sln` | `dotnet build` | `dotnet test` |
| Java / Kotlin | `pom.xml`, `build.gradle` | `mvn compile`, `./gradlew classes` | `mvn test`, `./gradlew test` |
| PHP | `composer.json` | `composer validate`, `phpstan analyse` | `./vendor/bin/phpunit` |

### 7.1 Auditoria de segurança (`devsecops-audit`)

Se o domínio tocado pela demanda envolver autenticação, rotas/middlewares, cookies/CORS, uploads, senhas ou dependências de pacotes, acrescente à etapa de verificação — independentemente da rota (A, B ou C):

```bash
node .agents/skills/devsecops-audit/scripts/audit.js --pilares=<pilares do domínio>
```

Exemplos de `--pilares`: `2,5,10` (auth), `3,12` (cookies/cors), `7,15` (uploads/owasp), `16` (segredos/git), `17` (cves).

> Mudanças cosméticas (cor, label, tipografia) ou de UI pura sem toque em lógica de segurança **não** acionam esta etapa.

### 7.2 Auditoria de Artesanato de Interface (`frontend-craftsman`)

Se a demanda envolver alteração ou criação de telas e componentes de front-end e a skill `frontend-craftsman` estiver disponível, acrescente à etapa de verificação:

```bash
node .agents/skills/frontend-craftsman/scripts/craft-audit.js [pasta-do-frontend]
```

Exija **Craftsmanship Score >= 90/100** para aprovação final. Se encontrar vícios de IA (roxo neon genérico, falta de feedback tátil `:active`/`whileTap`, blur desregulado), o Builder deve corrigir antes de concluir.

---

## 8. Projeto sem testes ou com testes quebrados

- **Sem testes:** diga explicitamente. Nas Rotas B e C, proponha e escreva o teste mínimo que cobre o comportamento alterado. Não apresente validação que não existe.
- **Testes já falhando antes da mudança:** registre quais falham, separe-os das falhas causadas por você e não os "corrija" fora do escopo sem pedido.
- **Sem ambiente de execução:** entregue os comandos e marque a validação como RACIOCINADA.
