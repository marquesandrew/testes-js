const express = require('express');
const path = require('path');
const { criarAppRecuperacao } = require('./recuperacao-app');

/**
 * Aula 22/10 — app WEB para o Playwright testar: páginas em /public + a API
 * de cadastro/login/recuperação (recuperacao-app.js) montada na mesma origem.
 *
 * Caixa de e-mail de DESENVOLVIMENTO (/__dev/emails): o "serviço de e-mail"
 * guarda a mensagem em memória, e o teste lê o link dali (ideia do Mailpit/MailHog).
 * Nunca exponha isto em produção.
 */
function criarAppWeb({ usuarios = [], relogio } = {}) {
  const caixa = [];
  const servicoEmail = {
    enviar: async ({ para, token }) => {
      caixa.push({ para, token, link: `/redefinir.html?token=${token}` });
    },
  };

  const app = express();
  app.use(criarAppRecuperacao({ servicoEmail, usuarios, relogio }));

  app.get('/__dev/emails', (req, res) => {
    const para = typeof req.query.para === 'string' ? req.query.para.trim().toLowerCase() : null;
    res.status(200).json(para ? caixa.filter((m) => m.para === para) : caixa);
  });

  app.use(express.static(path.join(__dirname, '..', 'public')));
  return app;
}

module.exports = { criarAppWeb };
