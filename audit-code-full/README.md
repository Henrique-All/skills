# 🕵️‍♂️ Audit Code Full — QA Brute-Force 360° (4 Agentes Paralelos)

Skill de QA completo que percorre o código inteiro, testa módulo por módulo em modo *bruteforce*, verifica o UI e o código de UI (paletas de cores e Dual-Theme), valida a funcionalidade real de todos os botões e executa o `code-map` ao final para listar tudo.

## 🐝 Os 4 Agentes Paralelos
1. **`qa-crawler`**: Anda pelo código inteiro e gera o `code-map` final (`.code-map/INDEX.md` e `.code-map/graph.json`).
2. **`qa-bruteforce`**: Executa testes brutos (*bruteforce* / fuzzing de parâmetros e detecção de crashes).
3. **`qa-ui-palette`**: Audita o UI e o código de UI garantindo fidelidade à paleta de cores e temas Claro/Escuro.
4. **`qa-button-action`**: Inspeciona todos os botões e ações interativas contra botões mortos (`dead buttons`).

## 🚀 Como Usar:
```bash
# Rodar os 4 agentes em paralelo + atualizar o code-map final:
node scripts/audit-full.js .

# Exportar relatório JSON completo:
node scripts/audit-full.js . --json
```

## 🧪 Testes da Skill:
```bash
npm test
```

