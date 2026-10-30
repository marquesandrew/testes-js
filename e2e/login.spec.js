const { test, expect } = require('./fixtures');

test.describe('Login', () => {
  test('entra com credenciais corretas e vê a área logada', async ({ page, loginPage, usuario }) => {
    await loginPage.abrir();
    await loginPage.entrarCom(usuario.email, usuario.senha);

    await expect(page).toHaveURL(/\/minha-conta\.html$/);
    await expect(page.getByRole('heading', { name: 'Minha conta' })).toBeVisible();
    await expect(page.getByTestId('usuario-logado')).toHaveText(usuario.email);
  });

  test('senha errada mostra erro e permanece na tela de login', async ({ page, loginPage, usuario }) => {
    await loginPage.abrir();
    await loginPage.entrarCom(usuario.email, 'senhaErrada999');

    await expect(loginPage.erro).toHaveText('Credenciais inválidas');
    await expect(page).toHaveURL('/');
  });

  test('sair encerra a sessão', async ({ page, loginPage, usuario }) => {
    await loginPage.abrir();
    await loginPage.entrarCom(usuario.email, usuario.senha);
    await page.getByRole('button', { name: 'Sair' }).click();

    await expect(page).toHaveURL('/');
    await page.goto('/minha-conta.html');          // sem sessão, volta ao login
    await expect(page).toHaveURL('/');
  });
});
