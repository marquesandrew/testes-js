const { test, expect } = require('@playwright/test');
const { ARQUIVO, CONTA } = require('./auth');

test.describe('Autenticação reaproveitada (storageState)', () => {
  test.describe('com sessão salva', () => {
    test.use({ storageState: ARQUIVO });          // nenhum login pela tela neste teste

    test('abre a área logada direto, sem passar pelo login', async ({ page }) => {
      await page.goto('/minha-conta.html');

      await expect(page.getByTestId('usuario-logado')).toHaveText(CONTA.email);
    });
  });

  test.describe('sem sessão', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('área logada redireciona para o login', async ({ page }) => {
      await page.goto('/minha-conta.html');

      await expect(page).toHaveURL('/');
      await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
    });
  });
});
