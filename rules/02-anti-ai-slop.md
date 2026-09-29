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
