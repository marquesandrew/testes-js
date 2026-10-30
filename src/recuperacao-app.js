const express = require('express');
const crypto = require('crypto');

/**
 * Aula 15/10 — RF-12: Recuperação de senha.
 *
 * Mesmo padrão do pedidos-app.js (08/10): as dependências externas são INJETADAS.
 *   - relogio:      { agora: () => milissegundos }  -> nos testes, um relógio falso que "avança" sem esperar
 *   - servicoEmail: { enviar: async ({ para, token }) => {} } -> nos testes, um fake que guarda o e-mail
 *   - usuarios:     [{ email, senha }] -> cadastro inicial em memória
 *
 * Decisões do PO (ver docs/oficina-15-10/entrega.md, seção 1):
 *   A1 e-mail não cadastrado -> mesma mensagem neutra, nenhum e-mail enviado
 *   A2 link válido enquanto tempo decorrido < 15 min (15:00 exato já expirou)
 *   A3 novo link invalida o anterior
 *   A4 senha fora da política NÃO consome o link
 *   A5 e-mail normalizado: trim + minúsculas
 *   A6 senha usada como digitada; tamanho contado em caracteres (emoji = 1)
 */

const VALIDADE_MS = 15 * 60 * 1000;
const SENHA_MIN = 8;
const SENHA_MAX = 64;
const EMAIL_MAX = 254;

const MSG = {
  neutra: 'Se o e-mail estiver cadastrado, você receberá as instruções',
  emailVazio: 'Informe um e-mail',
  emailInvalido: 'Informe um e-mail válido',
  linkInvalido: 'Este link é inválido ou expirou',
  politica: `A senha deve ter entre ${SENHA_MIN} e ${SENHA_MAX} caracteres`,
  sucesso: 'Senha alterada com sucesso',
  // 22/10: cadastro e sessão
  cadastrado: 'Cadastro realizado',
  emailEmUso: 'E-mail já cadastrado',
  credenciais: 'Credenciais inválidas',
};

function normalizarEmail(email) {
  return email.trim().toLowerCase();
}

function emailTemFormatoValido(email) {
  return email.length <= EMAIL_MAX && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function senhaAtendePolitica(senha) {
  if (typeof senha !== 'string') return false;
  const tamanho = Array.from(senha).length; // conta caracteres, não unidades UTF-16
  return tamanho >= SENHA_MIN && tamanho <= SENHA_MAX;
}

function criarAppRecuperacao({
  relogio = { agora: () => Date.now() },
  servicoEmail,
  usuarios = [],
} = {}) {
  const app = express();
  app.use(express.json());

  // email normalizado -> { senha }
  const contas = new Map(usuarios.map((u) => [normalizarEmail(u.email), { senha: u.senha }]));
  // token -> { email, criadoEm, estado: 'gerado' | 'usado' | 'invalidado' }
  const links = new Map();
  // email -> token ativo (só um por usuário, decisão A3)
  const linkAtivoPorEmail = new Map();
  // 22/10: sessão por cookie. sid -> email
  const sessoes = new Map();
  const lerSid = (req) => /(?:^|;\s*)sessao=([^;]+)/.exec(req.headers.cookie ?? '')?.[1];

  function linkEstaValido(link) {
    if (!link || link.estado !== 'gerado') return false;
    return relogio.agora() - link.criadoEm < VALIDADE_MS; // decisão A2: "<", não "<="
  }

  // 1) Solicitar recuperação
  app.post('/recuperacao', async (req, res) => {
    const { email } = req.body ?? {};

    if (typeof email !== 'string' || email.trim() === '') {
      return res.status(400).json({ erro: MSG.emailVazio });
    }
    const normalizado = normalizarEmail(email);
    if (!emailTemFormatoValido(normalizado)) {
      return res.status(400).json({ erro: MSG.emailInvalido });
    }

    if (contas.has(normalizado)) {
      const anterior = linkAtivoPorEmail.get(normalizado);
      if (anterior) links.get(anterior).estado = 'invalidado';

      const token = crypto.randomUUID();
      links.set(token, { email: normalizado, criadoEm: relogio.agora(), estado: 'gerado' });
      linkAtivoPorEmail.set(normalizado, token);
      await servicoEmail.enviar({ para: normalizado, token });
    }

    // Mesma resposta, cadastrado ou não (decisão A1: sem enumeração de usuários)
    return res.status(202).json({ mensagem: MSG.neutra });
  });

  // 2) Redefinir a senha com o link
  app.post('/recuperacao/redefinir', (req, res) => {
    const { token, novaSenha } = req.body ?? {};
    const link = links.get(token);

    // Link é verificado ANTES da senha (tabela de decisão R3/R4)
    if (!linkEstaValido(link)) {
      return res.status(410).json({ erro: MSG.linkInvalido, novoLink: '/recuperacao' });
    }
    if (!senhaAtendePolitica(novaSenha)) {
      return res.status(422).json({ erro: MSG.politica }); // link continua válido (A4)
    }

    contas.get(link.email).senha = novaSenha;
    link.estado = 'usado';
    linkAtivoPorEmail.delete(link.email);
    return res.status(200).json({ mensagem: MSG.sucesso });
  });

  // 3) Login: só para os testes conseguirem provar que a senha mudou (ou não)
  app.post('/login', (req, res) => {
    const { email, senha } = req.body ?? {};
    const conta = typeof email === 'string' ? contas.get(normalizarEmail(email)) : undefined;
    if (!conta || conta.senha !== senha) {
      return res.status(401).json({ erro: MSG.credenciais });
    }
    // 22/10: abre uma sessão (é isso que o Playwright guarda no storageState)
    const sid = crypto.randomUUID();
    sessoes.set(sid, normalizarEmail(email));
    res.cookie('sessao', sid, { httpOnly: true, sameSite: 'lax' });
    return res.status(200).json({ mensagem: 'ok' });
  });

  // 4) Cadastro (22/10): 201 | 400 e-mail | 409 e-mail em uso | 422 senha fora da política
  app.post('/cadastro', (req, res) => {
    const { email, senha } = req.body ?? {};
    if (typeof email !== 'string' || email.trim() === '') {
      return res.status(400).json({ erro: MSG.emailVazio });
    }
    const normalizado = normalizarEmail(email);
    if (!emailTemFormatoValido(normalizado)) {
      return res.status(400).json({ erro: MSG.emailInvalido });
    }
    if (!senhaAtendePolitica(senha)) {
      return res.status(422).json({ erro: MSG.politica });
    }
    if (contas.has(normalizado)) {
      return res.status(409).json({ erro: MSG.emailEmUso });
    }
    contas.set(normalizado, { senha });
    return res.status(201).json({ mensagem: MSG.cadastrado });
  });

  // 5) Quem sou eu? (22/10) — área logada
  app.get('/eu', (req, res) => {
    const email = sessoes.get(lerSid(req));
    if (!email) return res.status(401).json({ erro: 'Não autenticado' });
    return res.status(200).json({ email });
  });

  // 6) Sair (22/10)
  app.post('/logout', (req, res) => {
    sessoes.delete(lerSid(req));
    res.clearCookie('sessao');
    return res.status(204).send();
  });

  app.use((err, req, res, _next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ erro: 'JSON inválido' });
    }
    return res.status(500).json({ erro: 'erro interno' });
  });

  return app;
}

module.exports = { criarAppRecuperacao, MSG, VALIDADE_MS };
