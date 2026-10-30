const request = require('supertest');
const { criarAppWeb } = require('../../src/web-app');
const { MSG } = require('../../src/recuperacao-app');

/**
 * Aula 22/10 — a CAMADA DE BAIXO do E2E: cadastro, sessão e caixa de e-mail testados
 * por API (rápido). O E2E só precisa provar que o navegador consegue percorrer o fluxo.
 */
describe('App web (22/10)', () => {
  let app;
  beforeEach(() => {
    app = criarAppWeb({ usuarios: [{ email: 'ana@exemplo.com', senha: 'senhaAntiga123' }] });
  });

  describe('POST /cadastro', () => {
    test('cria a conta (201) e já permite login', async () => {
      const r = await request(app).post('/cadastro').send({ email: 'bia@exemplo.com', senha: 'senhaBoa123' });
      expect(r.status).toBe(201);
      expect(r.body).toEqual({ mensagem: MSG.cadastrado });

      const l = await request(app).post('/login').send({ email: 'bia@exemplo.com', senha: 'senhaBoa123' });
      expect(l.status).toBe(200);
    });

    test.each([
      ['e-mail ausente', {}, 400, MSG.emailVazio],
      ['e-mail inválido', { email: 'sem-arroba', senha: 'senhaBoa123' }, 400, MSG.emailInvalido],
      ['senha curta (7)', { email: 'c@exemplo.com', senha: 'a'.repeat(7) }, 422, MSG.politica],
      ['senha longa (65)', { email: 'c@exemplo.com', senha: 'a'.repeat(65) }, 422, MSG.politica],
      ['e-mail já em uso', { email: 'ana@exemplo.com', senha: 'senhaBoa123' }, 409, MSG.emailEmUso],
      ['e-mail em uso com outra caixa', { email: ' ANA@Exemplo.com ', senha: 'senhaBoa123' }, 409, MSG.emailEmUso],
    ])('rejeita %s', async (_d, corpo, status, erro) => {
      const r = await request(app).post('/cadastro').send(corpo);
      expect(r.status).toBe(status);
      expect(r.body).toEqual({ erro });
    });
  });

  describe('sessão (cookie) — base do storageState', () => {
    test('login abre sessão, /eu a reconhece e /logout a encerra', async () => {
      const agente = request.agent(app); // guarda cookies entre chamadas
      await agente.post('/login').send({ email: 'ana@exemplo.com', senha: 'senhaAntiga123' }).expect(200);

      const eu = await agente.get('/eu');
      expect(eu.status).toBe(200);
      expect(eu.body).toEqual({ email: 'ana@exemplo.com' });

      await agente.post('/logout').expect(204);
      await agente.get('/eu').expect(401);
    });

    test('sem login, /eu devolve 401', async () => {
      await request(app).get('/eu').expect(401);
    });

    test('login com senha errada não abre sessão', async () => {
      const agente = request.agent(app);
      await agente.post('/login').send({ email: 'ana@exemplo.com', senha: 'errada' }).expect(401);
      await agente.get('/eu').expect(401);
    });
  });

  describe('caixa de e-mail de desenvolvimento', () => {
    test('recuperação para conta cadastrada deixa um link na caixa', async () => {
      await request(app).post('/recuperacao').send({ email: 'ana@exemplo.com' }).expect(202);

      const r = await request(app).get('/__dev/emails').query({ para: 'ana@exemplo.com' });
      expect(r.body).toHaveLength(1);
      expect(r.body[0].link).toMatch(/^\/redefinir\.html\?token=[0-9a-f-]{36}$/);
    });

    test('conta inexistente: mesma resposta, caixa vazia (sem enumeração)', async () => {
      const r = await request(app).post('/recuperacao').send({ email: 'fantasma@exemplo.com' });
      expect(r.status).toBe(202);
      const caixa = await request(app).get('/__dev/emails').query({ para: 'fantasma@exemplo.com' });
      expect(caixa.body).toEqual([]);
    });
  });

  test('serve as páginas estáticas (/ é a tela de login)', async () => {
    const r = await request(app).get('/');
    expect(r.status).toBe(200);
    expect(r.text).toContain('<title>Entrar</title>');
  });
});
