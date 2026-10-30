// Page Object: UMA classe por tela. O seletor mora aqui; o teste só conta a história.
class CadastroPage {
  constructor(page) {
    this.page = page;
    this.email = page.getByLabel('E-mail');
    this.senha = page.getByLabel('Senha');
    this.criar = page.getByRole('button', { name: 'Criar conta' });
    this.sucesso = page.getByRole('status');
    this.erro = page.getByRole('alert');
  }
  async abrir() { await this.page.goto('/cadastro.html'); }
  async cadastrar(email, senha) {
    await this.email.fill(email);
    await this.senha.fill(senha);
    await this.criar.click();
  }
}
module.exports = { CadastroPage };
