const { test, expect, emailUnico, linkDeRecuperacao } = require('./fixtures');

const NEUTRA = 'Se o e-mail estiver cadastrado, você receberá as instruções';

test.describe('Recuperação de senha (RF-12) — o caminho crítico de ponta a ponta', () => {
  test('solicita o link, redefine a senha e entra com a nova', async ({
    page, request, recuperacaoPage, loginPage, usuario,
  }) => {
    await recuperacaoPage.solicitar(usuario.email);
    await expect(recuperacaoPage.sucesso).toHaveText(NEUTRA);

    const link = await linkDeRecuperacao(request, usuario.email);   // "abre o e-mail"
    await recuperacaoPage.redefinirComLink(link, 'novaSenha456');
    await expect(recuperacaoPage.sucesso).toHaveText('Senha alterada com sucesso');

    await loginPage.abrir();
    await loginPage.entrarCom(usuario.email, 'novaSenha456');       // prova que a senha mudou
    await expect(page.getByTestId('usuario-logado')).toHaveText(usuario.email);
  });

  test('e-mail não cadastrado recebe a MESMA mensagem e nenhum e-mail é enviado', async ({
    request, recuperacaoPage,
  }) => {
    const fantasma = emailUnico('fantasma');
    await recuperacaoPage.solicitar(fantasma);

    await expect(recuperacaoPage.sucesso).toHaveText(NEUTRA);
    const caixa = await (await request.get('/__dev/emails', { params: { para: fantasma } })).json();
    expect(caixa).toEqual([]);
  });

  test('link já usado é recusado e oferece solicitar outro', async ({
    request, recuperacaoPage, usuario,
  }) => {
    await recuperacaoPage.solicitar(usuario.email);
    const link = await linkDeRecuperacao(request, usuario.email);
    await recuperacaoPage.redefinirComLink(link, 'novaSenha456');
    await expect(recuperacaoPage.sucesso).toHaveText('Senha alterada com sucesso');

    await recuperacaoPage.redefinirComLink(link, 'outraSenha789');  // reutiliza o mesmo link

    await expect(recuperacaoPage.erro).toHaveText('Este link é inválido ou expirou');
    await expect(recuperacaoPage.page.getByRole('link', { name: 'Solicitar novo link' })).toBeVisible();
  });
});
