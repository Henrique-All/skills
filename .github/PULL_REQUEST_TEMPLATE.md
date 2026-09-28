## 📌 Descrição da Mudança

Descreva de forma clara e concisa o que este Pull Request introduz, corrige ou melhora.

---

## 🎯 Skill(s) Afetada(s)
- [ ] `hybrid-orchestrator`
- [ ] `frontend-craftsman`
- [ ] `mobile-converter`
- [ ] `repo-cartographer`
- [ ] `route-guard`
- [ ] `security-audit`
- [ ] Infraestrutura / Monorepo (`scripts/`, `install.js`, CI)

---

## 📋 Tipo de Alteração
- [ ] 🚀 Nova funcionalidade / Nova ferramenta CLI
- [ ] 🐛 Correção de bug
- [ ] 📝 Documentação / Exemplos
- [ ] 🧪 Novos testes de validação
- [ ] ⚡ Refatoração de desempenho sem alterar comportamento

---

## ✅ Checklist de Qualidade Obrigatório

Marque todos os itens antes de solicitar review:

- [ ] **Zero Dependências:** Todos os novos scripts em `scripts/` utilizam apenas módulos nativos do Node.js.
- [ ] **Testes Integrados:** Os novos arquivos foram adicionados ao `requiredFiles` do `test/validate.js` correspondente.
- [ ] **Bateria Passando:** O comando `npm test` foi executado na raiz e todas as skills passaram com sucesso.
- [ ] **Documentação Atualizada:** O `README.md` da respectiva skill e o `README.md` raiz foram atualizados com os novos comandos.
- [ ] **Nota 10 Mantida:** A alteração adiciona garantias determinísticas, segurança ou feedback visual, mantendo a excelência do ecossistema.
- [ ] **Proteção da Master:** O PR foi criado a partir de uma branch temática (`feat/...` ou `fix/...`) e não da master.

---

## 📸 Evidências / Demonstração (se aplicável)
Adicione capturas de tela, saídas de terminal ou logs de execução demonstrando o funcionamento.
