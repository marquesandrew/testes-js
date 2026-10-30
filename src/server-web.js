const { criarAppWeb } = require('./web-app');

const PORTA = process.env.PORT || 3100;
// Usuária de demonstração para testar à mão: ana@exemplo.com / senhaAntiga123
const usuarios = [{ email: 'ana@exemplo.com', senha: 'senhaAntiga123' }];

criarAppWeb({ usuarios }).listen(PORTA, () => {
  console.log(`App web rodando em http://localhost:${PORTA}`);
});
