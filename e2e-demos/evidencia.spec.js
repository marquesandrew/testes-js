const { test, expect } = require('@playwright/test');

/**
 * DEMO — evidências. Este teste FALHA DE PROPÓSITO para você abrir:
 *   1) o screenshot da falha   2) o vídeo   3) o trace (passo a passo navegável)
 *
 *   npm run e2e:demos
 *   npx playwright show-report playwright-report-demos
 */
test('❌ falha de propósito: título esperado errado', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('E-mail').fill('ana@exemplo.com');
  await page.getByLabel('Senha').fill('senhaErrada');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByRole('alert')).toHaveText('Login realizado com sucesso'); // não é o que a tela mostra
});
