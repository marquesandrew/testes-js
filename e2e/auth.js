// Constantes compartilhadas entre auth.setup.js e os testes que usam a sessão salva.
// (O Playwright não deixa um arquivo de teste importar outro, por isso ficam aqui.)
const ARQUIVO = 'playwright/.auth/usuario.json';
const CONTA = { email: 'qa-auth@exemplo.com', senha: 'senhaBoa123' };

module.exports = { ARQUIVO, CONTA };
