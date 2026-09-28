#!/usr/bin/env node
/**
 * scripts/preview-plan.js - Visualizador Estrutural da Sabatina dos 4 Quadrantes
 * Exibe o plano do Turno 1 em um painel estruturado com travas de permissão,
 * raio de impacto e status de snapshot antes de qualquer modificação de código.
 * 
 * Uso:
 *   node scripts/preview-plan.js [titulo-da-feature]
 */

const featureTitle = process.argv.slice(2).join(' ') || 'Implementação de Feature';

console.log('===============================================================');
console.log('⚡ HYBRID ORCHESTRATOR — PAINEL DE GOVERNANÇA (TURNO 1)');
console.log('===============================================================\n');

const dashboard = `
┌────────────────────────────────────────────────────────────────────────┐
│ 🎯 DEMANDA: ${featureTitle.padEnd(59)}│
│ 🛡️  ROTA DE EXECUÇÃO: [ ROTA B - SÉRIA (Sabatina + Trava + Falsifier) ]│
└────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────┬────────────────────────────────────┐
│ 📋 Q1: CONTRATOS & RETROCOMPAT    │ 🗄️ Q2: BANCO & TRANSAÇÕES          │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Schemas tipados Zod/DTO         │ • Migrations validadas             │
│ • Zero breaking changes em rotas  │ • Transações atômicas garantidas   │
│ • Blast Radius: 0 telas quebradas │ • Sem queries N+1 em loops async   │
├───────────────────────────────────┼────────────────────────────────────┤
│ 🎨 Q3: UI & EXPERIÊNCIA TÁTIL     │ 🔒 Q4: AUTH & GOVERNANÇA           │
├───────────────────────────────────┼────────────────────────────────────┤
│ • DESIGN_SPEC.md validado         │ • Middleware de Auth em rotas      │
│ • Física de Molas (Framer Motion) │ • Isolamento Multi-tenant          │
│ • Ergonomia Mobile (Thumb Zone)   │ • Menor privilégio no banco        │
└───────────────────────────────────┴────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ 🎭 ROLES COGNITIVOS ALINHADOS:                                         │
│   1. Lead: Escopo congelado e arquivos mapeados                        │
│   2. Builder: Implementação com diff atômico cirúrgico                 │
│   3. Falsifier: Atacará com estresse pós-implementação                │
└────────────────────────────────────────────────────────────────────────┘

🛑 TRAVA DE PERMISSÃO OBRIGATÓRIA:
O diagnóstico e a governança acima atendem à sua necessidade?
Responda "OK" para autorizar o Turno 2 (Snapshot git + Implementação).
`;

console.log(dashboard);
