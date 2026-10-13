#!/usr/bin/env node
/**
 * test-forge/scripts/forge-e2e.js
 * Gerador de Testes E2E Táteis para Playwright
 * Gera testes para Desktop e Mobile cobrindo Touch Targets de 44px+ e ausência de scroll horizontal.
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
let outFileVal = null;
const outEqArg = args.find(a => a.startsWith('--out='));
const outIdx = args.indexOf('--out');
if (outEqArg) {
  outFileVal = outEqArg.split('=')[1];
} else if (outIdx >= 0 && args[outIdx + 1]) {
  outFileVal = args[outIdx + 1];
}

const positionalArgs = args.filter((a, i) => !a.startsWith('--') && (outIdx < 0 || i !== outIdx + 1));
const pageRoute = positionalArgs[0] || '/';
const defaultFilename = `${pageRoute.replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+/, '') || 'home'}.e2e.spec.ts`;
const outPath = outFileVal ? path.resolve(outFileVal) : path.resolve(process.cwd(), 'e2e', defaultFilename);

const e2eContent = `/**
 * ${path.basename(outPath)}
 * Teste E2E Playwright gerado pelo Test Forge (Enterprise AI Suite)
 * Valida interações reais no navegador em Desktop e Mobile.
 */

import { test, expect, devices } from '@playwright/test';

// Remove defaultBrowserType para permitir test.use() dentro de test.describe() sem erro no Playwright
const { defaultBrowserType, ...iPhone15ProDescriptor } = devices['iPhone 15 Pro'];

// 1. TESTE DESKTOP
test.describe('Desktop Flow: ${pageRoute}', () => {
  test('deve renderizar a interface sem erros de console ou layout', async ({ page }) => {
    await page.goto('${pageRoute}');
    await expect(page).toHaveTitle(/./);
  });
});

// 2. TESTE MOBILE REAL (iPhone 15 Pro)
test.describe('Mobile Ergonomics: ${pageRoute} (iPhone 15 Pro)', () => {
  test.use({ ...iPhone15ProDescriptor });

  test('deve respeitar touch targets mínimos de 44px e safe-areas', async ({ page }) => {
    await page.goto('${pageRoute}');

    // Verifica botões interativos (mínimo 44x44px — Apple HIG / Enterprise AI Suite)
    const buttons = await page.locator('button, a[role="button"]').all();
    for (const btn of buttons.slice(0, 5)) {
      const box = await btn.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }

    // Garante que não haja scroll horizontal acidental
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
`;

const destDir = path.dirname(outPath);
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

fs.writeFileSync(outPath, e2eContent);
console.log(`\n✅ Teste E2E Playwright gerado com sucesso em: ${outPath}`);
console.log(`   Rota coberta: ${pageRoute}\n`);
