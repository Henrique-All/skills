# 🛡️ Regra 01: Zero-Trust, Cartografia-First & Governança de Execução

Esta regra é aplicada de forma global para qualquer agente ou subagente do ecossistema.

## 0. Ciclo Obrigatório da Cartografia: Olhar Primeiro & Atualizar ao Finalizar
Antes de executar buscas exploratórias (`grep_search`, `find_by_name`, `list_dir` em loop) para localizar telas, componentes, rotas, controllers ou models em qualquer projeto:
1. **No Início (Passo Zero — Leitura Imediata do `.code-map/`):** Verifique e leia **`.code-map/INDEX.md`** (ou `.code-map/graph.json` / `.code-map/handshake.json`) na **primeira chamada de ferramenta (`view_file`)**.
2. **Navegação Cirúrgica Direta:** Se `.code-map/INDEX.md` (ou `graph.json` populado) existir, use os caminhos já mapeados nas 6 camadas (UI → Estado → API → Backend → Banco → Infra) para abrir diretamente os arquivos-alvo. É **terminantemente proibido** ignorar a cartografia existente e ficar dando voltas pelo repositório.
3. **Consulta Instantânea ou Auto-Indexação:**
   - Para buscar rapidamente quem chama ou depende de um módulo no grafo: `node "$env:USERPROFILE\.gemini\config\plugins\enterprise-ai-suite\skills\repo-cartographer\scripts\cartographer.js" query <termo>`.
   - Se a pasta `.code-map/` não existir ou estiver vazia (`nodes: []`) em um projeto de código, gere-a imediatamente rodando `cartographer.js init .`.
4. **No Fim (Passo Final — Atualização Obrigatória do Cartógrafo):** Sempre que você criar, remover ou editar arquivos que adicionem/alterem imports, componentes ou endpoints HTTP, execute `cartographer.js init .` ao concluir a implementação para manter `.code-map/INDEX.md` e `.code-map/graph.json` 100% sincronizados.

## 1. Classificação Obrigatória Prévia
- Nenhuma alteração de código é realizada antes da classificação explícita da demanda em **Rota A (Cirúrgica)**, **Rota B (Governança Completa com Trava)** ou **Rota C (Intermediária)**.
- Demandas críticas (autenticação, transações financeiras, concorrência, migrações de banco, contratos de API) exigem **obrigatoriamente a Rota B**.

## 2. Proibição de Operações Destrutivas Autônomas
O agente é terminantemente proibido de executar de forma autônoma:
- `DROP TABLE`, `DROP DATABASE`, `TRUNCATE TABLE`, `DELETE` sem `WHERE`, `UPDATE` sem `WHERE`.
- `git push --force`, `git reset --hard`, `prisma migrate reset --force`.
- Exclusão recursiva de diretórios do sistema ou raiz do projeto.

## 3. Honestidade e Evidência Absoluta
- Nunca declare um teste ou cenário como "mitigado" ou "validado" sem evidência real de comando e saída do terminal.
- Classifique sempre como **EXECUTADO** (comando real rodou com sucesso) ou **RACIOCINADO** (análise teórica do modelo).
