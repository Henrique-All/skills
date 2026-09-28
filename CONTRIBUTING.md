# 🤝 Guia de Contribuição — Enterprise AI Skills

Agradecemos imensamente pelo seu interesse em contribuir com o **Enterprise AI Skills Monorepo**!  
Nosso objetivo é fornecer as ferramentas de maior fidelidade, precisão e governança do mundo para Agentes de IA (**Google Antigravity**, **Claude Code**, **Cursor**, **Windsurf**, **Copilot** e **Aider**).

Para manter a qualidade no nível **Nota 10.0/10**, todas as contribuições passam por validação automatizada e revisão rigorosa.

---

## 🛡️ Regras de Ouro do Repositório (Invioláveis)

1. **Zero Dependências Externas Obrigatórias nas Skills:**
   - Todos os scripts em `scripts/` e testes em `test/` devem executar nativamente com módulos padrão do **Node.js** (`fs`, `path`, `http`, `https`, `child_process`, `crypto`, `url`).
   - Não adicione pacotes externos pesados ao `dependencies` das skills.
2. **Nota 10.0/10 Inegociável:**
   - Nenhuma funcionalidade deve ser "apenas um prompt no markdown". Cada skill possui ferramentas determinísticas de terminal (CLI), testes de integridade e saídas estruturadas.
3. **100% de Testes Passando:**
   - Antes de abrir qualquer PR, execute `npm test` na raiz. Todas as 6 baterias de testes devem retornar `✅ aprovado`.
4. **Respeito à Proteção da Branch `master`:**
   - Ninguém faz push direto na `master`. Todas as alterações entram via **Pull Request (PR)** aprovado e com CI verde no GitHub Actions.

---

## 🚀 Fluxo de Trabalho Passo a Passo

### 1. Fork e Clonagem
```bash
# Faça o fork pelo GitHub e clone no seu ambiente:
git clone https://github.com/SEU-USUARIO/skills.git
cd skills
```

### 2. Criar uma Branch Temática
Crie uma branch descritiva a partir da `master`:
```bash
# Para novas funcionalidades:
git checkout -b feat/nome-da-feature

# Para correções de bugs:
git checkout -b fix/nome-do-bug

# Para documentação:
git checkout -b docs/detalhes-skill
```

### 3. Executar e Criar Testes
Ao criar ou alterar arquivos em uma skill:
1. Registre os novos arquivos no array `requiredFiles` dentro de `<skill>/test/validate.js`.
2. Adicione testes funcionais que executem o script com `--help` ou parâmetros de teste.
3. Valide tudo localmente:
```bash
# Rodar testes da skill específica:
cd frontend-craftsman && npm test

# Rodar a esteira completa do monorepo:
cd .. && npm test
```

### 4. Padrão de Commits (Conventional Commits)
Utilizamos mensagens de commit semânticas e claras:
- `feat(skill-name): breve descrição da nova funcionalidade`
- `fix(skill-name): correção de bug ou comportamento`
- `docs(readme): melhorias em manuais ou diagramas`
- `test(skill-name): inclusão ou ajuste de testes`
- `refactor(skill-name): refatoração de código sem alteração funcional`

### 5. Abrir Pull Request
1. Dê push para a sua branch no fork:
   ```bash
   git push origin feat/nome-da-feature
   ```
2. Abra um Pull Request apontando para a branch `master` do repositório oficial (`Henrique-All/skills`).
3. Preencha todos os campos do **Pull Request Template**.
4. Aguarde a validação dos 3 ambientes do **GitHub Actions** (Node.js 18, 20 e 22).

---

## 🏛️ Estrutura Obrigatória de Cada Skill

Cada diretório de skill no monorepo segue estritamente este padrão de arquivos:

```
minha-skill/
├── SKILL.md            # Instruções para o agente de IA com Frontmatter YAML
├── minha-skill.mdc     # Regra de contexto para Cursor / Windsurf
├── AGENTS.md           # Instruções complementares multi-agente
├── README.md           # Documentação humana com capacidades e exemplos
├── package.json        # Manifesto com scripts 'test' e metadados
├── install.js          # Instalador universal da skill
├── test/
│   └── validate.js     # Teste de validação funcional e sintática (obrigatório)
└── scripts/            # Ferramentas CLI determinísticas (zero-dependency)
```

---

## 💬 Dúvidas ou Sugestões?
Abra uma **Issue** no GitHub ou participe das discussões no repositório.  
Obrigado por ajudar a construir o melhor ecossistema de skills para agentes de IA do planeta! 🚀
