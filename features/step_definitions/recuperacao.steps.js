const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('node:assert/strict');

/**
 * Cada passo Gherkin vira uma chamada HTTP real na API (Supertest).
 * Dado = Arrange | Quando = Act | Então = Assert (Slide 8).
 */

const EMAIL_ANA = 'ana@exemplo.com';
const senhaCom = (n) => 'a'.repeat(n);

// ---------- Dado (Arrange) ----------

Given('que existe um usuário cadastrado com o e-mail {string}', function (email) {
  this.cadastrar(email);
});

Given('que não existe usuário com o e-mail {string}', function (_email) {
  this.cadastrar(EMAIL_ANA); // existe OUTRA pessoa, mas não esta
});

Given('um link de redefinição válido para {string}', async function (email) {
  this.cadastrar(email);
  await this.solicitar(email);
  this.token = this.email.ultimoTokenPara(email);
  this.emailAtual = email;
});

Given('que o link de redefinição de {string} já foi usado', async function (email) {
  this.cadastrar(email);
  await this.solicitar(email);
  this.token = this.email.ultimoTokenPara(email);
  this.emailAtual = email;
  this.senhaUsada = 'primeiraTroca123';
  const res = await this.redefinir(this.token, this.senhaUsada);
  assert.equal(res.status, 200);
});

Given('que o link de redefinição de {string} foi gerado há {int} minutos', async function (email, minutos) {
  this.cadastrar(email);
  await this.solicitar(email);
  this.token = this.email.ultimoTokenPara(email);
  this.emailAtual = email;
  this.relogio.avancar({ minutos });
});

// ---------- Quando (Act) ----------

When(/^(?:ela|alguém) solicita a recuperação de senha para "([^"]*)"$/, async function (email) {
  await this.solicitar(email);
});

When('ela tenta usar o mesmo link novamente', async function () {
  this.senhaTentada = 'tentativaDeReuso123';
  await this.redefinir(this.token, this.senhaTentada);
});

When('ela tenta redefinir a senha com esse link', async function () {
  this.senhaTentada = 'novaSenha123';
  await this.redefinir(this.token, this.senhaTentada);
});

When('ela informa uma nova senha com {int} caracteres', async function (tamanho) {
  this.senhaTentada = senhaCom(tamanho);
  await this.redefinir(this.token, this.senhaTentada);
});

When('ela solicita um novo link de recuperação', async function () {
  this.tokenAnterior = this.token;
  await this.solicitar(this.emailAtual);
  this.token = this.email.ultimoTokenPara(this.emailAtual);
});

// ---------- Então (Assert) ----------

Then('um e-mail com link de redefinição é enviado para {string}', function (email) {
  assert.ok(this.email.ultimoTokenPara(email), `nenhum link enviado para ${email}`);
});

Then('nenhum e-mail é enviado', function () {
  assert.equal(this.email.enviados.length, 0);
});

Then('a tela exibe {string}', function (texto) {
  assert.equal(this.textoNaTela(), texto);
});

Then('a senha não é alterada', async function () {
  const comTentada = await this.login(this.emailAtual, this.senhaTentada);
  assert.equal(comTentada.status, 401, 'a senha tentada NÃO deveria funcionar');
  const senhaVigente = this.senhaUsada ?? this.senhaOriginal;
  const comVigente = await this.login(this.emailAtual, senhaVigente);
  assert.equal(comVigente.status, 200, 'a senha vigente deveria continuar funcionando');
});

Then('é oferecida a opção de solicitar um novo link', function () {
  assert.equal(this.resposta.body.novoLink, '/recuperacao');
});

Then('o link continua válido', async function () {
  const res = await this.redefinir(this.token, 'senhaCorreta123');
  assert.equal(res.status, 200);
});

Then('o primeiro link deixa de funcionar', async function () {
  const res = await this.redefinir(this.tokenAnterior, 'novaSenha123');
  assert.equal(res.status, 410);
});

Then('o novo link funciona', async function () {
  const res = await this.redefinir(this.token, 'novaSenha123');
  assert.equal(res.status, 200);
});

Then('a nova senha é {word}', function (resultado) {
  const esperado = { aceita: 200, rejeitada: 422 }[resultado];
  assert.ok(esperado, `resultado desconhecido: ${resultado}`);
  assert.equal(this.resposta.status, esperado);
});
