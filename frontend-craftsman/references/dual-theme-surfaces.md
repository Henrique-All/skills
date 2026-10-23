# Superfícies, Profundidade & Coerência Dual-Theme (Light + Dark)

> Referência carregada sob demanda pelo `SKILL.md` do Frontend Craftsman (Seção 3 original, movida na íntegra).

## 💎 3. Superfícies, Profundidade & Coerência Dual-Theme (Light + Dark)

Para alcançar acabamento de hardware físico (Apple / Linear / Stripe) nos **dois temas**:

### Anatomia de um Card Dual-Theme de Alta Fidelidade:
```tsx
<motion.div
  whileHover={{ y: -2 }}
  transition={SPRINGS.snappy}
  className="
    relative rounded-xl p-5
    bg-white dark:bg-zinc-900/90
    text-zinc-900 dark:text-zinc-100
    border border-zinc-200/80 dark:border-white/[0.08]
    shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.8)]
    dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]
    hover:border-zinc-300 dark:hover:border-white/[0.16]
    transition-colors duration-200
  "
>
  {/* Conteúdo */}
</motion.div>
```

### Regras Inegociáveis de Coerência Dual-Theme:
1. **PROIBIDO Texto Branco Fixo (`color: #fff`, `text-white` sem `dark:`):** No modo claro, o fundo vira claro e o texto some. Use `text-zinc-900 dark:text-zinc-100` ou `isLight(theme) ? '#0f172a' : '#f8fafc'`. (Exceção única: texto sobre botão de acento sólido escuro em ambos os temas).
2. **PROIBIDO Superfícies Fantasma (`bg-white/5`, `border-white/10` sem `dark:`):** Branco translúcido desaparece sobre fundo claro. Use `bg-white dark:bg-zinc-900/90` e `border-zinc-200/80 dark:border-white/[0.08]`.
3. **Regra 60-30-10 de Paleta:**
   - **60% Canvas:** `#f8fafc` (Light) / `#09090b` (Dark — nunca `#000000` puro).
   - **30% Superfícies:** `#ffffff` (Light) / `#121215` (Dark).
   - **10% Tipografia:** Alto contraste (`#0f172a` / `#f4f4f5`) e apoio (`#475569` / `#a1a1aa`).
   - **< 5% Cor de Acento Cirúrgica (Apenas 1):** Amber (`#f59e0b`), Emerald (`#10b981`), Stripe Royal (`#0048e5`), Apple Blue (`#0071e3`) ou Rose Crimson (`#f43f5e`).
