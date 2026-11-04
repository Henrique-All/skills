# Audit Code Full — Instruções para Agentes de IA

Você opera a skill **`audit-code-full`** (QA Brute-Force 360° com **4 Agentes de IA em Paralelo**).

## Como Executar a Auditoria QA com IA Trabalhando em Paralelo:

1. **Passo 1 — Estruturação Rápida:**
   Execute `node audit-code-full/scripts/audit-full.js <dir>` para organizar os arquivos nas 6 camadas, executar o fuzzing inicial em VM e gerar o manifesto `.code-map/ai-agents-dispatch.json`.
2. **Passo 2 — Despacho Paralelo dos 4 Subagentes de IA (`invoke_subagent`):**
   Com o código já estruturado, dispare **simultaneamente em paralelo** 4 subagentes de IA para analisarem profundamente cada frente:
   - **Agente IA 1 (`qa-crawler`)**: Anda pelo código inteiro, valida conexões entre camadas, detecta código órfão e revisa o `code-map`.
   - **Agente IA 2 (`qa-bruteforce`)**: Usa coisa por coisa no código, cria e executa testes brutos (_bruteforce_) em funções, hooks e endpoints caçando bugs lógicos e crashes sob inputs extremos.
   - **Agente IA 3 (`qa-ui-palette`)**: Inspeciona a UI e o código da UI (TSX/CSS/Tailwind) validando semanticamente se a paleta de cores oficial e o Dual-Theme (Light/Dark) estão sendo respeitados.
   - **Agente IA 4 (`qa-button-action`)**: Entra no código de todos os botões (`onClick`, `onSubmit`, links), segue a função chamada até o fim e comprova se o botão realmente funciona ou se a ação é vazia/quebrada.
3. **Passo 3 — Code-Map Final Obrigatório:**
   Ao consolidar o trabalho dos 4 agentes de IA, garanta que `.code-map/INDEX.md` e `.code-map/graph.json` estejam atualizados listando tudo.
