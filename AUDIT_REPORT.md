# 🛡️ Relatório de Auditoria de Engenharia e Segurança — Enterprise AI Suite (`v2.8.1`)

- **Repositório:** `Henrique-All/skills`
- **Branch de Trabalho:** `fix/audit-geral` (baseada em `origin/master` @ `b19b60e`)
- **Ambiente de Auditoria:** Windows 11, Node.js `v24.19.0`, Git `2.55.0.windows.3`

---

## 0. Estado Inicial vs. Estado Final

| Verificação | Estado Inicial (`v2.8.0` @ `b19b60e`) | Estado Final (`v2.8.1` @ `fix/audit-geral`) |
| :--- | :--- | :--- |
| **`npm test`** | ✅ `PASS` (exit `0`) — 11 subagentes e 10 skills validados, porém sem checar divergência de versão/contagens no `README.md` | ✅ `PASS` (exit `0`) — inclui suíte de 47 casos do firewall, segurança do instalador, paridade `shared/`, `README.md`, âncoras e referências |
| **`npm run doctor`** | ✅ `PASS` (exit `0`, 11 PASS / 0 WARN / 0 FAIL, exigia Node >= 18) | ✅ `PASS` (exit `0`, 11 PASS / 0 WARN / 0 FAIL, exige Node >= 20) |
| **`node devsecops-audit/scripts/audit.js .`** | ❌ `FAIL` (exit `1`, `BLOQUEADO` — 28 achados: 5 CRITICAL, 6 HIGH, 14 MEDIUM, 3 LOW) | ✅ `PASS` (exit `0`, `APROVADO` — **0 achados**) |

---

## 1. Problemas Confirmados e Corrigidos

### Parte 1 — Correções Estruturais e Documentação

1. **Contagens inconsistentes no `README.md`, `plugin.json` e `package.json`:**
   - **Problema confirmado:** O repositório possui **11 subagentes** reais em `agents/*.agent.md` e **10 skills** reais com `SKILL.md` (9 skills de domínio + `orch`), mas o `README.md` misturava `"11 Subagentes"` / `"10 Skills"` no subtítulo com `"7 Subagentes"` e `"9 Skills"` no índice, scorecard, seções de subagentes, detalhamento e árvore do repositório.
   - **Correção:** Unificadas todas as referências para **11 Subagentes** e **10 Skills** em `README.md`, `plugin.json`, `package.json`, `scripts/doctor.js` e `scripts/test-all.js` (que agora falha se a contagem real ou o texto do `README.md` divergir).

2. **Versões divergentes (`v2.8.0` vs. `v2.5.1` e `v2.7.0`):**
   - **Problema confirmado:** `README.md` citava `v2.7.0` na linha 22 e `v2.5.1` nas linhas 81 e 301; `install.js` exibia `v2.7.0` fixo; `scripts/sync-versions.js` verificava apenas `plugin.json` e `<skill>/package.json`, ignorando o `README.md`.
   - **Correção:** `scripts/sync-versions.js` foi expandido para sincronizar e verificar (`--check`) `package.json` (fonte única), `plugin.json`, todas as 10 `<skill>/package.json` e o `README.md`. `install.js` e `scripts/test-all.js` agora leem a versão dinamicamente do `package.json`.

3. **`audit-code-full` (`orch qa`) e subagentes `qa-*` ausentes no `README.md`:**
   - **Problema confirmado:** `audit-code-full` não aparecia na tabela de Slash Commands, na Matriz de Capacidades, no detalhamento das skills nem na árvore "Estrutura do Repositório", e os 4 subagentes `qa-crawler`, `qa-bruteforce`, `qa-ui-palette` e `qa-button-action` estavam ausentes da seção de subagentes.
   - **Correção:** Documentada a skill `audit-code-full` (`orch qa`) e os 4 subagentes `qa-*` em todas as seções correspondentes do `README.md` e `.github/PULL_REQUEST_TEMPLATE.md`.

4. **Alegações sem prova (`"Nota 10.0/10"`, `"elimina alucinações"` e economia de tokens):**
   - **Problema confirmado:** Títulos e tabelas exibiam `"Nota 10.0/10"`, `"Ecosistema 10.0"` e `"eliminando alucinações"`, e a tabela de 9 turnos apresentava uma simulação hipotética como medição real.
   - **Correção:** Removidas todas as notas `"10.0/10"` e reformulado `"elimina alucinações"` para `"reduzindo alucinações de caminho e contrato por meio de evidências estáticas"`. A tabela de 9 turnos foi explicitamente identificada como **estimativa teórica de um cenário hipotético**, e foi criado o benchmark reproduzível `scripts/benchmark-tokens.js` (`npm run benchmark:tokens`), que mede nos 128 arquivos reais deste repositório a diferença entre leitura bruta (~1,17 MB / ~293.700 tokens) e leitura via `.code-map/INDEX.md` + saídas `--compact` (~18,7 KB / ~4.670 tokens, **98,4% de redução na leitura inicial**).

5. **Arquivo `LICENSE` ausente:**
   - **Problema confirmado:** `README.md` e `package.json` declaravam licença MIT, mas o arquivo `LICENSE` não existia na raiz.
   - **Correção:** Criado `LICENSE` (MIT License, Copyright (c) 2026 Henrique Alves) na raiz.

6. **Promessa de "code review humano obrigatório" em Branch Protection:**
   - **Problema confirmado:** Consulta à API pública do GitHub (`GET /repos/Henrique-All/skills/branches/master`) e inspeção de `scripts/protect-master.js` confirmaram que a branch `master` está protegida, porém com `enforce_admins: false`, `require_code_owner_reviews: false` e sem arquivo `.github/CODEOWNERS`. Assim, administradores/owner podem mesclar sem aprovação de terceiros.
   - **Correção:** Ajustados `README.md` e `CONTRIBUTING.md` para descrever com exatidão as regras ativas (bloqueio de force push e deleção, status checks obrigatórios no CI e exigência de 1 aprovação em PR para colaboradores não-administradores, com `enforce_admins: false`).

7. **Descrição e tópicos sugeridos para o GitHub:**
   - **Adicionado:** Registrados no `CHANGELOG.md` e na Seção 3 deste relatório para aplicação nas configurações do repositório no GitHub.

8. **Node.js 18 fora de suporte (EOL):**
   - **Problema confirmado:** `.github/workflows/ci.yml` testava `[18.x, 20.x, 22.x]`, `scripts/doctor.js` exigia `major >= 18` e nenhum `package.json` possuía campo `"engines"`.
   - **Correção:** Verificado que nenhum script depende de recurso exclusivo do Node 18; adicionado `"engines": { "node": ">=20.0.0" }` ao `package.json` raiz e às 10 skills; matriz do CI atualizada para `[20.x, 22.x, 24.x]` (`security-sarif` em `22.x`) e `scripts/doctor.js` atualizado para `major >= 20`.

---

### Parte 2 — Auditoria do Código (Reproduzidos com Teste Antes da Correção)

#### A. `scripts/hooks/pre-command-guard.js` (Firewall de Comandos no SO)
- **Problemas confirmados (22 casos reproduzidos com `scripts/test-firewall.js`):**
  1. `rm -rf ./` e `rm -rf ./*` passavam porque o regex exigia espaço ou fim de linha após `.`.
  2. `rm --recursive --force /` e `rm -f -r ./*` passavam porque flags longas e certas combinações não eram reconhecidas.
  3. Caminhos entre aspas ou variáveis (`rm -rf "/"`, `rm -rf '.'`, `rm -rf "./*"`, `rm -rf "$HOME"`, `rm -rf $HOME`, `rm -rf $PWD`) passavam.
  4. Comandos encadeados (`rm -rf .; echo ok`, `echo y | rm -rf ./*`, `sudo -u root rm --recursive --force /`) passavam.
  5. `git push origin main -f && git push origin feat --force-with-lease` passava porque o negative lookahead `(?!.*--force-with-lease)` inspecionava a linha inteira em vez de cada subcomando.
  6. `Remove-Item -Force -Recurse /`, `Remove-Item C:\ -Recurse -Force`, `Remove-Item ./* -Force -Recurse` e `rmdir /q /s C:\` passavam quando a ordem das flags/alvos variava.
  7. `npx prisma migrate reset -f` passava porque apenas `--force` era verificado.
  8. Chamadas vindas de `bash` ou `execute_command` (com `args.command`) passavam porque o script só lia `toolName === 'run_command'` e `args.CommandLine`, embora `hooks.json` declarasse `run_command|execute_command|bash`.
- **Correção:** Reescrito o parser de comandos em `scripts/hooks/pre-command-guard.js` para dividir subcomandos (`;`, `&&`, `||`, `|`, `\n`, `$(...)`, crases), remover prefixos `sudo` e suas flags, normalizar aspas e variáveis críticas (`$HOME`, `$PWD`, `~`, `.`, `./*`, `/`, `C:\`), validar flags de `rm`, `Remove-Item`, `rmdir`, `git push` e `prisma migrate reset` independentemente da ordem por subcomando, e aceitar `run_command`, `execute_command` e `bash`.
- **Prevenção de falsos positivos:** Validado em `scripts/test-firewall.js` (39 ataques bloqueados e 8 comandos legítimos permitidos, incluindo `rm -rf node_modules`, `Remove-Item -Recurse -Force node_modules` e `git push --force-with-lease`).

#### B. `install.js`, `scripts/switch-version.js` e `bin/orch.js`
- **Problemas confirmados (reproduzidos com `scripts/test-install-security.js`):**
  1. `scripts/switch-version.js` não validava o formato de `targetTag` (permitindo path traversal na montagem de `zipPath` e injeção de comandos via `execSync(\`tar -xf "${zipPath}" ...\`)` e `execSync(\`node install.js ${installFlags}\`)`), não aceitava argumento posicional `<tag>` (documentado no `README.md`), não validava o host em redirecionamentos HTTPS (`fetchJson`/`downloadFile`), não verificava SHA/hash do pacote baixado e executava `install.js` imediatamente sem confirmação nem modo `--dry-run`.
  2. `install.js` usava `execSync(\`node "${skillScript}" ${args}\`)` concatenando argumentos crus na string de shell e sobrescrevia diretórios existentes de plugin com `fs.rmSync` sem criar backup nem oferecer `--dry-run`.
- **Correção:**
  - Substituído `execSync` por `execFileSync` com array de argumentos e allowlist de flags tanto em `install.js` quanto em `scripts/switch-version.js`.
  - Em `scripts/switch-version.js`: adicionadas `isValidVersionTag()` (semver estrito), `validateUrl()` com allowlist de domínios HTTPS do GitHub, consulta de integridade do SHA da tag na API do GitHub, cálculo e verificação de hash SHA-256 (`--sha256=`), suporte a `--dry-run` e exigência de confirmação explícita do usuário (ou `--yes`).
  - Em `install.js`: adicionados `--dry-run` e backup automático `<pluginDir>.bak` ao atualizar uma instalação existente.

#### C. Opção `--fix` em `devsecops-audit` e `mobile-audit`
- **Problema confirmado:** Ambos operam em modo somente-leitura por padrão (sem `--fix`), mas quando `--fix` era utilizado não havia opção `--dry-run` para pré-visualizar as alterações nem criação automática de backup `.bak` antes de sobrescrever arquivos.
- **Correção:** Adicionado suporte a `--dry-run` (populando `plannedFixes` e `dryRun: true` no JSON sem modificar arquivos no disco) e criação automática de backup `<arquivo>.bak` antes de gravar alterações via `--fix` (desativável com `--no-backup`), cobertos por testes em `devsecops-audit/test/precision.check.js` e `mobile-converter/test/validate.js`.

#### D. `audit-code-full` e o Fuzzing em `node:vm`
- **Problemas confirmados (reproduzidos em `audit-code-full/test/validate.js`):**
  1. **Escape de contexto VM:** `worker-agent.js` injetava objetos do host (`Object`, `JSON`, `Error`, etc.) diretamente no `sandbox` e não configurava `codeGeneration: { strings: false, wasm: false }`, permitindo que uma função executada obtivesse o construtor `Function` do processo host via `Object.constructor("return process")()`.
  2. **Loop infinito de Microtasks (Promises) e ausência de timeout no processo pai:** `vm.createContext` não configurava `microtaskMode: 'afterEvaluate'` e `audit-full.js` chamava `execFile` sem `timeout` nem limite de memória (`--max-old-space-size`). Uma função com `function spin() { Promise.resolve().then(spin); } spin();` travava o worker indefinidamente.
  3. **Execução de código de terceiros/minificado:** `IGNORE_DIRS` e o filtro de `runBruteforceAgent` não excluíam `vendor/`, `third_party/`, `*.min.js` nem `*.bundle.js`.
- **Correção:**
  - `audit-full.js` agora executa cada worker em processo filho isolado com `--max-old-space-size=128` (128 MB), `timeout: 15000` (`SIGKILL`) e `env` sanitizado.
  - `worker-agent.js` cria o contexto VM com `vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false }, microtaskMode: 'afterEvaluate' })`, instancia os mocks (`console`, `path`, `fs`) dentro do próprio realm da VM (sem vazar construtores do host), aplica timeout de `20ms` por chamada e orçamento de `250ms` por arquivo, e ignora `vendor/`, `third_party/`, `*.min.js` e `*.bundle.js`. Limites documentados em `audit-code-full/SKILL.md` e `audit-code-full/README.md`.

#### E. Regras do `devsecops-audit` (13 Regras `RULE_*`) e Auto-Auditoria
- **Problemas confirmados:**
  1. `devsecops-audit/test/rules.test.js` possuía fixtures vulneráveis para todas as 13 regras `RULE_*`, mas `devsecops-audit/test/precision.check.js` só testava fixtures seguras para 3 delas e não possuía teste explícito de `--changed` nem fixture de projeto Express + Prisma.
  2. Rodar `node devsecops-audit/scripts/audit.js .` no próprio monorepo falhava com 28 achados: 22 falsos positivos nos próprios arquivos de teste (`*.test.js`, `*.check.js`) e em linhas de markdown de `scripts/publish-release-2.4.0.js`, 2 achados reais em `scripts/switch-version.js` (SSRF sem validação de host), 2 achados reais em `hybrid-orchestrator/scripts/preview-plan.js` (`target="_blank"` sem `rel="noopener noreferrer"`) e 1 achado real em `route-guard/scripts/mock-route.js` (`http.createServer` sem headers CSP/`X-Content-Type-Options`).
- **Correção:**
  - Corrigidos os achados reais em `switch-version.js`, `preview-plan.js` e `mock-route.js`, e ajustado `audit.js` para ignorar arquivos de runner de teste (`*.test.js`, `*.spec.js`, `*.check.js`) apenas nas regras de lógica de aplicação (mantendo a varredura de segredos do Pilar 16 em 100% dos arquivos). O próprio repositório agora passa com **0 achados (`APROVADO`, exit 0)**.
  - Adicionadas fixtures seguras para todas as 13 regras `RULE_*`, fixture realista Express + Prisma (0 falsos positivos) e teste automatizado de `--changed` em `devsecops-audit/test/precision.check.js`.

#### F. `shared/` e `scripts/sync-shared.js`
- **Problema confirmado:** `sync-shared.js --check` era chamado no `npm test`, mas não havia teste automatizado que provocasse uma divergência real para provar que `--check` falha com `exit 1` e que a sincronização é idempotente.
- **Correção:** Adicionados testes automatizados de falha em divergência e idempotência em `shared/test/suite-core.check.js`.

#### G. Higiene Geral
- **Problemas confirmados e corrigidos:**
  1. **Caminhos absolutos locais:** Removidas 5 ocorrências de caminhos absolutos locais (`file:///...`) em `mobile-converter/SKILL.md` e 1 ocorrência em `scripts/publish-release-2.3.0.js`.
  2. **Links/âncoras quebradas:** Corrigidas 4 âncoras quebradas no `README.md`, atualizado `SECURITY.md` (`2.8.x`), `CONTRIBUTING.md` e `.github/PULL_REQUEST_TEMPLATE.md` (10 skills).
  3. **`.gitignore` incompleto:** Adicionados `reports/`, `*.sarif`, `snapshots.json`, `*.bak`, `.hybrid/` e `.audit-baseline.json`.
  4. **Validação contínua:** Adicionadas checagens automáticas em `scripts/test-all.js` para frontmatter YAML (`name`, `description`), existência de arquivos em `references/`, âncoras do `README.md` e ausência de caminhos locais hardcoded.

---

## 2. Itens Verificados Sem Falha (`verificado, sem falha`)

1. **`bin/orch.js` (Parte 2B):** Verificado, sem falha. Utiliza `spawn(process.execPath, [targetScript, ...subArgs], { stdio: 'inherit' })` com array de argumentos e validação `Object.prototype.hasOwnProperty.call(SKILL_MAP, subCmd)`, sem interpolação em shell.
2. **Modo somente-leitura padrão em `devsecops-audit` e `mobile-audit` (Parte 2C):** Verificado, sem falha. Nenhum dos dois modifica arquivos a menos que `--fix` / `--autofix` seja explicitamente informado.
3. **Ausência de segredos ou credenciais vazadas no código e no histórico Git (Parte 2G):** Verificado, sem falha. Varredura com `git grep` na árvore atual e `git log -G` em todo o histórico de commits não encontrou chaves privadas, tokens do GitHub (`ghp_`, `github_pat_`), chaves AWS (`AKIA`) ou arquivos `.env` commitados (os scripts `publish-release-*.js` e `protect-master.js` consultam o Git Credential Manager local em tempo de execução sem armazenar credenciais).
4. **Validade dos JSONs (`hooks.json`, `plugin.json`, `package.json`) e existência de scripts (Parte 2G):** Verificado, sem falha. Todos os 11 arquivos `package.json`, `plugin.json` e `hooks.json` possuem sintaxe JSON válida e todos os alvos declarados em `"main"`, `"bin"` e `"scripts"` existem no repositório.
5. **Frontmatter YAML e `references/` de todos os 10 `SKILL.md` (Parte 2G):** Verificado, sem falha. Todos os 10 `SKILL.md` possuem `name` e `description` válidos e todas as referências a `references/*.md` (`frontend-craftsman` e `hybrid-orchestrator`) apontam para arquivos existentes.

---

## 3. Itens que Exigem Decisão do Autor (Henrique Alves)

1. **Política de Branch Protection para Administradores no GitHub (`enforce_admins` e `CODEOWNERS`):**
   - Atualmente, a branch `master` no GitHub está configurada com `enforce_admins: false` e `require_code_owner_reviews: false`.
   - **Decisão:** Se você trabalha sozinho no repositório, manter `enforce_admins: false` é prático (e o `README.md` já foi ajustado para explicar isso de forma transparente). Caso queira obrigar code review humano inclusive para administradores e atualizar os checks obrigatórios do GitHub para a nova matriz (`validate-skills (20.x)`, `validate-skills (22.x)`, `validate-skills (24.x)`), altere `enforce_admins: true` em `scripts/protect-master.js` e execute `node scripts/protect-master.js`.
2. **Aplicar Descrição e Tópicos Sugeridos na Página do Repositório no GitHub (About -> Settings):**
   - **Descrição sugerida:**
     > `Enterprise AI Suite — Plugin, 11 specialist subagents, OS command firewall, and 10 zero-dependency CLI skills (Cartography, DevSecOps OWASP/SARIF, UI/Mobile, DB Sentinel, Test Forge & 360° QA) for Antigravity, Claude Code & Cursor.`
   - **Tópicos sugeridos:**
     > `ai-agents`, `claude-code`, `cursor-rules`, `google-antigravity`, `devsecops`, `sast`, `sarif`, `owasp`, `code-cartography`, `design-engineering`, `mobile-first`, `prisma`, `playwright`, `qa-automation`, `llm-tools`, `nodejs`

---

## 4. O Que Não Foi Possível Verificar Localmente

1. **Execução remota do workflow `.github/workflows/ci.yml` nos runners Ubuntu do GitHub Actions (`20.x`, `22.x`, `24.x`) e ingestão do SARIF na aba GitHub Security (`github/codeql-action/upload-sarif@v3`):**
   - Localmente validamos toda a suíte em Node.js `v24.19.0` e a geração do arquivo SARIF (`--sarif`), mas a execução dos jobs em paralelo na nuvem do GitHub só ocorre após o `git push` da branch `fix/audit-geral` e abertura do Pull Request.
2. **Teste end-to-end de bloqueio de merge em Pull Request no GitHub por falta de aprovação humana:**
   - A configuração da branch `master` foi verificada diretamente via endpoint público `GET https://api.github.com/repos/Henrique-All/skills/branches/master`, mas testar o bloqueio de merge na interface do GitHub requer abrir um PR real com uma conta não-administradora.
