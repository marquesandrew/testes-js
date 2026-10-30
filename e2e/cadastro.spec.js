const { test, expect, emailUnico } = require('./fixtures');

test.describe('Cadastro', () => {
  test.beforeEach(async ({ cadastroPage }) => {
    await cadastroPage.abrir();
  });

  test('cria conta com dados válidos', async ({ cadastroPage }) => {
    await cadastroPage.cadastrar(emailUnico('novo'), 'senhaBoa123');

    await expect(cadastroPage.sucesso).toHaveText('Cadastro realizado');
    await expect(cadastroPage.page.getByRole('link', { name: 'Ir para o login' })).toBeVisible();
  });

  test('rejeita senha curta (7 caracteres)', async ({ cadastroPage }) => {
    await cadastroPage.cadastrar(emailUnico('curta'), 'a'.repeat(7));

    await expect(cadastroPage.erro).toHaveText('A senha deve ter entre 8 e 64 caracteres');
  });

  test('rejeita e-mail inválido', async ({ cadastroPage }) => {
    await cadastroPage.cadastrar('sem-arroba', 'senhaBoa123');

    await expect(cadastroPage.erro).toHaveText('Informe um e-mail válido');
  });

  test('rejeita e-mail já cadastrado', async ({ cadastroPage, usuario }) => {
    await cadastroPage.cadastrar(usuario.email, 'outraSenha123');

    await expect(cadastroPage.erro).toHaveText('E-mail já cadastrado');
  });
});
