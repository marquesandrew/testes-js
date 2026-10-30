const base = require('@playwright/test');
const { CadastroPage } = require('./pages/CadastroPage');
const { LoginPage } = require('./pages/LoginPage');
const { RecuperacaoPage } = require('./pages/RecuperacaoPage');

const { expect } = base;

// Dado ÚNICO por teste: nenhum teste enxerga (ou quebra) o dado de outro, mesmo em paralelo.
function emailUnico(prefixo = 'u') {
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@exemplo.com`;
}

// Lê o link de recuperação na caixa de e-mail de desenvolvimento.
// expect.poll = espera por uma condição FORA da tela (aqui, a API), com retry.
async function linkDeRecuperacao(request, email) {
  let link;
  await expect
    .poll(async () => {
      const r = await request.get('/__dev/emails', { params: { para: email } });
      const mensagens = await r.json();
      link = mensagens.at(-1)?.link;
      return link;
    }, { message: `nenhum e-mail de recuperação chegou para ${email}` })
    .toBeTruthy();
  return link;
}

const test = base.test.extend({
  cadastroPage: async ({ page }, use) => use(new CadastroPage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  recuperacaoPage: async ({ page }, use) => use(new RecuperacaoPage(page)),

  // Conta criada pela API (rápido), só para testes que NÃO são sobre cadastro
  usuario: async ({ request }, use) => {
    const conta = { email: emailUnico('conta'), senha: 'senhaBoa123' };
    const r = await request.post('/cadastro', { data: conta });
    expect(r.status()).toBe(201);
    await use(conta);
  },
});

module.exports = { test, expect, emailUnico, linkDeRecuperacao };
