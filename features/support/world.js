const { setWorldConstructor } = require('@cucumber/cucumber');
const request = require('supertest');
const { criarAppRecuperacao } = require('../../src/recuperacao-app');
const { criarRelogioFalso, criarEmailFalso } = require('../../tests/helpers/fakes');

/**
 * O "World" é recriado a cada cenário: é o beforeEach do Cucumber.
 * Cada cenário começa com app, relógio e caixa de e-mail novos (isolamento, 08/10).
 */
class MundoRecuperacao {
  constructor() {
    this.usuarios = [];
    this.relogio = criarRelogioFalso();
    this.email = criarEmailFalso();
    this.app = null;
    this.resposta = null;
    this.token = null;
    this.tokenAnterior = null;
    this.senhaOriginal = 'senhaAntiga123';
  }

  cadastrar(email) {
    this.usuarios.push({ email, senha: this.senhaOriginal });
  }

  iniciarApp() {
    if (!this.app) {
      this.app = criarAppRecuperacao({
        relogio: this.relogio,
        servicoEmail: this.email,
        usuarios: this.usuarios,
      });
    }
    return this.app;
  }

  async solicitar(email) {
    this.resposta = await request(this.iniciarApp()).post('/recuperacao').send({ email });
    return this.resposta;
  }

  async redefinir(token, novaSenha) {
    this.resposta = await request(this.iniciarApp())
      .post('/recuperacao/redefinir')
      .send({ token, novaSenha });
    return this.resposta;
  }

  login(email, senha) {
    return request(this.iniciarApp()).post('/login').send({ email, senha });
  }

  textoNaTela() {
    return this.resposta.body.mensagem ?? this.resposta.body.erro;
  }
}

setWorldConstructor(MundoRecuperacao);
