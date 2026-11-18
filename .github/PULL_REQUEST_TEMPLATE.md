## 📝 Descrição das Mudanças
<!-- Descreva de forma clara e objetiva o que este Pull Request adiciona, corrige ou melhora -->

## 🎯 Skills / Componentes Afetados
Marque os componentes impactados por este PR:
- [ ] `audit-code-full`
- [ ] `db-sentinel`
- [ ] `devsecops-audit`
- [ ] `frontend-craftsman`
- [ ] `hybrid-orchestrator`
- [ ] `mobile-converter`
- [ ] `orch`
- [ ] `repo-cartographer`
- [ ] `route-guard`
- [ ] `test-forge`
- [ ] `agents/` (11 Subagentes) / `shared/` / Infraestrutura / CI / `install.js`

## ✅ Checklist de Qualidade e Segurança
- [ ] Executei `npm test` e `npm run doctor` localmente e todas as 10 skills e 11 subagentes passaram sem erros.
- [ ] Caso tenha alterado `shared/`, executei `node scripts/sync-shared.js`.
- [ ] Caso tenha alterado versões, executei `node scripts/sync-versions.js --check`.
- [ ] O frontmatter YAML do `SKILL.md` (`name`, `description`) continua válido e as referências em `references/` existem.
- [ ] Nenhum segredo, token, `.env` ou caminho absoluto pessoal foi incluído nos commits.
- [ ] A documentação (`README.md` / `CHANGELOG.md`) foi atualizada se aplicável.
