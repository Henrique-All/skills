# 🎨 Regra 02: Anti-AI Slop, Densidade Profissional & Arquitetura Mobile

Esta regra governa qualquer geração, refatoração ou modificação de interface gráfica, telas ou componentes no ecossistema.

---

## 🛑 1. Erradicação do "Design de IA" (Proibição de Landing Page / Dribbble Slop)

Aplicações corporativas, painéis administrativos, help desks, chats e CRMs são **ferramentas de trabalho**, não landing pages promocionais.
O agente deve rejeitar o visual artificial gerado por IA genérica:

1. **Densidade de Informação Profissional:**
   - **Proibido Componentes Inflados:** Não use `rounded-3xl` (`border-radius: 24px+`) nem paddings gigantescos (`p-8`, `p-10`) em cards internos de dados.
   - **Padrão de Produto:** Use cantos moderados (`rounded-lg` / `rounded-md`, 6px a 10px), paddings compactos e ergonômicos (12px a 20px) e hierarquia tipográfica focada em legibilidade e rapidez de leitura.
   - **Tamanho de Botões:** Botões normais de desktop devem ter 32px a 40px de altura (nunca botões balão de 56px estilo landing page). No mobile, garanta área de toque invisível/visível de 44x44px.
2. **Proibição de Efeitos Espalhafatosos:**
   - Proibido o uso indiscriminado de gradientes roxos neon (`from-purple-500 to-indigo-500`), brilhos neon (`box-shadow: 0 0 25px rgba(...)`) ou glassmorphism denso (`backdrop-blur-xl bg-white/5`) sem contraste definido.
   - Paletas sóbrias e refinadas: monocromático equilibrado (Zinc/Slate) com apenas 1 cor de destaque funcional (< 5% da tela).

---

## 🛡️ 2. Defensive CSS — Proibido Deixar Telas Quebradas

Ao refatorar ou ajustar componentes existentes:
1. **Preservação de Flexbox e Grid:**
   - NUNCA remova `min-width: 0` de filhos flexíveis que contenham texto ou dados dinâmicos (sua ausência estoura o contêiner e causa scroll horizontal indesejado).
   - NUNCA quebre a cadeia de altura (`height: 100%`, `flex: 1`, `overflow: hidden`) sem testar se o scroll do chat/tabela continua funcionando.
   - NUNCA aplique larguras fixas em pixels (`width: 450px`) em áreas que precisam ser fluidas. Use `max-width: 100%` e unidades relativas.
2. **Harmonia com o Design System Existente:**
   - Respeite rigorosamente a tecnologia e os tokens já adotados pelo projeto (ex.: se o projeto usa Styled-Components com `theme.colors.*`, use esse padrão; se usa Tailwind, use os tokens utilitários).
   - NUNCA injete bibliotecas ou classes alienígenas conflitantes.
3. **Preservação Funcional:**
   - Ao refatorar o visual, NUNCA perca props, callbacks de eventos (`onClick`, `onChange`, `onClose`, `onSubmit`) ou a gestão de foco de inputs.

---

## 📱 3. Erradicação da Preguiça Mobile — Master-Detail Obrigatório

Mudar apenas `padding` ou aplicar `flex-direction: column` cego **NÃO É** adaptação mobile.
1. **Telas Multi-Coluna (Chat / Atendimento / Inboxes / Split-Views):**
   - **PROIBIDO EMPILHAMENTO VERTICAL:** No celular, o usuário não pode ter que rolar uma lista inteira de contatos para só então conseguir ver o chat.
   - **OBRIGATÓRIO MASTER-DETAIL:**
     * No celular, exiba **somente a lista** quando nenhum item estiver selecionado.
     * Ao clicar em um atendimento/item, oculte a lista e abra a área de conversa em **tela cheia (100dvh)**.
     * Deve haver obrigatoriamente um botão `← Voltar` (com touch target >= 44x44px) no topo para desmarcar a seleção e retornar à lista.
     * Painéis secundários de contexto (dados do cliente, histórico) devem ser acessados via **Bottom Sheet** deslizante acionada por botão de ação rápida no cabeçalho.
2. **Ergonomia do Polegar & Hardware:**
   - Altura dinâmica `100dvh` obrigatória em contêineres de tela cheia (elimina corte da barra de navegação no Safari e Chrome móvel).
   - Respeito à Safe Area na base (`pb-[env(safe-area-inset-bottom)]`) para barras fixas.
   - Clearance de 64px para o botão de menu hambúrguer no cabeçalho mobile.
   - Fonte mínima de 16px em inputs para impedir o auto-zoom do iOS Safari.

---

## ☀️ 4. Coerência Estrita Dual-Theme (Light & Dark Mode)

1. **Zero Texto Branco Hardcoded:**
   - Proibido `color: #fff`, `color: white` ou `text-white` estático sobre superfícies dinâmicas. No tema claro, isso gera texto branco no branco.
   - Sempre utilize ternárias `isLight(theme) ? '#0f172a' : '#f8fafc'` ou tokens semânticos `theme.colors.text`.
2. **Zero Superfícies Fantasma:**
   - Proibido `background: rgba(255, 255, 255, 0.05)` ou bordas brancas translúcidas sem alternativa clara. No tema claro, use fundos sólidos (`#ffffff`) com bordas nítidas (`#e2e8f0`).
3. **Contraste WCAG AA (4.5:1):**
   - Todo texto deve ser legível com contraste confortável em ambos os modos.

---

## ⚡ 5. Governança Autônoma Sem Comandos Avulsos

- O agente não espera nem pede comandos como `/front`, `/mobile` ou `/orch`.
- Ele assume a responsabilidade de entregar o front-end perfeito, com contraste verificado, mobile ergonômico e layout intacto.
