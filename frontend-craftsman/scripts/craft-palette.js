#!/usr/bin/env node
/**
 * scripts/craft-palette.js - Gerador de Paletas e Tokens de Design de Elite
 * Produz paletas calibradas (sem roxo clichê) para Tailwind e CSS Variables.
 * 
 * Uso:
 *   node scripts/craft-palette.js [preset] [--format=css|tailwind]
 *   node scripts/craft-palette.js linear-dark
 *   node scripts/craft-palette.js supabase-emerald --format=css
 */

const args = process.argv.slice(2);
const presetName = args.find((a) => !a.startsWith('--')) || 'linear-dark';
const formatArg = args.find((a) => a.startsWith('--format='));
const format = formatArg ? formatArg.split('=')[1] : 'tailwind';

const PRESETS = {
  'linear-dark': {
    name: 'Linear Dark (Zinc Profundo + Amber Accent)',
    bgCanvas: '#09090b',
    bgSurface: '#121215',
    bgElevated: '#18181b',
    borderSubtle: 'rgba(255, 255, 255, 0.08)',
    borderHover: 'rgba(255, 255, 255, 0.16)',
    textPrimary: '#f4f4f5',
    textSecondary: '#a1a1aa',
    textMuted: '#71717a',
    accent: '#f59e0b',
    accentHover: '#d97706',
    innerHighlight: 'rgba(255, 255, 255, 0.06)'
  },
  'supabase-emerald': {
    name: 'Supabase Emerald (Grafite Escuro + Esmeralda Energética)',
    bgCanvas: '#0c0e12',
    bgSurface: '#15181e',
    bgElevated: '#1c2028',
    borderSubtle: 'rgba(255, 255, 255, 0.07)',
    borderHover: 'rgba(255, 255, 255, 0.14)',
    textPrimary: '#ededed',
    textSecondary: '#9ba1a6',
    textMuted: '#687076',
    accent: '#10b981',
    accentHover: '#059669',
    innerHighlight: 'rgba(255, 255, 255, 0.05)'
  },
  'raycast-obsidian': {
    name: 'Raycast Obsidian (Preto Técnico + Crimson Accent)',
    bgCanvas: '#0a0a0c',
    bgSurface: '#141418',
    bgElevated: '#1d1d23',
    borderSubtle: 'rgba(255, 255, 255, 0.08)',
    borderHover: 'rgba(255, 255, 255, 0.18)',
    textPrimary: '#ffffff',
    textSecondary: '#a0a0aa',
    textMuted: '#52525b',
    accent: '#f43f5e',
    accentHover: '#e11d48',
    innerHighlight: 'rgba(255, 255, 255, 0.07)'
  },
  'apple-neutral': {
    name: 'Apple Neutral (Cinza Espacial Mínimo + Azul Cirúrgico)',
    bgCanvas: '#000000',
    bgSurface: '#161618',
    bgElevated: '#212124',
    borderSubtle: 'rgba(255, 255, 255, 0.10)',
    borderHover: 'rgba(255, 255, 255, 0.22)',
    textPrimary: '#f5f5f7',
    textSecondary: '#86868b',
    textMuted: '#6e6e73',
    accent: '#2997ff',
    accentHover: '#0077ed',
    innerHighlight: 'rgba(255, 255, 255, 0.12)'
  }
};

const selected = PRESETS[presetName] || PRESETS['linear-dark'];

console.log('===============================================================');
console.log(`🎨 PALETA CRAFTSMAN: ${selected.name}`);
console.log('===============================================================\n');

if (format === 'css') {
  console.log(`/* Tokens de Superfície e Contraste para :root */
:root {
  --craft-bg-canvas: ${selected.bgCanvas};
  --craft-bg-surface: ${selected.bgSurface};
  --craft-bg-elevated: ${selected.bgElevated};
  --craft-border-subtle: ${selected.borderSubtle};
  --craft-border-hover: ${selected.borderHover};
  --craft-text-primary: ${selected.textPrimary};
  --craft-text-secondary: ${selected.textSecondary};
  --craft-text-muted: ${selected.textMuted};
  --craft-accent: ${selected.accent};
  --craft-accent-hover: ${selected.accentHover};
  --craft-inner-highlight: inset 0 1px 0 0 ${selected.innerHighlight};
}`);
} else {
  console.log(`// Configuração para tailwind.config.js (theme.extend)
module.exports = {
  theme: {
    extend: {
      colors: {
        canvas: '${selected.bgCanvas}',
        surface: {
          DEFAULT: '${selected.bgSurface}',
          elevated: '${selected.bgElevated}',
        },
        accent: {
          DEFAULT: '${selected.accent}',
          hover: '${selected.accentHover}',
        }
      },
      boxShadow: {
        'craft-inner': 'inset 0 1px 0 0 ${selected.innerHighlight}',
        'craft-glow': '0 0 20px -5px ${selected.accent}',
      },
      borderColor: {
        'subtle': '${selected.borderSubtle}',
        'hover': '${selected.borderHover}',
      }
    }
  }
};`);
}

console.log('\n💡 Dica Craftsman: Use a cor de acento APENAS em CTAs primários e badges de status.');
console.log('Preserve 95% da interface em tons neutros para alcançar contraste profissional.\n');
