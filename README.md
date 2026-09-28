# ⚡ AI Skills Monorepo

> Coleção de skills de alta governança, arquitetura e execução autônoma para Agentes de IA (**Google Antigravity**, **Claude Code**, **Cursor**, **Windsurf**, **Copilot**, **Aider**).

---

## 📦 Skills Disponíveis

| Skill | Finalidade | Tecnologias / Destaques |
| :--- | :--- | :--- |
| **[`hybrid-orchestrator`](./hybrid-orchestrator)** | **Governança & Execução de Código** | Roteamento A/B/C, Sabatina em 4 Quadrantes, Trava de Permissão em 2 Turnos, Falsifier Adversário com Testes de Estresse, Snapshot Atômico (`git stash`) e Rollback Limpo. |
| **[`repo-cartographer`](./repo-cartographer)** | **Contexto & Cartografia 360°** | Varredura em 6 camadas (UI ➔ Estado ➔ Rede ➔ Backend ➔ DB ➔ Infra), resolução de Path Aliases (`tsconfig.json`), dynamic imports, detecção de ciclos e Handshake tipado em JSON Schema. |
| **[`security-audit`](./security-audit)** | **DevSecOps & 18 Pilares de Segurança** | Auditoria estática somente-leitura, OWASP Top 10, scanner de segredos no git, validação de tokens/cookies/CORS, supply chain e menor privilégio de banco. |

---

## 🚀 Instalação Rápida (1 Comando)

Instale **todas as skills** simultaneamente no seu perfil global de desenvolvedor (Gemini/Antigravity, Claude Code e Cursor Rules):

```bash
# Instalação global unificada em todos os agentes suportados
node install.js --global --target=all

# Ou via npm
npm run install:all
```

### Instalação no Workspace Local do Projeto:
```bash
node install.js
```

---

## 🧪 Validação e Testes Locais

Para validar a integridade de todas as skills, schemas e scripts:

```bash
npm test
```

O repositório conta com **CI automatizado via GitHub Actions** (`.github/workflows/ci.yml`) que valida todos os componentes em Node 18, 20 e 22 a cada commit.

---

## 🤝 Estrutura do Monorepo

```
skills/
├── hybrid-orchestrator/   # Orquestrador adaptativo de execução e falsificação
├── repo-cartographer/     # Cartógrafo de arquitetura e navegação 360°
├── scripts/
│   └── test-all.js        # Test runner universal
├── .github/
│   └── workflows/ci.yml   # Pipeline de CI/CD
├── install.js             # Instalador central do monorepo
├── package.json           # Scripts globais do monorepo
└── README.md              # Documentação principal
```

---

## 📜 Licença
MIT © [Henrique Alves](https://github.com/Henrique-All)
