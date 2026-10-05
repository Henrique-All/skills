# 🎨 Regra 02: Anti-AI Slop & Design Engineering de Alta Fidelidade

Esta regra governa qualquer geração ou modificação de interface gráfica, telas ou componentes.

## 1. Eliminação de Clichês Visuais ("Cara de IA")
- **Gradientes:** Proibido o uso indiscriminado de gradientes roxos neon (`bg-gradient-to-r from-purple-500 to-indigo-500`). Utilize paletas curadas de alto contraste (Linear Dark, Stripe Light, Apple Neutral).
- **Sombras e Vidro:** Evite glassmorphism exagerado (`backdrop-blur-xl bg-white/10`) sem propósito de profundidade ou contraste legível.
- **Tipografia:** Tipografia com hierarquia nítida, pesos balanceados e `tabular-nums` para números e tabelas.

## 2. Física e Ergonomia Mobile
- **Molas Reais:** Animações interativas utilizam molas elásticas (`stiffness: 300+, damping: 30`) e nunca transições lineares ou pasteurizadas.
- **Touch Targets:** Botões e áreas clicáveis devem ter no mínimo **44x44px** de área de toque.
- **Viewports Dinâmicos:** Use unidades `dvh` ou `svh` para evitar que a barra de navegação dos navegadores mobile cubra o conteúdo.
- **Safe Areas:** Respeite o entalhe do display (Notch) e a barra inferior de gestos (`env(safe-area-inset-bottom)`).
- **Master-Detail em Listas/Chats:** Nunca empilhe colunas desktop verticalmente em uma lista infinita no mobile. No celular, selecione a conversa/item e exiba em tela cheia com botão tátil de voltar (`← Voltar`).

## 3. Coerência Obrigatória Dual-Theme (Dark & Light Mode)
- **Zero Texto Branco Hardcoded:** É expressamente PROIBIDO o uso de `color: #fff`, `color: #ffffff` ou `color: white` de forma estática sem verificação do tema (`isLight(theme)` ou tokens de tema `theme.colors.text`). Em Light Mode, texto branco contra fundo claro torna o sistema 100% ilegível.
- **Zero Superfícies Fantasma:** É expressamente PROIBIDO usar `background: rgba(255, 255, 255, 0.02)` ou bordas brancas translúcidas em cards sem fallback para Light Mode. Em fundo claro (#F8FAFC), o card deve possuir fundo opaco (`#ffffff`), borda nítida (`#e2e8f0`) e sombra sutil (`0 1px 3px rgba(0,0,0,0.05)`).
- **Tokens de Design System:** Sempre priorize o uso de `theme.colors.*` (`theme.colors.text`, `theme.colors.surface`, `theme.colors.border`, `theme.colors.textSecondary`).

## 4. Orquestração Proativa Autônoma (Fim das "Coisas Avulsas")
- O agente não deve esperar que o usuário digite comandos avulsos (`/front`, `/mobile`, `/orch`) para fazer o trabalho direito.
- Em **qualquer** solicitação que toque o front-end, o agente deve agir como Design Engineer Senior: garantindo **automaticamente** contraste em Light Mode, acabamento artesanal e ergonomia mobile nativa.

