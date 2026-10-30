class LoginPage {
  constructor(page) {
    this.page = page;
    this.email = page.getByLabel('E-mail');
    this.senha = page.getByLabel('Senha');
    this.entrar = page.getByRole('button', { name: 'Entrar' });
    this.erro = page.getByRole('alert');
  }
  async abrir() { await this.page.goto('/'); }
  async entrarCom(email, senha) {
    await this.email.fill(email);
    await this.senha.fill(senha);
    await this.entrar.click();
  }
}
module.exports = { LoginPage };
