# 📱 Mobile Converter — Engenharia de Adaptação Mobile de Alta Fidelidade

> **Skill especializada em transformar telas, páginas e fluxos desktop em experiências mobile nativas de alta performance (Anti-Mobile Slop).**  
> Suporte nativo a Bottom Sheets com gesto de arrasto, Tab Bar móvel tátil, Touch Targets de 44px+, Safe Areas (Notch & Home Bar) e Viewport Dinâmico (`dvh`).

---

## 🎯 Por que Usar?

A maioria dos modelos de IA adapta interfaces mobile simplesmente encolhendo os elementos desktop. O resultado é o **Mobile Slop**:
- Tabelas com 6 colunas que quebram o layout com scroll horizontal impossível de ler;
- Botões menores que a ponta do polegar (< 30px);
- Menus superiores e modais flutuantes que cobrem o conteúdo e não respondem ao toque;
- Barras fixas cobertas pela linha home do iPhone;
- Telas que dão zoom in descontrolado no Safari ao clicar em um input.

O **`mobile-converter`** implementa os padrões de engenharia móvel da Apple (HIG), Google (Material 3), Nubank, Airbnb e Linear, transformando componentes brutos em interfaces táteis e fluidas.

---

## 📱 Os 7 Pilares de Conversão Mobile

1. **Viewport Dinâmico:** `100dvh` / `min-h-dvh` no lugar do obsoleto `100vh`.
2. **Safe Areas de Hardware:** Suporte a `env(safe-area-inset-top)` e `env(safe-area-inset-bottom)`.
3. **Ergonomia do Polegar (Thumb Zone):** Touch targets mínimos de 44×44px e ações primárias na base.
4. **Metamorfose de Tabelas:** Tabelas desktop viram feeds verticais de cards táteis no mobile.
5. **Navegação Nativa:** Menus densos viram **Bottom Navigation Bar** com abas deslizantes.
6. **Superfícies Gestuais:** Modais viram **Bottom Sheets** com arrasto para fechar (`drag="y"`).
7. **Prevenção de Falhas no iOS:** Inputs com `font-size: 16px` para eliminar auto-zoom forçado.

---

## 🛠️ Comandos e Ferramentas

```bash
# 1. Abrir simulador visual interativo de smartphone no navegador (1s):
node scripts/preview-mobile.js
node scripts/preview-mobile.js --device=iphone15
node scripts/preview-mobile.js --device=galaxy

# 2. Auditar qualidade mobile e calcular o Mobile Readiness Score (0-100):
node scripts/mobile-audit.js src/

# 3. Aplicar correções automáticas de viewport e safe-areas (Autofix):
node scripts/mobile-audit.js src/ --fix

# 4. Gerar receita cirúrgica de adaptação para um componente:
node scripts/adapt-screen.js src/components/OrderTable.tsx

# 5. Testar a integridade da skill:
npm test
```

---

## 📋 Catálogo de Templates Disponíveis

- **`templates/BottomSheet.tsx`:** Gaveta móvel com física de molas, arrasto para fechar (`drag="y"`), puxador tátil e padding de safe area.
- **`templates/MobileBottomNav.tsx`:** Tab Bar inferior estilo iOS com indicador ativo deslizante (`layoutId`), haptic tap e safe area.
- **`templates/ResponsiveTableToCards.tsx`:** Tabela clássica no desktop que se metamorfoseia automaticamente em cards empilhados no mobile.
- **`templates/SwipeableRow.tsx`:** Linha de lista móvel com gesto de arrasto horizontal estilo iOS/WhatsApp para revelar ações (Arquivar / Excluir).

---

## 🤝 Conexão no Monorepo de Skills

- **Com `frontend-craftsman`:** Herda paletas monocromáticas e molas rápidas do Framer Motion.
- **Com `hybrid-orchestrator`:** Integra o pipeline de verificação pós-execução (Pipeline 7.3) bloqueando entregas com Score < 90/100.

---

## 📜 Licença
MIT © [Henrique Alves](https://github.com/Henrique-All)
