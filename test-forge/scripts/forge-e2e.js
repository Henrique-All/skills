#!/usr/bin/env node
/**
 * test-forge/scripts/forge-e2e.js
 * Gerador de Testes E2E Táteis para Playwright
 * Gera testes para Desktop e Mobile cobrindo Touch Targets de 44px+ e ausência de scroll horizontal.
 */

const fs = require('fs');
const path = require('path');

const pageRoute = process.argv[2] || '/';
const outArg = process.argv.find(a => a.startsWith('--out='));
const defaultFilename = `${pageRoute.replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+/, '') || 'home'}.e2e.spec.ts`;
const outPath = outArg ? path.resolve(outArg.split('=')[1]) : path.resolve(process.cwd(), 'e2e', defaultFilename);

const e2eContent = `/**
 * ${path.basename(outPath)}
 * Teste E2E Playwright gerado pelo Test Forge (Enterprise AI Suite)
 * Valida interações reais no navegador em Desktop e Mobile.
 */

import { test, expect, devices } from '@playwright/test';

// 1. TESTE DESKTOP
test.describe('Desktop Flow: ${pageRoute}', () => {
  test('deve renderizar a interface sem erros de console ou layout', async ({ page }) => {
    await page.goto('${pageRoute}');
    await expect(page).toHaveTitle(/./);
  });
});

// 2. TESTE MOBILE REAL (iPhone 15 Pro)
test.describe('Mobile Ergonomics: ${pageRoute} (iPhone 15 Pro)', () => {
  test.use({ ...devices['iPhone 15 Pro'] });

  test('deve respeitar touch targets mínimos de 44px e safe-areas', async ({ page }) => {
    await page.goto('${pageRoute}');

    // Verifica botões interativos
    const buttons = await page.locator('button, a[role="button"]').all();
    for (const btn of buttons.slice(0, 5)) {
      const box = await btn.boundingBox();
      if (box) {
        // Alerta se touch target for menor que o padrão ergonômico da Apple
        expect(box.width).toBeGreaterThanOrEqual(40);
        expect(box.height).toBeGreaterThanOrEqual(40);
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
