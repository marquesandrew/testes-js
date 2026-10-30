const request = require('supertest');
const { criarAppRecuperacao, MSG } = require('../../src/recuperacao-app');
const { criarRelogioFalso, criarEmailFalso, USUARIOS_PADRAO } = require('../helpers/fakes');

/**
 * Aula 15/10 — cada describe é uma TÉCNICA da oficina.
 * Os IDs (A1, EQ1, VL1, R1, ...) são os mesmos de docs/oficina-15-10/entrega.md
 * e do gabarito-oficina.xlsx (aba Rastreabilidade).
 */
describe('RF-12 Recuperação de senha', () => {
  let app;
  let relogio;
  let email;

  beforeEach(() => {
    relogio = criarRelogioFalso();
    email = criarEmailFalso();
    app = criarAppRecuperacao({ relogio, servicoEmail: email, usuarios: USUARIOS_PADRAO });
  });

  // --- helpers do próprio teste ---
  async function solicitarLink(endereco = 'ana@exemplo.com') {
    await request(app).post('/recuperacao').send({ email: endereco });
    return email.ultimoTokenPara('ana@exemplo.com');
  }
  const redefinir = (token, novaSenha) =>
    request(app).post('/recuperacao/redefinir').send({ token, novaSenha });
  const login = (senha) => request(app).post('/login').send({ email: 'ana@exemplo.com', senha });
  const senhaCom = (n) => 'a'.repeat(n);

  // ---------------------------------------------------------------
  describe('Particionamento de equivalência — campo e-mail', () => {
    test.each([
      ['EQ1', 'cadastrado, formato válido', 'ana@exemplo.com'],
      ['EQ2', 'maiúsculas e espaços nas pontas', ' Ana@Exemplo.COM '],
    ])('%s %s: 202, mensagem neutra e e-mail enviado', async (_id, _d, entrada) => {
      const res = await request(app).post('/recuperacao').send({ email: entrada });

      expect(res.status).toBe(202);
      expect(res.body).toEqual({ mensagem: MSG.neutra });
      expect(email.enviados).toHaveLength(1);
      expect(email.enviados[0].para).toBe('ana@exemplo.com');
    });

    test('EQ3 não cadastrado: MESMA resposta da EQ1 e nenhum e-mail (A1, anti-enumeração)', async () => {
      const cadastrado = await request(app).post('/recuperacao').send({ email: 'ana@exemplo.com' });
      const fantasma = await request(app).post('/recuperacao').send({ email: 'fantasma@exemplo.com' });

      expect(fantasma.status).toBe(cadastrado.status);
      expect(fantasma.body).toEqual(cadastrado.body);
      expect(email.enviados.map((m) => m.para)).toEqual(['ana@exemplo.com']);
    });

    test.each([
      ['EQ4', 'sem @', 'ana.exemplo.com', MSG.emailInvalido],
      ['EQ5', 'sem domínio', 'ana@', MSG.emailInvalido],
      ['EQ6', 'só espaços', '   ', MSG.emailVazio],
      ['EQ6b', 'vazio', '', MSG.emailVazio],
      ['EQ7', 'mais de 254 caracteres', `${'a'.repeat(290)}@exemplo.com`, MSG.emailInvalido],
    ])('%s %s: 400 com erro de validação', async (_id, _d, entrada, mensagem) => {
      const res = await request(app).post('/recuperacao').send({ email: entrada });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ erro: mensagem });
      expect(email.enviados).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------
  describe('Valores limite — tamanho da nova senha (8 a 64)', () => {
    test.each([
      ['VL1', 7, 422],
      ['VL2', 8, 200],
      ['VL3', 20, 200],
      ['VL4', 64, 200],
      ['VL5', 65, 422],
    ])('%s senha com %i caracteres -> %i', async (_id, tamanho, statusEsperado) => {
      const token = await solicitarLink();

      const res = await redefinir(token, senhaCom(tamanho));

      expect(res.status).toBe(statusEsperado);
    });

    test('A6 emoji conta como 1 caractere: 7 letras + 1 emoji = 8 -> aceita', async () => {
      const token = await solicitarLink();

      const res = await redefinir(token, 'abcdefg🔒');

      expect(res.status).toBe(200);
    });
  });

  describe('Valores limite — expiração do link (15 min, relógio injetado)', () => {
    test.each([
      ['VL6', 14, 59, 200],
      ['VL7', 15, 0, 410], // decisão A2: 15:00 exato já expirou
      ['VL8', 15, 1, 410],
    ])('%s uso aos %i min %i s -> %i', async (_id, minutos, segundos, statusEsperado) => {
      const token = await solicitarLink();
      relogio.avancar({ minutos, segundos });

      const res = await redefinir(token, 'novaSenha123');

      expect(res.status).toBe(statusEsperado);
    });
  });

  // ---------------------------------------------------------------
  describe('Tabela de decisão — redefinição', () => {
    test('R1 cadastrado + link válido + senha OK: senha alterada e link invalidado', async () => {
      const token = await solicitarLink();

      const res = await redefinir(token, 'novaSenha123');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ mensagem: MSG.sucesso });
      expect((await login('novaSenha123')).status).toBe(200);
      expect((await login('senhaAntiga123')).status).toBe(401);
      expect((await redefinir(token, 'outraSenha123')).status).toBe(410);
    });

    test('R2 link válido + senha fora da política: 422 e link CONTINUA válido (A4)', async () => {
      const token = await solicitarLink();

      const falha = await redefinir(token, 'curta');
      const novaTentativa = await redefinir(token, 'agoraSim123');

      expect(falha.status).toBe(422);
      expect(falha.body).toEqual({ erro: MSG.politica });
      expect(novaTentativa.status).toBe(200);
    });

    test.each([
      ['R3', 'senha OK', 'novaSenha123'],
      ['R4', 'senha fora da política', 'curta'],
    ])('%s link inválido + %s: 410, oferece novo link (link checado antes da senha)', async (_id, _d, senha) => {
      await solicitarLink();
      relogio.avancar({ minutos: 16 });
      const token = email.ultimoTokenPara('ana@exemplo.com');

      const res = await redefinir(token, senha);

      expect(res.status).toBe(410);
      expect(res.body).toEqual({ erro: MSG.linkInvalido, novoLink: '/recuperacao' });
      expect((await login('senhaAntiga123')).status).toBe(200);
    });

    test('R7/R8 não cadastrado: mensagem neutra e nenhum e-mail', async () => {
      const res = await request(app).post('/recuperacao').send({ email: 'fantasma@exemplo.com' });

      expect(res.status).toBe(202);
      expect(res.body).toEqual({ mensagem: MSG.neutra });
      expect(email.enviados).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------
  describe('Transição de estados do link', () => {
    test('ET1 Gerado -> Usado (válida)', async () => {
      const token = await solicitarLink();
      expect((await redefinir(token, 'novaSenha123')).status).toBe(200);
    });

    test('ET4 Usado -> Usado (inválida): reutilizar o link é bloqueado', async () => {
      const token = await solicitarLink();
      await redefinir(token, 'novaSenha123');

      const reuso = await redefinir(token, 'invasor12345');

      expect(reuso.status).toBe(410);
      expect((await login('invasor12345')).status).toBe(401);
    });

    test('ET5 Expirado -> Usado (inválida)', async () => {
      const token = await solicitarLink();
      relogio.avancar({ minutos: 20 });

      expect((await redefinir(token, 'novaSenha123')).status).toBe(410);
    });

    test('ET3/ET6 Gerado -> Invalidado ao pedir novo link (A3); o novo funciona', async () => {
      const primeiro = await solicitarLink();
      const segundo = await solicitarLink();

      expect(segundo).not.toBe(primeiro);
      expect((await redefinir(primeiro, 'novaSenha123')).status).toBe(410);
      expect((await redefinir(segundo, 'novaSenha123')).status).toBe(200);
    });

    test('token inexistente é tratado como link inválido', async () => {
      expect((await redefinir('token-que-nao-existe', 'novaSenha123')).status).toBe(410);
    });
  });

  // ---------------------------------------------------------------
  describe('Robustez (herança de 08/10)', () => {
    test('JSON malformado -> 400 e não 500', async () => {
      const res = await request(app)
        .post('/recuperacao')
        .set('Content-Type', 'application/json')
        .send('{ "email": ');

      expect(res.status).toBe(400);
    });

    test('sem relógio injetado, usa o relógio real (link recém-criado é válido)', async () => {
      const appReal = criarAppRecuperacao({ servicoEmail: email, usuarios: USUARIOS_PADRAO });
      await request(appReal).post('/recuperacao').send({ email: 'ana@exemplo.com' });

      const res = await request(appReal)
        .post('/recuperacao/redefinir')
        .send({ token: email.ultimoTokenPara('ana@exemplo.com'), novaSenha: 'novaSenha123' });

      expect(res.status).toBe(200);
    });

    test('login com e-mail ausente -> 401', async () => {
      expect((await request(app).post('/login').send({})).status).toBe(401);
    });
  });
});
