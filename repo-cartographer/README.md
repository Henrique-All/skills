# 🗺️ Repo Cartographer — Cartografia de Repositórios 360°

> Camada de percepção, mapeamento e contextualização de arquitetura orientada por evidência.
> Elimina buscas cegas de agentes de IA, reduz drasticamente o consumo de tokens e entrega um **Handshake Estruturado** diretamente para o `hybrid-orchestrator`.

---

## ⚡ Por que o Repo Cartographer?

Agentes de IA costumam gastar centenas de milhares de tokens navegando em diretórios às cegas com `grep` e `list_dir` antes de entender onde uma tela ou funcionalidade está conectada.

O **Repo Cartographer** atua como uma bússola de engenharia:
1. Localiza o ponto de entrada (`/checkout`, `UsuarioPage.tsx`, `POST /pedidos`).
2. Desce cirurgicamente através de **6 camadas orientadas por evidência**.
3. Registra relações comprovadas (`confirmed`), deduções lógicas (`inferred`) e lacunas (`unknown`).
4. Armazena um cache incremental leve em `.code-map/graph.json`.
5. Em demandas de alteração, dispara o **Handshake Estruturado** para o `hybrid-orchestrator` assumir a execução sem perder tempo.

---

## 🏗️ As 6 Camadas da Cartografia

```
[Camada 1: UI]             Tela / Rota / Componentes / Formulários / Eventos
      ↓
[Camada 2: Estado]         Zustand / Redux / Context / Hooks / Mutações
      ↓
[Camada 3: Rede/Contratos] Endpoints HTTP / Métodos / DTOs / Schemas (Zod/Joi)
      ↓
[Camada 4: Backend]        Routers / Middlewares / Controllers / Services
      ↓
[Camada 5: Banco]          ORM Models / Tabelas / Migrations / Repositories
      ↓
[Camada 6: Infra/Externos] Redis / Filas (Bull, Rabbit) / Gateways / Workers
```

---

## 🤝 O Handshake com o `hybrid-orchestrator`

```
           USUÁRIO
              │
              ▼
     repo-cartographer  (Percebe / Mapeia / Registra Incertezas)
              │
              ▼
    .code-map/handshake.json  (Contrato Tipado com Schema Versionado)
              │
              ▼
     hybrid-orchestrator (Decide / Executa / Falsifica / Valida)
              │
       ┌──────┼──────┐
       ▼      ▼      ▼
     Rota A Rota B Rota C ➔ Falsifier ➔ Validação
```

---

## 🧭 Modos de Operação

| Modo | Gatilho | Ação |
| :--- | :--- | :--- |
| **`EXPLORE`** | *"Como funciona a tela X?", "Mapeie o fluxo de login"* | Mapeia o fluxo em Mermaid, gera notas Obsidian com `[[wikilinks]]` e canvas. **Não aciona execução.** |
| **`EXECUTE`** | *"Corrija o bug no checkout", "Adicione campo na tela X"* | Mapeia as 6 camadas, gera `.code-map/handshake.json` e aciona o `hybrid-orchestrator`. |
| **`REFRESH`** | `--refresh` ou arquivos alterados | Checa hashes em `.code-map/graph.json` e reindexa **apenas** nós divergentes. |

---

## 📦 Estrutura dos Arquivos da Skill

```
repo-cartographer/
├── SKILL.md                 # Especificação para Antigravity e Claude Code
├── repo-cartographer.mdc    # Regra contextual para Cursor e Windsurf
├── AGENTS.md                # Diretrizes para Copilot, Roo Code, Cline, Aider
├── install.js               # Instalador universal multiplataforma
├── README.md                # Documentação técnica
├── package.json             # Scripts de teste e instalação
├── schemas/
│   ├── graph.schema.json    # Schema do .code-map/graph.json
│   └── handshake.schema.json# Schema do contrato de handoff
├── templates/
│   └── graph.template.json  # Template base do grafo
├── scripts/
│   └── cartographer.js      # Utilitário CLI (init, check, obsidian)
└── test/
    └── validate.js          # Validador de integridade da skill
```

---

## 🚀 Instalação Rápida

```bash
# Instalar globalmente em todos os agentes (Antigravity, Claude, Cursor)
npm run install:global

# Ou instalar apenas no workspace do projeto atual
npm run install:local
```

---

## 📜 Licença
MIT © Henrique Alves
