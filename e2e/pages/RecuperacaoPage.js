class RecuperacaoPage {
  constructor(page) {
    this.page = page;
    this.email = page.getByLabel('E-mail');
    this.enviarLink = page.getByRole('button', { name: 'Enviar link' });
    this.novaSenha = page.getByLabel('Nova senha');
    this.redefinir = page.getByRole('button', { name: 'Redefinir senha' });
    this.sucesso = page.getByRole('status');
    this.erro = page.getByRole('alert');
  }
  async solicitar(email) {
    await this.page.goto('/recuperar.html');
    await this.email.fill(email);
    await this.enviarLink.click();
  }
  async redefinirComLink(link, senha) {
    await this.page.goto(link);
    await this.novaSenha.fill(senha);
    await this.redefinir.click();
  }
}
module.exports = { RecuperacaoPage };
