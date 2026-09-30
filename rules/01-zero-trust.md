# 🛡️ Regra 01: Zero-Trust & Governança de Execução

Esta regra é aplicada de forma global para qualquer agente ou subagente do ecossistema.

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
