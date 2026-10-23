# Engenharia de UX & Psicologia de Produto (5 Leis)

> Referência carregada sob demanda pelo `SKILL.md` do Frontend Craftsman (Seção 2 original, movida na íntegra).

## 🧠 2. Engenharia de UX & Psicologia de Produto (Nível Linear / Stripe)

Uma interface bonita que trava o fluxo do usuário ou esconde estados críticos é um fracasso de engenharia. Aplique estas **5 Leis de UX de Produto**:

### Lei 2.1 — Arquitetura Obrigatória dos 5 Estados de Tela
Nenhuma listagem, dashboard ou visão de dados pode ser entregue apenas com o estado "cheio". Você **DEVE** implementar:
1. **Loading (`Content-Aware Skeleton`):** Usa `ContentSkeleton.tsx` imitando a geometria exata da tela final (CLS = 0). **Proibido** spinner centralizado solto.
2. **Empty State Primário (Zero Dados na Conta):** Card limpo (`EmptyStateCard`) explicando o valor da funcionalidade com um botão CTA primário imediato (ex.: *"+ Criar primeiro projeto"*).
3. **Filtered Empty State (Busca/Filtro sem resultados):** Quando `items.length > 0` mas `filteredItems.length === 0`, mostre *"Nenhum resultado para 'X'"* acompanhado do botão tátil **`Limpar filtros`**.
4. **Error State Recuperável:** Banner inline com a causa legível, botão **`Tentar novamente`** e preservação total do que o usuário já digitou.
5. **Populated State (Densidade Calibrada):** Hierarquia visual onde o olho identifica título, status e ação primária em menos de 2 segundos.

### Lei 2.2 — Limiar de Doherty (< 400ms) & Optimistic UI
- Ações frequentes (marcar tarefa, favoritar, arquivar, curtir, alterar coluna de Kanban, enviar mensagem no chat) devem refletir na interface em **menos de 16ms (Optimistic Update)**, sem bloquear o botão com spinner.
- Se a requisição falhar em background, reverta o estado com mola suave e dispare um `StackedToast` de erro com opção de *Desfazer / Tentar novamente*.

### Lei 2.3 — UX Defensiva: Fim dos Modais de Confirmação Irritantes
- **TERMINANTEMENTE PROIBIDO** usar `window.alert()`, `window.confirm()` ou `window.prompt()`.
- Para ações destrutivas rápidas (excluir item, revogar token, limpar fila), substitua o modal bloqueante pelo padrão **`HoldToConfirmButton.tsx`** (o usuário mantém pressionado por `1.2s` enquanto uma barra de progresso preenche o botão; se soltar antes, cancela sem atrito).
- Para exclusões críticas de conta/repositório, use `MorphingDialog.tsx`.

### Lei 2.4 — Ergonomia Keyboard-First (`⌘K`)
- Aplicações ricas devem oferecer busca e ações rápidas via `⌘K` / `Ctrl+K` (`CommandPalette.tsx`).
- Botões de ação importantes exibem dicas sutis de atalho em tags `<kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">⌘K</kbd>`.
- Todo controle interativo possui anel de foco acessível (`focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2`).

### Lei 2.5 — Micro-Tipografia Funcional (`tabular-nums` & `text-wrap`)
- **Números Tabulares Obrigatórios (`tabular-nums`):** Qualquer preço (`R$ 1.290,00`), KPI, porcentagem, contador regressivo ou coluna numérica de tabela **DEVE** ter a classe `tabular-nums` (`font-variant-numeric: tabular-nums`) para evitar tremedeira horizontal durante atualizações ou animações (`SpringNumberTicker.tsx`).
- **Equilíbrio Óptico de Texto:**
  - Títulos (`h1`, `h2`, `h3`): `tracking-tight text-balance` (`text-wrap: balance`) para evitar linhas órfãs com 1 palavra.
  - Parágrafos e descrições: `text-pretty leading-relaxed max-w-[65ch]`.
