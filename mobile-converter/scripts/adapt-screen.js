#!/usr/bin/env node
/**
 * scripts/adapt-screen.js - Gerador de Receita de Adaptação Mobile
 * Analisa um arquivo de interface e gera o plano cirúrgico de conversão para mobile.
 */

const fs = require('fs');
const path = require('path');

const targetFile = process.argv[2];

if (!targetFile) {
  console.log('Uso: node adapt-screen.js <caminho-do-arquivo.tsx>');
  process.exit(1);
}

const fullPath = path.resolve(process.cwd(), targetFile);

if (!fs.existsSync(fullPath)) {
  console.error(`❌ Arquivo não encontrado: ${targetFile}`);
  process.exit(1);
}

const content = fs.readFileSync(fullPath, 'utf-8');

console.log('===============================================================');
console.log('📱 RECEITA CIRÚRGICA DE ADAPTAÇÃO MOBILE');
console.log(`🎯 Alvo: ${targetFile}`);
console.log('===============================================================\n');

const recommendations = [];

if (content.includes('<table')) {
  recommendations.push({
    title: 'Tabela Horizontal Detectada',
    action: 'Metamorfose Tabela ➔ Feed de Cards',
    details: 'Duplique a exibição: use "hidden md:table" para desktop e "md:hidden flex flex-col gap-3" renderizando cada linha como um card tátil com badges e ações rápidas no polegar.'
  });
}

if (content.includes('100vh') || content.includes('h-screen')) {
  recommendations.push({
    title: 'Viewport 100vh Encontrado',
    action: 'Migração para 100dvh',
    details: 'Substitua "h-screen" por "min-h-screen min-h-dvh" para impedir que o rodapé fique sob a barra do Safari/Chrome.'
  });
}

if (content.includes('<nav') || content.includes('<aside') || content.includes('sidebar')) {
  recommendations.push({
    title: 'Navegação Extensa (Header/Sidebar)',
    action: 'Conversão para Bottom Navigation Bar',
    details: 'No mobile (md:hidden), posicione as 4 abas prioritárias em um componente fixo na base com pb-[env(safe-area-inset-bottom)].'
  });
}

if (content.includes('fixed bottom-0') && !content.includes('safe-area-inset-bottom')) {
  recommendations.push({
    title: 'Barra Fixa na Base sem Safe Area',
    action: 'Adicionar Padding Safe Area',
    details: 'Adicione pb-[env(safe-area-inset-bottom)] para não colidir com o botão home gestual de iPhones modernos.'
  });
}

if (recommendations.length === 0) {
  console.log('✅ Nenhuma conversão complexa necessária. O componente já segue boas práticas de responsividade básica.');
} else {
  console.log(`📋 ${recommendations.length} Transformação(ões) Recomendada(s):\n`);
  recommendations.forEach((rec, idx) => {
    console.log(`${idx + 1}. 🚀 ${rec.title}`);
    console.log(`   🛠️ Ação: ${rec.action}`);
    console.log(`   📝 Como fazer: ${rec.details}\n`);
  });
}
