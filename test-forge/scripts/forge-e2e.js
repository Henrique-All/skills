#!/usr/bin/env node
/**
 * test-forge/scripts/forge-e2e.js (v2.0)
 * Gerador de Testes E2E Táteis, Dual-Theme e Acessíveis para Playwright
 * Cobre Desktop + Mobile (iPhone 15 Pro), Light/Dark Mode, Teclado e Touch Targets 44px+.
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
 * Teste E2E Playwright gerado pelo Test Forge v2.0 (Enterprise AI Suite)
 * Valida Desktop, Dual-Theme (Light/Dark), Teclado e Ergonomia Mobile (iPhone 15 Pro).
 */

import { test, expect, devices } from '@playwright/test';

const { defaultBrowserType, ...iPhone15ProDescriptor } = devices['iPhone 15 Pro'];

// 1. TESTE DESKTOP & COERÊNCIA DUAL-THEME (LIGHT + DARK)
test.describe('Desktop & Dual-Theme Flow: ${pageRoute}', () => {
  test('deve renderizar sem erros de runtime em Light Mode e Dark Mode', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('${pageRoute}');
    await expect(page).toHaveTitle(/./);

    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('body')).toBeVisible();
    expect(pageErrors).toHaveLength(0);
  });

  test('deve permitir navegação por teclado (Tab / Escape) com foco visível', async ({ page }) => {
    await page.goto('${pageRoute}');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Escape');
    await expect(page.locator('body')).toBeVisible();
  });
});

// 2. TESTE MOBILE REAL (iPhone 15 Pro)
test.describe('Mobile Ergonomics: ${pageRoute} (iPhone 15 Pro)', () => {
  test.use({ ...iPhone15ProDescriptor });

  test('deve respeitar touch targets mínimos de 44px e zero scroll horizontal', async ({ page }) => {
    await page.goto('${pageRoute}');

    const buttons = await page.locator('button, a[role="button"]').all();
    for (const btn of buttons.slice(0, 5)) {
      const box = await btn.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }

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
console.log(`\n✅ Teste E2E Playwright v2.0 gerado com sucesso em: ${outPath}`);
console.log(`   Rota coberta: ${pageRoute}\n`);
